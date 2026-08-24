'use client';

import { useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChipInput } from '@/components/ui/chip-input';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LinkIcon, ChevronDown, ChevronUp, Info } from 'lucide-react';
import RichTextEditor from '@/components/ui/rte/RichTextEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import useRoles from '@/hooks/useRoles';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseJobExperienceInput } from '@/lib/utils/job-experience';
import { JobFormValues } from '../schemas/job-schema';
import { JobFormSalaryField } from './JobFormSalaryField';

type EvaluationWeightsErrors = {
  skills?: string;
  experience?: string;
  affordability?: string;
  overall?: string;
};

function isEvaluationWeightsErrorObject(
  error: string | EvaluationWeightsErrors | undefined,
): error is EvaluationWeightsErrors {
  return typeof error === 'object' && error !== null && !Array.isArray(error);
}

export function JobForm() {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
  } = useFormikContext<JobFormValues>();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [showWeights, setShowWeights] = useState(false);
  const { sanitizeFiles } = useSanitizeFiles();
  const role = useRoles();

  const handleAddLink = () => {
    try {
      URL.canParse(newLink); // Validate URL
      const updatedLinks = [...values.links, newLink];
      setFieldValue('links', updatedLinks);
      setNewLink('');
      setIsLinkDialogOpen(false);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 pt-0">
      <div className="space-y-2">
        <Label htmlFor="title" className="font-semibold">
          Job Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g., Senior Frontend Developer"
        />
        {touched.title && errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="font-semibold">
          Status <span className="text-red-500">*</span>
        </Label>
        <Select
          value={values.status}
          onValueChange={(value) => setFieldValue('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        {touched.status && errors.status && (
          <p className="text-sm text-red-500">{errors.status}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-semibold">
          Description <span className="text-red-500">*</span>
        </Label>
        <RichTextEditor
          id="description"
          name="description"
          placeholder="Enter job description..."
          className="min-h-[100px] p-3"
          maxLength={10000}
          sanitizePastedTextColor
          allowColors={false}
          showClearFormatting
          value={values?.description || ''}
          onChange={(val) => setFieldValue('description', val)}
          onBlur={() => setFieldTouched('description', true)} // ✅ fixed
        />
        {errors.description && touched.description && (
          <p className="text-sm text-red-500">{String(errors.description)}</p>
        )}
      </div>

      <div className="space-y-2" id="skills">
        <Label className="font-semibold">
          Required Skills (Hit Enter to add){' '}
          <span className="text-red-500">*</span>
        </Label>
        <ChipInput
          value={values.skills}
          onChange={(newSkills) => {
            setFieldValue('skills', newSkills);
            // setFieldTouched("skills", true);
          }}
          placeholder="Add skills..."
          onSuggestionClick={(suggestion) => {
            if (!values.skills.includes(suggestion)) {
              const newSkills = [...values.skills, suggestion];
              setFieldValue('skills', newSkills);
              setFieldTouched('skills', true);
            }
          }}
        />

        {errors.skills && touched.skills && (
          <p className="text-sm text-red-500">{String(errors.skills)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience" className="font-semibold">
          Experience (years) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="experience.inText"
          name="experience.inText"
          type="text"
          value={values.experience?.inText ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const inText = e.target.value;
            const parsed = parseJobExperienceInput(inText);
            setFieldValue('experience', {
              inText,
              min: parsed?.min ?? 0,
              ...(parsed?.max != null ? { max: parsed.max } : {}),
            });
          }}
          onBlur={handleBlur}
          placeholder="e.g., 5 or 3-5"
        />
        {touched.experience?.inText && errors.experience && (
          <p className="text-sm text-red-500">
            {typeof errors.experience === 'string'
              ? errors.experience
              : (errors.experience as { inText?: string })?.inText}
          </p>
        )}
      </div>
      <JobFormSalaryField />

      <div className="space-y-2">
        <Label className="font-semibold">Job Links</Label>
        <div className="space-y-2">
          {values.links.map((link) => (
            <div key={`${link}`} className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span className="text-sm">{link}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newLinks = [...values.links];
                  newLinks.splice(newLinks.indexOf(link), 1);
                  setFieldValue('links', newLinks);
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsLinkDialogOpen(true);
              setFieldTouched('links', true);
            }}
          >
            Add Link
          </Button>
          {touched.links && errors.links && (
            <p className="text-sm text-red-500">{String(errors.links)}</p>
          )}
        </div>
      </div>

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          setIsLinkDialogOpen(open);
          setNewLink('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="link" className="font-semibold">
                URL
              </Label>
              <Input
                id="link"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleAddLink}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <Label className="font-semibold">Attachments</Label>
        <FileUpload
          onFileSelect={(newFiles) => {
            const sanitizedFiles = sanitizeFiles(newFiles);
            setFieldValue('files', [
              ...(values.files || []),
              ...sanitizedFiles.filter(
                (file) =>
                  !(values.files || []).some(
                    (existingFile) => existingFile.name === file.name,
                  ),
              ),
            ]);
          }}
          accept={{}} // Empty object means accept all file types
          maxFiles={30}
          files={values.files || []}
          setter={(files: File[]) => {
            const sanitizedFiles = sanitizeFiles(files);
            setFieldValue('files', sanitizedFiles);
          }}
        />
      </div>

      {role === 'admin' && (
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
      )}

      {role === 'admin' && (
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
                  Customize how much each evaluation dimension contributes to
                  the final candidate score. Values will be automatically
                  normalized. Leave all at default (25) for equal weighting.
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
                  {touched.evaluationWeights && errors.evaluationWeights && (
                    <p className="text-sm text-red-500">
                      {isEvaluationWeightsErrorObject(errors.evaluationWeights)
                        ? errors.evaluationWeights.skills || ''
                        : String(errors.evaluationWeights)}
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
                  {touched.evaluationWeights && errors.evaluationWeights && (
                    <p className="text-sm text-red-500">
                      {isEvaluationWeightsErrorObject(errors.evaluationWeights)
                        ? errors.evaluationWeights.experience || ''
                        : String(errors.evaluationWeights)}
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
                  {touched.evaluationWeights && errors.evaluationWeights && (
                    <p className="text-sm text-red-500">
                      {isEvaluationWeightsErrorObject(errors.evaluationWeights)
                        ? errors.evaluationWeights.affordability || ''
                        : String(errors.evaluationWeights)}
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
                  {touched.evaluationWeights && errors.evaluationWeights && (
                    <p className="text-sm text-red-500">
                      {isEvaluationWeightsErrorObject(errors.evaluationWeights)
                        ? errors.evaluationWeights.overall || ''
                        : String(errors.evaluationWeights)}
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
      )}
    </div>
  );
}
