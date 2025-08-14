import React from "react";

const Modal = ({
  isOpen,
  onClose,
  // imageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card p-4 rounded-lg shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl font-bold"
        >
          ×
        </button>
        {/* <img
          src="/notfound.jpg"
          alt="Preview"
          className="max-w-full max-h-[80vh] rounded"
        /> */}

        {/* <object
          className="pdf"
          data="/Resume_Builder_1740058265274.pdf"
          width="800"
          height="500"
        >
          {" "}
        </object> */}
      </div>
    </div>
  );
};

export default Modal;
