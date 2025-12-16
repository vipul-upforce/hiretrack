'use client';

import { useState } from 'react';
import { useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import useRoles from '@/hooks/useRoles';
import { JobFormValues } from '../../../schemas/job-schema';

export function AdminSettingsSection() {
  const { values, errors, touched, handleBlur, setFieldValue } =
    useFormikContext<JobFormValues>();
  const [showWeights, setShowWeights] = useState(false);
  const role = useRoles();

  if (role !== 'admin') {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="promptForStatusChangeReason"
            checked={values.promptForStatusChangeReason === true}
            onCheckedChange={(checked) => {
              setFieldValue('promptForStatusChangeReason', checked);
            }}
            onBlur={handleBlur}
          />
          <Label className="m-0 p-0" htmlFor="promptForStatusChangeReason">
            Prompt for reason when changing candidate status
          </Label>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Collapsible open={showWeights} onOpenChange={setShowWeights}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted">
            <div className="flex items-center gap-2">
              <Label className="cursor-pointer font-semibold">
                AI Evaluation - Weighted Scoring (Optional)
              </Label>
            </div>
            {showWeights ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Customize how much each evaluation dimension contributes to the
                final candidate score. Values will be automatically normalized.
                Leave all at default (25) for equal weighting.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evaluationWeights.skills">
                  Skills Weight (%)
                </Label>
                <Input
                  id="evaluationWeights.skills"
                  name="evaluationWeights.skills"
                  type="number"
                  min="0"
                  max="100"
                  value={values.evaluationWeights?.skills ?? 25}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setFieldValue('evaluationWeights.skills', value);
                  }}
                  onBlur={handleBlur}
                  placeholder="25"
                />
                {(touched.evaluationWeights as unknown as { skills?: boolean })
                  ?.skills &&
                  (errors.evaluationWeights as unknown as { skills?: string })
                    ?.skills && (
                    <p className="text-sm text-red-500">
                      {String(
                        (
                          errors.evaluationWeights as unknown as {
                            skills?: string;
                          }
                        ).skills,
                      )}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluationWeights.experience">
                  Experience Weight (%)
                </Label>
                <Input
                  id="evaluationWeights.experience"
                  name="evaluationWeights.experience"
                  type="number"
                  min="0"
                  max="100"
                  value={values.evaluationWeights?.experience ?? 25}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setFieldValue('evaluationWeights.experience', value);
                  }}
                  onBlur={handleBlur}
                  placeholder="25"
                />
                {(
                  touched.evaluationWeights as unknown as {
                    experience?: boolean;
                  }
                )?.experience &&
                  (
                    errors.evaluationWeights as unknown as {
                      experience?: string;
                    }
                  )?.experience && (
                    <p className="text-sm text-red-500">
                      {String(
                        (
                          errors.evaluationWeights as unknown as {
                            experience?: string;
                          }
                        ).experience,
                      )}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluationWeights.affordability">
                  Affordability Weight (%)
                </Label>
                <Input
                  id="evaluationWeights.affordability"
                  name="evaluationWeights.affordability"
                  type="number"
                  min="0"
                  max="100"
                  value={values.evaluationWeights?.affordability ?? 25}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setFieldValue('evaluationWeights.affordability', value);
                  }}
                  onBlur={handleBlur}
                  placeholder="25"
                />
                {(
                  touched.evaluationWeights as unknown as {
                    affordability?: boolean;
                  }
                )?.affordability &&
                  (
                    errors.evaluationWeights as unknown as {
                      affordability?: string;
                    }
                  )?.affordability && (
                    <p className="text-sm text-red-500">
                      {String(
                        (
                          errors.evaluationWeights as unknown as {
                            affordability?: string;
                          }
                        ).affordability,
                      )}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluationWeights.overall">
                  Overall Impression Weight (%)
                </Label>
                <Input
                  id="evaluationWeights.overall"
                  name="evaluationWeights.overall"
                  type="number"
                  min="0"
                  max="100"
                  value={values.evaluationWeights?.overall ?? 25}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setFieldValue('evaluationWeights.overall', value);
                  }}
                  onBlur={handleBlur}
                  placeholder="25"
                />
                {(touched.evaluationWeights as unknown as { overall?: boolean })
                  ?.overall &&
                  (errors.evaluationWeights as unknown as { overall?: string })
                    ?.overall && (
                    <p className="text-sm text-red-500">
                      {String(
                        (
                          errors.evaluationWeights as unknown as {
                            overall?: string;
                          }
                        ).overall,
                      )}
                    </p>
                  )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Total:{' '}
              {(values.evaluationWeights?.skills ?? 25) +
                (values.evaluationWeights?.experience ?? 25) +
                (values.evaluationWeights?.affordability ?? 25) +
                (values.evaluationWeights?.overall ?? 25)}
              % (will be normalized to 100%)
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
