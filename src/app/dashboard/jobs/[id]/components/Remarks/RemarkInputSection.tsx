import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import Rating from '@mui/material/Rating';

import { User } from '@/lib/features/users/usersApi';
import { Candidate } from '@/types/candidate';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState } from 'react';

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
  user: User | null;
  handleAddRemark: (selectedMentionUserIds?: string[]) => void;
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
  user,
  isRemarkSubmitting,
  handleAddRemark,
  localCandidate,
  handleRemoveFollowUp,
}: RemarkInputSectionProps) {
  const hasFollowUp =
    localCandidate?.followUp?.note && localCandidate?.followUp?.note.length > 0;
  const [removeFU, setRemoveFU] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionUser[]>([]);

  // const handleFollowUpCheckboxChange = (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   if (event.target.checked && hasFollowUp) {
  //     // handleRemoveFollowUp();
  //     setRemoveFU(true);
  //   } else {
  //     setRemoveFU(false);
  //   }
  // };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-4">
        <MentionTextarea
          placeholder="Add a remark... (Alt+Enter to submit)"
          value={newRemark}
          onChange={setNewRemark}
          onKeyDown={(e) => {
            if (e.altKey && e.key === 'Enter') {
              e.preventDefault();
              if (newRemark.trim() && !isRemarkSubmitting) {
                handleAddRemark(selectedMentions.map((m) => m._id));
              }
            }
          }}
          organizationId={String(user?.organizationId) || ''}
          currentUserRole={user?.role || ''}
          rows={3}
          isRemarkPrivate={isSubRemarkPrivate}
          onSelectedMentionsChange={setSelectedMentions}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="rating">Rating:</Label>
            <Rating
              name="half-rating"
              value={remarkRating}
              onChange={(_, value) => {
                setRemarkRating(value || null);
                setRemarkRatingHistory(value || null);
              }}
              defaultValue={0}
              precision={0.5}
              sx={{
                '& .MuiRating-iconEmpty': {
                  color: 'rgb(156 163 175)', // gray-400 for light mode
                },
                '& .MuiRating-iconFilled': {
                  color: '#f59e0b', // amber-500
                },
                '& .MuiRating-iconHover': {
                  color: '#d97706', // amber-600
                },
                '@media (prefers-color-scheme: dark)': {
                  '& .MuiRating-iconEmpty': {
                    color: 'rgb(156 163 175)', // gray-400 for dark mode
                  },
                },
              }}
            />
          </div>
          <div className="flex flex-row items-center justify-evenly">
            <div className="flex items-center justify-between px-2 py-2">
              {(user?.role === 'admin' || user?.role === 'hr') &&
                hasFollowUp && (
                  <div className="flex flex-row items-center justify-center space-x-2">
                    <Checkbox
                      onCheckedChange={(checked) => {
                        if (checked && hasFollowUp) {
                          setRemoveFU(true);
                        } else {
                          setRemoveFU(false);
                        }
                      }}
                      aria-label="Remove follow-up"
                    />
                    <Label htmlFor="followup-checkbox" className="text-sm">
                      Remove Follow-up
                    </Label>
                  </div>
                )}
            </div>
            <div className="flex items-center justify-between px-2 py-2">
              {(user?.role === 'admin' || user?.role === 'hr') && (
                <>
                  <div className="flex items-center space-x-2">
                    {isSubRemarkPrivate ? (
                      <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <Label
                      htmlFor="privacy-toggle"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      {isSubRemarkPrivate ? 'Private' : 'Public'}
                    </Label>
                  </div>
                  <Switch
                    id="privacy-toggle-submit"
                    checked={isSubRemarkPrivate}
                    onCheckedChange={() =>
                      setIsSubRemarkPrivate(!isSubRemarkPrivate)
                    }
                    className="border-1 ml-2 h-4 w-8 border border-solid drop-shadow-lg"
                  />
                </>
              )}
            </div>

            <Button
              variant="primary"
              onClick={() => {
                if (removeFU) {
                  handleRemoveFollowUp();
                } else {
                  handleAddRemark(selectedMentions.map((m) => m._id));
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
