import Modal from "./Modal";
import Icon from "./Icons";

const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            tone === "danger" ? "soft-danger" : "soft-brand"
          }`}
        >
          <Icon name={tone === "danger" ? "warning" : "info"} className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-[color:var(--text-muted)]">
          {message}
        </p>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
