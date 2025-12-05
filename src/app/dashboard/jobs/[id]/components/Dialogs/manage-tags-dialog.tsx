import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { MuiColorInput } from 'mui-color-input';
import {
  useFetchOrgTagsQuery,
  useUpdateOrgTagsMutation,
} from '@/lib/features/org/orgApi';
import { ITag } from '@/lib/models/organization';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { X, Edit2 } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

interface ManageTagsDialogProps {
  orgId?: string;
  onClose: () => void;
  isOpen?: boolean;
}

function ManageTagsDialog({
  orgId = '681a1ee3a73fc6b5449caa81',
  onClose,
  isOpen,
}: ManageTagsDialogProps) {
  const {
    data: tagsObj,
    isLoading,
    error,
  } = useFetchOrgTagsQuery({ organizationId: orgId });
  const [updateOrgTags, { isLoading: isUpdating, error: updateError }] = useUpdateOrgTagsMutation();
  const [orgTags, setOrgTags] = useState<ITag[]>([]);
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#FF4D4F');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [titleToDelete, setTitleToDelete] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ITag | null>(null);
  const [editTagTitle, setEditTagTitle] = useState('');
  const [editTagColor, setEditTagColor] = useState('#FF4D4F');
  const { toast } = useToast();

  useEffect(() => {
    if (tagsObj?.tags && orgTags.length === 0) {
      setOrgTags(tagsObj.tags);
    }
  }, [tagsObj, orgTags.length]);
  const handleCPChange = (newValue: string) => {
    setNewTagColor(newValue);
  };

  const handleEditCPChange = (newValue: string) => {
    setEditTagColor(newValue);
  };

  const handleAddTag = () => {
    if (!newTagTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Tag title is required.',
        variant: 'destructive',
      });
      return;
    }
    if (
      orgTags.some(
        (tag) => tag.title.toLowerCase() === newTagTitle.trim().toLowerCase(),
      )
    ) {
      toast({
        title: 'Error',
        description: 'Tag title already exists.',
        variant: 'destructive',
      });
      return;
    }

    if (orgTags.some((tag) => tag.color === newTagColor)) {
      toast({
        title: 'Error',
        description: 'Tag color already exists.',
        variant: 'destructive',
      });
      return;
    }
    const newTag: ITag = { title: newTagTitle.trim(), color: newTagColor };
    setOrgTags((prev) => [...prev, newTag]);
    setNewTagTitle('');
    // setNewTagColor(predefinedColors[0].value);
    toast({
      title: 'Success',
      description: 'Tag added successfully.',
    });
  };

  const handleEditTag = (tag: ITag) => {
    setEditingTag(tag);
    setEditTagTitle(tag.title);
    setEditTagColor(tag.color);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editTagTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Tag title is required.',
        variant: 'destructive',
      });
      return;
    }
    if (
      orgTags.some(
        (tag) => tag.title.toLowerCase() === editTagTitle.trim().toLowerCase()
          && tag.title !== editingTag?.title,
      )
    ) {
      toast({
        title: 'Error',
        description: 'Tag title already exists.',
        variant: 'destructive',
      });
      return;
    }
    setOrgTags((prev) => prev.map((tag) => (tag.title === editingTag?.title
      ? { title: editTagTitle.trim(), color: editTagColor }
      : tag)));
    setEditDialogOpen(false);
    setEditingTag(null);
    setEditTagTitle('');
    setEditTagColor('#FF4D4F');
    toast({
      title: 'Success',
      description: 'Tag updated successfully.',
    });
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingTag(null);
    setEditTagTitle('');
    setEditTagColor('#FF4D4F');
  };

  const handleDeleteTag = (tagTitle: string) => {
    setOrgTags((prev) => prev.filter((t) => t.title !== tagTitle));
    // toast({
    //   title: "Success",
    //   description: `Tag "${tagTitle}" deleted.`,
    // });
  };

  const handleSave = async () => {
    try {
      await updateOrgTags({ tags: orgTags, organizationId: orgId }).unwrap();
      toast({
        title: 'Success',
        description: 'Tags updated successfully.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const hasChanges = JSON.stringify(orgTags) !== JSON.stringify(tagsObj?.tags);

  if (confirmDeleteDialogOpen) {
    return (
      <ConfirmationDialog
        title="Are You Sure?"
        message="This will remove the tag from all the jobs and candidate in this organization."
        isOpen={confirmDeleteDialogOpen}
        setIsOpen={setConfirmDeleteDialogOpen}
        onConfirm={() => handleDeleteTag(titleToDelete)}
        onCancel={() => setConfirmDeleteDialogOpen(false)}
        isLoading={isLoading}
        loadingText="Removing the tag"
        className="sm:max-w-[400px]"
      />
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto px-6 py-4 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />

              <div className="flex gap-2">
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>

              <div className="h-9 w-20 bg-gray-200 dark:bg-gray-800 rounded" />

              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded mt-4" />

              <div className="flex flex-col gap-2 mt-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded" />

                    <div className="flex gap-2">
                      <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full" />
                      <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer buttons skeleton */}
              <div className="flex justify-end gap-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ) : error || updateError ? (
            <p className="text-red-500">An error occurred. Please try again.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto px-6 py-4">
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
                    className="w-2/6 dark:[&_input]:!text-white dark:[&_fieldset]:!border-gray-500"
                    format="hex8"
                    value={newTagColor}
                    onChange={handleCPChange}
                  />
                </div>
                <Button
                  onClick={handleAddTag}
                  disabled={!newTagTitle.trim()}
                  className="mt-2"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              <h4 className="text-sm font-medium">Current Tags</h4>
              <div className="flex flex-col gap-2 overflow-y-auto">
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                            className="rounded-full p-0 w-6 h-6"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTitleToDelete(tag.title);
                              setConfirmDeleteDialogOpen(true);
                            }}
                            className="rounded-full p-0 w-6 h-6"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || !hasChanges}
                  className="min-w-[80px]"
                  variant="primary"
                >
                  {isUpdating ? <LoadingSpinner w={4} /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 pl-[1px]">
                <Input
                  value={editTagTitle}
                  onChange={(e) => setEditTagTitle(e.target.value)}
                  placeholder="Enter tag title"
                  className="flex-1"
                />
                <MuiColorInput
                  size="small"
                  className="w-2/6 dark:[&_input]:!text-white dark:[&_fieldset]:!border-gray-500"
                  format="hex8"
                  value={editTagColor}
                  onChange={handleEditCPChange}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <Button onClick={handleCancelEdit} variant="outline">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editTagTitle.trim()}
                  variant="primary"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ManageTagsDialog;
