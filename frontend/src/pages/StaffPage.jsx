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

const DESIGNATIONS = ["TEACHER", "ADMIN", "SUPPORT"];

const emptyStaff = {
  staffNo: "",
  name: "",
  designation: "TEACHER",
  salary: "",
  phone: "",
  email: "",
};

const StaffFields = ({ value, onChange, idPrefix, lockStaffNo = false }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Staff number"
      htmlFor={`${idPrefix}-staff-no`}
      hint="Your internal staff ID"
    >
      <input
        id={`${idPrefix}-staff-no`}
        type="text"
        value={value.staffNo}
        onChange={(event) => onChange({ ...value, staffNo: event.target.value })}
        disabled={lockStaffNo}
        placeholder="e.g. STF-014"
        className={`${inputClass} ${lockStaffNo ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
      />
    </FormField>

    <FormField label="Full name" htmlFor={`${idPrefix}-name`}>
      <input
        id={`${idPrefix}-name`}
        type="text"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="e.g. Sara Ahmadi"
        className={inputClass}
      />
    </FormField>

    <FormField label="Designation" htmlFor={`${idPrefix}-designation`}>
      <select
        id={`${idPrefix}-designation`}
        value={value.designation}
        onChange={(event) => onChange({ ...value, designation: event.target.value })}
        className={inputClass}
      >
        {DESIGNATIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>

    <FormField
      label="Monthly salary"
      htmlFor={`${idPrefix}-salary`}
      hint="Default amount used when paying salary"
    >
      <input
        id={`${idPrefix}-salary`}
        type="number"
        min="0"
        step="0.01"
        value={value.salary}
        onChange={(event) => onChange({ ...value, salary: event.target.value })}
        placeholder="e.g. 45000"
        className={inputClass}
      />
    </FormField>

    <FormField label="Phone" htmlFor={`${idPrefix}-phone`} hint="Optional">
      <input
        id={`${idPrefix}-phone`}
        type="text"
        value={value.phone}
        onChange={(event) => onChange({ ...value, phone: event.target.value })}
        placeholder="e.g. 0700 123456"
        className={inputClass}
      />
    </FormField>

    <FormField label="Email" htmlFor={`${idPrefix}-email`} hint="Optional">
      <input
        id={`${idPrefix}-email`}
        type="email"
        value={value.email}
        onChange={(event) => onChange({ ...value, email: event.target.value })}
        placeholder="e.g. sara@fms.com"
        className={inputClass}
      />
    </FormField>
  </div>
);

const validateStaff = (value) => {
  if (!value.staffNo.trim() || !value.name.trim()) {
    return "Staff number and name are required";
  }
  if (!value.salary || Number(value.salary) <= 0) {
    return "Salary must be greater than zero";
  }
  return "";
};

const SalaryForm = ({ staff, onSubmit, submitting }) => {
  const [periodMonth, setPeriodMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
      setError("Choose the month this salary is for");
      return;
    }

    try {
      await onSubmit({
        staffId: staff.id,
        periodMonth,
        amount: amount ? Number(amount) : undefined,
        paidOn: paidOn || undefined,
      });
      setPeriodMonth("");
      setAmount("");
      setPaidOn("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg bg-white p-3 ring-1 ring-slate-200"
    >
      {error && <Alert type="error" message={error} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Salary month" htmlFor={`pay-period-${staff.id}`}>
          <input
            id={`pay-period-${staff.id}`}
            type="month"
            value={periodMonth}
            onChange={(event) => setPeriodMonth(event.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Amount paid"
          htmlFor={`pay-amount-${staff.id}`}
          hint={`Defaults to ${formatNumber(staff.salary)}`}
        >
          <input
            id={`pay-amount-${staff.id}`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 45000"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Payment date"
          htmlFor={`pay-date-${staff.id}`}
          hint="Leave empty to use today"
        >
          <input
            id={`pay-date-${staff.id}`}
            type="date"
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting ? "Paying..." : "Pay salary"}
      </button>
    </form>
  );
};

const StaffRow = ({
  staff,
  payments,
  onToggle,
  isOpen,
  onPay,
  submitting,
  onDeletePayment,
  onEditPayment,
  onEditStaff,
}) => (
  <li className="border-b border-slate-100 last:border-0">
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={() => onToggle(staff)} className="flex-1 text-left">
        <p className="text-sm font-medium text-slate-900">{staff.name}</p>
        <p className="text-xs text-slate-500">
          {staff.staffNo} · {staff.designation}
          {staff.email ? ` · ${staff.email}` : ""}
        </p>
      </button>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-900">
          {formatNumber(staff.salary)}
          <span className="text-xs font-normal text-slate-400">/mo</span>
        </span>
        <button
          onClick={() => onEditStaff(staff)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          Edit
        </button>
        <button
          onClick={() => onToggle(staff)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50"
        >
          {isOpen ? "Hide" : "Payments"}
        </button>
      </div>
    </div>
    {isOpen && (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Salary payments
        </h3>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {payment.periodMonth}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatDate(payment.paidOn)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600">
                    {formatNumber(payment.amount)}
                  </span>
                  <button
                    onClick={() => onEditPayment(payment, staff)}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeletePayment(payment, staff)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <SalaryForm staff={staff} onSubmit={onPay} submitting={submitting} />
      </div>
    )}
  </li>
);

const StaffPage = () => {
  const toast = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [paymentsMap, setPaymentsMap] = useState({});
  const [draft, setDraft] = useState(emptyStaff);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffValue, setEditStaffValue] = useState(emptyStaff);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentValue, setEditPaymentValue] = useState({
    periodMonth: "",
    amount: "",
    paidOn: "",
  });
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refreshStaff = async () => {
    const data = await api.get("/staff");
    setStaffList(data);
  };

  const refreshPayments = async (staffId) => {
    const data = await api.get(`/staff/${staffId}/payments`);
    setPaymentsMap((current) => ({ ...current, [staffId]: data }));
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get("/staff")
      .then((data) => {
        if (!cancelled) {
          setStaffList(data);
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

  const handleToggle = async (staff) => {
    const nextOpen = openId === staff.id ? null : staff.id;
    setOpenId(nextOpen);

    if (nextOpen && !paymentsMap[staff.id]) {
      try {
        await refreshPayments(staff.id);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    const message = validateStaff(draft);
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/staff", {
        staffNo: draft.staffNo.trim(),
        name: draft.name.trim(),
        designation: draft.designation,
        salary: Number(draft.salary),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
      });
      setDraft(emptyStaff);
      toast.success("Staff added");
      await refreshStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditStaff = (staff) => {
    setEditingStaff(staff);
    setEditStaffValue({
      staffNo: staff.staffNo,
      name: staff.name,
      designation: staff.designation,
      salary: String(staff.salary),
      phone: staff.phone ?? "",
      email: staff.email ?? "",
    });
  };

  const handleUpdateStaff = async (event) => {
    event.preventDefault();
    const message = validateStaff(editStaffValue);
    if (message) {
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/staff/${editingStaff.id}`, {
        name: editStaffValue.name.trim(),
        designation: editStaffValue.designation,
        salary: Number(editStaffValue.salary),
        phone: editStaffValue.phone.trim() || null,
        email: editStaffValue.email.trim() || null,
      });
      setEditingStaff(null);
      toast.success("Staff details updated");
      await refreshStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaySalary = async (payload) => {
    setSubmitting(true);
    try {
      await api.post("/salary-payments", payload);
      toast.success(`Salary paid for ${payload.periodMonth}`);
      await refreshPayments(payload.staffId);
      await refreshStaff();
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const openEditPayment = (payment, staff) => {
    setEditingPayment({ ...payment, staff });
    setEditPaymentValue({
      periodMonth: payment.periodMonth,
      amount: String(payment.amount),
      paidOn: payment.paidOn ? new Date(payment.paidOn).toISOString().slice(0, 10) : "",
    });
  };

  const handleUpdatePayment = async (event) => {
    event.preventDefault();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(editPaymentValue.periodMonth)) {
      toast.error("Choose the month this salary is for");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/salary-payments/${editingPayment.id}`, {
        periodMonth: editPaymentValue.periodMonth,
        amount: Number(editPaymentValue.amount),
        paidOn: editPaymentValue.paidOn || undefined,
      });
      setEditingPayment(null);
      toast.success("Salary payment updated");
      await refreshPayments(editingPayment.staff.id);
      await refreshStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/salary-payments/${deleting.payment.id}`);
      toast.success("Salary payment deleted");
      await refreshPayments(deleting.staff.id);
      await refreshStaff();
      setDeleting(null);
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
        title="Staff & Salaries"
        description="Manage staff members and pay monthly salaries."
      />

      <form
        onSubmit={handleCreateStaff}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add a staff member</h2>
        <StaffFields value={draft} onChange={setDraft} idPrefix="staff-create" />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add staff"}
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
      ) : staffList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No staff members yet.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {staffList.map((staff) => (
            <StaffRow
              key={staff.id}
              staff={staff}
              payments={paymentsMap[staff.id] ?? []}
              isOpen={openId === staff.id}
              onToggle={handleToggle}
              onPay={handlePaySalary}
              submitting={submitting}
              onDeletePayment={(payment, staffMember) => setDeleting({ payment, staff: staffMember })}
              onEditPayment={openEditPayment}
              onEditStaff={openEditStaff}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit staff member"
        description={editingStaff ? `${editingStaff.staffNo} · ${editingStaff.name}` : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingStaff(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="staff-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="staff-edit-form" onSubmit={handleUpdateStaff}>
          <StaffFields
            value={editStaffValue}
            onChange={setEditStaffValue}
            idPrefix="staff-edit"
            lockStaffNo
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingPayment)}
        onClose={() => setEditingPayment(null)}
        title="Edit salary payment"
        description={
          editingPayment
            ? `${editingPayment.staff.name} · ${editingPayment.periodMonth}`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingPayment(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="salary-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="salary-edit-form" onSubmit={handleUpdatePayment} className="grid gap-3 sm:grid-cols-3">
          <FormField label="Salary month" htmlFor="salary-edit-period">
            <input
              id="salary-edit-period"
              type="month"
              value={editPaymentValue.periodMonth}
              onChange={(event) =>
                setEditPaymentValue((current) => ({ ...current, periodMonth: event.target.value }))
              }
              className={inputClass}
            />
          </FormField>
          <FormField label="Amount paid" htmlFor="salary-edit-amount">
            <input
              id="salary-edit-amount"
              type="number"
              min="0"
              step="0.01"
              value={editPaymentValue.amount}
              onChange={(event) =>
                setEditPaymentValue((current) => ({ ...current, amount: event.target.value }))
              }
              placeholder="e.g. 45000"
              className={inputClass}
            />
          </FormField>
          <FormField
            label="Payment date"
            htmlFor="salary-edit-date"
            hint="Leave empty to use today"
          >
            <input
              id="salary-edit-date"
              type="date"
              value={editPaymentValue.paidOn}
              onChange={(event) =>
                setEditPaymentValue((current) => ({ ...current, paidOn: event.target.value }))
              }
              className={inputClass}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete salary payment"
        message={
          deleting
            ? `The ${deleting.payment.periodMonth} payment of ${formatNumber(deleting.payment.amount)} to ${deleting.staff.name} will be removed from reports.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default StaffPage;
