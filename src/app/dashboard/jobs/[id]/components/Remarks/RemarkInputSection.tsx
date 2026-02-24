import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import Rating from '@mui/material/Rating';

import { Candidate } from '@/types/candidate';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';

interface MentionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface RemarkInputSectionProps {
  newRemark: string;
  setNewRemark: (value: string) => void;
  remarkRating: number | null;
  setRemarkRating: (value: number | null) => void;
  setRemarkRatingHistory: (value: number | null) => void;
  isSubRemarkPrivate: boolean;
  setIsSubRemarkPrivate: (value: boolean) => void;
  handleAddRemark: (selectedMentionUserIds?: string[], removeFollowUp?: boolean) => void;
  localCandidate: Candidate | null;
  handleRemoveFollowUp: () => void;
  isRemarkSubmitting: boolean;
}

export default function RemarkInputSection({
  newRemark,
  setNewRemark,
  remarkRating,
  setRemarkRating,
  setRemarkRatingHistory,
  isSubRemarkPrivate,
  setIsSubRemarkPrivate,
  isRemarkSubmitting,
  handleAddRemark,
  localCandidate,
  handleRemoveFollowUp,
}: RemarkInputSectionProps) {
  const { user } = useAppSelector((state) => state.auth);
  const hasFollowUp =
    !!(localCandidate?.followUp?.note && localCandidate?.followUp?.note.length > 0);
  const [removeFU, setRemoveFU] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionUser[]>([]);

  const dynamicRows = Math.min(Math.max((newRemark.match(/\n/g) || []).length + 1, 1), 3);

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-3">
        <MentionTextarea
          placeholder="Add a remark... (Alt+Enter to submit)"
          value={newRemark}
          onChange={setNewRemark}
          onKeyDown={(e) => {
            if (e.altKey && e.key === 'Enter') {
              e.preventDefault();
              if (newRemark.trim() && !isRemarkSubmitting) {
                handleAddRemark(selectedMentions.map((m) => m._id), removeFU && hasFollowUp);
              }
            }
          }}
          organizationId={String(user?.organizationId) || ''}
          currentUserRole={user?.role || ''}
          rows={dynamicRows}
          className="min-h-[38px] w-full resize-none overflow-y-auto leading-relaxed transition-all"
          isRemarkPrivate={isSubRemarkPrivate}
          onSelectedMentionsChange={setSelectedMentions}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="rating" className="text-xs font-medium text-muted-foreground">
              Rating:
            </Label>
            <Rating
              name="half-rating"
              value={remarkRating}
              onChange={(_, value) => {
                setRemarkRating(value || null);
                setRemarkRatingHistory(value || null);
              }}
              defaultValue={0}
              precision={0.5}
              size="small"
              sx={{
                '& .MuiRating-iconEmpty': {
                  color: 'rgb(156 163 175)', // gray-400
                },
                '& .MuiRating-iconFilled': {
                  color: '#f59e0b', // amber-500
                },
                '& .MuiRating-iconHover': {
                  color: '#d97706', // amber-600
                },
              }}
            />
          </div>

          <div className="flex flex-row items-center justify-end gap-3">
            {(user?.role === 'admin' || user?.role === 'hr') && hasFollowUp && (
              <div className="flex flex-row items-center space-x-2">
                <Checkbox
                  id="followup-checkbox"
                  onCheckedChange={(checked) => {
                    if (checked && hasFollowUp) {
                      setRemoveFU(true);
                    } else {
                      setRemoveFU(false);
                    }
                  }}
                  aria-label="Remove follow-up"
                  className="h-4 w-4"
                />
                <Label htmlFor="followup-checkbox" className="text-xs text-muted-foreground">
                  Remove Follow-up
                </Label>
              </div>
            )}

            {(user?.role === 'admin' || user?.role === 'hr') && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {isSubRemarkPrivate ? (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Label
                    htmlFor="privacy-toggle-submit"
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    {isSubRemarkPrivate ? 'Private' : 'Public'}
                  </Label>
                </div>
                <Switch
                  id="privacy-toggle-submit"
                  checked={isSubRemarkPrivate}
                  onCheckedChange={() => setIsSubRemarkPrivate(!isSubRemarkPrivate)}
                  className="h-4 w-7"
                />
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                const hasRemark = newRemark.trim();

                if (hasRemark) {
                  handleAddRemark(selectedMentions.map((m) => m._id), removeFU && hasFollowUp);
                } else if (removeFU && hasFollowUp) {
                  handleRemoveFollowUp();
                }
              }}
              disabled={isRemarkSubmitting}
            >
              {isRemarkSubmitting ? 'Submitting...' : 'Add Remark'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}