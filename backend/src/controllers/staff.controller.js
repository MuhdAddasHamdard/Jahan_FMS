import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getSalaryPayments,
  createSalaryPayment,
  updateSalaryPayment,
  deleteSalaryPayment,
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

export const getSalaryPaymentsController = async (req, res) => {
  try {
    const payments = await getSalaryPayments(req.user.id, { staffId: req.query.staffId });
    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createSalaryPaymentController = async (req, res) => {
  try {
    const result = await createSalaryPayment(req.user.id, req.body);
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "This staff has already been paid for this period" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateSalaryPaymentController = async (req, res) => {
  try {
    const result = await updateSalaryPayment(req.user.id, req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ message: "Salary payment not found" });
    }
    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteSalaryPaymentController = async (req, res) => {
  try {
    const result = await deleteSalaryPayment(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Salary payment not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};