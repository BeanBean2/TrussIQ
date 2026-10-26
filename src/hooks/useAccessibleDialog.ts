import { useCallback, useEffect, useRef } from 'react';

/** Adds initial focus, Escape to close, Tab trapping, and focus restoration to a dialog. */
export function useAccessibleDialog(onClose: () => void) {
  const dialogElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const setDialogRef = useCallback((node: HTMLElement | null) => {
    dialogElementRef.current = node;
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogElementRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);

    const initialFocus = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? getFocusable()[0] ?? dialog;
    if (initialFocus === dialog && !dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
    initialFocus.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return setDialogRef;
}
