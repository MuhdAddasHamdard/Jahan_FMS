export const validateInstituteSettings = (req, res, next) => {
  const { name, tagline, email, phone, address } = req.body;

  for (const field of ["name", "tagline", "email", "phone", "address"]) {
    if (req.body[field] !== undefined && typeof req.body[field] !== "string") {
      return res.status(400).json({ message: `${field} must be a string` });
    }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (
    name === undefined &&
    tagline === undefined &&
    email === undefined &&
    phone === undefined &&
    address === undefined
  ) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};