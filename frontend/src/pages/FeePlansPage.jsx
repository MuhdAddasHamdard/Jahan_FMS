import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { showMutationFeedback } from "../api/mutationFeedback";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatDate } from "../utils/format";

const statusClass = (status) => {
  const styles = {
    PAID: "bg-teal-50 text-teal-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    PENDING: "bg-slate-100 text-slate-600",
  };
  return styles[status] ?? "bg-slate-100 text-slate-600";
};

const PlanFields = ({ value, onChange, students, feeTypes, idPrefix, isNew, showOptions }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {isNew && (
      <FormField label="Student" htmlFor={`${idPrefix}-student`} className="sm:col-span-2">
        <select
          id={`${idPrefix}-student`}
          value={value.studentId}
          onChange={(event) => onChange({ ...value, studentId: event.target.value })}
          className={inputClass}
        >
          <option value="">{students.length ? "Select student" : "No students available"}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.admissionNo})
            </option>
          ))}
        </select>
      </FormField>
    )}

    <FormField label="Fee" htmlFor={`${idPrefix}-fee-type`}>
      <select
        id={`${idPrefix}-fee-type`}
        value={value.feeTypeId}
        onChange={(event) => {
          const feeTypeId = event.target.value;
          const fee = feeTypes.find((item) => String(item.id) === feeTypeId);
          onChange({
            ...value,
            feeTypeId,
            totalAmount: isNew ? String(fee?.amount ?? "") : value.totalAmount,
          });
        }}
        className={inputClass}
      >
        <option value="">Select fee</option>
        {feeTypes.map((feeType) => (
          <option key={feeType.id} value={feeType.id}>{feeType.name}</option>
        ))}
      </select>
    </FormField>

    <FormField label={value.discountType === "NONE" ? "Amount (AFN)" : "Amount before discount (AFN)"} htmlFor={`${idPrefix}-total`}>
      <input
        id={`${idPrefix}-total`}
        type="number"
        min="0"
        step="0.01"
        value={value.totalAmount}
        onChange={(event) => onChange({ ...value, totalAmount: event.target.value })}
        className={inputClass}
      />
    </FormField>

    <details open={showOptions} className="rounded-lg border border-line p-3 sm:col-span-2">
      <summary className="cursor-pointer text-sm font-semibold text-content">Discounts and installments</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label="Payments" htmlFor={`${idPrefix}-count`} hint="Set to 1 to charge the full amount at once.">
          <input
            id={`${idPrefix}-count`}
            type="number"
            min="1"
            step="1"
            value={value.installmentCount}
            onChange={(event) => onChange({ ...value, installmentCount: event.target.value })}
            className={inputClass}
          />
        </FormField>
        <FormField label="Discount" htmlFor={`${idPrefix}-discount-type`}>
          <select
            id={`${idPrefix}-discount-type`}
            value={value.discountType}
            onChange={(event) => onChange({
              ...value,
              discountType: event.target.value,
              discountValue: event.target.value === "NONE" ? "0" : value.discountValue,
            })}
            className={inputClass}
          >
            <option value="NONE">No discount</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </select>
        </FormField>
        {value.discountType !== "NONE" && (
          <FormField
            label={value.discountType === "PERCENTAGE" ? "Discount percent" : "Discount amount (AFN)"}
            htmlFor={`${idPrefix}-discount-value`}
          >
            <input
              id={`${idPrefix}-discount-value`}
              type="number"
              min="0"
              max={value.discountType === "PERCENTAGE" ? "100" : undefined}
              step="0.01"
              value={value.discountValue}
              onChange={(event) => onChange({ ...value, discountValue: event.target.value })}
              className={inputClass}
            />
          </FormField>
        )}
      </div>
    </details>
  </div>
);

