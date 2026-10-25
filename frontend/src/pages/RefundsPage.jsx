import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate } from "../utils/format";

const emptyRefund = {
  studentId: "",
  receiptId: "",
  amount: "",
  reason: "",
  refundedOn: "",
};

const toDateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const RefundFields = ({
  value,
  onChange,
  students,
  receipts,
  editingReceiptId,
  editingAmount,
  idPrefix,
}) => {
  const studentReceipts = useMemo(() => {
    if (!value.studentId) return [];
    return receipts.filter(
      (receipt) => String(receipt.student?.id) === String(value.studentId),
    );
  }, [receipts, value.studentId]);

  const selectedReceipt = studentReceipts.find(
    (receipt) => String(receipt.id) === String(value.receiptId),
  );

  const remainingFor = (receipt) => {
    const alreadyRefunded =
      String(receipt.id) === String(editingReceiptId)
        ? Number(editingAmount) || 0
        : 0;
    return Math.max(0, receipt.amount - receipt.refundedAmount + alreadyRefunded);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Student" htmlFor={`${idPrefix}-student`}>
        <select
          id={`${idPrefix}-student`}
          value={value.studentId}
          onChange={(event) =>
            onChange({ ...value, studentId: event.target.value, receiptId: "" })
          }
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
        label="Receipt (optional)"
        htmlFor={`${idPrefix}-receipt`}
        hint={
          selectedReceipt
            ? `Remaining on this receipt: ${formatNumber(remainingFor(selectedReceipt))}`
            : "Link the refund to a receipt so it is tagged as refunded"
        }
      >
        <select
          id={`${idPrefix}-receipt`}
          value={value.receiptId}
          onChange={(event) => onChange({ ...value, receiptId: event.target.value })}
          disabled={!value.studentId}
          className={`${inputClass} ${
            !value.studentId ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
          }`}
        >
          <option value="">No specific receipt</option>
          {studentReceipts.map((receipt) => (
            <option key={receipt.id} value={receipt.id}>
              {receipt.number} · {formatNumber(receipt.amount)} · remaining{" "}
              {formatNumber(remainingFor(receipt))}
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
};

const RefundsPage = () => {
  const toast = useToast();
  const [refunds, setRefunds] = useState([]);
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyRefund);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyRefund);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/refunds"),
      api.get("/students"),
      api.get("/fees/receipts").catch(() => []),
    ])
      .then(([refundList, studentList, receiptList]) => {
        if (!cancelled) {
          setRefunds(refundList);
          setStudents(studentList);
          setReceipts(receiptList ?? []);
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
    const [refundList, receiptList] = await Promise.all([
      api.get("/refunds"),
      api.get("/fees/receipts").catch(() => []),
    ]);
    setRefunds(refundList);
    setReceipts(receiptList ?? []);
  };

  const openCreate = () => {
    setDraft(emptyRefund);
    setError("");
    setCreating(true);
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
        receiptId: draft.receiptId ? Number(draft.receiptId) : null,
        amount: Number(draft.amount),
        reason: draft.reason.trim() || null,
        refundedOn: draft.refundedOn || undefined,
      });
      setCreating(false);
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
      receiptId: refund.receipt ? String(refund.receipt.id) : "",
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
        receiptId: editValue.receiptId ? Number(editValue.receiptId) : null,
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

  const columns = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (refund) => refund.student?.name ?? "",
      render: (refund) => (
        <span className="font-medium text-slate-900">
          {refund.student ? refund.student.name : "—"}
        </span>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      sortable: true,
      sortValue: (refund) => refund.receipt?.number ?? "",
      render: (refund) =>
        refund.receipt ? (
          <span className="font-medium text-teal-700">{refund.receipt.number}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (refund) => (
        <span className="text-slate-500">{refund.reason || "—"}</span>
      ),
    },
    {
      key: "refundedOn",
      header: "Date",
      sortable: true,
      sortValue: (refund) =>
        refund.refundedOn ? new Date(refund.refundedOn).getTime() : 0,
      render: (refund) => (
        <span className="text-slate-500">{formatDate(refund.refundedOn)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (refund) => Number(refund.amount),
      render: (refund) => (
        <span className="font-semibold text-red-600">
          {formatNumber(refund.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Issue refunds to students. Amounts are subtracted from fee income in reports."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All refunds"
        count={refunds.length}
        loading={loading}
        rows={refunds}
        columns={columns}
        searchPlaceholder="Search refunds..."
        searchValue={(refund) =>
          [refund.student?.name, refund.student?.admissionNo, refund.reason, refund.receipt?.number]
            .filter(Boolean)
            .join(" ")
        }
        defaultSort={{ key: "refundedOn", direction: "desc" }}
        addButton={{ label: "Issue refund", onClick: openCreate }}
        emptyMessage="No refunds yet."
        rowActions={(refund) => [
          { label: "Edit", icon: "edit", onClick: () => openEdit(refund) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting(refund),
          },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Issue a refund"
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
              form="refund-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Processing..." : "Issue refund"}
            </button>
          </>
        }
      >
        <form id="refund-create-form" onSubmit={handleCreate} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          <RefundFields
            value={draft}
            onChange={setDraft}
            students={students}
            receipts={receipts}
            idPrefix="refund-create"
          />
        </form>
      </Modal>

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
            receipts={receipts}
            editingReceiptId={editing?.receipt?.id}
            editingAmount={editing?.amount}
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
