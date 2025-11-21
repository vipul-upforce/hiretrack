import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RenameFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onRename: (newName: string) => void;
}

export function RenameFileDialog({
  isOpen,
  onClose,
  fileName,
  onRename,
}: RenameFileDialogProps) {
  const [newName, setNewName] = React.useState(fileName);

  React.useEffect(() => {
    setNewName(fileName);
  }, [fileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if the new name has an extension
    const hasExtension = /\.[^/.]+$/.test(newName);

    // If original filename has an extension and new name doesn't, copy the extension
    if (!hasExtension && fileName.includes(".")) {
      const originalExt = fileName.split(".").pop();
      const nameWithExt = `${newName}.${originalExt}`;
      onRename(nameWithExt);
    } else {
      onRename(newName);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden flex flex-col z-[99999]">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              min={3}
              placeholder="Enter new file name"
            />
          </div>
          <DialogFooter className="border-t bg-background px-6 py-4 sticky bottom-0 z-10">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={newName.length < 3}
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
