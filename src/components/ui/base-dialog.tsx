"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogContentProps,
} from "./dialog";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface BaseDialogProps extends Omit<DialogContentProps, "children"> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  
  // Footer configuration
  showFooter?: boolean;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "warning" | "info";
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "warning" | "info";
  };
  
  // Additional footer content
  footerContent?: React.ReactNode;
  
  // Custom styling
  headerClassName?: string;
  footerClassName?: string;
  
  // Accessibility
  "aria-describedby"?: string;
}

export const BaseDialog = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  BaseDialogProps
>(({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showFooter = true,
  primaryAction,
  secondaryAction,
  footerContent,
  headerClassName,
  footerClassName,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}, ref) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        ref={ref}
        size={size}
        className={className}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        <DialogHeader className={cn("flex-shrink-0", headerClassName)}>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 py-4">
          {children}
        </div>
        
        {showFooter && (primaryAction || secondaryAction || footerContent) && (
          <DialogFooter className={cn("flex-shrink-0", footerClassName)}>
            {footerContent}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
              {secondaryAction && (
                <Button
                  variant={secondaryAction.variant || "outline"}
                  onClick={secondaryAction.onClick}
                  className="w-full sm:w-auto"
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || "default"}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className="w-full sm:w-auto"
                >
                  {primaryAction.loading ? "Loading..." : primaryAction.label}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
});

BaseDialog.displayName = "BaseDialog";

// Specialized dialog variants for common use cases

export interface ConfirmationDialogProps extends Omit<BaseDialogProps, "primaryAction" | "secondaryAction"> {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "success" | "warning";
  isLoading?: boolean;
}

export const ConfirmationDialog = React.forwardRef<
  React.ElementRef<typeof BaseDialog>,
  ConfirmationDialogProps
>(({
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  isLoading = false,
  ...props
}, ref) => {
  return (
    <BaseDialog
      ref={ref}
      size="sm"
      primaryAction={{
        label: confirmLabel,
        onClick: onConfirm,
        variant: confirmVariant,
        loading: isLoading,
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: onCancel || props.onClose,
        variant: "outline",
      }}
      {...props}
    />
  );
});

ConfirmationDialog.displayName = "ConfirmationDialog";

export interface FormDialogProps extends Omit<BaseDialogProps, "primaryAction" | "secondaryAction"> {
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isValid?: boolean;
}

export const FormDialog = React.forwardRef<
  React.ElementRef<typeof BaseDialog>,
  FormDialogProps
>(({
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  isValid = true,
  ...props
}, ref) => {
  return (
    <BaseDialog
      ref={ref}
      primaryAction={{
        label: submitLabel,
        onClick: onSubmit,
        variant: "success",
        loading: isSubmitting,
        disabled: !isValid || isSubmitting,
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: onCancel || props.onClose,
        variant: "outline",
      }}
      {...props}
    />
  );
});

FormDialog.displayName = "FormDialog";