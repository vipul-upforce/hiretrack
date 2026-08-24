import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  X,
  AlertCircle,
  Briefcase,
  User,
  LayoutList
} from 'lucide-react';
import { useGetCustomFieldsQuery } from '@/lib/features/org/orgApi';
import { useAppSelector } from '@/lib/redux/hooks';
import type { CustomField } from '@/Custom_Fields/Types/CustomField';
import {
  CustomFieldPromptScope,
  EvaluationCustomFieldSelection,
} from '@/lib/evaluation/custom-field-context';
import { SectionProps } from '../types';
import { DEFAULT_CUSTOM_FIELDS_PROMPT } from '../constants';

interface CustomFieldsForm {
  formName?: string;
  fields?: CustomField[];
}

interface AvailableCustomField extends EvaluationCustomFieldSelection {
  compositeKey: string;
}

interface SelectedFieldListProps {
  fields: EvaluationCustomFieldSelection[];
  icon: React.ElementType;
  emptyMessage: string;
  onRemove: (field: EvaluationCustomFieldSelection) => void;
}

const FILTERS: Array<{ id: 'all' | CustomFieldPromptScope; label: string }> = [
  { id: 'all', label: 'All Fields' },
  { id: 'global', label: 'Global' },
  { id: 'candidate-specific', label: 'Candidate' },
  { id: 'job-specific', label: 'Job' },
];

function toCompositeKey(
  field: Pick<AvailableCustomField, 'formId' | 'fieldId' | 'target'>,
): string {
  return `${field.formId}::${field.fieldId}::${field.target}`;
}

function getScope(field: CustomField): CustomFieldPromptScope {
  if (field.candidateId) return 'candidate-specific';
  if (field.jobId) return 'job-specific';
  return 'global';
}

function getTarget(formName?: string): 'job' | 'candidate' {
  const normalized = (formName || '').toLowerCase();
  return normalized.includes('job') ? 'job' : 'candidate';
}

function formatScope(scope: CustomFieldPromptScope): string {
  if (scope === 'candidate-specific') return 'Candidate Specific';
  if (scope === 'job-specific') return 'Job Specific';
  return 'Global';
}

function isSelectableCustomField(field: CustomField): boolean {
  return field.type !== 'file';
}

function cleanFieldLabel(label: string): string {
  return label.split(' |||||(')[0];
}

