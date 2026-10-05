const DAYS = Array.from({ length: 7 }, (_, index) => index);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const validateClass = (req, res, next) => {
  const { name, section, teacherId } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (section !== undefined && (typeof section !== "string" || section.trim().length === 0)) {
    return res.status(400).json({ message: "Section must be a non-empty string" });
  }

  if (teacherId !== undefined && teacherId !== null && Number.isNaN(Number(teacherId))) {
    return res.status(400).json({ message: "teacherId must be a number" });
  }

  next();
};

export const validateClassUpdate = (req, res, next) => {
  const { name, section, teacherId } = req.body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (section !== undefined && (typeof section !== "string" || section.trim().length === 0)) {
    return res.status(400).json({ message: "Section must be a non-empty string" });
  }

  if (teacherId !== undefined) {
    if (teacherId === null) {
      req.body.clearTeacher = true;
    } else if (Number.isNaN(Number(teacherId))) {
      return res.status(400).json({ message: "teacherId must be a number" });
    }
  }

  if (name === undefined && section === undefined && teacherId === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};

export const validateClassSchedule = (req, res, next) => {
  const { dayOfWeek, startTime, endTime, room } = req.body;

  if (!Number.isInteger(Number(dayOfWeek)) || !DAYS.includes(Number(dayOfWeek))) {
    return res.status(400).json({ message: "dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday)" });
  }

  if (!startTime || typeof startTime !== "string" || !TIME_PATTERN.test(startTime)) {
    return res.status(400).json({ message: "startTime must be in HH:mm (24h) format" });
  }

  if (!endTime || typeof endTime !== "string" || !TIME_PATTERN.test(endTime)) {
    return res.status(400).json({ message: "endTime must be in HH:mm (24h) format" });
  }

  if (room !== undefined && room !== null && typeof room !== "string") {
    return res.status(400).json({ message: "room must be a string" });
  }

  next();
};

export const validateClassScheduleUpdate = (req, res, next) => {
  const { dayOfWeek, startTime, endTime, room } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["dayOfWeek", "startTime", "endTime", "room"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (
    dayOfWeek !== undefined &&
    (!Number.isInteger(Number(dayOfWeek)) || !DAYS.includes(Number(dayOfWeek)))
  ) {
    return res.status(400).json({
      message: "dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday)",
    });
  }

  if (startTime !== undefined && (typeof startTime !== "string" || !TIME_PATTERN.test(startTime))) {
    return res.status(400).json({ message: "startTime must be in HH:mm (24h) format" });
  }

  if (endTime !== undefined && (typeof endTime !== "string" || !TIME_PATTERN.test(endTime))) {
    return res.status(400).json({ message: "endTime must be in HH:mm (24h) format" });
  }

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    startTime.slice(0, 5) >= endTime.slice(0, 5)
  ) {
    return res.status(400).json({ message: "endTime must be after startTime" });
  }

  if (room !== undefined && room !== null && typeof room !== "string") {
    return res.status(400).json({ message: "room must be a string" });
  }

  if (room === null || room === "") {
    req.body.room = null;
  }

  next();
};

export const validateCourseMaterial = (req, res, next) => {
  const { title, description, link } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ message: "Title is required" });
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({ message: "description must be a string" });
  }

  if (link !== undefined && link !== null && typeof link !== "string") {
    return res.status(400).json({ message: "link must be a string" });
  }

  next();
};

export const validateCourseMaterialUpdate = (req, res, next) => {
  const { title, description, link } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["title", "description", "link"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    return res.status(400).json({ message: "Title must be a non-empty string" });
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({ message: "description must be a string" });
  }

  if (link !== undefined && link !== null && typeof link !== "string") {
    return res.status(400).json({ message: "link must be a string" });
  }

  if (description === "") req.body.description = null;
  if (link === "") req.body.link = null;

  next();
};