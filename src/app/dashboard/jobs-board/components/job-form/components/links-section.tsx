'use client';

import { useState } from 'react';
import { useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LinkIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { JobFormValues } from '../../../schemas/job-schema';

export function LinksSection() {
  const { values, errors, touched, setFieldValue, setFieldTouched } =
    useFormikContext<JobFormValues>();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState('');

  const handleAddLink = () => {
    try {
      // eslint-disable-next-line no-new
      new URL(newLink); // Validate URL
      const updatedLinks = [...values.links, newLink];
      setFieldValue('links', updatedLinks);
      setNewLink('');
      setIsLinkDialogOpen(false);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="font-semibold">Job Links</Label>
        <div className="space-y-2">
          {values.links.map((link, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span className="text-sm">{link}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newLinks = [...values.links];
                  newLinks.splice(index, 1);
                  setFieldValue('links', newLinks);
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsLinkDialogOpen(true);
              setFieldTouched('links', true);
            }}
          >
            Add Link
          </Button>
          {touched.links && errors.links && (
            <p className="text-sm text-red-500">{String(errors.links)}</p>
          )}
        </div>
      </div>

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          setIsLinkDialogOpen(open);
          setNewLink('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="link" className="font-semibold">
                URL
              </Label>
              <Input
                id="link"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleAddLink}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
