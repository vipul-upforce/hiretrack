import React, { useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Rating } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { useDeferredRemark } from '@/contexts/deferred-remark-context';
import { UnifiedFormValues, Mention } from './types';
import { FormError } from './form-errors';

interface RemarkSectionProps {
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  organizationId?: string;
  userRole?: string;
}

export function RemarkSection({
  values,
  setFieldValue,
  organizationId,
  userRole,
}: RemarkSectionProps) {
  const { setRemark, setIsSubRemarkPrivate, setRemarkRating } = useDeferredRemark();

  useEffect(() => {
    setRemark(values.remarkDescription ?? '');
    setIsSubRemarkPrivate(values.isRemarkPrivate ?? true);
    setRemarkRating(values.remarkRating ?? null);
  }, [values.remarkDescription, values.isRemarkPrivate, values.remarkRating, setRemark, setIsSubRemarkPrivate, setRemarkRating]);

  const handleMentionsChange = useCallback(
    (mentions: Mention[]) => {
      setFieldValue('selectedMentions', mentions);
    },
    [setFieldValue],
  );

  const handleTextChange = useCallback(
    (v: string) => {
      setFieldValue('remarkDescription', v);
      setRemark(v);
    },
    [setFieldValue, setRemark],
  );

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">Remark</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="remarkDescription" className="text-sm font-medium">
          Description
        </Label>
        <div id="remarkDescription">
          <MentionTextarea
            placeholder="Add a remark... (Alt+Enter to submit)"
            className="max-h-80 overflow-y-auto"
            value={values.remarkDescription}
            onChange={handleTextChange}
            organizationId={organizationId || ''}
            currentUserRole={userRole || ''}
            rows={4}
            isRemarkPrivate={values.isRemarkPrivate}
            onSelectedMentionsChange={handleMentionsChange}
          />
        </div>
        <FormError name="remarkDescription" />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <Label
            htmlFor="remarkRating"
            className="text-sm font-medium text-muted-foreground"
          >
            Rating:
          </Label>
          <Rating
            name="remark-rating"
            value={values.remarkRating}
            onChange={(_e, v) => {
              setFieldValue('remarkRating', v);
              setFieldValue('remarkRatingHistory', v);
              setRemarkRating(v ?? null);
              setIsSubRemarkPrivate(values.isRemarkPrivate);
            }}
            precision={0.5}
            sx={{
              '& .MuiRating-iconEmpty': { color: 'rgb(156 163 175)' },
              '& .MuiRating-iconFilled': { color: '#fbbf24' },
              '& .MuiRating-iconHover': { color: '#f59e0b' },
            }}
          />
        </div>
        {userRole !== 'interviewer' && (
          <div className="flex items-center space-x-3">
            {values.isRemarkPrivate ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <Label
              htmlFor="privacy-toggle"
              className="cursor-pointer text-sm font-medium"
            >
              {values.isRemarkPrivate ? 'Private' : 'Public'}
            </Label>
            <Switch
              id="privacy-toggle"
              checked={values.isRemarkPrivate}
              onCheckedChange={(c) => {
                setFieldValue('isRemarkPrivate', c);
                setIsSubRemarkPrivate(!!c);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
