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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              min={3}
              placeholder="Enter new file name"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={newName.length < 3}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
