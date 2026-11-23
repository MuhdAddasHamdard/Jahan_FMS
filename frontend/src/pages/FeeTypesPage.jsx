import { useEffect, useState } from "react";
import { api } from "../api/client";
import { showMutationFeedback } from "../api/mutationFeedback";
import PageHeader from "../components/PageHeader";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber } from "../utils/format";

const PERIODS = ["MONTHLY", "SESSION", "ONE_TIME"];

const emptyFeeType = { name: "", amount: "", period: "MONTHLY" };

const FeeTypeFields = ({ value, onChange, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Fee name"
      htmlFor={`${idPrefix}-name`}
      hint="Shown on student fees and receipts"
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
    <details className="sm:col-span-2">
      <summary className="cursor-pointer text-sm font-semibold text-content">Period label (optional)</summary>
      <div className="mt-3">
        <FormField
          label="Period label"
          htmlFor={`${idPrefix}-period`}
          hint="Used to organize templates. Assign each charge from the Fees page."
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
    </details>
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

const FeeTypesPage = () => {
  const toast = useToast();
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyFeeType);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyFeeType);
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

  const openCreate = () => {
    setDraft(emptyFeeType);
    setError("");
    setCreating(true);
  };

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
      const result = await api.post("/fees/types", {
        name: draft.name.trim(),
        amount: Number(draft.amount),
        period: draft.period,
      });
      setCreating(false);
      setDraft(emptyFeeType);
      const synced = showMutationFeedback(toast, result, "Fee type added");
      if (!synced) return;
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
      const result = await api.patch(`/fees/types/${editing.id}`, {
        name: editValue.name.trim(),
        amount: Number(editValue.amount),
        period: editValue.period,
      });
      setEditing(null);
      const synced = showMutationFeedback(toast, result, "Fee type updated");
      if (!synced) return;
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
      const result = await api.delete(`/fees/types/${deleting.id}`);
      const synced = showMutationFeedback(toast, result, `"${deleting.name}" deleted`);
      setDeleting(null);
      if (!synced) return;
      await refresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Fee name",
      sortable: true,
      render: (feeType) => (
        <span className="font-medium text-slate-900">{feeType.name}</span>
      ),
    },
    {
      key: "period",
      header: "Period label",
      sortable: true,
      render: (feeType) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {feeType.period.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Default amount",
      align: "right",
      sortable: true,
      sortValue: (feeType) => Number(feeType.amount),
      render: (feeType) => (
        <span className="font-semibold text-slate-900">
          {formatNumber(feeType.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fee Settings"
        description="Manage reusable fee templates and their default amounts."
        breadcrumbs={[{ label: "Fees", to: "/fees" }, { label: "Fee Settings" }]}
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="Fee templates"
        count={feeTypes.length}
        loading={loading}
        rows={feeTypes}
        columns={columns}
        searchPlaceholder="Search fee templates..."
        searchKeys={["name", "period"]}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        filters={[
          {
            key: "period",
            label: "Filter by period",
            options: [
              { value: "", label: "All periods" },
              ...PERIODS.map((period) => ({
                value: period,
                label: period.replace("_", " "),
              })),
            ],
            value: (feeType) => feeType.period,
          },
        ]}
        addButton={{ label: "Add fee template", onClick: openCreate }}
        emptyMessage="No fee templates yet."
        rowActions={(feeType) => [
          { label: "Edit", icon: "edit", onClick: () => openEdit(feeType) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting(feeType),
          },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add fee template"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="fee-type-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add fee type"}
            </button>
          </>
        }
      >
        <form id="fee-type-create-form" onSubmit={handleCreate} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          <FeeTypeFields value={draft} onChange={setDraft} idPrefix="fee-type-create" />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit fee template"
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
        title="Delete fee template"
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
