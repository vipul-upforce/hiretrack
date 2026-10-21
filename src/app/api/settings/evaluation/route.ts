import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import { IEvaluationConfig } from '@/lib/models/settings';
import {
  DEFAULT_CUSTOM_FIELDS_PROMPT_TEMPLATE,
  EvaluationCustomFieldSelection,
} from '@/lib/evaluation/custom-field-context';

const DEFAULT_EVALUATION_CONFIG: IEvaluationConfig = {
  temperature: 0.1,
  customPrompt: null,
  autoEvaluateAllCandidates: false,
  maxPdfPages: 4,
  enableConfidenceScores: true,
  enableRedFlagsDetection: true,
  enableSkillsMatrix: true,
  enableComparativeRanking: false,
  useCustomFieldsPrompt: false,
  customFieldsPrompt: DEFAULT_CUSTOM_FIELDS_PROMPT_TEMPLATE,
  selectedCustomFields: [],
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTarget(
  value: unknown,
): value is EvaluationCustomFieldSelection['target'] {
  return value === 'job' || value === 'candidate';
}

function isValidScope(
  value: unknown,
): value is EvaluationCustomFieldSelection['scope'] {
  return (
    value === 'global' ||
    value === 'job-specific' ||
    value === 'candidate-specific'
  );
}

function normalizeSelectedCustomFields(
  input: unknown,
): EvaluationCustomFieldSelection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const dedupe = new Set<string>();
  const normalized = input
    .map((field): EvaluationCustomFieldSelection | null => {
      if (!field || typeof field !== 'object') {
        return null;
      }

      const candidate = field as Partial<EvaluationCustomFieldSelection>;
      if (
        !isNonEmptyString(candidate.fieldId) ||
        !isNonEmptyString(candidate.formId) ||
        !isNonEmptyString(candidate.label) ||
        !isValidTarget(candidate.target) ||
        !isValidScope(candidate.scope)
      ) {
        return null;
      }

      const normalizedField: EvaluationCustomFieldSelection = {
        fieldId: candidate.fieldId,
        formId: candidate.formId,
        formName: isNonEmptyString(candidate.formName)
          ? candidate.formName
          : 'Unknown Form',
        label: candidate.label,
        target: candidate.target,
        scope: candidate.scope,
      };

      const key = `${normalizedField.formId}::${normalizedField.fieldId}::${normalizedField.target}`;
      if (dedupe.has(key)) {
        return null;
      }
      dedupe.add(key);

      return normalizedField;
    })
    .filter((field): field is EvaluationCustomFieldSelection => field !== null);

  return normalized;
}

function normalizeEvaluationConfig(payload: unknown): IEvaluationConfig {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_EVALUATION_CONFIG;
  }

  const config = payload as Partial<IEvaluationConfig>;

  return {
    temperature:
      typeof config.temperature === 'number'
        ? config.temperature
        : DEFAULT_EVALUATION_CONFIG.temperature,
    customPrompt:
      typeof config.customPrompt === 'string' || config.customPrompt === null
        ? config.customPrompt
        : DEFAULT_EVALUATION_CONFIG.customPrompt,
    autoEvaluateAllCandidates:
      typeof config.autoEvaluateAllCandidates === 'boolean'
        ? config.autoEvaluateAllCandidates
        : DEFAULT_EVALUATION_CONFIG.autoEvaluateAllCandidates,
    maxPdfPages:
      typeof config.maxPdfPages === 'number'
        ? config.maxPdfPages
        : DEFAULT_EVALUATION_CONFIG.maxPdfPages,
    enableConfidenceScores:
      typeof config.enableConfidenceScores === 'boolean'
        ? config.enableConfidenceScores
        : DEFAULT_EVALUATION_CONFIG.enableConfidenceScores,
    enableRedFlagsDetection:
      typeof config.enableRedFlagsDetection === 'boolean'
        ? config.enableRedFlagsDetection
        : DEFAULT_EVALUATION_CONFIG.enableRedFlagsDetection,
    enableSkillsMatrix:
      typeof config.enableSkillsMatrix === 'boolean'
        ? config.enableSkillsMatrix
        : DEFAULT_EVALUATION_CONFIG.enableSkillsMatrix,
    enableComparativeRanking:
      typeof config.enableComparativeRanking === 'boolean'
        ? config.enableComparativeRanking
        : DEFAULT_EVALUATION_CONFIG.enableComparativeRanking,
    useCustomFieldsPrompt:
      typeof config.useCustomFieldsPrompt === 'boolean'
        ? config.useCustomFieldsPrompt
        : DEFAULT_EVALUATION_CONFIG.useCustomFieldsPrompt,
    customFieldsPrompt:
      typeof config.customFieldsPrompt === 'string' ||
      config.customFieldsPrompt === null
        ? config.customFieldsPrompt
        : DEFAULT_EVALUATION_CONFIG.customFieldsPrompt,
    selectedCustomFields: normalizeSelectedCustomFields(
      config.selectedCustomFields,
    ),
  };
}

export async function GET(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const settings = await Settings.findOne({
      organizationId,
    })
      .select('evaluationConfig')
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    const evaluationConfig = normalizeEvaluationConfig(
      settings.evaluationConfig || DEFAULT_EVALUATION_CONFIG,
    );

    return NextResponse.json({ evaluationConfig });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const [userData, payload] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      req.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }
    const evaluationConfig = normalizeEvaluationConfig(payload);

    // Validate temperature range
    if (
      evaluationConfig.temperature !== undefined &&
      (evaluationConfig.temperature < 0 || evaluationConfig.temperature > 1)
    ) {
      return NextResponse.json(
        { error: 'Temperature must be between 0 and 1' },
        { status: 400 },
      );
    }

    // Validate maxPdfPages
    if (
      evaluationConfig.maxPdfPages !== undefined &&
      evaluationConfig.maxPdfPages < 0
    ) {
      return NextResponse.json(
        { error: 'Max PDF pages must be 0 or greater (0 = no limit)' },
        { status: 400 },
      );
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      { evaluationConfig },
      {
        new: true,
        runValidators: true,
        upsert: true,
        select: 'evaluationConfig',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Evaluation settings updated successfully',
      evaluationConfig: updatedSettings.evaluationConfig,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error updating evaluation settings');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
