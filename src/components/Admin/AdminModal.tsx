import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

const AdminModal: React.FC<AdminModalProps> = ({
  open,
  title,
  onClose,
  maxWidthClass = 'max-w-2xl',
  children,
}) => {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${maxWidthClass} max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-[linear-gradient(160deg,rgba(17,23,58,0.96),rgba(10,14,36,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default AdminModal;
