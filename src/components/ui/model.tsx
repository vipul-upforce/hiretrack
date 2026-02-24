import React from 'react';

function Modal({
  isOpen,
  onClose,
  // imageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative rounded-lg bg-card p-4 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 text-xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Modal;
