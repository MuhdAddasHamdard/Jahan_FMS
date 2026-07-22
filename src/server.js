import express from "express";
import userRoutes from "./routes/user.routes";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Financial Management System API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
