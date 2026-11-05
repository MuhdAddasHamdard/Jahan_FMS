import { Prisma } from "../../generated/prisma/client";
import {
  createSalaryPayment,
  createSalaryRate,
  deleteSalaryPayment,
  deleteSalaryRate,
  getSalaryPayments,
  getSalaryRates,
  updateSalaryPayment,
  updateSalaryRate,
} from "../services/salary.service";
import { businessErrorToResponse } from "../utils/errors";

const respondToBusinessError = (res, error) => {
  const mapped = businessErrorToResponse(error);
  return res.status(mapped.status).json({ message: mapped.message });
};

export const getSalaryRatesController = async (req, res) => {
  try {
    res.status(200).json(await getSalaryRates());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createSalaryRateController = async (req, res) => {
  try {
    const result = await createSalaryRate(req.user.id, req.body);
    if (result.error) {
      return respondToBusinessError(res, result.error);
    }
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "A salary rate already exists for this staff member and effective date",
      });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateSalaryRateController = async (req, res) => {
  try {
    const result = await updateSalaryRate(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ message: "Salary rate not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "A salary rate already exists for this staff member and effective date",
      });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteSalaryRateController = async (req, res) => {
  try {
    const result = await deleteSalaryRate(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Salary rate not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getSalaryPaymentsController = async (req, res) => {
  try {
    res.status(200).json(await getSalaryPayments({ staffId: req.query.staffId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createSalaryPaymentController = async (req, res) => {
  try {
    const result = await createSalaryPayment(req.user.id, req.body);
    if (result.error) {
      return respondToBusinessError(res, result.error);
    }
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "This staff has already been paid for this period" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateSalaryPaymentController = async (req, res) => {
  try {
    const result = await updateSalaryPayment(req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ message: "Salary payment not found" });
    }
    if (result.error) {
      return respondToBusinessError(res, result.error);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteSalaryPaymentController = async (req, res) => {
  try {
    const result = await deleteSalaryPayment(req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Salary payment not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};
