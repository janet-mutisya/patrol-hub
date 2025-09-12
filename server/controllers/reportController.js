const { Op } = require("sequelize");
const { Checkpoint, PatrolLog, User } = require("../models");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// Helper to calculate expected visits
const getExpectedVisits = (cp, shift, days = 1) => {
  const base = shift === "day" ? cp.expectedVisitsDay
             : shift === "night" ? cp.expectedVisitsNight
             : cp.expectedVisitsDay + cp.expectedVisitsNight;
  return base * days;
};

// ================================
// CHECKPOINT REPORT
// ================================
const getCheckpointReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();

    const report = await Promise.all(
      checkpoints.map(async (cp) => {
        const completed = await PatrolLog.count({
          where: {
            checkpointId: cp.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = getExpectedVisits(cp, shift);

        return {
          checkpointId: cp.id,
          checkpointName: cp.name,
          expected,
          completed,
          missed: Math.max(expected - completed, 0),
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate checkpoint report" });
  }
};

// ================================
// GUARD REPORT
// ================================
const getGuardReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const guards = await User.findAll({ where: { role: "guard" } });
    const checkpoints = await Checkpoint.findAll();

    const report = await Promise.all(
      guards.map(async (guard) => {
        const completed = await PatrolLog.count({
          where: {
            guardId: guard.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = checkpoints.reduce((sum, cp) => sum + getExpectedVisits(cp, shift), 0);

        return {
          guardId: guard.id,
          guardName: guard.name,
          expected,
          completed,
          missed: Math.max(expected - completed, 0),
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate guard report" });
  }
};

// ================================
// SUMMARY REPORT
// ================================
const getSummaryReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();
    const totalExpected = checkpoints.reduce((sum, cp) => sum + getExpectedVisits(cp, shift), 0);

    const totalCompleted = await PatrolLog.count({
      where: {
        timestamp: { [Op.between]: [startDate, endDate] },
        ...(shift && { shift }),
      },
    });

    res.json({
      date,
      shift,
      totalCheckpoints: checkpoints.length,
      totalExpected,
      totalCompleted,
      totalMissed: Math.max(totalExpected - totalCompleted, 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
};

// ================================
// MISSED VISITS
// ================================
const getMissedVisitsReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();

    const missed = await Promise.all(
      checkpoints.map(async (cp) => {
        const completed = await PatrolLog.count({
          where: {
            checkpointId: cp.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = getExpectedVisits(cp, shift);

        if (completed < expected) {
          return {
            checkpointName: cp.name,
            expected,
            completed,
            missed: expected - completed,
          };
        }
        return null;
      })
    );

    res.json(missed.filter((m) => m !== null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate missed visits report" });
  }
};

// ================================
// GUARD DETAIL REPORT
// ================================
const getGuardDetailReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const guard = await User.findByPk(id);
    if (!guard) return res.status(404).json({ error: "Guard not found" });

    const checkpoints = await Checkpoint.findAll();

    const details = await Promise.all(
      checkpoints.map(async (cp) => {
        const completed = await PatrolLog.count({
          where: {
            guardId: id,
            checkpointId: cp.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = getExpectedVisits(cp, shift);

        return {
          checkpointName: cp.name,
          expected,
          completed,
          missed: Math.max(expected - completed, 0),
        };
      })
    );

    res.json({
      guardId: guard.id,
      guardName: guard.name,
      checkpoints: details,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate guard detail report" });
  }
};

// ================================
// EXPORT CSV
// ================================
const exportReportsCSV = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();

    const report = await Promise.all(
      checkpoints.map(async (cp) => {
        const completed = await PatrolLog.count({
          where: {
            checkpointId: cp.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = getExpectedVisits(cp, shift);

        return {
          checkpoint: cp.name,
          expected,
          completed,
          missed: Math.max(expected - completed, 0),
        };
      })
    );

    const parser = new Parser({ fields: ["checkpoint", "expected", "completed", "missed"] });
    const csv = parser.parse(report);

    res.header("Content-Type", "text/csv");
    res.attachment(`report_${date}_${shift || "all"}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export CSV" });
  }
};

// ================================
// EXPORT PDF
// ================================
const exportReportsPDF = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();

    const report = await Promise.all(
      checkpoints.map(async (cp) => {
        const completed = await PatrolLog.count({
          where: {
            checkpointId: cp.id,
            timestamp: { [Op.between]: [startDate, endDate] },
            ...(shift && { shift }),
          },
        });

        const expected = getExpectedVisits(cp, shift);

        return {
          checkpoint: cp.name,
          expected,
          completed,
          missed: Math.max(expected - completed, 0),
        };
      })
    );

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report_${date}_${shift || "all"}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`Patrol Report - ${date} (${shift || "All Shifts"})`, { underline: true });
    doc.moveDown();

    report.forEach((row) => {
      doc.fontSize(12).text(`${row.checkpoint} | Expected: ${row.expected}, Completed: ${row.completed}, Missed: ${row.missed}`);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export PDF" });
  }
};

module.exports = {
  getCheckpointReport,
  getGuardReport,
  getSummaryReport,
  getMissedVisitsReport,
  getGuardDetailReport,
  exportReportsCSV,
  exportReportsPDF,
};
