import {
  getAllFeeTypes,
  getFeeTypeById,
  createFeeType,
  updateFeeType,
  deleteFeeType,
  getAllFeePlans,
  getFeePlanById,
  createFeePlan,
  updateFeePlan,
  deleteFeePlan,
  collectFeePayment,
  getReceipts,
  updateReceipt,
} from "../services/fee.service";
import { businessErrorToResponse } from "../utils/errors";
import { Prisma } from "../../generated/prisma/client";

const sendResult = (res, result, created = false) => {
  if (result.error) {
    const mapped = businessErrorToResponse(result.error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
  return res.status(created ? 201 : 200).json(result);
};

export const getFeeTypes = async (req, res) => {
  try {
    const feeTypes = await getAllFeeTypes(req.user.id);
    res.status(200).json(feeTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getFeeType = async (req, res) => {
  try {
    const feeType = await getFeeTypeById(req.user.id, req.params.id);
    if (!feeType) {
      return res.status(404).json({ message: "Fee type not found" });
    }
    res.status(200).json(feeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createFeeTypeController = async (req, res) => {
  try {
    const result = await createFeeType(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateFeeTypeController = async (req, res) => {
  try {
    const result = await updateFeeType(req.user.id, req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ message: "Fee type not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteFeeTypeController = async (req, res) => {
  try {
    const result = await deleteFeeType(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Fee type not found" });
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

export const getFeePlans = async (req, res) => {
  try {
    const plans = await getAllFeePlans(req.user.id);
    res.status(200).json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getFeePlan = async (req, res) => {
  try {
    const plan = await getFeePlanById(req.user.id, req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "Fee plan not found" });
    }
    res.status(200).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createFeePlanController = async (req, res) => {
  try {
    const result = await createFeePlan(req.user.id, req.body);
    sendResult(res, result, true);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "This student already has this fee assigned" });
    }
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateFeePlanController = async (req, res) => {
  try {
    const result = await updateFeePlan(req.user.id, req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ message: "Fee plan not found" });
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

export const deleteFeePlanController = async (req, res) => {
  try {
    const result = await deleteFeePlan(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Fee plan not found" });
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

export const collectFeePaymentController = async (req, res) => {
  try {
    const result = await collectFeePayment(req.user.id, req.body);
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

export const updateReceiptController = async (req, res) => {
  try {
    const receipt = await updateReceipt(req.user.id, req.params.id, req.body);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    res.status(200).json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getReceiptsController = async (req, res) => {
  try {
    const receipts = await getReceipts(req.user.id);
    res.status(200).json(receipts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};