import React from 'react';
import { Dialog as HDialog, DialogPanel, DialogTitle } from '@headlessui/react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode;
  /** Extra classes for the panel (e.g. a wider max-width). */
  className?: string;
}

const Dialog: React.FC<DialogProps> = ({ open, onClose, title, ariaLabel, children, className = '' }) => (
  <HDialog
    open={open}
    onClose={onClose}
    aria-label={!title ? (ariaLabel || 'Dialog') : undefined}
    className="relative z-[1000]"
  >
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
    <div className="fixed inset-0 overflow-y-auto p-4 flex items-center justify-center">
      <DialogPanel
        className={`glass-thick my-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 text-white shadow-elev-4 ${className}`}
      >
        {title && <DialogTitle className="mb-2 text-lg font-semibold">{title}</DialogTitle>}
        {children}
      </DialogPanel>
    </div>
  </HDialog>
);

export default Dialog;
