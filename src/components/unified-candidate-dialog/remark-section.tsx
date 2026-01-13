import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Rating } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import { MentionTextarea } from '@/components/ui/mention-textarea';
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
  const handleMentionsChange = useCallback(
    (mentions: Mention[]) => {
      setFieldValue('selectedMentions', mentions);
    },
    [setFieldValue],
  );

  const handleTextChange = useCallback(
    (v: string) => {
      setFieldValue('remarkDescription', v);
    },
    [setFieldValue],
  );

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Remark</h3>
      <div className="space-y-2">
        <Label htmlFor="remarkDescription">Description</Label>
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
        <FormError name="remarkDescription" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="remarkRating">Rating:</Label>
          <Rating
            name="remark-rating"
            value={values.remarkRating}
            onChange={(_e, v) => {
              setFieldValue('remarkRating', v);
              setFieldValue('remarkRatingHistory', v);
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
          <div className="flex items-center space-x-2">
            {values.isRemarkPrivate ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
            <Label htmlFor="privacy-toggle" className="text-sm">
              {values.isRemarkPrivate ? 'Private' : 'Public'}
            </Label>
            <Switch
              id="privacy-toggle"
              checked={values.isRemarkPrivate}
              onCheckedChange={(c) => setFieldValue('isRemarkPrivate', c)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
