'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface EditLaneDialogProps {
  isEditLaneDialogOpen: boolean;
  setIsEditLaneDialogOpen: (open: boolean) => void;
  editingLane: string | null;
  prevLane: string | null;
  setEditingLane: (lane: string) => void;
  handleLaneUpdate: (prevId: string, name: string) => void;
  isLoading: boolean;
}

function EditLaneDialog({
  isEditLaneDialogOpen,
  setIsEditLaneDialogOpen,
  editingLane,
  prevLane,
  setEditingLane,
  handleLaneUpdate,
  isLoading,
}: EditLaneDialogProps) {
  // Use local state to prevent parent state from overriding user input
  const [localEditingValue, setLocalEditingValue] = useState<string>('');

  // Initialize local state when dialog opens or editingLane changes
  useEffect(() => {
    if (isEditLaneDialogOpen && editingLane) {
      setLocalEditingValue(editingLane);
    } else if (!isEditLaneDialogOpen) {
      // Reset when dialog closes
      setLocalEditingValue('');
    }
  }, [isEditLaneDialogOpen, editingLane]);

  return (
    <Dialog open={isEditLaneDialogOpen} onOpenChange={setIsEditLaneDialogOpen}>
      <DialogContent className="flex flex-col overflow-hidden p-0 sm:max-w-[400px]">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>Edit Lane</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lane-name">Lane Name</Label>
            <Input
              id="lane-name"
              placeholder="Enter lane name..."
              value={localEditingValue}
              onChange={(e) => {
                const newValue = e.target.value;
                const regex = /^[A-Za-z0-9\s\-_]*$/;
                if (regex.test(newValue)) {
                  setLocalEditingValue(newValue);
                  // Also update parent state for consistency, but local state takes precedence
                  setEditingLane(newValue);
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
          <Button
            variant="outline"
            onClick={() => setIsEditLaneDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!localEditingValue?.trim() || !prevLane?.trim()}
            variant="primary"
            onClick={() => {
              const trimmedNewValue = localEditingValue.trim();
              const trimmedPrevValue = prevLane?.trim() || '';
              
              if (
                trimmedPrevValue.length > 0 &&
                trimmedNewValue.length > 0 &&
                trimmedPrevValue !== trimmedNewValue // Ensure we're actually changing the name
              ) {
                handleLaneUpdate(trimmedPrevValue, trimmedNewValue);
                setIsEditLaneDialogOpen(false);
              } else if (!trimmedPrevValue || trimmedPrevValue.length === 0) {
                toast({
                  title: 'Error',
                  description: 'Original lane name is missing. Please close and try again.',
                  variant: 'destructive',
                });
                // Don't close dialog if there's an error
              } else if (trimmedPrevValue === trimmedNewValue) {
                toast({
                  title: 'No changes',
                  description: 'Lane name has not been changed.',
                  variant: 'default',
                });
                setIsEditLaneDialogOpen(false);
              } else {
                toast({
                  title: 'Error',
                  description: 'Something is missing...',
                  variant: 'destructive',
                });
                // Don't close dialog if there's an error
              }
            }}
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditLaneDialog;
