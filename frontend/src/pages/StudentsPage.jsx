import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate } from "../utils/format";

const STATUSES = ["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED"];

const STATUS_HINTS = {
  ACTIVE: "Currently enrolled",
  INACTIVE: "Temporarily not attending",
  GRADUATED: "Completed the course",
  SUSPENDED: "Enrolment paused",
};

const statusClass = (status) => {
  const styles = {
    ACTIVE: "bg-teal-50 text-teal-700",
    INACTIVE: "bg-slate-100 text-slate-600",
    GRADUATED: "bg-blue-50 text-blue-700",
    SUSPENDED: "bg-red-50 text-red-700",
  };
  return styles[status] ?? "bg-slate-100 text-slate-600";
};

const emptyStudent = {
  admissionNo: "",
  name: "",
  guardianName: "",
  phone: "",
  email: "",
  classId: "",
  status: "ACTIVE",
};

const StudentFields = ({ value, onChange, classes, idPrefix, lockAdmissionNo = false }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Admission number"
      htmlFor={`${idPrefix}-admission`}
      hint="Your internal student ID"
    >
      <input
        id={`${idPrefix}-admission`}
        type="text"
        value={value.admissionNo}
        onChange={(event) => onChange({ ...value, admissionNo: event.target.value })}
        disabled={lockAdmissionNo}
        placeholder="e.g. ADM-2024-015"
        className={`${inputClass} ${lockAdmissionNo ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
      />
    </FormField>

    <FormField label="Student name" htmlFor={`${idPrefix}-name`}>
      <input
        id={`${idPrefix}-name`}
        type="text"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="e.g. Ayesha Khan"
        className={inputClass}
      />
    </FormField>

    <FormField
      label="Guardian name"
      htmlFor={`${idPrefix}-guardian`}
      hint="The parent or guardian responsible for this student and their fees"
    >
      <input
        id={`${idPrefix}-guardian`}
        type="text"
        value={value.guardianName}
        onChange={(event) => onChange({ ...value, guardianName: event.target.value })}
        placeholder="e.g. Muhammad Khan"
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
        placeholder="e.g. ayesha@example.com"
        className={inputClass}
      />
    </FormField>

    <FormField label="Class" htmlFor={`${idPrefix}-class`} hint="Optional">
      <select
        id={`${idPrefix}-class`}
        value={value.classId}
        onChange={(event) => onChange({ ...value, classId: event.target.value })}
        className={inputClass}
      >
        <option value="">No class</option>
        {classes.map((classRecord) => (
          <option key={classRecord.id} value={classRecord.id}>
            {classRecord.name}
            {classRecord.section ? ` - ${classRecord.section}` : ""}
          </option>
        ))}
      </select>
    </FormField>

    <FormField
      label="Status"
      htmlFor={`${idPrefix}-status`}
      hint={STATUS_HINTS[value.status]}
    >
      <select
        id={`${idPrefix}-status`}
        value={value.status}
        onChange={(event) => onChange({ ...value, status: event.target.value })}
        className={inputClass}
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>
  </div>
);

const InstallmentRow = ({ installment }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
    <div>
      <p className="text-xs font-medium text-slate-700">
        {formatNumber(installment.amount)}
      </p>
      <p className="text-[11px] text-slate-400">
        Due {formatDate(installment.dueDate)}
      </p>
    </div>
    <div className="text-right">
      <p className="text-xs font-semibold text-slate-900">
        Paid {formatNumber(installment.paidAmount)}
      </p>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(installment.status)}`}
      >
        {installment.status}
      </span>
    </div>
  </div>
);

