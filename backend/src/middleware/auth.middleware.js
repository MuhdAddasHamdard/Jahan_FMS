import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { syncReadRevision } from "./sync.middleware";

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization header is missing",
    });
  }
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: " Invalid authorization format ",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!Number.isInteger(decoded.id) || !Number.isInteger(decoded.sessionVersion)) {
      throw new Error("Invalid session claims");
    }
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: { id: true, role: true, permissions: true, deactivatedAt: true, sessionVersion: true },
    });

    if (!user || user.deactivatedAt || user.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = user;
    await syncReadRevision(req, res);
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong on the server" });
  }
};
