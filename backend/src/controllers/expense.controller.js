import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expense.service";

export const getExpensesController = async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.id, {
      from: req.query.from,
      to: req.query.to,
    });
    res.status(200).json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const getExpenseController = async (req, res) => {
  try {
    const expense = await getExpenseById(req.user.id, req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.status(200).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createExpenseController = async (req, res) => {
  try {
    const expense = await createExpense(req.user.id, req.body);
    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateExpenseController = async (req, res) => {
  try {
    const expense = await updateExpense(req.user.id, req.params.id, req.body);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.status(200).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const deleteExpenseController = async (req, res) => {
  try {
    const result = await deleteExpense(req.user.id, req.params.id);
    if (result === null) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};