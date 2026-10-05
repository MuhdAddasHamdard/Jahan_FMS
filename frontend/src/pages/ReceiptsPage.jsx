import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDateTime } from "../utils/format";

const ReceiptsPage = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/fees/receipts")
      .then((data) => {
        if (!cancelled) {
          setReceipts(data);
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

  const openEdit = (receipt) => {
    setEditing(receipt);
    setNotes(receipt.notes ?? "");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch(`/fees/receipts/${editing.id}`, {
        notes: notes.trim(),
      });
      setReceipts((current) =>
        current.map((receipt) => (receipt.id === updated.id ? { ...receipt, ...updated } : receipt)),
      );
      setEditing(null);
      toast.success("Receipt notes updated");
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
        description="Payment receipts issued against fee installments. Amounts and dates are fixed once issued, but you can attach notes."
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
                      Edit notes
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
        title="Edit receipt notes"
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
        <form id="receipt-edit-form" onSubmit={handleSave} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              Amount: <span className="font-semibold">{formatNumber(editing?.amount)}</span>
            </p>
            <p>
              Paid at:{" "}
              <span className="font-semibold">{formatDateTime(editing?.paidAt)}</span>
            </p>
            <p className="mt-1 text-slate-500">
              Amount and date cannot be changed after a receipt is issued.
            </p>
          </div>
          <FormField
            label="Notes"
            htmlFor="receipt-notes"
            hint="Visible to staff reviewing this receipt"
          >
            <textarea
              id="receipt-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
