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
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-2 sm:p-4"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded shadow-lg relative w-full mx-2 
                   max-h-[90vh] overflow-y-auto
                   p-4 sm:p-6 
                   sm:max-w-lg 
                   sm:mx-auto"
      >
        <button
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full 
                     h-7 w-7 sm:h-8 sm:w-8 
                     text-xl sm:text-2xl
                     flex items-center justify-center focus:outline-none"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
