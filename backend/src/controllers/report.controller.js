import {
  getReportSummary as getReportSummaryService,
  getInstituteReport as getInstituteReportService,
} from "../services/report.service";

const isValidRange = (from, to) => {
  if (from && to && Date.parse(from) > Date.parse(to)) {
    return false;
  }
  return true;
};

export const getReportSummary = async (req, res) => {
  const { from, to } = req.query;

  if (!isValidRange(from, to)) {
    return res.status(400).json({
      message: "from date must be before or equal to to date",
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

  if (!isValidRange(from, to)) {
    return res.status(400).json({
      message: "from date must be before or equal to to date",
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