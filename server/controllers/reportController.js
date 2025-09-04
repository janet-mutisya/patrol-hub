const { Op } = require("sequelize");
const { Checkpoint, PatrolLog, User } = require("../models");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// ✅ Existing ones
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

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay
            : shift === "night"
            ? cp.expectedVisitsNight
            : cp.expectedVisitsDay + cp.expectedVisitsNight;

        return {
          checkpointId: cp.id,
          checkpointName: cp.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate checkpoint report" });
  }
};

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

        let expected = 0;
        checkpoints.forEach((cp) => {
          expected +=
            shift === "day"
              ? cp.expectedVisitsDay
              : shift === "night"
              ? cp.expectedVisitsNight
              : cp.expectedVisitsDay + cp.expectedVisitsNight;
        });

        return {
          guardId: guard.id,
          guardName: guard.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate guard report" });
  }
};

//
// 🔹 NEW REPORTS
//

// 1️⃣ Daily/Shift Summary
const getSummaryReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkpoints = await Checkpoint.findAll();
    let totalExpected = 0;

    checkpoints.forEach((cp) => {
      totalExpected +=
        shift === "day"
          ? cp.expectedVisitsDay
          : shift === "night"
          ? cp.expectedVisitsNight
          : cp.expectedVisitsDay + cp.expectedVisitsNight;
    });

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
      totalMissed: totalExpected - totalCompleted > 0 ? totalExpected - totalCompleted : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
};

// 2️⃣ Multi-day Checkpoint Stats
const getRangeCheckpointReport = async (req, res) => {
  try {
    const { start, end, shift } = req.query;
    const startDate = new Date(start);
    const endDate = new Date(end);
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

        const days = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
        );

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay * days
            : shift === "night"
            ? cp.expectedVisitsNight * days
            : (cp.expectedVisitsDay + cp.expectedVisitsNight) * days;

        return {
          checkpointId: cp.id,
          checkpointName: cp.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate range checkpoint report" });
  }
};

// 3️⃣ Exceptions Only (missed visits)
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

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay
            : shift === "night"
            ? cp.expectedVisitsNight
            : cp.expectedVisitsDay + cp.expectedVisitsNight;

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

// 4️⃣ Guard Detail Breakdown
const getGuardDetailReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, shift } = req.query;

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const guard = await User.findByPk(id);
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

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay
            : shift === "night"
            ? cp.expectedVisitsNight
            : cp.expectedVisitsDay + cp.expectedVisitsNight;

        return {
          checkpointName: cp.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
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

// 5️⃣ CSV Export
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

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay
            : shift === "night"
            ? cp.expectedVisitsNight
            : cp.expectedVisitsDay + cp.expectedVisitsNight;

        return {
          checkpoint: cp.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
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

// 6️⃣ PDF Export
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

        const expected =
          shift === "day"
            ? cp.expectedVisitsDay
            : shift === "night"
            ? cp.expectedVisitsNight
            : cp.expectedVisitsDay + cp.expectedVisitsNight;

        return {
          checkpoint: cp.name,
          expected,
          completed,
          missed: expected - completed > 0 ? expected - completed : 0,
        };
      })
    );

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report_${date}_${shift || "all"}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`Patrol Report - ${date} (${shift || "all shifts"})`, { underline: true });
    doc.moveDown();

    report.forEach((row) => {
      doc.fontSize(12).text(
        `${row.checkpoint} | Expected: ${row.expected}, Completed: ${row.completed}, Missed: ${row.missed}`
      );
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
  getRangeCheckpointReport,
  getMissedVisitsReport,
  getGuardDetailReport,
  exportReportsCSV,
  exportReportsPDF,
};
