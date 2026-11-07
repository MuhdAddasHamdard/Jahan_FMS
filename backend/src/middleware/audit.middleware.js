const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE"]);

export const auditSensitiveChange = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method) || req.path === "/users/login") {
    return next();
  }

  res.once("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.user?.id) {
      return;
    }

    console.info(
      JSON.stringify({
        type: "audit",
        actorId: req.user.id,
        action: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  return next();
};
