"use client";

import { QuickCreateDialog } from "@/components/ui/specialized-dialogs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface CreateLaneDialogProps {
  onAddLane: (title: string) => void;
}

export function CreateLaneDialog({ onAddLane }: CreateLaneDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { toast } = useToast();


  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Lane title is required",
        variant: "destructive",
      });
      return;
    }

    onAddLane(title);
    setTitle("");
    setIsOpen(false);
  };

  const isValid = title.trim().length > 0;

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Lane
      </Button>

      <QuickCreateDialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setTitle("");
        }}
        onSubmit={handleSubmit}
        title="Add New Lane"
        submitLabel="Add Lane"
        isValid={isValid}
      >
        <div className="space-y-2 mb-1">
          <Label htmlFor="title">Lane Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              const newValue = e.target.value;
              const regex = /^[a-zA-Z0-9\s]*$/;
              if (regex.test(newValue)) {
                setTitle(newValue);
              }
            }}
            placeholder="Enter lane title..."
            maxLength={50}
          />
        </div>
      </QuickCreateDialog>
    </>
  );
}
