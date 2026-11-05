import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate } from "../utils/format";

const statusClass = (status) => {
  const styles = {
    PAID: "bg-teal-50 text-teal-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    PENDING: "bg-slate-100 text-slate-600",
  };
  return styles[status] ?? "bg-slate-100 text-slate-600";
};

const PlanFields = ({ value, onChange, students, feeTypes, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Student"
      htmlFor={`${idPrefix}-student`}
      hint="The student this plan is charged to"
    >
      <select
        id={`${idPrefix}-student`}
        value={value.studentId}
        onChange={(event) => onChange({ ...value, studentId: event.target.value })}
        className={inputClass}
      >
        <option value="">
          {students.length > 0 ? "Select student" : "No students available"}
        </option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} ({student.admissionNo})
          </option>
        ))}
      </select>
    </FormField>

    <FormField
      label="Fee type"
      htmlFor={`${idPrefix}-fee-type`}
      hint="The fee being charged, e.g. tuition, admission or session fee"
    >
      <select
        id={`${idPrefix}-fee-type`}
        value={value.feeTypeId}
        onChange={(event) => onChange({ ...value, feeTypeId: event.target.value })}
        className={inputClass}
      >
        <option value="">Select fee type</option>
        {feeTypes.map((feeType) => (
          <option key={feeType.id} value={feeType.id}>
            {feeType.name}
          </option>
        ))}
      </select>
    </FormField>

    <FormField label="Total amount" htmlFor={`${idPrefix}-total`}>
      <input
        id={`${idPrefix}-total`}
        type="number"
        min="0"
        step="0.01"
        value={value.totalAmount}
        onChange={(event) => onChange({ ...value, totalAmount: event.target.value })}
        placeholder="e.g. 15000"
        className={inputClass}
      />
    </FormField>

    <FormField
      label="Number of installments"
      htmlFor={`${idPrefix}-count`}
      hint="Split the total into this many payments"
    >
      <input
        id={`${idPrefix}-count`}
        type="number"
        min="1"
        value={value.installmentCount}
        onChange={(event) => onChange({ ...value, installmentCount: event.target.value })}
        placeholder="e.g. 3"
        className={inputClass}
      />
    </FormField>
  </div>
);

