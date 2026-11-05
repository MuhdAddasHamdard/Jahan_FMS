export const authorizeRole = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
};

export const authorizeRoleOrPermission = (permission, ...requiredRoles) => {
  return (req, res, next) => {
    if (
      !req.user ||
      (!requiredRoles.includes(req.user.role) &&
        !req.user.permissions?.includes(permission))
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
};