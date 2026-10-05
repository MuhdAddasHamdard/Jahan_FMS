import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate } from "../utils/format";

const RefundFields = ({ value, onChange, students, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField label="Student" htmlFor={`${idPrefix}-student`}>
      <select
        id={`${idPrefix}-student`}
        value={value.studentId}
        onChange={(event) => onChange({ ...value, studentId: event.target.value })}
        className={inputClass}
      >
        <option value="">Select student</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} ({student.admissionNo})
          </option>
        ))}
      </select>
    </FormField>

    <FormField
      label="Refund amount"
      htmlFor={`${idPrefix}-amount`}
      hint="Cannot exceed what the student has paid"
    >
      <input
        id={`${idPrefix}-amount`}
        type="number"
        min="0"
        step="0.01"
        value={value.amount}
        onChange={(event) => onChange({ ...value, amount: event.target.value })}
        placeholder="e.g. 2000"
        className={inputClass}
      />
    </FormField>

    <FormField label="Reason" htmlFor={`${idPrefix}-reason`} hint="Optional">
      <input
        id={`${idPrefix}-reason`}
        type="text"
        value={value.reason}
        onChange={(event) => onChange({ ...value, reason: event.target.value })}
        placeholder="e.g. Class cancelled"
        className={inputClass}
      />
    </FormField>

    <FormField
      label="Refund date"
      htmlFor={`${idPrefix}-date`}
      hint="Leave empty to use today"
    >
      <input
        id={`${idPrefix}-date`}
        type="date"
        value={value.refundedOn}
        onChange={(event) => onChange({ ...value, refundedOn: event.target.value })}
        className={inputClass}
      />
    </FormField>
  </div>
);

const emptyRefund = { studentId: "", amount: "", reason: "", refundedOn: "" };

const toDateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const RefundRow = ({ refund, onEdit, onDelete }) => (
  <li className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-900">
        {refund.student ? refund.student.name : "—"}
      </p>
      <p className="text-xs text-slate-500">
        {formatDate(refund.refundedOn)}
        {refund.reason ? ` · ${refund.reason}` : ""}
      </p>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-red-600">
        {formatNumber(refund.amount)}
      </span>
      <button
        onClick={() => onEdit(refund)}
        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(refund)}
        className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  </li>
);

const RefundsPage = () => {
  const toast = useToast();
  const [refunds, setRefunds] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(emptyRefund);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyRefund);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.get("/refunds"), api.get("/students")])
      .then(([refundList, studentList]) => {
        if (!cancelled) {
          setRefunds(refundList);
          setStudents(studentList);
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

  const refresh = async () => {
    const data = await api.get("/refunds");
    setRefunds(data);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.studentId) {
      setError("Select a student");
      return;
    }
    if (!draft.amount || Number(draft.amount) <= 0) {
      setError("Refund amount must be greater than zero");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/refunds", {
        studentId: Number(draft.studentId),
        amount: Number(draft.amount),
        reason: draft.reason.trim() || null,
        refundedOn: draft.refundedOn || undefined,
      });
      setDraft(emptyRefund);
      toast.success("Refund issued");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (refund) => {
    setEditing(refund);
    setEditValue({
      studentId: refund.student ? String(refund.student.id) : "",
      amount: String(refund.amount),
      reason: refund.reason ?? "",
      refundedOn: toDateInput(refund.refundedOn),
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editValue.amount || Number(editValue.amount) <= 0) {
      toast.error("Refund amount must be greater than zero");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/refunds/${editing.id}`, {
        amount: Number(editValue.amount),
        reason: editValue.reason.trim() || null,
        refundedOn: editValue.refundedOn || undefined,
      });
      setEditing(null);
      toast.success("Refund updated");
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
      await api.delete(`/refunds/${deleting.id}`);
      toast.success("Refund deleted");
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
        title="Refunds"
        description="Issue refunds to students. Amounts are subtracted from fee income in reports."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Issue a refund</h2>
        <RefundFields
          value={draft}
          onChange={setDraft}
          students={students}
          idPrefix="refund-create"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Processing..." : "Issue refund"}
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
      ) : refunds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No refunds yet.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {refunds.map((refund) => (
            <RefundRow
              key={refund.id}
              refund={refund}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit refund"
        description={
          editing && editing.student ? `For ${editing.student.name}` : undefined
        }
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
              form="refund-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="refund-edit-form" onSubmit={handleUpdate}>
          <RefundFields
            value={editValue}
            onChange={setEditValue}
            students={students}
            idPrefix="refund-edit"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete refund"
        message={
          deleting
            ? `This refund of ${formatNumber(deleting.amount)} will be removed and the amount will be added back to fee income.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default RefundsPage;
