'use client';

import ConfirmationDialog from './Dialogs/ConfirmationDialog';

interface ArchiveConfirmDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  action: 'archive' | 'unarchive' | null;
  count: number;
  isLoading: boolean;
  onConfirm: (action: 'archive' | 'unarchive') => void;
  onClose: () => void;
}

export function ArchiveConfirmDialog({
  isOpen,
  setIsOpen,
  action,
  count,
  isLoading,
  onConfirm,
  onClose,
}: ArchiveConfirmDialogProps) {
  if (!action) return null;
  const isRestore = action === 'unarchive';
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={isRestore ? 'Restore candidates?' : 'Archive candidates?'}
      message={
        isRestore
          ? `This will restore ${count} candidate${count === 1 ? '' : 's'}. They will be visible in the regular view again.`
          : `This will archive ${count} candidate${count === 1 ? '' : 's'}. They will be hidden from the regular view.`
      }
      onConfirm={() => onConfirm(action)}
      onCancel={onClose}
      isLoading={isLoading}
      loadingText={isRestore ? 'Restoring...' : 'Archiving...'}
      buttonName={isRestore ? 'Restore' : 'Archive'}
      className="sm:max-w-[400px]"
    />
  );
}
