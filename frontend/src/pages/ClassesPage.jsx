import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatNumber } from "../utils/format";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyClass = { name: "", section: "", teacherId: "" };

const ClassFields = ({
  value,
  onChange,
  teachers,
  showTeacher,
  teacherRequired = false,
  idPrefix,
  lockName = false,
}) => (
  <div className="grid gap-3 sm:grid-cols-3">
    <FormField label="Class name" htmlFor={`${idPrefix}-name`} hint="e.g. Grade 5">
      <input
        id={`${idPrefix}-name`}
        type="text"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        disabled={lockName}
        placeholder="e.g. Grade 5"
        className={`${inputClass} ${lockName ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
      />
    </FormField>

    <FormField label="Section" htmlFor={`${idPrefix}-section`} hint="Optional, e.g. A">
      <input
        id={`${idPrefix}-section`}
        type="text"
        value={value.section}
        onChange={(event) => onChange({ ...value, section: event.target.value })}
        placeholder="e.g. A"
        className={inputClass}
      />
    </FormField>

    {showTeacher && (
      <FormField
        label="Assigned teacher"
        htmlFor={`${idPrefix}-teacher`}
        hint={teacherRequired ? "Required — choose who teaches this class" : "Who teaches this class"}
      >
        <select
          id={`${idPrefix}-teacher`}
          value={value.teacherId}
          onChange={(event) => onChange({ ...value, teacherId: event.target.value })}
          className={inputClass}
        >
          <option value="">
            {teacherRequired ? "Select a teacher" : "No assigned teacher"}
          </option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.email})
            </option>
          ))}
        </select>
      </FormField>
    )}
  </div>
);

const ScheduleFields = ({ value, onChange, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-4">
    <FormField label="Day" htmlFor={`${idPrefix}-day`}>
      <select
        id={`${idPrefix}-day`}
        value={value.dayOfWeek}
        onChange={(event) => onChange({ ...value, dayOfWeek: event.target.value })}
        className={inputClass}
      >
        {DAY_NAMES.map((day, index) => (
          <option key={day} value={index}>
            {day}
          </option>
        ))}
      </select>
    </FormField>

    <FormField label="Start time" htmlFor={`${idPrefix}-start`}>
      <input
        id={`${idPrefix}-start`}
        type="time"
        value={value.startTime}
        onChange={(event) => onChange({ ...value, startTime: event.target.value })}
        className={inputClass}
      />
    </FormField>

    <FormField label="End time" htmlFor={`${idPrefix}-end`}>
      <input
        id={`${idPrefix}-end`}
        type="time"
        value={value.endTime}
        onChange={(event) => onChange({ ...value, endTime: event.target.value })}
        className={inputClass}
      />
    </FormField>

    <FormField label="Room" htmlFor={`${idPrefix}-room`} hint="Optional">
      <input
        id={`${idPrefix}-room`}
        type="text"
        value={value.room}
        onChange={(event) => onChange({ ...value, room: event.target.value })}
        placeholder="e.g. Room 204"
        className={inputClass}
      />
    </FormField>
  </div>
);

const MaterialFields = ({ value, onChange, idPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    <FormField label="Title" htmlFor={`${idPrefix}-title`}>
      <input
        id={`${idPrefix}-title`}
        type="text"
        value={value.title}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        placeholder="e.g. Chapter 1 slides"
        className={inputClass}
      />
    </FormField>

    <FormField label="Description" htmlFor={`${idPrefix}-description`} hint="Optional">
      <input
        id={`${idPrefix}-description`}
        type="text"
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        placeholder="e.g. Fractions and decimals"
        className={inputClass}
      />
    </FormField>

    <FormField
      label="Link"
      htmlFor={`${idPrefix}-link`}
      hint="Optional — students can open it from their portal"
    >
      <input
        id={`${idPrefix}-link`}
        type="url"
        value={value.link}
        onChange={(event) => onChange({ ...value, link: event.target.value })}
        placeholder="https://example.com/notes.pdf"
        className={inputClass}
      />
    </FormField>
  </div>
);

const InlineForm = ({ onSubmit, submitLabel, children }) => {
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert type="error" message={error} />}
      {children}
      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        {submitLabel}
      </button>
    </form>
  );
};

const MaterialFormInline = ({ classId, onAddMaterial }) => {
  const [value, setValue] = useState({ title: "", description: "", link: "" });

  const handleSubmit = async () => {
    if (!value.title.trim()) {
      throw new Error("Title is required");
    }
    await onAddMaterial(classId, {
      title: value.title.trim(),
      description: value.description.trim() || null,
      link: value.link.trim() || null,
    });
    setValue({ title: "", description: "", link: "" });
  };

  return (
    <InlineForm onSubmit={handleSubmit} submitLabel="Add material">
      <MaterialFields value={value} onChange={setValue} idPrefix={`material-new-${classId}`} />
    </InlineForm>
  );
};

const ScheduleFormInline = ({ classId, onAddSchedule }) => {
  const [value, setValue] = useState({
    dayOfWeek: "1",
    startTime: "08:00",
    endTime: "09:00",
    room: "",
  });

  const handleSubmit = async () => {
    if (value.startTime >= value.endTime) {
      throw new Error("End time must be after start time");
    }
    await onAddSchedule(classId, {
      dayOfWeek: Number(value.dayOfWeek),
      startTime: value.startTime,
      endTime: value.endTime,
      room: value.room.trim() || null,
    });
  };

  return (
    <InlineForm onSubmit={handleSubmit} submitLabel="Add schedule">
      <ScheduleFields value={value} onChange={setValue} idPrefix={`schedule-new-${classId}`} />
    </InlineForm>
  );
};

const ClassDetailPanel = ({ classRecord }) => {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleValue, setScheduleValue] = useState({
    dayOfWeek: "0",
    startTime: "08:00",
    endTime: "09:00",
    room: "",
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialValue, setMaterialValue] = useState({
    title: "",
    description: "",
    link: "",
  });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const data = await api.get(`/classes/${classRecord.id}`);
    setDetail(data);
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/classes/${classRecord.id}`)
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
  }, [classRecord.id, toast]);

  const addSchedule = async (classId, payload) => {
    try {
      await api.post(`/classes/${classId}/schedules`, payload);
      toast.success("Schedule added");
      await refresh();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const addMaterial = async (classId, payload) => {
    try {
      await api.post(`/classes/${classId}/materials`, payload);
      toast.success("Material added");
      await refresh();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleValue({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime.slice(0, 5),
      endTime: schedule.endTime.slice(0, 5),
      room: schedule.room ?? "",
    });
  };

  const handleUpdateSchedule = async (event) => {
    event.preventDefault();
    if (scheduleValue.startTime >= scheduleValue.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/classes/${detail.id}/schedules/${editingSchedule.id}`, {
        dayOfWeek: Number(scheduleValue.dayOfWeek),
        startTime: scheduleValue.startTime,
        endTime: scheduleValue.endTime,
        room: scheduleValue.room.trim() || null,
      });
      setEditingSchedule(null);
      toast.success("Schedule updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openEditMaterial = (material) => {
    setEditingMaterial(material);
    setMaterialValue({
      title: material.title,
      description: material.description ?? "",
      link: material.link ?? "",
    });
  };

  const handleUpdateMaterial = async (event) => {
    event.preventDefault();
    if (!materialValue.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/classes/${detail.id}/materials/${editingMaterial.id}`, {
        title: materialValue.title.trim(),
        description: materialValue.description.trim() || null,
        link: materialValue.link.trim() || null,
      });
      setEditingMaterial(null);
      toast.success("Material updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.type === "schedule") {
        await api.delete(`/classes/${detail.id}/schedules/${deleting.record.id}`);
      } else {
        await api.delete(`/classes/${detail.id}/materials/${deleting.record.id}`);
      }
      toast.success("Deleted");
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
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
    return <p className="text-sm text-slate-400">Could not load class details.</p>;
  }

  const deleteTitle =
    deleting?.type === "schedule" ? "Delete schedule" : "Delete material";
  const deleteMessage =
    deleting?.type === "schedule"
      ? `This ${DAY_NAMES[deleting.record.dayOfWeek] ?? ""} ${deleting.record.startTime} - ${deleting.record.endTime} entry will be removed.`
      : deleting
        ? `"${deleting.record.title}" will be removed for students in this class.`
        : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
        <span className="text-slate-500">
          Class:{" "}
          <span className="font-semibold text-slate-900">
            {detail.name}
            {detail.section ? ` · Section ${detail.section}` : ""}
          </span>
        </span>
        <span className="text-slate-500">
          Teacher:{" "}
          <span className="font-semibold text-slate-900">
            {detail.teacher ? detail.teacher.name : "Not assigned"}
          </span>
        </span>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Schedule
        </h3>
        {detail.schedules?.length === 0 ? (
          <p className="text-sm text-slate-400">No schedule yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {detail.schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {DAY_NAMES[schedule.dayOfWeek] ?? schedule.dayOfWeek}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {schedule.startTime} - {schedule.endTime}
                    {schedule.room ? ` · ${schedule.room}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditSchedule(schedule)}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting({ type: "schedule", record: schedule })}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <ScheduleFormInline classId={detail.id} onAddSchedule={addSchedule} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Course materials
        </h3>
        {detail.materials?.length === 0 ? (
          <p className="text-sm text-slate-400">No materials yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {detail.materials.map((material) => (
              <li key={material.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-700">{material.title}</p>
                  {(material.description || material.link) && (
                    <p className="text-[11px] text-slate-400">
                      {material.description}
                      {material.link ? ` · ${material.link}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditMaterial(material)}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting({ type: "material", record: material })}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <MaterialFormInline classId={detail.id} onAddMaterial={addMaterial} />
        </div>
      </div>

      <Modal
        open={Boolean(editingSchedule)}
        onClose={() => setEditingSchedule(null)}
        title="Edit schedule"
        description={editingSchedule ? DAY_NAMES[editingSchedule.dayOfWeek] : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingSchedule(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-edit-form"
              disabled={busy}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="schedule-edit-form" onSubmit={handleUpdateSchedule}>
          <ScheduleFields
            value={scheduleValue}
            onChange={setScheduleValue}
            idPrefix="schedule-edit"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingMaterial)}
        onClose={() => setEditingMaterial(null)}
        title="Edit material"
        description={editingMaterial ? editingMaterial.title : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingMaterial(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="material-edit-form"
              disabled={busy}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="material-edit-form" onSubmit={handleUpdateMaterial}>
          <MaterialFields
            value={materialValue}
            onChange={setMaterialValue}
            idPrefix="material-edit"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleteTitle}
        message={deleteMessage}
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

const ClassesPage = () => {
  const { isAdmin, isFinance } = useAuth();
  const canAssignTeacher = isAdmin || isFinance;
  const canDeleteClass = isAdmin || isFinance;
  const toast = useToast();
  const [classList, setClassList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyClass);
  const [editingClass, setEditingClass] = useState(null);
  const [editClassValue, setEditClassValue] = useState(emptyClass);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refreshClasses = async () => {
    const data = await api.get("/classes");
    setClassList(data);
  };

  useEffect(() => {
    let cancelled = false;

    const requests = [api.get("/classes")];
    if (canAssignTeacher) {
      requests.push(api.get("/users/teachers").catch(() => []));
    }

    Promise.all(requests)
      .then(([classData, teacherList]) => {
        if (!cancelled) {
          setClassList(classData);
          setTeachers(teacherList ?? []);
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
  }, [canAssignTeacher]);

  const openCreate = () => {
    setDraft(emptyClass);
    setError("");
    setCreating(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Class name is required");
      return;
    }
    if (canAssignTeacher && !draft.teacherId) {
      setError("Choose a teacher for the class");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/classes", {
        name: draft.name.trim(),
        section: draft.section.trim() || null,
        teacherId: draft.teacherId ? Number(draft.teacherId) : null,
      });
      setCreating(false);
      setDraft(emptyClass);
      toast.success("Class created");
      await refreshClasses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditClass = (classRecord) => {
    setEditingClass(classRecord);
    setEditClassValue({
      name: classRecord.name,
      section: classRecord.section ?? "",
      teacherId: classRecord.teacher ? String(classRecord.teacher.id) : "",
    });
  };

  const handleUpdateClass = async (event) => {
    event.preventDefault();
    if (!editClassValue.name.trim()) {
      toast.error("Class name is required");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/classes/${editingClass.id}`, {
        name: editClassValue.name.trim(),
        section: editClassValue.section.trim() || null,
        teacherId: editClassValue.teacherId
          ? Number(editClassValue.teacherId)
          : null,
      });
      setEditingClass(null);
      toast.success("Class updated");
      await refreshClasses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/classes/${deleting.id}`);
      toast.success("Class deleted");
      setDeleting(null);
      await refreshClasses();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Class",
      sortable: true,
      render: (classRecord) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{classRecord.name}</span>
          {classRecord.section ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              Section {classRecord.section}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "teacher",
      header: "Teacher",
      sortable: true,
      sortValue: (classRecord) => classRecord.teacher?.name ?? "",
      render: (classRecord) =>
        classRecord.teacher ? (
          <span className="text-slate-700">{classRecord.teacher.name}</span>
        ) : (
          <span className="text-amber-600">No teacher assigned</span>
        ),
    },
    {
      key: "studentCount",
      header: "Students",
      align: "right",
      sortable: true,
      sortValue: (classRecord) => classRecord.studentCount ?? 0,
      render: (classRecord) => (
        <span className="text-slate-700">
          {formatNumber(classRecord.studentCount)} student
          {classRecord.studentCount === 1 ? "" : "s"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Manage classes, assigned teachers, schedules and course materials."
      />

      {error && !creating && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <DataTable
        title="All classes"
        count={classList.length}
        loading={loading}
        rows={classList}
        columns={columns}
        searchPlaceholder="Search classes..."
        searchValue={(classRecord) =>
          [classRecord.name, classRecord.section, classRecord.teacher?.name]
            .filter(Boolean)
            .join(" ")
        }
        defaultSort={{ key: "createdAt", direction: "desc" }}
        addButton={{ label: "Add class", onClick: openCreate }}
        emptyMessage="No classes yet."
        renderDetail={(classRecord) => (
          <ClassDetailPanel classRecord={classRecord} />
        )}
        rowActions={(classRecord) => {
          const actions = [
            { label: "Edit", icon: "edit", onClick: () => openEditClass(classRecord) },
          ];
          if (canDeleteClass) {
            actions.push({
              label: "Delete",
              icon: "trash",
              tone: "danger",
              onClick: () => setDeleting(classRecord),
            });
          }
          return actions;
        }}
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a new class"
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
              form="class-create-form"
              disabled={submitting || (canAssignTeacher && !draft.teacherId)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add class"}
            </button>
          </>
        }
      >
        <form id="class-create-form" onSubmit={handleCreate} className="space-y-3">
          {error && <Alert type="error" message={error} />}
          {canAssignTeacher && teachers.length === 0 && (
            <Alert
              type="info"
              message="No teachers available yet. Add a teacher under Staff & Salaries or User management, then create the class."
            />
          )}
          <ClassFields
            value={draft}
            onChange={setDraft}
            teachers={teachers}
            showTeacher={canAssignTeacher}
            teacherRequired={canAssignTeacher}
            idPrefix="class-create"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingClass)}
        onClose={() => setEditingClass(null)}
        title="Edit class"
        description={editingClass ? editingClass.name : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingClass(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="class-edit-form"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="class-edit-form" onSubmit={handleUpdateClass}>
          <ClassFields
            value={editClassValue}
            onChange={setEditClassValue}
            teachers={teachers}
            showTeacher={canAssignTeacher}
            idPrefix="class-edit"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete class"
        message={
          deleting
            ? `"${deleting.name}" will be removed. Students are kept but will have no class.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default ClassesPage;
