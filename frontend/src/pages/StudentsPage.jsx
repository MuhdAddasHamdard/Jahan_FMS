import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass, errorInputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber, formatDate } from "../utils/format";
import { PASSWORD_RULE, passwordLengthError } from "../utils/password";

const STATUSES = ["ACTIVE", "INACTIVE"];

const STATUS_HINTS = {
  ACTIVE: "Currently enrolled",
  INACTIVE: "Temporarily not attending",
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
  feeTypeId: "",
  feeAmount: "",
  installmentCount: "1",
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

    <FormField
      label="Class"
      htmlFor={`${idPrefix}-class`}
      hint="The student's teacher comes from this class"
    >
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
            {classRecord.section ? ` - Section ${classRecord.section}` : ""}
            {classRecord.teacher ? ` - ${classRecord.teacher.name}` : " - no teacher"}
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

const FeePlanFields = ({ value, onChange, feeTypes, idPrefix }) => {
  const selectedType = feeTypes.find(
    (type) => String(type.id) === String(value.feeTypeId),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Fee plan (optional)
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField
          label="Fee type"
          htmlFor={`${idPrefix}-fee-type`}
          hint="Leave empty to set up fees later"
        >
          <select
            id={`${idPrefix}-fee-type`}
            value={value.feeTypeId}
            onChange={(event) =>
              onChange({ ...value, feeTypeId: event.target.value, feeAmount: "" })
            }
            className={inputClass}
          >
            <option value="">No fee plan</option>
            {feeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} · {formatNumber(type.amount)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Total fee amount"
          htmlFor={`${idPrefix}-fee-amount`}
          hint={
            selectedType
              ? `Defaults to ${formatNumber(selectedType.amount)}`
              : "Set the fee type first"
          }
        >
          <input
            id={`${idPrefix}-fee-amount`}
            type="number"
            min="0"
            step="0.01"
            value={value.feeAmount}
            onChange={(event) => onChange({ ...value, feeAmount: event.target.value })}
            disabled={!value.feeTypeId}
            placeholder={selectedType ? String(selectedType.amount) : ""}
            className={`${inputClass} ${
              !value.feeTypeId ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
            }`}
          />
        </FormField>

        <FormField
          label="Installments"
          htmlFor={`${idPrefix}-installments`}
          hint="How many payments to split the fee into"
        >
          <input
            id={`${idPrefix}-installments`}
            type="number"
            min="1"
            step="1"
            value={value.installmentCount}
            onChange={(event) =>
              onChange({ ...value, installmentCount: event.target.value })
            }
            disabled={!value.feeTypeId}
            className={`${inputClass} ${
              !value.feeTypeId ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
            }`}
          />
        </FormField>
      </div>
    </div>
  );
};

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
  const [submitted, setSubmitted] = useState(false);

  const emailInvalid = !email.trim() || !email.trim().includes("@");
  const emailError = emailInvalid && (Boolean(email) || submitted)
    ? "A valid email is required"
    : "";
  const passwordError = !password
    ? submitted
      ? "Password is required"
      : ""
    : passwordLengthError(password);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitted(true);

    if (emailInvalid) {
      return;
    }
    if (passwordError) {
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
      setSubmitted(false);
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
        <FormField
          label="Login email"
          htmlFor={`${idPrefix}-account-email`}
          error={emailError}
        >
          <input
            id={`${idPrefix}-account-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e.g. ayesha@example.com"
            className={emailError ? errorInputClass : inputClass}
            aria-invalid={Boolean(emailError)}
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor={`${idPrefix}-account-password`}
          hint="At least 8 characters"
          error={passwordError}
          success={password && !passwordError ? PASSWORD_RULE.label + " ✓" : ""}
        >
          <input
            id={`${idPrefix}-account-password`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={passwordError ? errorInputClass : inputClass}
            aria-invalid={Boolean(passwordError)}
          />
        </FormField>
      </div>
      <button
        type="submit"
        disabled={submitting || Boolean(emailError) || Boolean(passwordError)}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create portal login"}
      </button>
    </form>
  );
};

const StudentDetail = ({ student, isTeacher, onChanged }) => {
  const toast = useToast();
  const [linking, setLinking] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [detail, setDetail] = useState(student);

  const handleLinkAccount = async (payload) => {
    setLinking(true);
    try {
      const result = await api.post(`/students/${student.id}/account`, payload);
      setDetail(result.student);
      toast.success("Portal login created");
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinkBusy(true);
    try {
      await api.delete(`/students/${student.id}/account`);
      const fresh = await api.get(`/students/${student.id}`);
      setDetail(fresh);
      setUnlinkOpen(false);
      toast.success("Portal login unlinked");
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
      setUnlinkOpen(false);
    } finally {
      setUnlinkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Class:</span>{" "}
          {detail.class
            ? `${detail.class.name}${detail.class.section ? ` (Section ${detail.class.section})` : ""}`
            : "Not assigned"}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Teacher:</span>{" "}
          {detail.class?.teacher?.name || "Not assigned"}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Parent / guardian:</span>{" "}
          {detail.guardianName || "—"}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Phone:</span>{" "}
          {detail.phone || "—"}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">Email:</span>{" "}
          {detail.email || "—"}
        </p>
        {!isTeacher && (
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Total refunded:</span>{" "}
            {formatNumber(detail.totalRefunded)}
          </p>
        )}
      </div>

      {!isTeacher && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Portal login
          </h3>
          {detail.account ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-700">
                  Linked to {detail.account.email}
                </p>
                <p className="text-[11px] text-slate-400">
                  The student can sign in and view dues, receipts and class info.
                </p>
              </div>
              <button
                onClick={() => setUnlinkOpen(true)}
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
                idPrefix={`student-${detail.id}`}
                onSubmit={handleLinkAccount}
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
          {detail.feePlans.length === 0 ? (
            <p className="text-sm text-slate-400">No fee plans.</p>
          ) : (
            <div className="space-y-3">
              {detail.feePlans.map((plan) => (
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
          {detail.refunds.length === 0 ? (
            <p className="text-sm text-slate-400">No refunds.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {detail.refunds.map((refund) => (
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

      <ConfirmDialog
        open={unlinkOpen}
        title="Unlink portal login"
        message={`${detail.name} will no longer be able to sign in to the student portal.`}
        busy={unlinkBusy}
        onConfirm={handleUnlink}
        onCancel={() => setUnlinkOpen(false)}
      />
    </div>
  );
};

const StudentDetailLoader = ({ student, isTeacher, onChanged }) => {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/students/${student.id}`)
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
  }, [student.id, toast]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-slate-400">Could not load student details.</p>;
  }

  return (
    <StudentDetail student={detail} isTeacher={isTeacher} onChanged={onChanged} />
  );
};

const StudentsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isTeacher = user?.role === "TEACHER";
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyStudent);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState(emptyStudent);
  const [deleting, setDeleting] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fetchStudents = async () => {
    const data = await api.get("/students");
    setStudents(data);
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/students"),
      api.get("/classes").catch(() => []),
      api.get("/fees/types").catch(() => []),
    ])
      .then(([studentList, classList, feeTypeList]) => {
        if (!cancelled) {
          setStudents(studentList);
          setClasses(classList ?? []);
          setFeeTypes(feeTypeList ?? []);
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
    setDraft(emptyStudent);
    setError("");
    setCreating(true);
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
      const payload = {
        admissionNo: draft.admissionNo.trim(),
        name: draft.name.trim(),
        guardianName: draft.guardianName.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        classId: draft.classId ? Number(draft.classId) : null,
        status: draft.status,
      };

      if (draft.feeTypeId) {
        payload.feeTypeId = Number(draft.feeTypeId);
        if (draft.feeAmount !== "") {
          payload.feeAmount = Number(draft.feeAmount);
        }
        payload.installmentCount = Math.max(1, Number(draft.installmentCount) || 1);
      }

      await api.post("/students", payload);
      setCreating(false);
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
      const detail = await api.get(`/students/${student.id}`);
      setEditing(detail);
      setEditValue({
        admissionNo: detail.admissionNo,
        name: detail.name,
        guardianName: detail.guardianName ?? "",
        phone: detail.phone ?? "",
        email: detail.email ?? "",
        classId: detail.classId ? String(detail.classId) : "",
        status: detail.status,
        feeTypeId: "",
        feeAmount: "",
        installmentCount: "1",
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
      await api.patch(`/students/${editing.id}`, {
        name: editValue.name.trim(),
        guardianName: editValue.guardianName.trim() || null,
        phone: editValue.phone.trim() || null,
        email: editValue.email.trim() || null,
        classId: editValue.classId ? Number(editValue.classId) : null,
        status: editValue.status,
      });
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

  const columns = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (student) => (
        <div>
          <p className="font-medium text-slate-900">{student.name}</p>
          <p className="text-xs text-slate-500">{student.admissionNo}</p>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class & teacher",
      sortable: true,
      sortValue: (student) => student.class?.name ?? "",
      render: (student) => (
        <div>
          <p className="text-slate-700">
            {student.class
              ? `${student.class.name}${student.class.section ? ` (Section ${student.class.section})` : ""}`
              : "No class"}
          </p>
          <p className="text-xs text-slate-500">
            {student.class?.teacher ? (
              student.class.teacher.name
            ) : (
              <span className="text-amber-600">
                {student.class ? "No teacher assigned" : "No class or teacher"}
              </span>
            )}
          </p>
        </div>
      ),
    },
    {
      key: "guardianName",
      header: "Guardian",
      sortable: true,
      render: (student) => (
        <div>
          <p className="text-slate-700">{student.guardianName || "—"}</p>
          {student.phone ? (
            <p className="text-xs text-slate-500">{student.phone}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (student) => (
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(student.status)}`}
        >
          {student.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage your students and their fee plans."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All students"
        count={students.length}
        loading={loading}
        rows={students}
        columns={columns}
        searchPlaceholder="Search by name, admission no, guardian..."
        searchValue={(student) =>
          [
            student.name,
            student.admissionNo,
            student.guardianName,
            student.phone,
            student.email,
            student.class?.name,
            student.class?.teacher?.name,
          ]
            .filter(Boolean)
            .join(" ")
        }
        filters={[
          {
            key: "status",
            label: "Filter by status",
            options: [
              { value: "", label: "All statuses" },
              ...STATUSES.map((status) => ({ value: status, label: status })),
            ],
            value: (student) => student.status,
          },
        ]}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        addButton={{ label: "Add student", onClick: openCreate }}
        emptyMessage="No students found."
        renderDetail={(student) => (
          <StudentDetailLoader
            student={student}
            isTeacher={isTeacher}
            onChanged={fetchStudents}
          />
        )}
        rowActions={(student) => {
          const actions = [
            { label: "Edit", icon: "edit", onClick: () => openEdit(student) },
          ];
          if (!isTeacher) {
            actions.push({
              label: "Delete",
              icon: "trash",
              tone: "danger",
              onClick: () => setDeleting(student),
            });
          }
          return actions;
        }}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a new student"
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
              form="student-create-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add student"}
            </button>
          </>
        }
      >
        <form id="student-create-form" onSubmit={handleCreate} className="space-y-4">
          {error && <Alert type="error" message={error} />}
          <StudentFields
            value={draft}
            onChange={setDraft}
            classes={classes}
            idPrefix="student-create"
          />
          <FeePlanFields
            value={draft}
            onChange={setDraft}
            feeTypes={feeTypes}
            idPrefix="student-create"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit student"
        description={editing ? `${editing.admissionNo} · ${editing.name}` : undefined}
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
    </div>
  );
};

export default StudentsPage;
