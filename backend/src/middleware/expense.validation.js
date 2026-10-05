const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const validateExpense = (req, res, next) => {
  const { description, amount, paidOn } = req.body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ message: "Description is required" });
  }

  if (!isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (paidOn !== undefined && Number.isNaN(Date.parse(paidOn))) {
    return res.status(400).json({ message: "paidOn must be a valid date" });
  }

  next();
};

export const validateExpenseUpdate = (req, res, next) => {
  const { description, amount, paidOn } = req.body;

  if (description !== undefined && (typeof description !== "string" || description.trim().length === 0)) {
    return res.status(400).json({ message: "Description must be a non-empty string" });
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (paidOn !== undefined && Number.isNaN(Date.parse(paidOn))) {
    return res.status(400).json({ message: "paidOn must be a valid date" });
  }

  if (description === undefined && amount === undefined && paidOn === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};