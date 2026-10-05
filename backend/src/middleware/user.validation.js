const MAX_AVATAR_LENGTH = 1_500_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateManagedUserUpdate = (req, res, next) => {
  const { name, email, password } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["name", "email", "password"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not editable here` });
    }
  }

  if (name !== undefined && String(name).trim().length === 0) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (email !== undefined && !EMAIL_PATTERN.test(String(email))) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (password !== undefined && String(password).length < 8) {
    return res.status(400).json({ message: "password must be at least 8 characters long" });
  }

  next();
};

export const validateUser = (req, res, next) => {
  const { name, password, email } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email and password must be strings",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "password must be at least 8 characters long",
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    });
  }

  next();
};

export const validateProfileUpdate = (req, res, next) => {
  const { name, email, avatarUrl, password, currentPassword } = req.body;

  if (name !== undefined && typeof name !== "string") {
    return res.status(400).json({ message: "Name must be a string" });
  }

  if (email !== undefined) {
    if (typeof email !== "string") {
      return res.status(400).json({ message: "Email must be a string" });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      return res.status(400).json({ message: "Avatar must be a string" });
    }
    if (typeof avatarUrl === "string" && avatarUrl.length > MAX_AVATAR_LENGTH) {
      return res.status(413).json({
        message: "That photo is too large. Please choose a smaller image.",
      });
    }
  }

  if (password !== undefined) {
    if (typeof password !== "string") {
      return res.status(400).json({ message: "Password must be a string" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters long" });
    }
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ message: "Current password is required to change your password" });
    }
  }

  const hasUpdates = name !== undefined || email !== undefined || avatarUrl !== undefined || password !== undefined;
  if (!hasUpdates) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};
