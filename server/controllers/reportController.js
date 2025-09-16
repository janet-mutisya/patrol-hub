const { Op } = require("sequelize");
const { Checkpoint, PatrolLog, User } = require("../models");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// ================================
// HELPER FUNCTIONS
// ================================

// Helper to parse and validate date parameters
const parseDate = (dateStr) => {
  if (!dateStr) {
    return new Date(); // Default to today if no date provided
  }
  
  const date = new Date(dateStr);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string provided: ${dateStr}, falling back to today`);
    return new Date(); // Fallback to today if invalid
  }
  
  return date;
};

// Helper to get date range for queries
const getDateRange = (dateStr) => {
  const parsedDate = parseDate(dateStr);
  
  const startDate = new Date(parsedDate);
  startDate.setHours(0, 0, 0, 0); // Start of day
  
  const endDate = new Date(parsedDate);
  endDate.setHours(23, 59, 59, 999); // End of day
  
  return { startDate, endDate };
};

// Helper to calculate expected visits
const getExpectedVisits = (checkpoint, shift, days = 1) => {
  if (!checkpoint) return 0;
  
  let base = 0;
  
  switch (shift) {
    case "day":
      base = checkpoint.expectedVisitsDay || 0;
      break;
    case "night":
      base = checkpoint.expectedVisitsNight || 0;
      break;
    default:
      base = (checkpoint.expectedVisitsDay || 0) + (checkpoint.expectedVisitsNight || 0);
      break;
  }
  
  return base * days;
};

// Helper to build patrol log query conditions
const buildPatrolLogQuery = (baseConditions, shift) => {
  const query = { ...baseConditions };
  
  if (shift && (shift === 'day' || shift === 'night')) {
    query.shift = shift;
  }
  
  return query;
};

// ================================
// CHECKPOINT REPORT
// ================================
const getCheckpointReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Generating checkpoint report for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch all checkpoints
    const checkpoints = await Checkpoint.findAll({
      order: [['name', 'ASC']]
    });

    if (checkpoints.length === 0) {
      return res.json({
        message: "No checkpoints found",
        data: []
      });
    }

    // Generate report for each checkpoint
    const report = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        try {
          const queryConditions = buildPatrolLogQuery({
            checkpointId: checkpoint.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({
            where: queryConditions
          });

          const expected = getExpectedVisits(checkpoint, shift);
          const missed = Math.max(expected - completed, 0);

          return {
            checkpointId: checkpoint.id,
            checkpointName: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected,
            completed,
            missed,
            completionRate: expected > 0 ? Math.round((completed / expected) * 100) : 0
          };
        } catch (error) {
          console.error(`Error processing checkpoint ${checkpoint.id}:`, error);
          return {
            checkpointId: checkpoint.id,
            checkpointName: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected: 0,
            completed: 0,
            missed: 0,
            completionRate: 0,
            error: 'Failed to process checkpoint data'
          };
        }
      })
    );

    res.json({
      date: startDate.toISOString().split('T')[0],
      shift: shift || 'all',
      totalCheckpoints: checkpoints.length,
      data: report
    });

  } catch (error) {
    console.error('Checkpoint report error:', error);
    res.status(500).json({ 
      error: "Failed to generate checkpoint report",
      details: error.message 
    });
  }
};

// ================================
// GUARD REPORT
// ================================
const getGuardReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Generating guard report for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch all guards
    const guards = await User.findAll({ 
      where: { role: "guard" },
      order: [['name', 'ASC']]
    });

    if (guards.length === 0) {
      return res.json({
        message: "No guards found",
        data: []
      });
    }

    // Fetch all checkpoints to calculate total expected visits
    const checkpoints = await Checkpoint.findAll();
    const totalExpectedPerGuard = checkpoints.reduce(
      (sum, checkpoint) => sum + getExpectedVisits(checkpoint, shift), 
      0
    );

    // Generate report for each guard
    const report = await Promise.all(
      guards.map(async (guard) => {
        try {
          const queryConditions = buildPatrolLogQuery({
            guardId: guard.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({
            where: queryConditions
          });

          const expected = totalExpectedPerGuard;
          const missed = Math.max(expected - completed, 0);

          return {
            guardId: guard.id,
            guardName: guard.name,
            email: guard.email || 'N/A',
            expected,
            completed,
            missed,
            completionRate: expected > 0 ? Math.round((completed / expected) * 100) : 0
          };
        } catch (error) {
          console.error(`Error processing guard ${guard.id}:`, error);
          return {
            guardId: guard.id,
            guardName: guard.name,
            email: guard.email || 'N/A',
            expected: totalExpectedPerGuard,
            completed: 0,
            missed: totalExpectedPerGuard,
            completionRate: 0,
            error: 'Failed to process guard data'
          };
        }
      })
    );

    res.json({
      date: startDate.toISOString().split('T')[0],
      shift: shift || 'all',
      totalGuards: guards.length,
      data: report
    });

  } catch (error) {
    console.error('Guard report error:', error);
    res.status(500).json({ 
      error: "Failed to generate guard report",
      details: error.message 
    });
  }
};

// ================================
// SUMMARY REPORT
// ================================
const getSummaryReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Generating summary report for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch checkpoints and calculate total expected visits
    const checkpoints = await Checkpoint.findAll();
    const totalExpected = checkpoints.reduce(
      (sum, checkpoint) => sum + getExpectedVisits(checkpoint, shift), 
      0
    );

    // Count completed patrol logs
    const queryConditions = buildPatrolLogQuery({
      timestamp: { [Op.between]: [startDate, endDate] }
    }, shift);

    const totalCompleted = await PatrolLog.count({
      where: queryConditions
    });

    const totalMissed = Math.max(totalExpected - totalCompleted, 0);
    const completionRate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

    // Get guard count
    const guardCount = await User.count({ where: { role: 'guard' } });

    res.json({
      date: startDate.toISOString().split('T')[0],
      shift: shift || 'all',
      summary: {
        totalCheckpoints: checkpoints.length,
        totalGuards: guardCount,
        totalExpected,
        totalCompleted,
        totalMissed,
        completionRate
      }
    });

  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({ 
      error: "Failed to generate summary report",
      details: error.message 
    });
  }
};

// ================================
// MISSED VISITS REPORT
// ================================
const getMissedVisitsReport = async (req, res) => {
  try {
    const { date, shift } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Generating missed visits report for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const checkpoints = await Checkpoint.findAll({
      order: [['name', 'ASC']]
    });

    if (checkpoints.length === 0) {
      return res.json({
        message: "No checkpoints found",
        missedVisits: []
      });
    }

    // Find checkpoints with missed visits
    const missedVisits = [];

    for (const checkpoint of checkpoints) {
      try {
        const queryConditions = buildPatrolLogQuery({
          checkpointId: checkpoint.id,
          timestamp: { [Op.between]: [startDate, endDate] }
        }, shift);

        const completed = await PatrolLog.count({
          where: queryConditions
        });

        const expected = getExpectedVisits(checkpoint, shift);

        if (completed < expected) {
          missedVisits.push({
            checkpointId: checkpoint.id,
            checkpointName: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected,
            completed,
            missed: expected - completed,
            lastVisit: await getLastVisitTime(checkpoint.id, startDate)
          });
        }
      } catch (error) {
        console.error(`Error checking missed visits for checkpoint ${checkpoint.id}:`, error);
        // Continue with other checkpoints even if one fails
      }
    }

    res.json({
      date: startDate.toISOString().split('T')[0],
      shift: shift || 'all',
      totalMissedCheckpoints: missedVisits.length,
      missedVisits
    });

  } catch (error) {
    console.error('Missed visits report error:', error);
    res.status(500).json({ 
      error: "Failed to generate missed visits report",
      details: error.message 
    });
  }
};

// Helper function to get last visit time for a checkpoint
const getLastVisitTime = async (checkpointId, beforeDate) => {
  try {
    const lastVisit = await PatrolLog.findOne({
      where: {
        checkpointId,
        timestamp: { [Op.lt]: beforeDate }
      },
      order: [['timestamp', 'DESC']],
      attributes: ['timestamp']
    });
    
    return lastVisit ? lastVisit.timestamp : null;
  } catch (error) {
    console.error(`Error getting last visit for checkpoint ${checkpointId}:`, error);
    return null;
  }
};

// ================================
// GUARD DETAIL REPORT
// ================================
const getGuardDetailReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, shift } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: "Guard ID is required" });
    }

    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Generating guard detail report for guard ${id}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Find the guard
    const guard = await User.findByPk(id);
    if (!guard) {
      return res.status(404).json({ error: "Guard not found" });
    }

    // Get all checkpoints
    const checkpoints = await Checkpoint.findAll({
      order: [['name', 'ASC']]
    });

    if (checkpoints.length === 0) {
      return res.json({
        guardId: guard.id,
        guardName: guard.name,
        date: startDate.toISOString().split('T')[0],
        shift: shift || 'all',
        message: "No checkpoints found",
        checkpoints: []
      });
    }

    // Generate details for each checkpoint
    const checkpointDetails = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        try {
          const queryConditions = buildPatrolLogQuery({
            guardId: id,
            checkpointId: checkpoint.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({
            where: queryConditions
          });

          const expected = getExpectedVisits(checkpoint, shift);
          const missed = Math.max(expected - completed, 0);

          // Get actual visit times for this guard and checkpoint
          const visits = await PatrolLog.findAll({
            where: queryConditions,
            attributes: ['timestamp', 'notes'],
            order: [['timestamp', 'ASC']]
          });

          return {
            checkpointId: checkpoint.id,
            checkpointName: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected,
            completed,
            missed,
            completionRate: expected > 0 ? Math.round((completed / expected) * 100) : 0,
            visits: visits.map(visit => ({
              timestamp: visit.timestamp,
              notes: visit.notes || null
            }))
          };
        } catch (error) {
          console.error(`Error processing checkpoint ${checkpoint.id} for guard ${id}:`, error);
          return {
            checkpointId: checkpoint.id,
            checkpointName: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected: 0,
            completed: 0,
            missed: 0,
            completionRate: 0,
            visits: [],
            error: 'Failed to process checkpoint data'
          };
        }
      })
    );

    // Calculate totals
    const totals = checkpointDetails.reduce((acc, checkpoint) => ({
      expected: acc.expected + checkpoint.expected,
      completed: acc.completed + checkpoint.completed,
      missed: acc.missed + checkpoint.missed
    }), { expected: 0, completed: 0, missed: 0 });

    res.json({
      guardId: guard.id,
      guardName: guard.name,
      email: guard.email || 'N/A',
      date: startDate.toISOString().split('T')[0],
      shift: shift || 'all',
      totals: {
        ...totals,
        completionRate: totals.expected > 0 ? Math.round((totals.completed / totals.expected) * 100) : 0
      },
      checkpoints: checkpointDetails
    });

  } catch (error) {
    console.error('Guard detail report error:', error);
    res.status(500).json({ 
      error: "Failed to generate guard detail report",
      details: error.message 
    });
  }
};

// ================================
// EXPORT CSV
// ================================
const exportReportsCSV = async (req, res) => {
  try {
    const { date, shift, type = 'checkpoint' } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Exporting CSV report (${type}) for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    let data = [];
    let fields = [];
    let filename = '';

    if (type === 'checkpoint') {
      const checkpoints = await Checkpoint.findAll({ order: [['name', 'ASC']] });
      
      data = await Promise.all(
        checkpoints.map(async (checkpoint) => {
          const queryConditions = buildPatrolLogQuery({
            checkpointId: checkpoint.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({ where: queryConditions });
          const expected = getExpectedVisits(checkpoint, shift);

          return {
            checkpoint: checkpoint.name,
            location: checkpoint.location || 'N/A',
            expected,
            completed,
            missed: Math.max(expected - completed, 0),
            completionRate: expected > 0 ? Math.round((completed / expected) * 100) : 0
          };
        })
      );
      
      fields = ['checkpoint', 'location', 'expected', 'completed', 'missed', 'completionRate'];
      filename = `checkpoint_report_${startDate.toISOString().split('T')[0]}_${shift || 'all'}.csv`;
      
    } else if (type === 'guard') {
      const guards = await User.findAll({ 
        where: { role: 'guard' },
        order: [['name', 'ASC']]
      });
      const checkpoints = await Checkpoint.findAll();
      const totalExpectedPerGuard = checkpoints.reduce(
        (sum, checkpoint) => sum + getExpectedVisits(checkpoint, shift), 
        0
      );

      data = await Promise.all(
        guards.map(async (guard) => {
          const queryConditions = buildPatrolLogQuery({
            guardId: guard.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({ where: queryConditions });

          return {
            guard: guard.name,
            email: guard.email || 'N/A',
            expected: totalExpectedPerGuard,
            completed,
            missed: Math.max(totalExpectedPerGuard - completed, 0),
            completionRate: totalExpectedPerGuard > 0 ? Math.round((completed / totalExpectedPerGuard) * 100) : 0
          };
        })
      );
      
      fields = ['guard', 'email', 'expected', 'completed', 'missed', 'completionRate'];
      filename = `guard_report_${startDate.toISOString().split('T')[0]}_${shift || 'all'}.csv`;
    }

    if (data.length === 0) {
      return res.status(404).json({ error: "No data available for export" });
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      error: "Failed to export CSV",
      details: error.message 
    });
  }
};

// ================================
// EXPORT PDF
// ================================
const exportReportsPDF = async (req, res) => {
  try {
    const { date, shift, type = 'checkpoint' } = req.query;
    const { startDate, endDate } = getDateRange(date);
    
    console.log(`Exporting PDF report (${type}) for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const doc = new PDFDocument();
    const filename = `${type}_report_${startDate.toISOString().split('T')[0]}_${shift || 'all'}.pdf`;
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Patrol Report`, { underline: true });
    doc.fontSize(12).text(`Date: ${startDate.toISOString().split('T')[0]}`);
    doc.text(`Shift: ${shift || 'All Shifts'}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (type === 'checkpoint') {
      const checkpoints = await Checkpoint.findAll({ order: [['name', 'ASC']] });
      
      if (checkpoints.length === 0) {
        doc.text('No checkpoints found.');
      } else {
        doc.text('Checkpoint Performance:');
        doc.moveDown(0.5);

        for (const checkpoint of checkpoints) {
          const queryConditions = buildPatrolLogQuery({
            checkpointId: checkpoint.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({ where: queryConditions });
          const expected = getExpectedVisits(checkpoint, shift);
          const missed = Math.max(expected - completed, 0);
          const rate = expected > 0 ? Math.round((completed / expected) * 100) : 0;

          doc.text(`${checkpoint.name} (${checkpoint.location || 'N/A'})`);
          doc.text(`  Expected: ${expected}, Completed: ${completed}, Missed: ${missed}, Rate: ${rate}%`);
        }
      }
    } else if (type === 'guard') {
      const guards = await User.findAll({ 
        where: { role: 'guard' },
        order: [['name', 'ASC']]
      });
      const checkpoints = await Checkpoint.findAll();
      const totalExpectedPerGuard = checkpoints.reduce(
        (sum, checkpoint) => sum + getExpectedVisits(checkpoint, shift), 
        0
      );

      if (guards.length === 0) {
        doc.text('No guards found.');
      } else {
        doc.text('Guard Performance:');
        doc.moveDown(0.5);

        for (const guard of guards) {
          const queryConditions = buildPatrolLogQuery({
            guardId: guard.id,
            timestamp: { [Op.between]: [startDate, endDate] }
          }, shift);

          const completed = await PatrolLog.count({ where: queryConditions });
          const missed = Math.max(totalExpectedPerGuard - completed, 0);
          const rate = totalExpectedPerGuard > 0 ? Math.round((completed / totalExpectedPerGuard) * 100) : 0;

          doc.text(`${guard.name} (${guard.email || 'N/A'})`);
          doc.text(`  Expected: ${totalExpectedPerGuard}, Completed: ${completed}, Missed: ${missed}, Rate: ${rate}%`);
        }
      }
    }

    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ 
      error: "Failed to export PDF",
      details: error.message 
    });
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