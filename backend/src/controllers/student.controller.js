import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  linkStudentAccount,
  unlinkStudentAccount,
  getStudentPortal,
} from "../services/student.service";
import { businessErrorToResponse } from "../utils/errors";
import { Prisma } from "../../generated/prisma/client";

export const getStudents = async (req, res) => {
  try {
    const students = await getAllStudents(req.user.id, {
      status: req.query.status,
      classId: req.query.classId,
    });
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getStudent = async (req, res) => {
  try {
    const student = await getStudentById(req.user.id, req.params.id, req.user.role);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createStudentController = async (req, res) => {
  try {
    const student = await createStudent(req.user.id, req.body);
    res.status(201).json(student);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Admission number already exists" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateStudentController = async (req, res) => {
  try {
    const student = await updateStudent(req.user.id, req.params.id, req.body);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Admission number already exists" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteStudentController = async (req, res) => {
  try {
    const result = await deleteStudent(req.user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getMyPortalController = async (req, res) => {
  try {
    const portal = await getStudentPortal(req.user.id);
    if (!portal) {
      return res.status(404).json({ message: "No student profile linked to this account" });
    }
    res.status(200).json(portal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const linkStudentAccountController = async (req, res) => {
  try {
    const result = await linkStudentAccount(req.user.id, req.params.id, req.body);
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const unlinkStudentAccountController = async (req, res) => {
  try {
    const result = await unlinkStudentAccount(req.user.id, req.params.id);
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};