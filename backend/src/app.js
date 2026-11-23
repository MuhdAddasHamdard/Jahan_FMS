import express from "express";
import cors from "cors";
import helmet from "helmet";
import prisma from "./prisma";
import { auditSensitiveChange } from "./middleware/audit.middleware";
import userRouter from "./routes/user.router";
import dashboardRouter from "./routes/dashboard.router";
import reportRouter from "./routes/report.router";
import classRouter from "./routes/class.router";
import studentRouter from "./routes/student.router";
import feeRouter from "./routes/fee.router";
import refundRouter from "./routes/refund.router";
import staffRouter from "./routes/staff.router";
import salaryRouter, { salaryPaymentRouter } from "./routes/salary.router";
import expenseRouter from "./routes/expense.router";
import settingsRouter from "./routes/settings.router";
import offlineRouter from "./routes/offline.router";

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Sync-Operation", "X-Sync-Device", "X-Sync-Revision", "X-Offline-Device"],
    exposedHeaders: ["X-Sync-Revision"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "3mb" }));
app.use(auditSensitiveChange);
app.use("/users", userRouter);
app.use("/dashboard", dashboardRouter);
app.use("/reports", reportRouter);
app.use("/classes", classRouter);
app.use("/students", studentRouter);
app.use("/fees", feeRouter);
app.use("/refunds", refundRouter);
app.use("/staff", staffRouter);
app.use("/salaries", salaryRouter);
app.use("/salary-payments", salaryPaymentRouter);
app.use("/expenses", expenseRouter);
app.use("/settings/offline", offlineRouter);
app.use("/settings", settingsRouter);

app.get("/", (req, res) => {
  res.send("Institute Management System API");
});

app.get("/health/ready", async (_req, res) => {
  const revision = process.env.JAHAN_RELEASE_SHA || "development";
  res.set("Cache-Control", "no-store");
  try {
    await prisma.$queryRaw`SELECT EXISTS (SELECT "sessionVersion" FROM "User"),
      EXISTS (SELECT "offlineMaxDays" FROM "InstituteSettings"),
      EXISTS (SELECT "trusted" FROM "OfflineDevice"),
      EXISTS (SELECT "recordKeys" FROM "SyncMutation")`;
    return res.json({ status: "ready", revision });
  } catch {
    return res.status(503).json({ status: "unavailable", revision });
  }
});

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: "That upload is too large. Please choose a smaller image or file.",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      message: "Request body is not valid JSON",
    });
  }

  return res.status(500).json({
    message: "Something went wrong on the server",
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

export default app;
