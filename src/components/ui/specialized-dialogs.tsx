'use client';

import * as React from 'react';
import { Trash2, AlertTriangle, Info } from 'lucide-react';
import { BaseDialog, ConfirmationDialog, FormDialog } from './base-dialog';

// Delete Confirmation Dialog
export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  isLoading?: boolean;
  additionalWarning?: string;
}

export const DeleteDialog = React.forwardRef<
  React.ElementRef<typeof ConfirmationDialog>,
  DeleteDialogProps
>(({
  itemName,
  itemType = 'item',
  additionalWarning,
  ...props
}, ref) => (
  <ConfirmationDialog
    ref={ref}
    size="sm"
    title={`Delete ${itemType}`}
    description={
        `Are you sure you want to delete "${itemName}"? This action cannot be undone.${
          additionalWarning ? ` ${additionalWarning}` : ''
        }`
      }
    confirmLabel="Delete"
    confirmVariant="destructive"
    {...props}
  >
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20">
        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
    </div>
  </ConfirmationDialog>
));

DeleteDialog.displayName = 'DeleteDialog';

// Warning Dialog
export interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export const WarningDialog = React.forwardRef<
  React.ElementRef<typeof ConfirmationDialog>,
  WarningDialogProps
>(({
  title,
  message,
  confirmLabel = 'Continue',
  ...props
}, ref) => (
  <ConfirmationDialog
    ref={ref}
    size="sm"
    title={title}
    description={message}
    confirmLabel={confirmLabel}
    confirmVariant="warning"
    {...props}
  >
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20">
        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
    </div>
  </ConfirmationDialog>
));

WarningDialog.displayName = 'WarningDialog';

// Info Dialog
export interface InfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export const InfoDialog = React.forwardRef<
  React.ElementRef<typeof BaseDialog>,
  InfoDialogProps
>(({
  title,
  message,
  confirmLabel = 'OK',
  ...props
}, ref) => (
  <BaseDialog
    ref={ref}
    size="sm"
    title={title}
    description={message}
    primaryAction={{
      label: confirmLabel,
      onClick: props.onClose,
      variant: 'info',
    }}
    showFooter
    {...props}
  >
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
        <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  </BaseDialog>
));

InfoDialog.displayName = 'InfoDialog';

// Quick Create Dialog (for simple forms)
export interface QuickCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: React.ReactNode;
  isSubmitting?: boolean;
  isValid?: boolean;
  submitLabel?: string;
}

export const QuickCreateDialog = React.forwardRef<
  React.ElementRef<typeof FormDialog>,
  QuickCreateDialogProps
>(({
  title,
  submitLabel = 'Create',
  ...props
}, ref) => (
  <FormDialog
    ref={ref}
    size="sm"
    title={title}
    submitLabel={submitLabel}
    {...props}
  />
));

QuickCreateDialog.displayName = 'QuickCreateDialog';
