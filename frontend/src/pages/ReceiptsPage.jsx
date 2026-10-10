import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate, formatDateTime } from "../utils/format";

const emptyForm = {
  studentId: "",
  installmentId: "",
  amount: "",
  paidAt: "",
  notes: "",
};

const ReceiptsPage = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const loadPlans = async (studentId) => {
    if (!studentId) {
      setPlans([]);
      return;
    }
    setLoadingPlans(true);
    try {
      setPlans(await api.get(`/fees/students/${studentId}/installments`));
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
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
      loadPlans(receipt.student.id);
    }
  };

  const handleStudentChange = (event) => {
    const studentId = event.target.value;
    setForm((current) => ({ ...current, studentId, installmentId: "" }));
    loadPlans(studentId);
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

  const selectedOption = installmentOptions.find(
    (option) => String(option.id) === form.installmentId,
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

      const updated = await api.patch(`/fees/receipts/${editing.id}`, payload);
      setReceipts((current) =>
        current.map((receipt) =>
          receipt.id === updated.id ? { ...receipt, ...updated } : receipt,
        ),
      );
      setEditing(null);
      toast.success("Receipt updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Payment receipts issued against fee installments. You can correct the student, installment, amount, date and notes."
      />

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No receipts yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Fee type</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Paid at</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-teal-700">
                    {receipt.number}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {receipt.student ? receipt.student.name : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {receipt.feeType ? receipt.feeType.name : "—"}
                    {receipt.notes ? (
                      <span className="mt-1 block text-xs text-slate-400">
                        Note: {receipt.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatNumber(receipt.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatDateTime(receipt.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(receipt)}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            hint={
              selectedOption
                ? `Remaining before this receipt: ${formatNumber(selectedOption.remaining)}`
                : "Pick the installment this payment belongs to"
            }
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
