import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUpdateCandidateMutation } from "@/lib/features/candidate/candidateApi";
import { useFetchOrgTagsQuery } from "@/lib/features/org/orgApi";
import { User } from "@/lib/features/users/usersApi";
import { ITag } from "@/lib/models/organization";
import { Candidate } from "@/types/candidate";
import { useEffect, useState } from "react";

interface TagsDialogProps {
  user: User | null;
  candidate: Candidate;
  refetch: () => void;
}

const TagsDialog = ({ user, candidate, refetch }: TagsDialogProps) => {
  const orgId: string =
    user && typeof user.organizationId === "string" ? user?.organizationId : "";
  const {
    data: tagsObj,
    isLoading,
    error,
  } = useFetchOrgTagsQuery({ organizationId: orgId });
  const [selectedTags, setSelectedTags] = useState<ITag[]>([]);
  const [updateCandidate, { isLoading: isUpdating }] =
    useUpdateCandidateMutation();

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

  const handleSave = async () => {
    try {
      await updateCandidate({ ...candidate, tags: selectedTags }).unwrap();
      refetch();
    } catch (error) {
      console.error("Failed to update tags:", error);
      alert("Failed to update tags. Please try again.");
    }
  };

  const hasChanges =
    JSON.stringify(selectedTags) !== JSON.stringify(candidate.tags);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Candidate Tags</h3>
      {isLoading ? (
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-red-500">Failed to load tags. Please try again.</p>
      ) : !tagsObj?.tags?.length ? (
        <p className="text-gray-500">No tags available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tagsObj.tags.map((tag) => (
            <div key={tag.title} className="flex items-center gap-3">
              <Checkbox
                id={`tag-${tag.title}`}
                checked={selectedTags.some((t) => t.title === tag.title)}
                onCheckedChange={() => handleTagSelection(tag)}
                aria-label={`Select ${tag.title}`}
              />
              <label htmlFor={`tag-${tag.title}`}>
                <Badge
                  className="text-white cursor-pointer"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.title}
                </Badge>
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          className="min-w-[80px]"
        >
          {isUpdating ? <LoadingSpinner /> : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default TagsDialog;
