import React from 'react';
import Dialog from './Dialog';
import Button from './Button';

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

/**
 * Destructive/confirm dialog. Now built on the shared <Dialog> primitive, so it
 * has a focus trap, Escape-to-close and scroll-lock (the old hand-rolled portal
 * had none), and uses the shared <Button> for consistent affordances.
 */
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
}) => (
  <Dialog open={isOpen} onClose={onCancel} title={title}>
    <p className="text-sm text-white/70">{message}</p>
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
      {secondaryLabel && onSecondary && (
        <Button variant="secondary" size="sm" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      )}
      <Button variant={isDanger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </Dialog>
);

export default ConfirmationDialog;
