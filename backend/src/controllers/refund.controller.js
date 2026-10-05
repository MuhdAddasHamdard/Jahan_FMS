import {
  getRefunds,
  createRefund,
  updateRefund,
  deleteRefund,
} from "../services/refund.service";
import { businessErrorToResponse } from "../utils/errors";

export const getRefundsController = async (req, res) => {
  try {
    const refunds = await getRefunds(req.user.id, { studentId: req.query.studentId });
    res.status(200).json(refunds);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createRefundController = async (req, res) => {
  try {
    const result = await createRefund(req.user.id, req.body);
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

export const updateRefundController = async (req, res) => {
  try {
    const result = await updateRefund(req.user.id, req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ message: "Refund not found" });
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

export const deleteRefundController = async (req, res) => {
  try {
    const result = await deleteRefund(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Refund not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};