import { Button, Sheet } from './ui';

/**
 * In-app confirmation. Used instead of window.confirm, which many mobile browsers and
 * installed web apps block silently (so the button appears to do nothing).
 */
export function ConfirmSheet({
  open, title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className='muted mb12'>{message}</p>
      <div className='grid2'>
        <Button variant='ghost' disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Sheet>
  );
}
