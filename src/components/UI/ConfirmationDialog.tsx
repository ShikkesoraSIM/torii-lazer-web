import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
  isDanger?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  secondaryLabel,
  onConfirm,
  onCancel,
  onSecondary,
  isDanger = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-4"
      style={{ zIndex: 1000001 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-card p-5 shadow-2xl">
        <h4 className="text-base font-semibold text-white">{title}</h4>
        <p className="mt-2 text-sm text-gray-300">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/15 bg-slate-700/30 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30"
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-lg border border-white/15 bg-slate-700/30 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-osu-pink hover:bg-osu-pink/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationDialog;
