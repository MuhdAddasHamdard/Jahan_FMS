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

const ClassFields = ({ value, onChange, teachers, showTeacher, idPrefix, lockName = false }) => (
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
        hint="Who teaches this class"
      >
        <select
          id={`${idPrefix}-teacher`}
          value={value.teacherId}
          onChange={(event) => onChange({ ...value, teacherId: event.target.value })}
          className={inputClass}
        >
          <option value="">No assigned teacher</option>
          {teachers
            .filter((teacher) => teacher.role === "TEACHER")
            .map((teacher) => (
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

const ClassDetail = ({
  classRecord,
  onAddSchedule,
  onAddMaterial,
  onDeleteSchedule,
  onDeleteMaterial,
  onEditSchedule,
  onEditMaterial,
}) => (
  <div className="space-y-5">
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Schedule
      </h3>
      {classRecord.schedules?.length === 0 ? (
        <p className="text-sm text-slate-400">No schedule yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {classRecord.schedules.map((schedule) => (
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
                  onClick={() => onEditSchedule(schedule)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteSchedule(schedule)}
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
        <ScheduleFormInline classRecord={classRecord} onAddSchedule={onAddSchedule} />
      </div>
    </div>

    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Course materials
      </h3>
      {classRecord.materials?.length === 0 ? (
        <p className="text-sm text-slate-400">No materials yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {classRecord.materials.map((material) => (
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
                  onClick={() => onEditMaterial(material)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteMaterial(material)}
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
        <MaterialFormInline classRecord={classRecord} onAddMaterial={onAddMaterial} />
      </div>
    </div>
  </div>
);

const MaterialFormInline = ({ classRecord, onAddMaterial }) => {
  const [value, setValue] = useState({ title: "", description: "", link: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!value.title.trim()) {
      throw new Error("Title is required");
    }
    await onAddMaterial(classRecord.id, {
      title: value.title.trim(),
      description: value.description.trim() || null,
      link: value.link.trim() || null,
    });
    setValue({ title: "", description: "", link: "" });
  };

  return (
    <InlineForm onSubmit={handleSubmit} submitLabel="Add material">
      <MaterialFields value={value} onChange={setValue} idPrefix={`material-new-${classRecord.id}`} />
    </InlineForm>
  );
};

const ScheduleFormInline = ({ classRecord, onAddSchedule }) => {
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
    await onAddSchedule(classRecord.id, {
      dayOfWeek: Number(value.dayOfWeek),
      startTime: value.startTime,
      endTime: value.endTime,
      room: value.room.trim() || null,
    });
  };

  return (
    <InlineForm onSubmit={handleSubmit} submitLabel="Add schedule">
      <ScheduleFields value={value} onChange={setValue} idPrefix={`schedule-new-${classRecord.id}`} />
    </InlineForm>
  );
};

const ClassRow = ({
  classRecord,
  onDelete,
  onToggle,
  isOpen,
  onAddSchedule,
  onAddMaterial,
  onDeleteSchedule,
  onDeleteMaterial,
  onEditClass,
  onEditSchedule,
  onEditMaterial,
}) => (
  <li className="border-b border-slate-100 last:border-0">
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{classRecord.name}</p>
        <p className="text-xs text-slate-500">
          {classRecord.section ? `Section ${classRecord.section}` : "No section"}
          {classRecord.teacher
            ? ` · Teacher: ${classRecord.teacher.name}`
            : " · No teacher assigned"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          {formatNumber(classRecord.studentCount)} student
          {classRecord.studentCount === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => onEditClass(classRecord)}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          Edit
        </button>
        <button
          onClick={() => onToggle(classRecord)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50"
        >
          {isOpen ? "Hide details" : "Details"}
        </button>
        <button
          onClick={() => onDelete(classRecord)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
    {isOpen && (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
        <ClassDetail
          classRecord={classRecord}
          onAddSchedule={onAddSchedule}
          onAddMaterial={onAddMaterial}
          onDeleteSchedule={onDeleteSchedule}
          onDeleteMaterial={onDeleteMaterial}
          onEditSchedule={onEditSchedule}
          onEditMaterial={onEditMaterial}
        />
      </div>
    )}
  </li>
);

const ClassesPage = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [classList, setClassList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [draft, setDraft] = useState(emptyClass);
  const [editingClass, setEditingClass] = useState(null);
  const [editClassValue, setEditClassValue] = useState(emptyClass);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editScheduleValue, setEditScheduleValue] = useState({
    dayOfWeek: "0",
    startTime: "08:00",
    endTime: "09:00",
    room: "",
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editMaterialValue, setEditMaterialValue] = useState({
    title: "",
    description: "",
    link: "",
  });
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refreshClasses = async () => {
    const data = await api.get("/classes");
    setClassList(data);
  };

  const refreshDetail = async (classId) => {
    const detail = await api.get(`/classes/${classId}`);
    setDetailMap((current) => ({ ...current, [classId]: detail }));
  };

  useEffect(() => {
    let cancelled = false;

    const requests = [api.get("/classes")];
    if (isAdmin) {
      requests.push(api.get("/users").catch(() => []));
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
  }, [isAdmin]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Class name is required");
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
      if (openId === editingClass.id) {
        await refreshDetail(editingClass.id);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (classRecord) => {
    const nextOpen = openId === classRecord.id ? null : classRecord.id;
    setOpenId(nextOpen);

    if (nextOpen && !detailMap[classRecord.id]) {
      try {
        await refreshDetail(classRecord.id);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const addSchedule = async (classId, payload) => {
    try {
      await api.post(`/classes/${classId}/schedules`, payload);
      toast.success("Schedule added");
      await refreshDetail(classId);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const addMaterial = async (classId, payload) => {
    try {
      await api.post(`/classes/${classId}/materials`, payload);
      toast.success("Material added");
      await refreshDetail(classId);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const openEditSchedule = (schedule) => {
    setEditingSchedule({ schedule, classId: openId });
    setEditScheduleValue({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime.slice(0, 5),
      endTime: schedule.endTime.slice(0, 5),
      room: schedule.room ?? "",
    });
  };

  const handleUpdateSchedule = async (event) => {
    event.preventDefault();
    if (editScheduleValue.startTime >= editScheduleValue.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(
        `/classes/${editingSchedule.classId}/schedules/${editingSchedule.schedule.id}`,
        {
          dayOfWeek: Number(editScheduleValue.dayOfWeek),
          startTime: editScheduleValue.startTime,
          endTime: editScheduleValue.endTime,
          room: editScheduleValue.room.trim() || null,
        },
      );
      setEditingSchedule(null);
      toast.success("Schedule updated");
      await refreshDetail(editingSchedule.classId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditMaterial = (material) => {
    setEditingMaterial({ material, classId: openId });
    setEditMaterialValue({
      title: material.title,
      description: material.description ?? "",
      link: material.link ?? "",
    });
  };

  const handleUpdateMaterial = async (event) => {
    event.preventDefault();
    if (!editMaterialValue.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(
        `/classes/${editingMaterial.classId}/materials/${editingMaterial.material.id}`,
        {
          title: editMaterialValue.title.trim(),
          description: editMaterialValue.description.trim() || null,
          link: editMaterialValue.link.trim() || null,
        },
      );
      setEditingMaterial(null);
      toast.success("Material updated");
      await refreshDetail(editingMaterial.classId);
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
      if (deleting.type === "class") {
        await api.delete(`/classes/${deleting.record.id}`);
        setDetailMap((current) => {
          const next = { ...current };
          delete next[deleting.record.id];
          return next;
        });
        await refreshClasses();
      } else if (deleting.type === "schedule") {
        await api.delete(
          `/classes/${deleting.classId}/schedules/${deleting.record.id}`,
        );
        await refreshDetail(deleting.classId);
      } else {
        await api.delete(
          `/classes/${deleting.classId}/materials/${deleting.record.id}`,
        );
        await refreshDetail(deleting.classId);
      }
      toast.success("Deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteTitle =
    deleting?.type === "class"
      ? "Delete class"
      : deleting?.type === "schedule"
        ? "Delete schedule"
        : "Delete material";

  const deleteMessage =
    deleting?.type === "class"
      ? `"${deleting.record.name}" will be removed. Students are kept but will have no class.`
      : deleting?.type === "schedule"
        ? `This ${DAY_NAMES[deleting.record.dayOfWeek] ?? ""} ${deleting.record.startTime} - ${deleting.record.endTime} entry will be removed.`
        : deleting
          ? `"${deleting.record.title}" will be removed for students in this class.`
          : "";

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Manage classes, assigned teachers, schedules and course materials."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add a new class</h2>
        <ClassFields
          value={draft}
          onChange={setDraft}
          teachers={teachers}
          showTeacher={isAdmin}
          idPrefix="class-create"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add class"}
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
      ) : classList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No classes yet.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {classList.map((classRecord) => {
            const detail = detailMap[classRecord.id] ?? classRecord;
            return (
              <ClassRow
                key={classRecord.id}
                classRecord={detail}
                isOpen={openId === classRecord.id}
                onToggle={handleToggle}
                onEditClass={openEditClass}
                onDelete={(record) => setDeleting({ type: "class", record })}
                onAddSchedule={addSchedule}
                onAddMaterial={addMaterial}
                onDeleteSchedule={(record) =>
                  setDeleting({ type: "schedule", record, classId: openId })
                }
                onDeleteMaterial={(record) =>
                  setDeleting({ type: "material", record, classId: openId })
                }
                onEditSchedule={openEditSchedule}
                onEditMaterial={openEditMaterial}
              />
            );
          })}
        </ul>
      )}

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
            showTeacher={isAdmin}
            idPrefix="class-edit"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingSchedule)}
        onClose={() => setEditingSchedule(null)}
        title="Edit schedule"
        description={
          editingSchedule
            ? DAY_NAMES[editingSchedule.schedule.dayOfWeek]
            : undefined
        }
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
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="schedule-edit-form" onSubmit={handleUpdateSchedule}>
          <ScheduleFields
            value={editScheduleValue}
            onChange={setEditScheduleValue}
            idPrefix="schedule-edit"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingMaterial)}
        onClose={() => setEditingMaterial(null)}
        title="Edit material"
        description={editingMaterial ? editingMaterial.material.title : undefined}
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
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="material-edit-form" onSubmit={handleUpdateMaterial}>
          <MaterialFields
            value={editMaterialValue}
            onChange={setEditMaterialValue}
            idPrefix="material-edit"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleteTitle}
        message={deleteMessage}
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default ClassesPage;
