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

const emptyExpense = { description: "", amount: "", paidOn: "" };

const ExpenseFields = ({ value, onChange, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Description"
      htmlFor={`${idPrefix}-description`}
      hint="What was paid for"
    >
      <input
        id={`${idPrefix}-description`}
        type="text"
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        placeholder="e.g. Electricity bill - March"
        className={inputClass}
      />
    </FormField>
    <FormField label="Amount" htmlFor={`${idPrefix}-amount`}>
      <input
        id={`${idPrefix}-amount`}
        type="number"
        min="0"
        step="0.01"
        value={value.amount}
        onChange={(event) => onChange({ ...value, amount: event.target.value })}
        placeholder="e.g. 12000"
        className={inputClass}
      />
    </FormField>
    <FormField
      label="Payment date"
      htmlFor={`${idPrefix}-paid-on`}
      hint="Leave empty to use today"
    >
      <input
        id={`${idPrefix}-paid-on`}
        type="date"
        value={value.paidOn}
        onChange={(event) => onChange({ ...value, paidOn: event.target.value })}
        className={inputClass}
      />
    </FormField>
  </div>
);

const validateExpense = (value) => {
  if (!value.description.trim()) {
    return "Description is required";
  }
  if (!value.amount || Number(value.amount) <= 0) {
    return "Amount must be greater than zero";
  }
  return "";
};

const ExpenseRow = ({ expense, onEdit, onDelete }) => (
  <li className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-900">{expense.description}</p>
      <p className="text-xs text-slate-500">{formatDate(expense.paidOn)}</p>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-red-600">
        {formatNumber(expense.amount)}
      </span>
      <button
        onClick={() => onEdit(expense)}
        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(expense)}
        className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  </li>
);

const ExpensesPage = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(emptyExpense);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyExpense);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const data = await api.get(`/expenses${query ? `?${query}` : ""}`);
    setExpenses(data);
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get("/expenses")
      .then((data) => {
        if (!cancelled) {
          setExpenses(data);
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
    const message = validateExpense(draft);
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/expenses", {
        description: draft.description.trim(),
        amount: Number(draft.amount),
        paidOn: draft.paidOn || undefined,
      });
      setDraft(emptyExpense);
      toast.success("Expense recorded");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setEditValue({
      description: expense.description,
      amount: String(expense.amount),
      paidOn: expense.paidOn ? new Date(expense.paidOn).toISOString().slice(0, 10) : "",
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const message = validateExpense(editValue);
    if (message) {
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/expenses/${editing.id}`, {
        description: editValue.description.trim(),
        amount: Number(editValue.amount),
        paidOn: editValue.paidOn || undefined,
      });
      setEditing(null);
      toast.success("Expense updated");
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
      await api.delete(`/expenses/${deleting.id}`);
      toast.success("Expense deleted");
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleFilter = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Record institute operating expenses like utilities and supplies."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Record an expense</h2>
        <ExpenseFields value={draft} onChange={setDraft} idPrefix="expense-create" />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Record expense"}
        </button>
      </form>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <form
        onSubmit={handleFilter}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <FormField label="From" htmlFor="expense-filter-from">
          <input
            id="expense-filter-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="To" htmlFor="expense-filter-to">
          <input
            id="expense-filter-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
          />
        </FormField>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No expenses found.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit expense"
        description={editing ? editing.description : undefined}
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
              form="expense-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="expense-edit-form" onSubmit={handleUpdate}>
          <ExpenseFields value={editValue} onChange={setEditValue} idPrefix="expense-edit" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete expense"
        message={
          deleting
            ? `"${deleting.description}" (${formatNumber(deleting.amount)}) will be removed from expense reports.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default ExpensesPage;