const AccountForm = ({ onSubmit, submitting, idPrefix }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("A valid email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await onSubmit({
        name: name.trim() || null,
        email: email.trim(),
        password,
      });
      setName("");
      setEmail("");
      setPassword("");
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
        <FormField label="Login name" htmlFor={`${idPrefix}-account-name`} hint="Optional">
          <input
            id={`${idPrefix}-account-name`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ayesha Khan"
            className={inputClass}
          />
        </FormField>
        <FormField label="Login email" htmlFor={`${idPrefix}-account-email`}>
          <input
            id={`${idPrefix}-account-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e.g. ayesha@example.com"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor={`${idPrefix}-account-password`}
          hint="At least 8 characters"
        >
          <input
            id={`${idPrefix}-account-password`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create portal login"}
      </button>
    </form>
  );
};

const StudentDetail = ({
  student,
  onLinkAccount,
  onUnlinkAccount,
  linking,
  isTeacher,
}) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-4 text-sm">
      <p className="text-slate-600">
        <span className="font-semibold text-slate-900">Parent / guardian:</span>{" "}
        {student.guardianName || "—"}
      </p>
      <p className="text-slate-600">
        <span className="font-semibold text-slate-900">Phone:</span>{" "}
        {student.phone || "—"}
      </p>
      <p className="text-slate-600">
        <span className="font-semibold text-slate-900">Email:</span>{" "}
        {student.email || "—"}
      </p>
      {!isTeacher && (
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Total refunded:</span>{" "}
          {formatNumber(student.totalRefunded)}
        </p>
      )}
    </div>

    {!isTeacher && (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Portal login
        </h3>
        {student.account ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-xs font-medium text-slate-700">
                Linked to {student.account.email}
              </p>
              <p className="text-[11px] text-slate-400">
                The student can sign in and view dues, receipts and class info.
              </p>
            </div>
            <button
              onClick={() => onUnlinkAccount(student)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              Unlink
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400">
              Create a login so this student can use the portal.
            </p>
            <AccountForm
              idPrefix={`student-${student.id}`}
              onSubmit={(payload) => onLinkAccount(student, payload)}
              submitting={linking}
            />
          </>
        )}
      </div>
    )}

    {!isTeacher && (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Fee plans
        </h3>
        {student.feePlans.length === 0 ? (
          <p className="text-sm text-slate-400">No fee plans.</p>
        ) : (
          <div className="space-y-3">
            {student.feePlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {plan.feeType.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total {formatNumber(plan.totalAmount)} · Paid{" "}
                      {formatNumber(plan.paidAmount)} · Balance{" "}
                      {formatNumber(plan.balance)}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(plan.status)}`}
                  >
                    {plan.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {plan.installments.map((installment) => (
                    <InstallmentRow key={installment.id} installment={installment} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {!isTeacher && (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Refunds
        </h3>
        {student.refunds.length === 0 ? (
          <p className="text-sm text-slate-400">No refunds.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {student.refunds.map((refund) => (
              <li
                key={refund.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {refund.reason || "Refund"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatDate(refund.refundedOn)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {formatNumber(refund.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);

const StudentRow = ({
  student,
  onToggleDetail,
  isOpen,
  onEdit,
  onDelete,
  onLinkAccount,
  onUnlinkAccount,
  linking,
  isTeacher,
}) => (
  <li className="border-b border-slate-100 last:border-0">
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={() => onToggleDetail(student)} className="flex-1 text-left">
        <p className="text-sm font-medium text-slate-900">{student.name}</p>
        <p className="text-xs text-slate-500">
          {student.admissionNo}
          {student.class ? ` · ${student.class.name}` : " · No class"}
        </p>
      </button>
      <div className="flex items-center gap-3">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(student.status)}`}
        >
          {student.status}
        </span>
        <button
          onClick={() => onEdit(student)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          Edit
        </button>
        <button
          onClick={() => onToggleDetail(student)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50"
        >
          {isOpen ? "Hide details" : "Details"}
        </button>
        <button
          onClick={() => onDelete(student)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
    {isOpen && (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
        <StudentDetail
          student={student}
          onLinkAccount={onLinkAccount}
          onUnlinkAccount={onUnlinkAccount}
          linking={linking}
          isTeacher={isTeacher}
        />
      </div>
    )}
  </li>
);

const StudentsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isTeacher = user?.role === "TEACHER";
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [draft, setDraft] = useState(emptyStudent);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyStudent);
  const [deleting, setDeleting] = useState(null);
  const [unlinking, setUnlinking] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fetchStudents = async (filter = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const path = filter ? `/students?status=${filter}` : "/students";
      const data = await api.get(path);
      setStudents(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.get("/students"), api.get("/classes")])
      .then(([studentList, classList]) => {
        if (!cancelled) {
          setStudents(studentList);
          setClasses(classList);
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

  const handleStatusFilter = async (nextStatus) => {
    setStatusFilter(nextStatus);
    setOpenId(null);
    setDetailMap({});
    await fetchStudents(nextStatus);
  };

  const handleToggleDetail = async (student) => {
    const nextOpen = openId === student.id ? null : student.id;
    setOpenId(nextOpen);

    if (nextOpen && !detailMap[student.id]) {
      try {
        const detail = await api.get(`/students/${student.id}`);
        setDetailMap((current) => ({ ...current, [student.id]: detail }));
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.admissionNo.trim() || !draft.name.trim()) {
      setError("Admission number and student name are required");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/students", {
        admissionNo: draft.admissionNo.trim(),
        name: draft.name.trim(),
        guardianName: draft.guardianName.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        classId: draft.classId ? Number(draft.classId) : null,
        status: draft.status,
      });
      setDraft(emptyStudent);
      toast.success("Student created");
      await fetchStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = async (student) => {
    try {
      const detail = detailMap[student.id] ?? (await api.get(`/students/${student.id}`));
      setEditing(detail);
      setEditValue({
        admissionNo: detail.admissionNo,
        name: detail.name,
        guardianName: detail.guardianName ?? "",
        phone: detail.phone ?? "",
        email: detail.email ?? "",
        classId: detail.classId ? String(detail.classId) : "",
        status: detail.status,
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editValue.name.trim()) {
      toast.error("Student name is required");
      return;
    }

    setSubmitting(true);
    try {
      const detail = await api.patch(`/students/${editing.id}`, {
        name: editValue.name.trim(),
        guardianName: editValue.guardianName.trim() || null,
        phone: editValue.phone.trim() || null,
        email: editValue.email.trim() || null,
        classId: editValue.classId ? Number(editValue.classId) : null,
        status: editValue.status,
      });
      setDetailMap((current) => ({ ...current, [editing.id]: detail }));
      setEditing(null);
      toast.success("Student updated");
      await fetchStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setConfirmBusy(true);
    try {
      await api.delete(`/students/${deleting.id}`);
      setDetailMap((current) => {
        const next = { ...current };
        delete next[deleting.id];
        return next;
      });
      setDeleting(null);
      toast.success("Student deleted");
      await fetchStudents();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleLinkAccount = async (student, payload) => {
    setLinking(true);
    try {
      const result = await api.post(`/students/${student.id}/account`, payload);
      setDetailMap((current) => ({ ...current, [student.id]: result.student }));
      toast.success("Portal login created");
      await fetchStudents();
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!unlinking) return;
    setConfirmBusy(true);
    try {
      await api.delete(`/students/${unlinking.id}/account`);
      const detail = await api.get(`/students/${unlinking.id}`);
      setDetailMap((current) => ({ ...current, [unlinking.id]: detail }));
      setUnlinking(null);
      toast.success("Portal login unlinked");
      await fetchStudents();
    } catch (err) {
      toast.error(err.message);
      setUnlinking(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage your students and their fee plans."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add a new student</h2>
        <StudentFields
          value={draft}
          onChange={setDraft}
          classes={classes}
          idPrefix="student-create"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add student"}
        </button>
      </form>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          All students
          {!loading && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              {students.length} shown
            </span>
          )}
        </h2>
        <div className="w-48">
          <label
            htmlFor="student-status-filter"
            className="mb-1 block text-xs font-semibold text-slate-600"
          >
            Filter by status
          </label>
          <select
            id="student-status-filter"
            value={statusFilter}
            onChange={(event) => handleStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {STATUSES.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} students found.`
              : "No students found."}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={detailMap[student.id] ?? student}
              isOpen={openId === student.id}
              onToggleDetail={handleToggleDetail}
              onEdit={openEdit}
              onDelete={setDeleting}
              onLinkAccount={handleLinkAccount}
              onUnlinkAccount={setUnlinking}
              linking={linking}
              isTeacher={isTeacher}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit student"
        description={
          editing ? `${editing.admissionNo} · ${editing.name}` : undefined
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
              form="student-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="student-edit-form" onSubmit={handleUpdate}>
          <StudentFields
            value={editValue}
            onChange={setEditValue}
            classes={classes}
            idPrefix="student-edit"
            lockAdmissionNo
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete student"
        message={
          deleting
            ? `"${deleting.name}" (${deleting.admissionNo}) will be removed, along with their fee plans and payments.`
            : ""
        }
        busy={confirmBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(unlinking)}
        title="Unlink portal login"
        message={
          unlinking
            ? `${unlinking.name} will no longer be able to sign in to the student portal.`
            : ""
        }
        busy={confirmBusy}
        onConfirm={handleUnlinkAccount}
        onCancel={() => setUnlinking(null)}
      />
    </div>
  );
};

export default StudentsPage;
