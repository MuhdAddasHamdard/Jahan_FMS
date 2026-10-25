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

const toDateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const ExpensesPage = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyExpense);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyExpense);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = async () => {
    const data = await api.get("/expenses");
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

  const visibleExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = expense.paidOn ? new Date(expense.paidOn) : null;
      if (from && date && date < new Date(from)) return false;
      if (to) {
        const upper = new Date(to);
        upper.setHours(23, 59, 59, 999);
        if (date && date > upper) return false;
      }
      return true;
    });
  }, [expenses, from, to]);

  const openCreate = () => {
    setDraft(emptyExpense);
    setError("");
    setCreating(true);
  };

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
      setCreating(false);
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
      paidOn: toDateInput(expense.paidOn),
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

  const columns = [
    {
      key: "description",
      header: "Description",
      sortable: true,
      render: (expense) => (
        <span className="font-medium text-slate-900">{expense.description}</span>
      ),
    },
    {
      key: "paidOn",
      header: "Payment date",
      sortable: true,
      sortValue: (expense) => (expense.paidOn ? new Date(expense.paidOn).getTime() : 0),
      render: (expense) => (
        <span className="text-slate-500">{formatDate(expense.paidOn)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (expense) => Number(expense.amount),
      render: (expense) => (
        <span className="font-semibold text-red-600">
          {formatNumber(expense.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Record institute operating expenses like utilities and supplies."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All expenses"
        count={visibleExpenses.length}
        loading={loading}
        rows={visibleExpenses}
        columns={columns}
        searchPlaceholder="Search expenses..."
        searchKeys={["description"]}
        defaultSort={{ key: "paidOn", direction: "desc" }}
        addButton={{ label: "Add expense", onClick: openCreate }}
        emptyMessage="No expenses found."
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-slate-500">
              <span className="mb-1 block">From</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-500"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              <span className="mb-1 block">To</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-500"
              />
            </label>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        }
        rowActions={(expense) => [
          { label: "Edit", icon: "edit", onClick: () => openEdit(expense) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting(expense),
          },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Record an expense"
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
              form="expense-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Record expense"}
            </button>
          </>
        }
      >
        <form id="expense-create-form" onSubmit={handleCreate} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          <ExpenseFields value={draft} onChange={setDraft} idPrefix="expense-create" />
        </form>
      </Modal>

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
