import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassSchedules,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  getClassMaterials,
  createCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterial,
} from "../services/class.service";
import { businessErrorToResponse } from "../utils/errors";

export const getClasses = async (req, res) => {
  try {
    const classes = await getAllClasses(req.user.id);
    res.status(200).json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getClass = async (req, res) => {
  try {
    const classRecord = await getClassById(req.user.id, req.params.id);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json(classRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createClassController = async (req, res) => {
  try {
    const classRecord = await createClass(req.user.id, req.body);
    res.status(201).json(classRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateClassController = async (req, res) => {
  try {
    const classRecord = await updateClass(req.user.id, req.params.id, req.body);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json(classRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteClassController = async (req, res) => {
  try {
    const result = await deleteClass(req.user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getClassSchedulesController = async (req, res) => {
  try {
    const schedules = await getClassSchedules(req.user.id, req.params.id);
    if (schedules === null) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createClassScheduleController = async (req, res) => {
  try {
    const result = await createClassSchedule(req.user.id, req.params.id, req.body);
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateClassScheduleController = async (req, res) => {
  try {
    const result = await updateClassSchedule(
      req.user.id,
      req.params.scheduleId,
      req.body,
    );
    if (result === null) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteClassScheduleController = async (req, res) => {
  try {
    const result = await deleteClassSchedule(req.user.id, req.params.scheduleId);
    if (result === null) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getClassMaterialsController = async (req, res) => {
  try {
    const materials = await getClassMaterials(req.user.id, req.params.id);
    if (materials === null) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createCourseMaterialController = async (req, res) => {
  try {
    const result = await createCourseMaterial(req.user.id, req.params.id, req.body);
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateCourseMaterialController = async (req, res) => {
  try {
    const result = await updateCourseMaterial(
      req.user.id,
      req.params.materialId,
      req.body,
    );
    if (result === null) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteCourseMaterialController = async (req, res) => {
  try {
    const result = await deleteCourseMaterial(req.user.id, req.params.materialId);
    if (result === null) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};