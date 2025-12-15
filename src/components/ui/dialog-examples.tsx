/**
 * Dialog Examples - Demonstrating the usage of the unified dialog system
 *
 * This file shows how to use the different dialog components:
 * - BaseDialog: Full control dialog with custom actions
 * - ConfirmationDialog: Simple yes/no confirmations
 * - FormDialog: Form submissions with validation
 * - DeleteDialog: Specialized delete confirmations
 * - WarningDialog: Warning prompts
 * - InfoDialog: Information displays
 * - QuickCreateDialog: Simple create forms
 */

import React, { useState } from 'react';
import {
  BaseDialog,
  ConfirmationDialog,
  FormDialog,
} from './base-dialog';
import {
  DeleteDialog,
  WarningDialog,
  InfoDialog,
  QuickCreateDialog,
} from './specialized-dialogs';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

export function DialogExamples() {
  const [showExample, setShowExample] = useState<string | null>(null);
  const [formValue, setFormValue] = useState('');

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Base Dialog Example */}
      <Button onClick={() => setShowExample('base')}>
        Base Dialog
      </Button>
      <BaseDialog
        isOpen={showExample === 'base'}
        onClose={() => setShowExample(null)}
        title="Custom Dialog"
        description="This is a flexible base dialog"
        size="md"
        primaryAction={{
          label: 'Save',
          onClick: () => setShowExample(null),
          variant: 'success',
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setShowExample(null),
        }}
      >
        <p>Your custom content goes here...</p>
      </BaseDialog>

      {/* Confirmation Dialog */}
      <Button onClick={() => setShowExample('confirm')}>
        Confirmation
      </Button>
      <ConfirmationDialog
        isOpen={showExample === 'confirm'}
        onClose={() => setShowExample(null)}
        onConfirm={() => {
          setShowExample(null);
        }}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
      >
        <p>This action will make changes to your data.</p>
      </ConfirmationDialog>

      {/* Form Dialog */}
      <Button onClick={() => setShowExample('form')}>
        Form Dialog
      </Button>
      <FormDialog
        isOpen={showExample === 'form'}
        onClose={() => {
          setShowExample(null);
          setFormValue('');
        }}
        onSubmit={() => {
          setShowExample(null);
          setFormValue('');
        }}
        title="Create Item"
        isValid={formValue.trim().length > 0}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Enter name..."
          />
        </div>
      </FormDialog>

      {/* Delete Dialog */}
      <Button onClick={() => setShowExample('delete')} variant="destructive">
        Delete Dialog
      </Button>
      <DeleteDialog
        isOpen={showExample === 'delete'}
        onClose={() => setShowExample(null)}
        onConfirm={() => {
          setShowExample(null);
        }}
        itemName="Important File"
        itemType="File"
      />

      {/* Warning Dialog */}
      <Button onClick={() => setShowExample('warning')} variant="warning">
        Warning Dialog
      </Button>
      <WarningDialog
        isOpen={showExample === 'warning'}
        onClose={() => setShowExample(null)}
        onConfirm={() => setShowExample(null)}
        title="Proceed with Caution"
        message="This action may have unintended consequences. Please review before continuing."
      />

      {/* Info Dialog */}
      <Button onClick={() => setShowExample('info')} variant="info">
        Info Dialog
      </Button>
      <InfoDialog
        isOpen={showExample === 'info'}
        onClose={() => setShowExample(null)}
        title="Information"
        message="Your operation completed successfully. All changes have been saved."
      />

      {/* Quick Create Dialog */}
      <Button onClick={() => setShowExample('quick')}>
        Quick Create
      </Button>
      <QuickCreateDialog
        isOpen={showExample === 'quick'}
        onClose={() => {
          setShowExample(null);
          setFormValue('');
        }}
        onSubmit={() => {
          setShowExample(null);
          setFormValue('');
        }}
        title="Quick Add"
        isValid={formValue.trim().length > 0}
      >
        <div className="space-y-2">
          <Label htmlFor="quickName">Quick Name</Label>
          <Input
            id="quickName"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Enter quick name..."
          />
        </div>
      </QuickCreateDialog>
    </div>
  );
}
