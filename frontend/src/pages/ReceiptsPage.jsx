import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate, formatDateTime } from "../utils/format";

const emptyCollect = {
  studentId: "",
  installmentId: "",
  amount: "",
  paidAt: "",
  notes: "",
};

const REFUND_BADGE = {
  REFUNDED: "bg-red-50 text-red-700",
  PARTIAL: "bg-amber-50 text-amber-700",
};

const RefundTag = ({ receipt }) => {
  if (!receipt.refundStatus || receipt.refundStatus === "NONE") {
    return <span className="text-xs text-slate-300">—</span>;
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${REFUND_BADGE[receipt.refundStatus] ?? "bg-slate-100 text-slate-600"}`}
      >
        {receipt.refundStatus === "REFUNDED" ? "Refunded" : "Partially refunded"}
      </span>
      <span className="text-[11px] text-slate-400">
        {formatNumber(receipt.refundedAmount)}
      </span>
    </span>
  );
};

const ReceiptsPage = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [collect, setCollect] = useState(emptyCollect);
  const [collectPlans, setCollectPlans] = useState([]);
  const [loadingCollectPlans, setLoadingCollectPlans] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCollect);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const refresh = async () => {
    const data = await api.get("/fees/receipts");
    setReceipts(data);
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/fees/receipts"),
      api.get("/students").catch(() => []),
    ])
      .then(([receiptData, studentData]) => {
        if (!cancelled) {
          setReceipts(receiptData);
          setStudents(studentData ?? []);
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

  const loadPlans = async (studentId, setter, setBusy) => {
    if (!studentId) {
      setter([]);
      return;
    }
    setBusy(true);
    try {
      setter(await api.get(`/fees/students/${studentId}/installments`));
    } catch {
      setter([]);
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setCollect(emptyCollect);
    setCollectPlans([]);
    setError("");
    setCreating(true);
  };

  const openCollectStudent = (studentId) => {
    setCollect((current) => ({ ...current, studentId, installmentId: "", amount: "" }));
    loadPlans(studentId, setCollectPlans, setLoadingCollectPlans);
  };

  const collectOptions = collectPlans.flatMap((plan) =>
    plan.installments
      .filter((installment) => installment.remaining > 0)
      .map((installment) => ({
        id: installment.id,
        label: `${plan.feeType.name} · due ${formatDate(installment.dueDate) || "—"}`,
        remaining: installment.remaining,
      })),
  );

  const handleCollect = async (event) => {
    event.preventDefault();
    if (!collect.installmentId) {
      setError("Choose the installment this payment is for");
      return;
    }
    const amount = Number(collect.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post("/fees/payments", {
        installmentId: Number(collect.installmentId),
        amount,
        date: collect.paidAt || undefined,
        notes: collect.notes.trim() || undefined,
      });
      setCreating(false);
      setCollect(emptyCollect);
      toast.success("Payment collected and receipt created");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (receipt) => {
    setEditing(receipt);
    setForm({
      studentId: receipt.student ? String(receipt.student.id) : "",
      installmentId: receipt.installmentId ? String(receipt.installmentId) : "",
      amount: String(receipt.amount ?? ""),
      paidAt: receipt.paidAt ? String(receipt.paidAt).slice(0, 10) : "",
      notes: receipt.notes ?? "",
    });
    setPlans([]);
    if (receipt.student) {
      loadPlans(receipt.student.id, setPlans, setLoadingPlans);
    }
  };

  const handleStudentChange = (event) => {
    const studentId = event.target.value;
    setForm((current) => ({ ...current, studentId, installmentId: "" }));
    loadPlans(studentId, setPlans, setLoadingPlans);
  };

  const installmentOptions = plans.flatMap((plan) =>
    plan.installments.map((installment) => {
      const isCurrent = installment.id === editing?.installmentId;
      const remaining =
        installment.remaining + (isCurrent ? Number(editing?.amount ?? 0) : 0);
      return {
        id: installment.id,
        label: `${plan.feeType.name} · due ${formatDate(installment.dueDate) || "—"}`,
        remaining,
      };
    }),
  );

  const handleSave = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount,
        paidAt: form.paidAt || undefined,
        notes: form.notes.trim(),
      };
      if (form.installmentId) {
        payload.installmentId = Number(form.installmentId);
      }

      await api.patch(`/fees/receipts/${editing.id}`, payload);
      setEditing(null);
      toast.success("Receipt updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "number",
      header: "Receipt",
      sortable: true,
      render: (receipt) => (
        <span className="font-medium text-teal-700">{receipt.number}</span>
      ),
    },
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (receipt) => receipt.student?.name ?? "",
      render: (receipt) => (
        <span className="text-slate-900">{receipt.student?.name ?? "—"}</span>
      ),
    },
    {
      key: "feeType",
      header: "Fee type",
      sortable: true,
      sortValue: (receipt) => receipt.feeType?.name ?? "",
      render: (receipt) => (
        <span className="text-slate-600">
          {receipt.feeType?.name ?? "—"}
          {receipt.notes ? (
            <span className="mt-1 block text-xs text-slate-400">
              Note: {receipt.notes}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "refundStatus",
      header: "Refund",
      sortable: true,
      sortValue: (receipt) => receipt.refundedAmount ?? 0,
      render: (receipt) => <RefundTag receipt={receipt} />,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (receipt) => Number(receipt.amount),
      render: (receipt) => (
        <span className="font-semibold text-slate-900">
          {formatNumber(receipt.amount)}
        </span>
      ),
    },
    {
      key: "paidAt",
      header: "Paid at",
      align: "right",
      sortable: true,
      sortValue: (receipt) =>
        receipt.paidAt ? new Date(receipt.paidAt).getTime() : 0,
      render: (receipt) => (
        <span className="text-slate-500">{formatDateTime(receipt.paidAt)}</span>
      ),
    },
  ];

  const collectSelected = collectOptions.find(
    (option) => String(option.id) === collect.installmentId,
  );

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Payment receipts issued against fee installments. Collect new payments or correct existing receipts."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All receipts"
        count={receipts.length}
        loading={loading}
        rows={receipts}
        columns={columns}
        searchPlaceholder="Search receipts..."
        searchValue={(receipt) =>
          [receipt.number, receipt.student?.name, receipt.feeType?.name, receipt.notes]
            .filter(Boolean)
            .join(" ")
        }
        defaultSort={{ key: "paidAt", direction: "desc" }}
        filters={[
          {
            key: "refund",
            label: "Filter by refund status",
            options: [
              { value: "", label: "All receipts" },
              { value: "REFUNDED", label: "Fully refunded" },
              { value: "PARTIAL", label: "Partially refunded" },
              { value: "NONE", label: "Not refunded" },
            ],
            value: (receipt) => receipt.refundStatus ?? "NONE",
          },
        ]}
        addButton={{ label: "Collect payment", onClick: openCreate }}
        emptyMessage="No receipts yet."
        rowActions={(receipt) => [
          { label: "Edit", icon: "edit", onClick: () => openEdit(receipt) },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Collect a payment"
        description="Collecting a payment issues a receipt for the chosen installment."
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
              form="receipt-create-form"
              disabled={saving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Collect payment"}
            </button>
          </>
        }
      >
        <form id="receipt-create-form" onSubmit={handleCollect} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          <FormField label="Student" htmlFor="receipt-create-student">
            <select
              id="receipt-create-student"
              value={collect.studentId}
              onChange={(event) => openCollectStudent(event.target.value)}
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
            label="Installment"
            htmlFor="receipt-create-installment"
            hint={
              collectSelected
                ? `Remaining: ${formatNumber(collectSelected.remaining)}`
                : "Pick the installment this payment belongs to"
            }
          >
            <select
              id="receipt-create-installment"
              value={collect.installmentId}
              onChange={(event) => {
                const value = event.target.value;
                const option = collectOptions.find(
                  (item) => String(item.id) === value,
                );
                setCollect((current) => ({
                  ...current,
                  installmentId: value,
                  amount: option ? String(option.remaining) : current.amount,
                }));
              }}
              disabled={!collect.studentId || loadingCollectPlans}
              className={`${inputClass} ${
                !collect.studentId || loadingCollectPlans
                  ? "cursor-not-allowed bg-slate-50 text-slate-400"
                  : ""
              }`}
            >
              <option value="">
                {loadingCollectPlans ? "Loading installments..." : "Select an installment"}
              </option>
              {collectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} · remaining {formatNumber(option.remaining)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Amount" htmlFor="receipt-create-amount">
              <input
                id="receipt-create-amount"
                type="number"
                min="0"
                step="0.01"
                value={collect.amount}
                onChange={(event) =>
                  setCollect((current) => ({ ...current, amount: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Payment date" htmlFor="receipt-create-date">
              <input
                id="receipt-create-date"
                type="date"
                value={collect.paidAt}
                onChange={(event) =>
                  setCollect((current) => ({ ...current, paidAt: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="receipt-create-notes" hint="Optional">
            <textarea
              id="receipt-create-notes"
              rows={2}
              value={collect.notes}
              onChange={(event) =>
                setCollect((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="e.g. Paid by cheque #1234"
              className={inputClass}
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit receipt"
        description={editing ? `Receipt ${editing.number}` : undefined}
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
              form="receipt-edit-form"
              disabled={saving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="receipt-edit-form" onSubmit={handleSave} className="space-y-3">
          <FormField
            label="Student"
            htmlFor="receipt-student"
            hint="Changing the student lets you move this receipt to another student's installment"
          >
            <select
              id="receipt-student"
              value={form.studentId}
              onChange={handleStudentChange}
              className={inputClass}
            >
              <option value="">No student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.admissionNo})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Installment"
            htmlFor="receipt-installment"
            hint="Pick the installment this payment belongs to"
          >
            <select
              id="receipt-installment"
              value={form.installmentId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  installmentId: event.target.value,
                }))
              }
              disabled={!form.studentId || loadingPlans}
              className={`${inputClass} ${
                !form.studentId || loadingPlans
                  ? "cursor-not-allowed bg-slate-50 text-slate-400"
                  : ""
              }`}
            >
              <option value="">
                {loadingPlans ? "Loading installments..." : "Select an installment"}
              </option>
              {installmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} · remaining {formatNumber(option.remaining)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Amount" htmlFor="receipt-amount">
              <input
                id="receipt-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Paid at" htmlFor="receipt-paid-at">
              <input
                id="receipt-paid-at"
                type="date"
                value={form.paidAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidAt: event.target.value }))
                }
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField
            label="Notes"
            htmlFor="receipt-notes"
            hint="Visible to staff reviewing this receipt"
          >
            <textarea
              id="receipt-notes"
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="e.g. Paid by cheque #1234"
              className={inputClass}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default ReceiptsPage;
