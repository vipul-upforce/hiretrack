import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useUpdateCandidateMutation } from "@/lib/features/candidate/candidateApi";
import { useFetchOrgTagsQuery } from "@/lib/features/org/orgApi";
import { User } from "@/lib/features/users/usersApi";
import { ITag } from "@/lib/models/organization";
import { Candidate } from "@/types/candidate";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import ManageTagsDialog from "./manage-tags-dialog";

interface TagsDialogProps {
  user: User | null;
  candidate: Candidate;
  refetch: () => void;
  onClose: () => void;
}

const TagsDialog = ({ user, candidate, refetch, onClose }: TagsDialogProps) => {
  const orgId: string =
    user && typeof user.organizationId === "string" ? user?.organizationId : "";
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
      a.title.localeCompare(b.title)
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
        : [...prev, tag]
    );
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateCandidate({ ...candidate, tags: selectedTags }).unwrap();
      refetch();
      toast({
        title: "Success",
        description: "Candidate tags updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update candidate tags:", error);
      toast({
        title: "Error",
        description: "Failed to update candidate tags. Please try again.",
        variant: "destructive",
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
      className="p-6 w-[300px] max-h-[570px] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold mr-4">Assign Tags</h3>
        <Button variant="outline" size="sm" onClick={handleOpenManageTags}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center">
          <LoadingSpinner w={4} />
        </div>
      ) : error || candidateError ? (
        <p className="text-red-500">An error occurred. Please try again.</p>
      ) : allTags.length === 0 ? (
        <p className="text-gray-500">No tags available.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {" "}
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
                    className="text-white cursor-pointer break-all w-fit"
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
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          className="min-w-[80px]"
        >
          {isUpdating ? <LoadingSpinner w={4} /> : "Save"}
        </Button>
      </div>
      {isManageTagsOpen && (
        <ManageTagsDialog
          orgId={orgId}
          open={isManageTagsOpen}
          onClose={handleManageTagsClose}
        />
      )}
    </div>
  );
};

export default TagsDialog;
