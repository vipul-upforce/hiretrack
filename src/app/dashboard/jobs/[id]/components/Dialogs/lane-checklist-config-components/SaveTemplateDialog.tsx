import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, BookOpen } from 'lucide-react';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  templateDescription: string;
  setTemplateDescription: (description: string) => void;
  onSave: () => void;
  activeTab: string;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  isOpen,
  onOpenChange,
  templateName,
  setTemplateName,
  templateDescription,
  setTemplateDescription,
  onSave,
  activeTab,
}) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle>Save as Template</DialogTitle>
      </DialogHeader>
      <div className="px-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-name" className="text-sm font-medium">
            Template Name
          </Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name..."
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="template-description"
            className="text-sm font-medium"
          >
            Description (Optional)
          </Label>
          <Textarea
            id="template-description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Describe what this template is for..."
            rows={3}
            className="w-full resize-none"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <BookOpen className="h-4 w-4 flex-shrink-0" />
          <span>
            This will be saved as an
            {activeTab}
            {' '}
            checklist template
          </span>
        </div>
      </div>
      <DialogFooter className="px-6 py-4 border-t bg-muted/30">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!templateName.trim()}>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
