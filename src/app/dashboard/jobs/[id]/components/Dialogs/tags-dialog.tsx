import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { useUpdateCandidateMutation } from '@/lib/features/candidate/candidateApi';
import { useFetchOrgTagsQuery } from '@/lib/features/org/orgApi';
import { ITag } from '@/lib/models/organization';
import { Candidate } from '@/types/candidate';
import { Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import ManageTagsDialog from './manage-tags-dialog';

interface TagsDialogProps {
  candidate: Candidate;
  refetch: () => void;
  onClose: () => void;
  isDialog?: boolean;
}

function TagsDialog({
  candidate,
  refetch,
  onClose,
  isDialog,
}: TagsDialogProps) {
  const { user } = useAppSelector((state) => state.auth);
  const orgId: string =
    user && typeof user.organizationId === 'string' ? user?.organizationId : '';
  const {
    data: tagsObj,
    isLoading,
    error,
  } = useFetchOrgTagsQuery({ organizationId: orgId });
  const [updateCandidate, { isLoading: isUpdating, error: candidateError }] =
    useUpdateCandidateMutation();
  const [selectedTags, setSelectedTags] = useState<ITag[]>([]);
  const [allTags, setAllTags] = useState<ITag[]>([]);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const orgTags = tagsObj?.tags || [];
    const candidateTags = candidate.tags || [];
    const uniqueTagsMap = new Map<string, ITag>();
    [...orgTags, ...candidateTags].forEach((tag) => {
      uniqueTagsMap.set(tag.title, tag);
    });
    const combinedTags = Array.from(uniqueTagsMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    setAllTags(combinedTags);
  }, [tagsObj, candidate.tags]);

  useEffect(() => {
    if (candidate.tags) {
      setSelectedTags(candidate.tags);
    }
  }, [candidate.tags]);

  const handleTagSelection = (tag: ITag) => {
    setSelectedTags((prev) =>
      prev.some((t) => t.title === tag.title)
        ? prev.filter((t) => t.title !== tag.title)
        : [...prev, tag],
    );
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateCandidate({ ...candidate, tags: selectedTags }).unwrap();
      refetch();
      toast({
        title: 'Success',
        description: 'Candidate tags updated successfully.',
      });
    } catch (er) {
      logger.error('Failed to update candidate tags:', er);
      toast({
        title: 'Error',
        description: 'Failed to update candidate tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenManageTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManageTagsOpen(true);
  };

  const handleManageTagsClose = () => {
    setIsManageTagsOpen(false);
    onClose();
  };

  const hasChanges =
    JSON.stringify(selectedTags) !== JSON.stringify(candidate.tags);

  return (
    <div
      role="dialog"
      className="flex max-h-[570px] w-[300px] flex-col p-4 pt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="mr-4 text-lg font-semibold">Assign Tags</h3>
        <Button variant="outline" size="sm" onClick={handleOpenManageTags}>
          <Settings className="h-3 w-3" />
        </Button>
      </div>
      {isLoading && (
        <div className="flex justify-center">
          <LoadingSpinner width={4} />
        </div>
      )}
      {!isLoading && (error || candidateError) && (
        <p className="text-red-500">An error occurred. Please try again.</p>
      )}
      {!isLoading && !(error || candidateError) && allTags.length === 0 && (
        <p className="text-gray-500">No tags available.</p>
      )}
      {!isLoading && !(error || candidateError) && allTags.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3">
            {allTags.map((tag) => (
              <div key={tag.title} className="flex items-center gap-3">
                <Checkbox
                  id={`tag-${tag.title}`}
                  checked={selectedTags.some((t) => t.title === tag.title)}
                  onCheckedChange={() => handleTagSelection(tag)}
                  aria-label={`Select ${tag.title}`}
                  onClick={(e) => e.stopPropagation()}
                />
                <label htmlFor={`tag-${tag.title}`}>
                  <Badge
                    className="w-fit cursor-pointer break-all text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.title}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`mt-4 flex justify-end ${isDialog ? 'w-[110%]' : ''}`}>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          className="min-w-[80px]"
        >
          {isUpdating ? <LoadingSpinner width={4} /> : 'Save'}
        </Button>
      </div>
      {isManageTagsOpen && (
        <ManageTagsDialog
          orgId={orgId}
          isOpen={isManageTagsOpen}
          onClose={handleManageTagsClose}
        />
      )}
    </div>
  );
}

export default TagsDialog;
