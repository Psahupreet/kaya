import React, { useEffect } from 'react';

export default function ImagePreviewModal({ imageUrl, alt = 'Preview image', onClose }) {
  useEffect(() => {
    if (!imageUrl) return undefined;

    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white"
      >
        Close
      </button>

      <img
        src={imageUrl}
        alt={alt}
        className="max-h-[92vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
