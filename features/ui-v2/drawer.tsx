"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";

export type DrawerProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
};

export function Drawer({
  children,
  closeLabel = "Close",
  description,
  onOpenChange,
  open,
  title,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const requestClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      requestClose();
    },
    [requestClose]
  );

  const handleClose = useCallback(() => {
    if (open) {
      requestClose();
    }
  }, [open, requestClose]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="v2-drawer"
      onCancel={handleCancel}
      onClose={handleClose}
      ref={dialogRef}
    >
      <div className="v2-drawer__header">
        <div>
          <h2 className="v2-drawer__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="v2-drawer__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <button
          className="v2-drawer__close"
          onClick={requestClose}
          type="button"
        >
          {closeLabel}
        </button>
      </div>
      <div className="v2-drawer__body">{children}</div>
    </dialog>
  );
}
