import express from "express";
import userRouter from "./routes/user.router";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use("/users", userRouter);

app.get("/", (req, res) => {
  res.send("Financial Management System API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
