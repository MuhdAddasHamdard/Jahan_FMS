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

    <FormField
      label="Email"
      htmlFor={`${idPrefix}-email`}
      hint="Optional · a TEACHER with an email gets a login for class assignment"
    >
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

const designationClass = (designation) => {
  const styles = {
    TEACHER: "bg-blue-50 text-blue-700",
    ADMIN: "bg-purple-50 text-purple-700",
    SUPPORT: "bg-slate-100 text-slate-600",
  };
  return styles[designation] ?? "bg-slate-100 text-slate-600";
};

const SalaryForm = ({ staff, onSubmit }) => {
  const [periodMonth, setPeriodMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
      setError("Choose the month this salary is for");
      return;
    }

    setBusy(true);
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
        disabled={busy}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {busy ? "Paying..." : "Pay salary"}
      </button>
    </form>
  );
};

const StaffDetailPanel = ({ staff, onChanged }) => {
  const toast = useToast();
  const [payments, setPayments] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ periodMonth: "", amount: "", paidOn: "" });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const data = await api.get(`/staff/${staff.id}/payments`);
    setPayments(data);
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/staff/${staff.id}/payments`)
      .then((data) => {
        if (!cancelled) {
          setPayments(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err.message);
          setPayments([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [staff.id, toast]);

  const handlePay = async (payload) => {
    await api.post("/salary-payments", payload);
    toast.success(`Salary paid for ${payload.periodMonth}`);
    await refresh();
    onChanged?.();
  };

  const openEdit = (payment) => {
    setEditing(payment);
    setForm({
      periodMonth: payment.periodMonth,
      amount: String(payment.amount),
      paidOn: payment.paidOn ? new Date(payment.paidOn).toISOString().slice(0, 10) : "",
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.periodMonth)) {
      toast.error("Choose the month this salary is for");
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/salary-payments/${editing.id}`, {
        periodMonth: form.periodMonth,
        amount: Number(form.amount),
        paidOn: form.paidOn || undefined,
      });
      setEditing(null);
      toast.success("Salary payment updated");
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/salary-payments/${deleting.id}`);
      toast.success("Salary payment deleted");
      setDeleting(null);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (payments === null) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Salary payments
      </h3>
      {payments.length === 0 ? (
        <p className="text-sm text-slate-400">No payments yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-700">
                  {payment.periodMonth}
                </p>
                <p className="text-[11px] text-slate-400">{formatDate(payment.paidOn)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-red-600">
                  {formatNumber(payment.amount)}
                </span>
                <button
                  onClick={() => openEdit(payment)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(payment)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SalaryForm staff={staff} onSubmit={handlePay} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit salary payment"
        description={editing ? `${staff.name} · ${editing.periodMonth}` : undefined}
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
              form="salary-edit-form"
              disabled={busy}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="salary-edit-form" onSubmit={handleUpdate} className="grid gap-3 sm:grid-cols-3">
          <FormField label="Salary month" htmlFor="salary-edit-period">
            <input
              id="salary-edit-period"
              type="month"
              value={form.periodMonth}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodMonth: event.target.value }))
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
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
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
              value={form.paidOn}
              onChange={(event) =>
                setForm((current) => ({ ...current, paidOn: event.target.value }))
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
            ? `The ${deleting.periodMonth} payment of ${formatNumber(deleting.amount)} to ${staff.name} will be removed from reports.`
            : ""
        }
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

const StaffPage = () => {
  const toast = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyStaff);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffValue, setEditStaffValue] = useState(emptyStaff);

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

  const refreshStaff = async () => {
    const data = await api.get("/staff");
    setStaffList(data);
  };

  const openCreate = () => {
    setDraft(emptyStaff);
    setError("");
    setCreating(true);
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
      setCreating(false);
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

  const columns = [
    {
      key: "name",
      header: "Staff",
      sortable: true,
      render: (staff) => (
        <div>
          <p className="font-medium text-slate-900">{staff.name}</p>
          <p className="text-xs text-slate-500">{staff.staffNo}</p>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      render: (staff) => (
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${designationClass(staff.designation)}`}
        >
          {staff.designation}
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (staff) => (
        <div className="text-slate-600">
          <p>{staff.email || "—"}</p>
          {staff.phone ? <p className="text-xs text-slate-400">{staff.phone}</p> : null}
        </div>
      ),
    },
    {
      key: "salary",
      header: "Monthly salary",
      align: "right",
      sortable: true,
      sortValue: (staff) => Number(staff.salary),
      render: (staff) => (
        <span className="font-semibold text-slate-900">
          {formatNumber(staff.salary)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff & Salaries"
        description="Manage staff members and pay monthly salaries."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All staff"
        count={staffList.length}
        loading={loading}
        rows={staffList}
        columns={columns}
        searchPlaceholder="Search staff..."
        searchValue={(staff) =>
          [staff.name, staff.staffNo, staff.designation, staff.email, staff.phone]
            .filter(Boolean)
            .join(" ")
        }
        filters={[
          {
            key: "designation",
            label: "Filter by designation",
            options: [
              { value: "", label: "All designations" },
              ...DESIGNATIONS.map((designation) => ({
                value: designation,
                label: designation,
              })),
            ],
            value: (staff) => staff.designation,
          },
        ]}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        addButton={{ label: "Add staff", onClick: openCreate }}
        emptyMessage="No staff members yet."
        renderDetail={(staff) => (
          <StaffDetailPanel staff={staff} onChanged={refreshStaff} />
        )}
        rowActions={(staff) => [
          { label: "Edit", icon: "edit", onClick: () => openEditStaff(staff) },
        ]}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a staff member"
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
              form="staff-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add staff"}
            </button>
          </>
        }
      >
        <form id="staff-create-form" onSubmit={handleCreateStaff} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          <StaffFields value={draft} onChange={setDraft} idPrefix="staff-create" />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit staff member"
        description={
          editingStaff ? `${editingStaff.staffNo} · ${editingStaff.name}` : undefined
        }
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
    </div>
  );
};

export default StaffPage;