const PaymentForm = ({ installment, onSubmit, onCancel }) => {
  const remaining = Math.max(0, installment.amount - installment.paidAmount);
  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount to collect");
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        installmentId: installment.id,
        amount: Number(amount),
        date: date || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg bg-white p-3 ring-1 ring-slate-200"
    >
      {error && <Alert type="error" message={error} />}
      <p className="text-xs text-slate-500">
        Remaining balance: {formatNumber(remaining)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Amount received" htmlFor={`pay-${installment.id}`}>
          <input
            id={`pay-${installment.id}`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 5000"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Payment date"
          htmlFor={`pay-date-${installment.id}`}
          hint="Leave empty to use today"
        >
          <input
            id={`pay-date-${installment.id}`}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {busy ? "Processing..." : "Collect payment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const PlanDetailPanel = ({ plan, onChanged }) => {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState(null);

  const refresh = async () => {
    const data = await api.get(`/fees/plans/${plan.id}`);
    setDetail(data);
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/fees/plans/${plan.id}`)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [plan.id, toast]);

  const handleCollect = async (payload) => {
    try {
      await api.post("/fees/payments", payload);
      toast.success(`Payment collected for ${plan.student.name}`);
      setCollectingId(null);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-slate-400">Could not load plan details.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-lg font-bold text-slate-900">
            {formatNumber(detail.totalAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Paid</p>
          <p className="text-lg font-bold text-teal-700">
            {formatNumber(detail.paidAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Balance</p>
          <p className="text-lg font-bold text-amber-700">
            {formatNumber(detail.balance)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {detail.installments.map((installment) => (
          <div key={installment.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {formatNumber(installment.amount)}
                </p>
                <p className="text-xs text-slate-500">
                  Due {formatDate(installment.dueDate)}
                  {installment.paidAmount > 0
                    ? ` · Paid ${formatNumber(installment.paidAmount)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(installment.status)}`}
                >
                  {installment.status}
                </span>
                {collectingId !== installment.id && installment.status !== "PAID" && (
                  <button
                    onClick={() => setCollectingId(installment.id)}
                    className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Collect
                  </button>
                )}
              </div>
            </div>
            {collectingId === installment.id && (
              <PaymentForm
                installment={installment}
                onSubmit={handleCollect}
                onCancel={() => setCollectingId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const emptyPlan = {
  studentId: "",
  feeTypeId: "",
  totalAmount: "",
  installmentCount: "1",
};

const FeePlansPage = () => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyPlan);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyPlan);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.get("/fees/plans"), api.get("/students"), api.get("/fees/types")])
      .then(([planList, studentList, feeTypeList]) => {
        if (!cancelled) {
          setPlans(planList);
          setStudents(studentList);
          setFeeTypes(feeTypeList);
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

  const refreshPlans = async () => {
    const data = await api.get("/fees/plans");
    setPlans(data);
  };

  const validatePlan = (value) => {
    if (!value.feeTypeId) {
      return "Select a fee type";
    }
    if (!value.totalAmount || Number(value.totalAmount) <= 0) {
      return "Total amount must be greater than zero";
    }
    return "";
  };

  const openCreate = () => {
    setDraft(emptyPlan);
    setError("");
    setCreating(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const message = !draft.studentId ? "Select a student" : validatePlan(draft);
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/fees/plans", {
        studentId: Number(draft.studentId),
        feeTypeId: Number(draft.feeTypeId),
        totalAmount: Number(draft.totalAmount),
        installmentCount: Math.max(1, Number(draft.installmentCount) || 1),
      });
      setCreating(false);
      setDraft(emptyPlan);
      toast.success("Fee plan created");
      await refreshPlans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = async (plan) => {
    try {
      const detail = await api.get(`/fees/plans/${plan.id}`);
      setEditing(detail);
      setEditValue({
        studentId: String(detail.student.id),
        feeTypeId: String(detail.feeType.id),
        totalAmount: String(detail.totalAmount),
        installmentCount: String(detail.installmentCount),
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const message = validatePlan(editValue);
    if (message) {
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/fees/plans/${editing.id}`, {
        feeTypeId: Number(editValue.feeTypeId),
        totalAmount: Number(editValue.totalAmount),
        installmentCount: Math.max(1, Number(editValue.installmentCount) || 1),
      });
      setEditing(null);
      toast.success("Fee plan updated");
      await refreshPlans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/fees/plans/${deleting.id}`);
      toast.success("Fee plan deleted");
      setDeleting(null);
      await refreshPlans();
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
      sortValue: (plan) => plan.student?.name ?? "",
      render: (plan) => (
        <div>
          <p className="font-medium text-slate-900">{plan.student?.name ?? "—"}</p>
          <p className="text-xs text-slate-500">{plan.student?.admissionNo}</p>
        </div>
      ),
    },
    {
      key: "feeType",
      header: "Fee type",
      sortable: true,
      sortValue: (plan) => plan.feeType?.name ?? "",
      render: (plan) => (
        <div>
          <p className="text-slate-700">{plan.feeType?.name ?? "—"}</p>
          <p className="text-xs text-slate-500">
            {plan.installmentCount} installment{plan.installmentCount === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      sortable: true,
      render: (plan) => (
        <span className="text-slate-700">{formatNumber(plan.totalAmount)}</span>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      align: "right",
      sortable: true,
      render: (plan) => (
        <span className="text-teal-700">{formatNumber(plan.paidAmount)}</span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortable: true,
      render: (plan) => (
        <span className="font-semibold text-slate-900">
          {formatNumber(plan.balance)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (plan) => (
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(plan.status)}`}
        >
          {plan.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fee Plans"
        description="Assign a fee type to a student, split it into installments and collect payments."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All fee plans"
        count={plans.length}
        loading={loading}
        rows={plans}
        columns={columns}
        searchPlaceholder="Search by student or fee type..."
        searchValue={(plan) =>
          [plan.student?.name, plan.student?.admissionNo, plan.feeType?.name]
            .filter(Boolean)
            .join(" ")
        }
        filters={[
          {
            key: "status",
            label: "Filter by status",
            options: [
              { value: "", label: "All statuses" },
              { value: "PAID", label: "Paid" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PENDING", label: "Pending" },
            ],
            value: (plan) => plan.status,
          },
        ]}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        addButton={{ label: "Create fee plan", onClick: openCreate }}
        emptyMessage="No fee plans yet."
        renderDetail={(plan) => (
          <PlanDetailPanel plan={plan} onChanged={refreshPlans} />
        )}
        rowActions={(plan) => [
          { label: "Edit", icon: "edit", onClick: () => openEdit(plan) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting(plan),
          },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a fee plan"
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
              form="fee-plan-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create fee plan"}
            </button>
          </>
        }
      >
        <form id="fee-plan-create-form" onSubmit={handleCreate} className="space-y-4">
          {error && <Alert type="error" message={error} />}
          <PlanFields
            value={draft}
            onChange={setDraft}
            students={students}
            feeTypes={feeTypes}
            idPrefix="plan-create"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit fee plan"
        description={
          editing ? `${editing.student.name} · ${editing.feeType.name}` : undefined
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
              form="fee-plan-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="fee-plan-edit-form" onSubmit={handleUpdate} className="space-y-4">
          <PlanFields
            value={editValue}
            onChange={setEditValue}
            students={students}
            feeTypes={feeTypes}
            idPrefix="plan-edit"
          />
          <p className="text-xs text-amber-700">
            Plans that already have collected payments cannot be edited.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete fee plan"
        message={
          deleting
            ? `The fee plan for ${deleting.student?.name} (${deleting.feeType?.name}) will be removed. Plans with payments cannot be deleted.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default FeePlansPage;
