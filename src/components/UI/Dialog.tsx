import React from 'react';
import { Dialog as HDialog, DialogPanel, DialogTitle } from '@headlessui/react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes for the panel (e.g. a wider max-width). */
  className?: string;
}

/**
 * The one modal primitive. Built on @headlessui/react so it gets a real focus
 * trap, Escape-to-close, scroll-lock, aria-modal, and focus restore for free -
 * which none of the ~22 hand-rolled modals had. Use this instead of building a
 * portal + backdrop by hand.
 */
const Dialog: React.FC<DialogProps> = ({ open, onClose, title, children, className = '' }) => (
  <HDialog open={open} onClose={onClose} className="relative z-[1000]">
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel
        className={`glass-thick w-full max-w-md rounded-2xl p-6 text-white shadow-elev-4 ${className}`}
      >
        {title && <DialogTitle className="mb-2 text-lg font-semibold">{title}</DialogTitle>}
        {children}
      </DialogPanel>
    </div>
  </HDialog>
);

export default Dialog;
