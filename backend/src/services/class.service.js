import prisma from "../prisma";
import { ROLES } from "../constants/roles";

const formatTeacher = (teacher) =>
  teacher
    ? {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
      }
    : null;

const formatClass = (classRecord) => ({
  id: classRecord.id,
  name: classRecord.name,
  section: classRecord.section,
  teacher: formatTeacher(classRecord.teacher),
  studentCount: classRecord._count?.students ?? 0,
  createdAt: classRecord.createdAt,
  updatedAt: classRecord.updatedAt,
});

const formatSchedule = (schedule) => ({
  id: schedule.id,
  classId: schedule.classId,
  dayOfWeek: schedule.dayOfWeek,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  room: schedule.room,
  createdAt: schedule.createdAt,
});

const formatMaterial = (material) => ({
  id: material.id,
  classId: material.classId,
  title: material.title,
  description: material.description,
  link: material.link,
  createdAt: material.createdAt,
});

export const getAllClasses = async (userId) => {
  const classes = await prisma.class.findMany({
    where: { userId },
    include: {
      _count: { select: { students: true } },
      teacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return classes.map(formatClass);
};

export const getClassById = async (userId, id) => {
  const classRecord = await prisma.class.findFirst({
    where: { id: Number(id), userId },
    include: {
      _count: { select: { students: true } },
      teacher: { select: { id: true, name: true, email: true } },
      students: {
        select: { id: true, admissionNo: true, name: true, status: true },
        orderBy: { name: "asc" },
      },
      schedules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      materials: { orderBy: { createdAt: "desc" } },
    },
  });

  return classRecord
    ? {
        ...formatClass(classRecord),
        students: classRecord.students.map((student) => ({
          id: student.id,
          admissionNo: student.admissionNo,
          name: student.name,
          status: student.status,
        })),
        schedules: classRecord.schedules.map(formatSchedule),
        materials: classRecord.materials.map(formatMaterial),
      }
    : null;
};

const resolveTeacherId = async (teacherId) => {
  if (!teacherId) {
    return null;
  }

  const teacher = await prisma.user.findFirst({
    where: { id: Number(teacherId), role: ROLES.TEACHER },
    select: { id: true },
  });

  return teacher ? teacher.id : undefined;
};

export const createClass = async (userId, classData) => {
  const teacherId = await resolveTeacherId(classData.teacherId);

  if (teacherId === undefined) {
    return { error: "TEACHER_NOT_FOUND" };
  }

  const classRecord = await prisma.class.create({
    data: {
      name: classData.name,
      section: classData.section ?? null,
      teacherId,
      userId,
    },
    include: {
      _count: { select: { students: true } },
      teacher: { select: { id: true, name: true, email: true } },
    },
  });

  return formatClass(classRecord);
};

export const updateClass = async (userId, id, classData) => {
  const existing = await prisma.class.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  let teacherId;

  if (classData.clearTeacher) {
    teacherId = null;
  } else if (classData.teacherId !== undefined) {
    teacherId = await resolveTeacherId(classData.teacherId);

    if (teacherId === undefined) {
      return { error: "TEACHER_NOT_FOUND" };
    }
  }

  const classRecord = await prisma.class.update({
    where: { id: Number(id) },
    data: {
      name: classData.name ?? undefined,
      section: classData.section ?? undefined,
      teacherId,
    },
    include: {
      _count: { select: { students: true } },
      teacher: { select: { id: true, name: true, email: true } },
    },
  });

  return formatClass(classRecord);
};

export const deleteClass = async (userId, id) => {
  const existing = await prisma.class.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.class.delete({ where: { id: Number(id) } });

  return true;
};

export const getClassSchedules = async (userId, classId) => {
  const classRecord = await prisma.class.findFirst({
    where: { id: Number(classId), userId },
    select: { id: true },
  });

  if (!classRecord) {
    return null;
  }

  const schedules = await prisma.classSchedule.findMany({
    where: { classId: classRecord.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return schedules.map(formatSchedule);
};

export const createClassSchedule = async (userId, classId, scheduleData) => {
  const classRecord = await prisma.class.findFirst({
    where: { id: Number(classId), userId },
    select: { id: true },
  });

  if (!classRecord) {
    return { error: "CLASS_NOT_FOUND" };
  }

  const schedule = await prisma.classSchedule.create({
    data: {
      classId: classRecord.id,
      dayOfWeek: Number(scheduleData.dayOfWeek),
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      room: scheduleData.room ?? null,
      userId,
    },
  });

  return formatSchedule(schedule);
};

export const updateClassSchedule = async (userId, scheduleId, scheduleData) => {
  const schedule = await prisma.classSchedule.findFirst({
    where: {
      id: Number(scheduleId),
      class: { userId },
    },
    select: { id: true },
  });

  if (!schedule) {
    return null;
  }

  const updated = await prisma.classSchedule.update({
    where: { id: schedule.id },
    data: {
      dayOfWeek:
        scheduleData.dayOfWeek !== undefined
          ? Number(scheduleData.dayOfWeek)
          : undefined,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      room: scheduleData.room !== undefined ? scheduleData.room : undefined,
    },
  });

  return formatSchedule(updated);
};

export const deleteClassSchedule = async (userId, scheduleId) => {
  const schedule = await prisma.classSchedule.findFirst({
    where: {
      id: Number(scheduleId),
      class: { userId },
    },
    select: { id: true },
  });

  if (!schedule) {
    return null;
  }

  await prisma.classSchedule.delete({ where: { id: schedule.id } });

  return true;
};

export const getClassMaterials = async (userId, classId) => {
  const classRecord = await prisma.class.findFirst({
    where: { id: Number(classId), userId },
    select: { id: true },
  });

  if (!classRecord) {
    return null;
  }

  const materials = await prisma.courseMaterial.findMany({
    where: { classId: classRecord.id },
    orderBy: { createdAt: "desc" },
  });

  return materials.map(formatMaterial);
};

export const createCourseMaterial = async (userId, classId, materialData) => {
  const classRecord = await prisma.class.findFirst({
    where: { id: Number(classId), userId },
    select: { id: true },
  });

  if (!classRecord) {
    return { error: "CLASS_NOT_FOUND" };
  }

  const material = await prisma.courseMaterial.create({
    data: {
      classId: classRecord.id,
      title: String(materialData.title).trim(),
      description: materialData.description ?? null,
      link: materialData.link ?? null,
      userId,
    },
  });

  return formatMaterial(material);
};

export const updateCourseMaterial = async (userId, materialId, materialData) => {
  const material = await prisma.courseMaterial.findFirst({
    where: {
      id: Number(materialId),
      class: { userId },
    },
    select: { id: true },
  });

  if (!material) {
    return null;
  }

  const updated = await prisma.courseMaterial.update({
    where: { id: material.id },
    data: {
      title:
        materialData.title !== undefined
          ? String(materialData.title).trim()
          : undefined,
      description:
        materialData.description !== undefined ? materialData.description : undefined,
      link: materialData.link !== undefined ? materialData.link : undefined,
    },
  });

  return formatMaterial(updated);
};

export const deleteCourseMaterial = async (userId, materialId) => {
  const material = await prisma.courseMaterial.findFirst({
    where: {
      id: Number(materialId),
      class: { userId },
    },
    select: { id: true },
  });

  if (!material) {
    return null;
  }

  await prisma.courseMaterial.delete({ where: { id: material.id } });

  return true;
};