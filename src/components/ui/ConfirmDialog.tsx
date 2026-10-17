import { useState } from "react";
import { Modal } from "./Modal";
import type { SaveResult } from "../../context/personal-context";

export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => SaveResult;
}) {
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <p className="form-description">{description}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="button button-secondary"
          onClick={onClose}
          data-autofocus
        >
          Keep it
        </button>
        <button
          className="button button-danger"
          onClick={() => {
            const result = onConfirm();
            if (result.ok) onClose();
            else setError(result.message);
          }}
        >
          Delete permanently
        </button>
      </div>
    </Modal>
  );
}