const PaymentForm = ({ installment, onSubmit, onCancel }) => {
  const remaining = Math.max(0, Math.round((installment.amount - installment.paidAmount) * 100) / 100);
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
        Remaining balance: {formatCurrency(remaining)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Amount received (AFN)" htmlFor={`pay-${installment.id}`}>
          <input
            id={`pay-${installment.id}`}
            type="number"
            min="0"
            max={remaining}
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

const PlanDetailPanel = ({ plan, onChanged, closePayment }) => {
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
  }, [plan.id, plan.paidAmount, toast]);

  const handleCollect = async (payload) => {
    try {
      const result = await api.post("/fees/payments", payload, { sourcePath: `/fees/plans/${plan.id}` });
      const synced = showMutationFeedback(toast, result, `Payment collected for ${plan.student.name}`);
      setCollectingId(null);
      closePayment?.();
      if (!synced) return;
      if (!closePayment) await refresh();
      await onChanged?.();
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
    return <p className="text-sm text-muted">Could not load fee details.</p>;
  }

  if (closePayment) {
    const unpaid = detail.installments.filter((item) => item.amount > item.paidAmount);
    const selected = unpaid.find((item) => item.id === collectingId) ?? unpaid[0];
    if (!selected) return <p className="text-sm text-muted">This fee has been paid in full.</p>;

    return (
      <>
        {unpaid.length > 1 && (
          <FormField label="Installment" htmlFor="fee-payment-installment">
            <select
              id="fee-payment-installment"
              value={selected.id}
              onChange={(event) => setCollectingId(Number(event.target.value))}
              className={inputClass}
            >
              {unpaid.map((item) => (
                <option key={item.id} value={item.id}>
                  Due {formatDate(item.dueDate)} · {formatCurrency(item.amount - item.paidAmount)} remaining
                </option>
              ))}
            </select>
          </FormField>
        )}
        <PaymentForm key={selected.id} installment={selected} onSubmit={handleCollect} onCancel={closePayment} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-lg font-bold text-slate-900">
            {formatCurrency(detail.totalAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Discount</p>
          <p className="text-lg font-bold text-violet-700">
            {formatCurrency(detail.discountAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Paid</p>
          <p className="text-lg font-bold text-teal-700">
            {formatCurrency(detail.paidAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-400">Balance</p>
          <p className="text-lg font-bold text-amber-700">
            {formatCurrency(detail.balance)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {detail.installments.map((installment) => (
          <div key={installment.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(installment.amount)}
                </p>
                <p className="text-xs text-slate-500">
                  Due {formatDate(installment.dueDate)}
                  {installment.paidAmount > 0
                    ? ` · Paid ${formatCurrency(installment.paidAmount)}`
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
                    type="button"
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
  discountType: "NONE",
  discountValue: "0",
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
  const [collecting, setCollecting] = useState(null);
  const [draft, setDraft] = useState(emptyPlan);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyPlan);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.get("/fees/plans"), api.get("/students").catch(() => []), api.get("/fees/types")])
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
      return "Select a fee";
    }
    if (!value.totalAmount || Number(value.totalAmount) <= 0) {
      return "Total amount must be greater than zero";
    }
    const discount = Number(value.discountValue);
    if (
      value.discountType === "PERCENTAGE" &&
      (!Number.isFinite(discount) || discount <= 0 || discount > 100)
    ) {
      return "Percentage discount must be greater than zero and at most 100";
    }
    if (
      value.discountType === "FIXED" &&
      (!Number.isFinite(discount) ||
        discount <= 0 ||
        discount > Number(value.totalAmount))
    ) {
      return "Fixed discount must be greater than zero and no more than the fee amount";
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
      const result = await api.post("/fees/plans", {
        studentId: Number(draft.studentId),
        feeTypeId: Number(draft.feeTypeId),
        totalAmount: Number(draft.totalAmount),
        installmentCount: Math.max(1, Number(draft.installmentCount) || 1),
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue) || 0,
      });
      setCreating(false);
      setDraft(emptyPlan);
      const synced = showMutationFeedback(toast, result, "Fee assigned");
      if (!synced) return;
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
        totalAmount: String(detail.grossAmount ?? detail.totalAmount),
        installmentCount: String(detail.installmentCount),
        discountType: detail.discountType ?? "NONE",
        discountValue: String(detail.discountValue ?? 0),
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
      const result = await api.patch(`/fees/plans/${editing.id}`, {
        feeTypeId: Number(editValue.feeTypeId),
        totalAmount: Number(editValue.totalAmount),
        installmentCount: Math.max(1, Number(editValue.installmentCount) || 1),
        discountType: editValue.discountType,
        discountValue: Number(editValue.discountValue) || 0,
      });
      setEditing(null);
      const synced = showMutationFeedback(toast, result, "Fee updated");
      if (!synced) return;
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
      const result = await api.delete(`/fees/plans/${deleting.id}`);
      const synced = showMutationFeedback(toast, result, "Fee removed");
      setDeleting(null);
      if (!synced) return;
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
      header: "Fee",
      sortable: true,
      sortValue: (plan) => plan.feeType?.name ?? "",
      render: (plan) => (
        <div>
          <p className="text-slate-700">{plan.feeType?.name ?? "—"}</p>
          {plan.installmentCount > 1 && <p className="text-xs text-slate-500">{plan.installmentCount} installments</p>}
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      sortable: true,
      render: (plan) => (
        <div>
          <span className="font-medium text-slate-700">
            {formatCurrency(plan.totalAmount)}
          </span>
          {plan.discountAmount > 0 && (
            <span className="mt-1 block text-xs text-violet-600">
              {formatCurrency(plan.discountAmount)} discount from{" "}
              {formatCurrency(plan.grossAmount)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      align: "right",
      sortable: true,
      render: (plan) => (
        <span className="text-teal-700">{formatCurrency(plan.paidAmount)}</span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortable: true,
      render: (plan) => (
        <span className="font-semibold text-slate-900">
          {formatCurrency(plan.balance)}
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
    {
      key: "payment",
      header: "Payment",
      render: (plan) => plan.balance > 0 && (
        <button
          type="button"
          onClick={() => setCollecting(plan)}
          className="btn btn-secondary whitespace-nowrap"
          aria-label={`Collect payment for ${plan.student.name} · ${plan.feeType.name}`}
        >
          Collect payment
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Assign fees, collect payments, and see what students still owe."
        action={<Link to="/fees/settings" className="btn btn-secondary">Fee Settings</Link>}
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="Student fees"
        count={plans.length}
        loading={loading}
        rows={plans}
        columns={columns}
        searchPlaceholder="Search by student or fee..."
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
        addButton={{ label: "Assign fee", onClick: openCreate }}
        emptyMessage="No fees assigned yet."
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
        open={Boolean(collecting)}
        onClose={() => setCollecting(null)}
        title="Collect payment"
        description={collecting ? `${collecting.student.name} · ${collecting.feeType.name}` : undefined}
      >
        {collecting && (
          <PlanDetailPanel
            key={collecting.id}
            plan={collecting}
            onChanged={refreshPlans}
            closePayment={() => setCollecting(null)}
          />
        )}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Assign fee"
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
              disabled={submitting || !students.length || !feeTypes.length}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Assigning…" : "Assign fee"}
            </button>
          </>
        }
      >
        <form id="fee-plan-create-form" onSubmit={handleCreate} className="space-y-4">
          {error && <Alert type="error" message={error} />}
          {!loading && feeTypes.length === 0 && (
            <p className="text-sm text-muted">Create a template in <Link to="/fees/settings" className="font-semibold underline">Fee Settings</Link> first.</p>
          )}
          <PlanFields
            value={draft}
            onChange={setDraft}
            students={students}
            feeTypes={feeTypes}
            idPrefix="plan-create"
            isNew
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit fee"
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
            feeTypes={feeTypes}
            idPrefix="plan-edit"
            showOptions={editing?.installmentCount > 1 || editing?.discountAmount > 0}
          />
          <p className="text-xs text-amber-700">
            Fees with recorded payments cannot be edited.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove fee"
        message={
          deleting
            ? `Remove ${deleting.feeType?.name} for ${deleting.student?.name}? Fees with recorded payments cannot be removed.`
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
