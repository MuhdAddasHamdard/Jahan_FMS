import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber } from "../utils/format";

const PERIODS = ["MONTHLY", "SESSION", "ONE_TIME"];

const PERIOD_HINTS = {
  MONTHLY: "Charged every month",
  SESSION: "Charged once per academic session",
  ONE_TIME: "Charged a single time (e.g. admission)",
};

const FeeTypeFields = ({ value, onChange, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    <FormField
      label="Fee name"
      htmlFor={`${idPrefix}-name`}
      hint="How this fee appears on plans and receipts"
    >
      <input
        id={`${idPrefix}-name`}
        type="text"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="e.g. Tuition fee"
        className={inputClass}
      />
    </FormField>
    <FormField label="Default amount" htmlFor={`${idPrefix}-amount`}>
      <input
        id={`${idPrefix}-amount`}
        type="number"
        min="0"
        step="0.01"
        value={value.amount}
        onChange={(event) => onChange({ ...value, amount: event.target.value })}
        placeholder="e.g. 5000"
        className={inputClass}
      />
    </FormField>
    <FormField
      label="Billing period"
      htmlFor={`${idPrefix}-period`}
      hint={PERIOD_HINTS[value.period]}
    >
      <select
        id={`${idPrefix}-period`}
        value={value.period}
        onChange={(event) => onChange({ ...value, period: event.target.value })}
        className={inputClass}
      >
        {PERIODS.map((periodOption) => (
          <option key={periodOption} value={periodOption}>
            {periodOption.replace("_", " ")}
          </option>
        ))}
      </select>
    </FormField>
  </div>
);

const validate = (value) => {
  if (!value.name.trim()) {
    return "Fee name is required";
  }
  if (!value.amount || Number(value.amount) <= 0) {
    return "Amount must be greater than zero";
  }
  return "";
};

const FeeTypeRow = ({ feeType, onEdit, onDelete }) => (
  <li className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-900">{feeType.name}</p>
      <p className="text-xs text-slate-500">{feeType.period.replace("_", " ")}</p>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-900">
        {formatNumber(feeType.amount)}
      </span>
      <button
        onClick={() => onEdit(feeType)}
        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(feeType)}
        className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  </li>
);

const FeeTypesPage = () => {
  const toast = useToast();
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({ name: "", amount: "", period: "MONTHLY" });
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState({ name: "", amount: "", period: "MONTHLY" });
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = async () => {
    const data = await api.get("/fees/types");
    setFeeTypes(data);
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get("/fees/types")
      .then((data) => {
        if (!cancelled) {
          setFeeTypes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    const message = validate(draft);
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/fees/types", {
        name: draft.name.trim(),
        amount: Number(draft.amount),
        period: draft.period,
      });
      setDraft({ name: "", amount: "", period: "MONTHLY" });
      toast.success("Fee type added");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (feeType) => {
    setEditing(feeType);
    setEditValue({
      name: feeType.name,
      amount: String(feeType.amount),
      period: feeType.period,
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const message = validate(editValue);
    if (message) {
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/fees/types/${editing.id}`, {
        name: editValue.name.trim(),
        amount: Number(editValue.amount),
        period: editValue.period,
      });
      setEditing(null);
      toast.success("Fee type updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/fees/types/${deleting.id}`);
      toast.success(`"${deleting.name}" deleted`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Fee Types"
        description="Define the fees you charge, like tuition, admission and session charges. Fee types are then assigned to students through fee plans."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add a fee type</h2>
        <FeeTypeFields value={draft} onChange={setDraft} idPrefix="fee-type-create" />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add fee type"}
        </button>
      </form>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : feeTypes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No fee types yet.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {feeTypes.map((feeType) => (
            <FeeTypeRow
              key={feeType.id}
              feeType={feeType}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit fee type"
        description={editing ? `Editing "${editing.name}"` : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="fee-type-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="fee-type-edit-form" onSubmit={handleUpdate}>
          <FeeTypeFields value={editValue} onChange={setEditValue} idPrefix="fee-type-edit" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete fee type"
        message={
          deleting
            ? `"${deleting.name}" will be removed. Fee types already used by a fee plan cannot be deleted.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default FeeTypesPage;
