// src/components/Modal.js
import React, { useRef } from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef();

  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white p-6 rounded shadow-lg relative max-w-full w-full sm:max-w-lg max-h-full overflow-auto"
      >
        <button
          className="absolute top-2 right-2 bg-red-500 text-white text-2xl rounded-full h-8 w-8 flex items-center justify-center focus:outline-none"
          onClick={onClose}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
