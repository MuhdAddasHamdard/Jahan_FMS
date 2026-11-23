import {
  getReportSummary as getReportSummaryService,
  getInstituteReport as getInstituteReportService,
} from "../services/report.service";
import { isValidKabulDateRange } from "../utils/kabulDate";

export const getReportSummary = async (req, res) => {
  const { from, to } = req.query;

  if (!isValidKabulDateRange(from, to)) {
    return res.status(400).json({
      message: "Enter a valid date range with the start before or on the end date",
    });
  }

  try {
    const summary = await getReportSummaryService(req.user.id, {
      from,
      to,
    });

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const getInstituteReport = async (req, res) => {
  const { from, to } = req.query;

  if (!isValidKabulDateRange(from, to)) {
    return res.status(400).json({
      message: "Enter a valid date range with the start before or on the end date",
    });
  }

  try {
    const report = await getInstituteReportService(req.user.id, { from, to });

    res.status(200).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};
