import { ROLES } from "../constants/roles";

export const validateRole = (req, res, next) => {
  const { role } = req.body;

  if (!role || !Object.values(ROLES).includes(role)) {
    return res.status(400).json({
      message: `Role must be one of: ${Object.values(ROLES).join(", ")}`,
    });
  }

  next();
};