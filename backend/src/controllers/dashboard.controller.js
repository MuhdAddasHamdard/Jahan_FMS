import {
  getDashboardSummary,
  getAdminDashboardSummary,
  getTeacherDashboard,
} from "../services/dashboard.service";

export const getDashboard = async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.user.id);
    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    const summary = await getAdminDashboardSummary();
    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const getTeacherDashboardData = async (req, res) => {
  try {
    const summary = await getTeacherDashboard(req.user.id);
    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};