function SelectedFieldList({
  fields,
  icon: Icon,
  emptyMessage,
  onRemove,
}: SelectedFieldListProps) {
  if (fields.length === 0) {
    return (
      <p className="text-[13px] italic text-muted-foreground/60">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <Badge
          key={toCompositeKey(field)}
          variant="outline"
          className="flex items-center gap-1.5 border-dashed pl-2 pr-1 py-1 hover:border-solid hover:bg-secondary/40 transition-colors"
          title={`Form: ${field.formName} | Scope: ${formatScope(field.scope)}`}
        >
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="max-w-[150px] truncate text-xs font-normal">
            {cleanFieldLabel(field.label)}
          </span>
          <Separator orientation="vertical" className="h-3 mx-0.5" />
          <button
            type="button"
            onClick={() => onRemove(field)}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label={`Remove ${field.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export function CustomFieldsPromptSettingsSection({
  config,
  updateConfig,
}: SectionProps) {
  const user = useAppSelector((state) => state.auth?.user);
  const organizationId = user?.organizationId || '';
  const [activeFilter, setActiveFilter] = useState<
    'all' | CustomFieldPromptScope
  >('all');

  const { data: rawCustomFields } = useGetCustomFieldsQuery(organizationId, {
    skip: !organizationId,
  });

  const allAvailableFields = useMemo(() => {
    if (!rawCustomFields || typeof rawCustomFields !== 'object') {
      return [] as AvailableCustomField[];
    }

    const customFields = rawCustomFields as Record<string, CustomFieldsForm>;
    const dedupe = new Set<string>();
    const available: AvailableCustomField[] = [];

    Object.entries(customFields).forEach(([formId, form]) => {
      const formName = form.formName || '';
      const fields = Array.isArray(form.fields)
        ? form.fields.filter(isSelectableCustomField)
        : [];

      fields.forEach((field) => {
        const target = getTarget(formName);
        const availableField: AvailableCustomField = {
          fieldId: field.id,
          formId,
          formName,
          label: field.label,
          target,
          scope: getScope(field),
          compositeKey: toCompositeKey({
            formId,
            fieldId: field.id,
            target,
          }),
        };

        if (!dedupe.has(availableField.compositeKey)) {
          dedupe.add(availableField.compositeKey);
          available.push(availableField);
        }
      });
    });

    return available.sort((a, b) => a.label.localeCompare(b.label));
  }, [rawCustomFields]);

  const selectedCompositeKeys = useMemo(
    () =>
      new Set(
        config.selectedCustomFields.map((field) =>
          toCompositeKey({
            formId: field.formId,
            fieldId: field.fieldId,
            target: field.target,
          }),
        ),
      ),
    [config.selectedCustomFields],
  );

  const filteredAvailableFields = useMemo(() => {
    if (activeFilter === 'all') {
      return allAvailableFields;
    }
    return allAvailableFields.filter((field) => field.scope === activeFilter);
  }, [allAvailableFields, activeFilter]);

  const groupedSelection = useMemo(() => ({
    job: config.selectedCustomFields.filter((f) => f.target === 'job'),
    candidate: config.selectedCustomFields.filter(
      (f) => f.target === 'candidate',
    ),
  }), [config.selectedCustomFields]);

  const addCustomField = (field: AvailableCustomField) => {
    if (selectedCompositeKeys.has(field.compositeKey)) {
      return;
    }

    updateConfig('selectedCustomFields', [
      ...config.selectedCustomFields,
      {
        fieldId: field.fieldId,
        formId: field.formId,
        formName: field.formName || 'Unknown Form',
        label: field.label,
        target: field.target,
        scope: field.scope,
      },
    ]);
  };

  const removeCustomField = (field: EvaluationCustomFieldSelection) => {
    const targetKey = toCompositeKey({
      formId: field.formId,
      fieldId: field.fieldId,
      target: field.target,
    });

    updateConfig(
      'selectedCustomFields',
      config.selectedCustomFields.filter(
        (item) =>
          toCompositeKey({
            formId: item.formId,
            fieldId: item.fieldId,
            target: item.target,
          }) !== targetKey,
      ),
    );
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="useCustomFieldsPrompt">
            Use custom fields prompt context
          </Label>
          <p className="text-sm text-muted-foreground">
            Add selected job and candidate custom fields in AI evaluation context
          </p>
        </div>
        <Switch
          id="useCustomFieldsPrompt"
          checked={config.useCustomFieldsPrompt}
          onCheckedChange={(value) =>
            updateConfig('useCustomFieldsPrompt', value)
          }
        />
      </div>

      {config.useCustomFieldsPrompt && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="customFieldsPrompt">Custom Fields Prompt</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() =>
                  updateConfig(
                    'customFieldsPrompt',
                    DEFAULT_CUSTOM_FIELDS_PROMPT,
                  )
                }
              >
                Reset to Default
              </Button>
            </div>
            <Textarea
              id="customFieldsPrompt"
              value={config.customFieldsPrompt}
              onChange={(event) =>
                updateConfig('customFieldsPrompt', event.target.value)
              }
              rows={6}
              className="font-mono text-xs leading-relaxed resize-y min-h-[120px]"
              placeholder={DEFAULT_CUSTOM_FIELDS_PROMPT}
            />
            <Alert variant="default" className="bg-muted/50 py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">
                Variables: <code className="bg-background px-1 py-0.5 rounded border">{'{job_custom_fields}'}</code> and{' '}
                <code className="bg-background px-1 py-0.5 rounded border">{'{candidate_custom_fields}'}</code>.
              </AlertDescription>
            </Alert>
          </div>

          {/* Selected Fields - Grouped */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold leading-none tracking-tight">Selected Fields</h4>
                <Badge variant="secondary" className="text-xs font-mono">{config.selectedCustomFields.length} total</Badge>
              </div>

              <div className="space-y-3">
                {/* Job Fields Group */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs text-muted-foreground font-medium">
                      Job Fields (populates <span className="font-mono">{'{job_custom_fields}'}</span>)
                    </Label>
                  </div>
                  <SelectedFieldList
                    fields={groupedSelection.job}
                    icon={Briefcase}
                    emptyMessage="No job fields selected."
                    onRemove={removeCustomField}
                  />
                </div>

                <Separator />

                {/* Candidate Fields Group */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs text-muted-foreground font-medium">
                      Candidate Fields (populates <span className="font-mono">{'{candidate_custom_fields}'}</span>)
                    </Label>
                  </div>
                  <SelectedFieldList
                    fields={groupedSelection.candidate}
                    icon={User}
                    emptyMessage="No candidate fields selected."
                    onRemove={removeCustomField}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Field Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-sm font-medium">Add Fields</Label>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter.id}
                    type="button"
                    size="sm"
                    variant={activeFilter === filter.id ? 'secondary' : 'ghost'}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`h-7 px-3 text-xs ${activeFilter === filter.id ? 'font-medium' : 'text-muted-foreground'}`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-52 rounded-md border bg-background">
              <div className="p-2 space-y-1">
                {filteredAvailableFields.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <LayoutList className="h-8 w-8 opacity-20" />
                    <p className="text-xs">No fields available for this filter.</p>
                  </div>
                )}

                {filteredAvailableFields.map((field) => {
                  const isSelected = selectedCompositeKeys.has(field.compositeKey);
                  const Icon = field.target === 'job' ? Briefcase : User;

                  return (
                    <button
                      key={field.compositeKey}
                      type="button"
                      disabled={isSelected}
                      onClick={() => addCustomField(field)}
                      className={`
                        w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-all
                        ${isSelected
                          ? 'opacity-50 cursor-not-allowed bg-muted/50'
                          : 'hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-md ${isSelected ? 'bg-transparent' : 'bg-muted'}`}>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-xs sm:text-sm">
                            {cleanFieldLabel(field.label)}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="truncate max-w-[120px]">{field.formName}</span>
                            <span>•</span>
                            <span>{formatScope(field.scope)}</span>
                          </div>
                        </div>
                      </div>

                      {!isSelected && (
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-medium text-muted-foreground px-2">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}