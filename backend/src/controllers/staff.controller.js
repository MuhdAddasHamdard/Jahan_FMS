import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
} from "../services/staff.service";
import { businessErrorToResponse } from "../utils/errors";
import { Prisma } from "../../generated/prisma/client";

export const getStaffList = async (req, res) => {
  try {
    const staff = await getAllStaff(req.user.id);
    res.status(200).json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getStaff = async (req, res) => {
  try {
    const staff = await getStaffById(req.user.id, req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.status(200).json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createStaffController = async (req, res) => {
  try {
    const staff = await createStaff(req.user.id, req.body);
    res.status(201).json(staff);
  } catch (error) {
    console.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Staff number already exists" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateStaffController = async (req, res) => {
  try {
    const staff = await updateStaff(req.user.id, req.params.id, req.body);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    res.status(200).json(staff);
  } catch (error) {
    console.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Staff number already exists" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteStaffController = async (req, res) => {
  try {
    const result = await deleteStaff(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Staff not found" });
    }
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