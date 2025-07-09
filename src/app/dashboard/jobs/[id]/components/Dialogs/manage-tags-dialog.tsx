import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { MuiColorInput } from "mui-color-input"
import {
  useFetchOrgTagsQuery,
  useUpdateOrgTagsMutation,
} from "@/lib/features/org/orgApi";
import { ITag } from "@/lib/models/organization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import { X } from "lucide-react";

interface ManageTagsDialogProps {
  orgId?: string;
  onClose: () => void;
  isOpen?: boolean;
}

const ManageTagsDialog = ({
  orgId = "681a1ee3a73fc6b5449caa81",
  onClose,
  isOpen,
}: ManageTagsDialogProps) => {
  const {
    data: tagsObj,
    isLoading,
    error,
  } = useFetchOrgTagsQuery({ organizationId: orgId });
  const [updateOrgTags, { isLoading: isUpdating, error: updateError }] =
    useUpdateOrgTagsMutation();
  const [orgTags, setOrgTags] = useState<ITag[]>([]);
  const [newTagTitle, setNewTagTitle] = useState("");
  const [newTagColor, setNewTagColor] = useState("#FF4D4F");
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [titleToDelete, setTitleToDelete] = useState("");
  const { toast } = useToast();
  useEffect(() => {
    if (tagsObj?.tags && orgTags.length === 0) {
      setOrgTags(tagsObj.tags);
    }
  }, [tagsObj, orgTags.length]);
  const handleCPChange = (newValue: string) => {
    setNewTagColor(newValue);
  };

  const handleAddTag = () => {
    if (!newTagTitle.trim()) {
      toast({
        title: "Error",
        description: "Tag title is required.",
        variant: "destructive",
      });
      return;
    }
    if (
      orgTags.some(
        (tag) => tag.title.toLowerCase() === newTagTitle.trim().toLowerCase()
      )
    ) {
      toast({
        title: "Error",
        description: "Tag title already exists.",
        variant: "destructive",
      });
      return;
    }
    const newTag: ITag = { title: newTagTitle.trim(), color: newTagColor };
    setOrgTags((prev) => [...prev, newTag]);
    setNewTagTitle("");
    // setNewTagColor(predefinedColors[0].value);
    toast({
      title: "Success",
      description: "Tag added successfully.",
    });
  };

  const handleDeleteTag = (tagTitle: string) => {
    setOrgTags((prev) => prev.filter((t) => t.title !== tagTitle));
    toast({
      title: "Success",
      description: `Tag "${tagTitle}" deleted.`,
    });
  };

  const handleSave = async () => {
    try {
      await updateOrgTags({ tags: orgTags, organizationId: orgId }).unwrap();
      toast({
        title: "Success",
        description: "Tags updated successfully.",
      });
      onClose();
    } catch (error) {
      console.error("Failed to update tags:", error);
      toast({
        title: "Error",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasChanges = JSON.stringify(orgTags) !== JSON.stringify(tagsObj?.tags);
  if (confirmDeleteDialogOpen)
    return (
      <ConfirmationDialog
        title="Are You Sure?"
        message={`This will remove the tag from all the jobs and candidate in this organization.`}
        isOpen={confirmDeleteDialogOpen}
        setIsOpen={setConfirmDeleteDialogOpen}
        onConfirm={() => handleDeleteTag(titleToDelete)}
        onCancel={() => setConfirmDeleteDialogOpen(false)}
        isLoading={isLoading}
        loadingText="Removing the tag"
        className="sm:max-w-[400px]"
      />
    );
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center">
            <LoadingSpinner w={4} />
          </div>
        ) : error || updateError ? (
          <p className="text-red-500">An error occurred. Please try again.</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">Add New Tags</h4>
              <div className="flex gap-2 pl-[1px]">
                <Input
                  value={newTagTitle}
                  onChange={(e) => setNewTagTitle(e.target.value)}
                  placeholder="Enter tag title (e.g., Accepted Another Offer)"
                  className="flex-1"
                />
                <MuiColorInput
                  size="small"
                  className="w-2/6"
                  format="hex8"
                  value={newTagColor}
                  onChange={handleCPChange}
                />
              </div>
              <Button
                onClick={handleAddTag}
                disabled={!newTagTitle.trim()}
                className="mt-2"
              >
                Add
              </Button>
            </div>
            <h4 className="text-sm font-medium">Current Tags</h4>
            <div className="flex flex-col gap-2 mb-[11%] overflow-y-auto">
              {!orgTags.length ? (
                <p className="text-gray-500">No Tags available.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {orgTags.map((tag) => (
                    <div
                      key={tag.title}
                      className="flex items-center gap-2 justify-between"
                    >
                      <Badge
                        style={{ backgroundColor: tag.color }}
                        className="text-white break-all w-fit"
                      >
                        {tag.title}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTitleToDelete(tag.title);
                          setConfirmDeleteDialogOpen(true);
                        }}
                        className="rounded-full  p-0 w-6 h-6"
                      // className="bg-white text-black"
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex fixed bottom-0 w-[90%] justify-end space-x-2 bg-background px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges}
                className="min-w-[80px]"
              >
                {isUpdating ? <LoadingSpinner w={4} /> : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageTagsDialog;
