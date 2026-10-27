import express from "express";
import userRouter from "./routes/user.router";
import dashboardRouter from "./routes/dashboard.router";
import reportRouter from "./routes/report.router";
import classRouter from "./routes/class.router";
import studentRouter from "./routes/student.router";
import feeRouter from "./routes/fee.router";
import refundRouter from "./routes/refund.router";
import staffRouter, { salaryRouter } from "./routes/staff.router";
import expenseRouter from "./routes/expense.router";
import settingsRouter from "./routes/settings.router";

const app = express();

app.use(express.json({ limit: "3mb" }));
app.use("/users", userRouter);
app.use("/dashboard", dashboardRouter);
app.use("/reports", reportRouter);
app.use("/classes", classRouter);
app.use("/students", studentRouter);
app.use("/fees", feeRouter);
app.use("/refunds", refundRouter);
app.use("/staff", staffRouter);
app.use("/salary-payments", salaryRouter);
app.use("/expenses", expenseRouter);
app.use("/settings", settingsRouter);

app.get("/", (req, res) => {
  res.send("Institute Management System API");
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