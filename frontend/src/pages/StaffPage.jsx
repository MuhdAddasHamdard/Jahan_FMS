import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";

const DESIGNATIONS = ["TEACHER", "ADMIN", "SUPPORT"];
const emptyStaff = {
  staffNo: "",
  name: "",
  designation: "TEACHER",
  phone: "",
  email: "",
};

const StaffFields = ({ value, onChange, idPrefix, lockStaffNo = false }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField label="Staff number" htmlFor={`${idPrefix}-staff-no`} hint="Your internal staff ID">
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

const validateStaff = (value) =>
  !value.staffNo.trim() || !value.name.trim()
    ? "Staff number and name are required"
    : "";

const designationClass = (designation) => {
  const styles = {
    TEACHER: "bg-blue-50 text-blue-700",
    ADMIN: "bg-purple-50 text-purple-700",
    SUPPORT: "bg-slate-100 text-slate-600",
  };
  return styles[designation] ?? "bg-slate-100 text-slate-600";
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

  const refreshStaff = async () => {
    const data = await api.get("/staff");
    setStaffList(data);
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
        <span className={`rounded px-2 py-1 text-xs font-semibold ${designationClass(staff.designation)}`}>
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
  ];

  return (
    <div>
      <PageHeader title="Staff" description="Manage staff members and contact information." />

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
