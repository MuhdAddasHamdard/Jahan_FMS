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
    <FormField label="Student" htmlFor={`${idPrefix}-student`}>
      <select
        id={`${idPrefix}-student`}
        value={value.studentId}
        onChange={(event) => onChange({ ...value, studentId: event.target.value })}
        disabled
        className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
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

const PaymentForm = ({ installment, onSubmit, submitting }) => {
  const remaining = Math.max(0, installment.amount - installment.paidAmount);
  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount to collect");
      return;
    }

    onSubmit({
      installmentId: installment.id,
      amount: Number(amount),
      date: date || undefined,
    });
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
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting ? "Processing..." : "Collect payment"}
      </button>
    </form>
  );
};

const PlanDetail = ({ plan, onCollect, collectingId, onDeletePlan, onEditPlan }) => (
  <div className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
        <p className="text-xs text-slate-400">Total</p>
        <p className="text-lg font-bold text-slate-900">
          {formatNumber(plan.totalAmount)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
        <p className="text-xs text-slate-400">Paid</p>
        <p className="text-lg font-bold text-teal-700">
          {formatNumber(plan.paidAmount)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
        <p className="text-xs text-slate-400">Balance</p>
        <p className="text-lg font-bold text-amber-700">
          {formatNumber(plan.balance)}
        </p>
      </div>
    </div>

    <div className="space-y-2">
      {plan.installments.map((installment) => (
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
              {collectingId === installment.id ? (
                <button
                  onClick={() => onCollect(plan, installment, "cancel")}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              ) : (
                installment.status !== "PAID" && (
                  <button
                    onClick={() => onCollect(plan, installment, "start")}
                    className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Collect
                  </button>
                )
              )}
            </div>
          </div>
          {collectingId === installment.id && (
            <PaymentForm
              installment={installment}
              submitting={false}
              onSubmit={(payload) => onCollect(plan, installment, "submit", payload)}
            />
          )}
        </div>
      ))}
    </div>

    <div className="flex items-center gap-3">
      <button
        onClick={() => onEditPlan(plan)}
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      >
        Edit plan
      </button>
      <button
        onClick={() => onDeletePlan(plan)}
        className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
      >
        Delete plan
      </button>
    </div>
  </div>
);

const PlanRow = ({
  plan,
  detailMap,
  onToggle,
  isOpen,
  onCollectPayment,
  collectingId,
  onDeletePlan,
  onEditPlan,
}) => (
  <li className="border-b border-slate-100 last:border-0">
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={() => onToggle(plan)} className="flex-1 text-left">
        <p className="text-sm font-medium text-slate-900">{plan.student.name}</p>
        <p className="text-xs text-slate-500">
          {plan.feeType.name} · {plan.installmentCount} installment
          {plan.installmentCount === 1 ? "" : "s"}
        </p>
      </button>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">
            {formatNumber(plan.balance)}
          </p>
          <p className="text-[11px] text-slate-400">balance</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(plan.status)}`}
        >
          {plan.status}
        </span>
        <button
          onClick={() => onToggle(plan)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          {isOpen ? "Hide" : "View installments"}
        </button>
      </div>
    </div>
    {isOpen && (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
        <PlanDetail
          plan={detailMap[plan.id] ?? plan}
          onCollect={onCollectPayment}
          collectingId={collectingId}
          onDeletePlan={onDeletePlan}
          onEditPlan={onEditPlan}
        />
      </div>
    )}
  </li>
);

const FeePlansPage = () => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [collectingId, setCollectingId] = useState(null);
  const [draft, setDraft] = useState({
    studentId: "",
    feeTypeId: "",
    totalAmount: "",
    installmentCount: "1",
  });
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState({
    studentId: "",
    feeTypeId: "",
    totalAmount: "",
    installmentCount: "1",
  });
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
    try {
      const data = await api.get("/fees/plans");
      setPlans(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const refreshPlanDetail = async (planId) => {
    try {
      const detail = await api.get(`/fees/plans/${planId}`);
      setDetailMap((current) => ({ ...current, [planId]: detail }));
    } catch (err) {
      toast.error(err.message);
    }
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

  const handleCreate = async (event) => {
    event.preventDefault();
    const message = !draft.studentId
      ? "Select a student"
      : validatePlan(draft);
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
      setDraft({ studentId: "", feeTypeId: "", totalAmount: "", installmentCount: "1" });
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
      const updated = await api.patch(`/fees/plans/${editing.id}`, {
        feeTypeId: Number(editValue.feeTypeId),
        totalAmount: Number(editValue.totalAmount),
        installmentCount: Math.max(1, Number(editValue.installmentCount) || 1),
      });
      setEditing(null);
      toast.success("Fee plan updated");
      setDetailMap((current) => ({ ...current, [updated.id]: updated }));
      await refreshPlans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (plan) => {
    const nextOpen = openId === plan.id ? null : plan.id;
    setOpenId(nextOpen);

    if (nextOpen && !detailMap[plan.id]) {
      await refreshPlanDetail(plan.id);
    }
  };

  const handleCollectPayment = async (plan, installment, action, payload) => {
    if (action === "start") {
      setCollectingId(installment.id);
      return;
    }
    if (action === "cancel") {
      setCollectingId(null);
      return;
    }

    try {
      await api.post("/fees/payments", payload);
      toast.success(`Payment collected for ${plan.student.name}`);
      setCollectingId(null);
      await refreshPlanDetail(plan.id);
      await refreshPlans();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/fees/plans/${deleting.id}`);
      toast.success("Fee plan deleted");
      setDetailMap((current) => {
        const next = { ...current };
        delete next[deleting.id];
        return next;
      });
      setDeleting(null);
      await refreshPlans();
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
        title="Fee Plans"
        description="Assign a fee type to a student, split it into installments and collect payments."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Create a fee plan</h2>
        <PlanFields
          value={draft}
          onChange={setDraft}
          students={students}
          feeTypes={feeTypes}
          idPrefix="plan-create"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create fee plan"}
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
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No fee plans yet.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              detailMap={detailMap}
              isOpen={openId === plan.id}
              onToggle={handleToggle}
              onCollectPayment={handleCollectPayment}
              collectingId={collectingId}
              onDeletePlan={setDeleting}
              onEditPlan={openEdit}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit fee plan"
        description={
          editing
            ? `${editing.student.name} · ${editing.feeType.name}`
            : undefined
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
            ? `The fee plan for ${deleting.student.name} (${deleting.feeType.name}) will be removed. Plans with payments cannot be deleted.`
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
