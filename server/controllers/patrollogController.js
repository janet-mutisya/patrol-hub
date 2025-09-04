const { PatrolLog, User, Checkpoint, sequelize } = require("../models");
const { Op } = require("sequelize");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// ------------------------
// Create a new patrol log
// ------------------------
const createPatrolLog = async (req, res) => {
  try {
    const { guardId, checkpointId, status, notes } = req.body;
    if (!guardId || !checkpointId)
      return res.status(400).json({ message: "Guard ID and Checkpoint ID are required" });

    const guard = await User.findByPk(guardId);
    const checkpoint = await Checkpoint.findByPk(checkpointId);
    if (!guard) return res.status(404).json({ message: "Guard not found" });
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    const patrolLog = await PatrolLog.create({
      guardId,
      checkpointId,
      status: status || "pending",
      notes: notes || "",
      timestamp: new Date(),
    });

    const logWithDetails = await PatrolLog.findByPk(patrolLog.id, {
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        { model: Checkpoint, attributes: ["id", "name", "location"] },
      ],
    });

    res.status(201).json({ message: "Patrol log created successfully", data: logWithDetails });
  } catch (error) {
    console.error("Error creating patrol log:", error);
    res.status(500).json({
      message: "Failed to create patrol log",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ------------------------
// Get all patrol logs
// ------------------------
const getAllPatrolLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      guardId,
      checkpointId,
      status,
      startDate,
      endDate,
      search,
      sortBy = "timestamp",
      order = "DESC",
      exportType,
    } = req.query;

    const where = {};
    if (guardId) where.guardId = guardId;
    if (checkpointId) where.checkpointId = checkpointId;
    if (status) where.status = status;
    if (startDate && endDate) where.timestamp = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    else if (startDate) where.timestamp = { [Op.gte]: new Date(startDate) };
    else if (endDate) where.timestamp = { [Op.lte]: new Date(endDate) };

    if (search) {
      where[Op.or] = [
        { notes: { [Op.iLike]: `%${search}%` } },
        { '$User.name$': { [Op.iLike]: `%${search}%` } },
        { '$Checkpoint.name$': { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: logs, count } = await PatrolLog.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ["id", "name", "email", "role"], required: false },
        { model: Checkpoint, attributes: ["id", "name", "location", "description"], required: false },
      ],
      order: [[sortBy, order.toUpperCase()]],
      limit: exportType ? undefined : parseInt(limit),
      offset: exportType ? undefined : parseInt(offset),
      distinct: true,
    });

    // Export CSV
    if (exportType === "csv") {
      const csvData = logs.map(log => ({
        id: log.id,
        guard_name: log.User?.name || "Unknown",
        guard_email: log.User?.email || "N/A",
        checkpoint_name: log.Checkpoint?.name || "Unknown",
        checkpoint_location: log.Checkpoint?.location || "N/A",
        status: log.status,
        notes: log.notes || "No notes",
        timestamp: log.timestamp,
      }));
      const fields = ["id","guard_name","guard_email","checkpoint_name","checkpoint_location","status","notes","timestamp"];
      const parser = new Parser({ fields });
      const csv = parser.parse(csvData);
      res.header("Content-Type", "text/csv");
      res.attachment(`patrol_logs_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    // Export PDF
    if (exportType === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=patrol_logs_${new Date().toISOString().split('T')[0]}.pdf`);
      doc.pipe(res);

      doc.fontSize(20).text("Patrol Logs Report", { align: "center" });
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.moveDown(2);
      doc.fontSize(14).text(`Total Records: ${count}`, { align: "left" });
      doc.moveDown(1);

      const headers = ["ID","Guard","Checkpoint","Status","Notes","Timestamp"];
      let yPos = doc.y;
      headers.forEach((h,i)=>doc.text(h,50+(i*80),yPos,{width:75}));
      doc.moveDown(0.5);
      doc.moveTo(50,doc.y).lineTo(550,doc.y).stroke();
      doc.moveDown(0.5);

      logs.forEach(log=>{
        if(doc.y>750) doc.addPage();
        yPos = doc.y;
        const row = [
          log.id.toString(),
          log.User?.name || "Unknown",
          log.Checkpoint?.name || "Unknown",
          log.status,
          (log.notes || "").substring(0,20)+(log.notes?.length>20?"...":""),
          new Date(log.timestamp).toLocaleDateString(),
        ];
        row.forEach((data,i)=>doc.text(data,50+(i*80),yPos,{width:75}));
        doc.moveDown(0.5);
      });

      doc.end();
      return;
    }

    res.json({
      success:true,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      limit: parseInt(limit),
      data: logs
    });
  } catch (error) {
    console.error("Error fetching patrol logs:", error);
    res.status(500).json({
      message: "Failed to fetch patrol logs",
      error: process.env.NODE_ENV==="development"?error.message:undefined
    });
  }
};

// ------------------------
// Get patrol log by ID
// ------------------------
const getPatrolLogById = async (req,res)=>{
  try {
    const {id}=req.params;
    const log = await PatrolLog.findByPk(id,{
      include:[
        {model:User,attributes:["id","name","email","role"]},
        {model:Checkpoint,attributes:["id","name","location","description"]}
      ]
    });
    if(!log) return res.status(404).json({message:"Patrol log not found"});
    res.json({success:true,data:log});
  } catch(error){
    console.error("Error fetching patrol log:",error);
    res.status(500).json({message:"Failed to fetch patrol log",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Update patrol log
// ------------------------
const updatePatrolLog = async(req,res)=>{
  try{
    const {id}=req.params;
    const updateData=req.body;
    const log=await PatrolLog.findByPk(id);
    if(!log) return res.status(404).json({message:"Patrol log not found"});
    if(updateData.status && !["pending","completed","skipped"].includes(updateData.status))
      return res.status(400).json({message:"Invalid status. Must be 'pending','completed','skipped'"});
    await log.update(updateData);
    const updatedLog=await PatrolLog.findByPk(id,{
      include:[
        {model:User,attributes:["id","name","email"]},
        {model:Checkpoint,attributes:["id","name","location"]}
      ]
    });
    res.json({success:true,message:"Patrol log updated successfully",data:updatedLog});
  }catch(error){
    console.error("Error updating patrol log:",error);
    res.status(500).json({message:"Failed to update patrol log",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Delete patrol log
// ------------------------
const deletePatrolLog=async(req,res)=>{
  try{
    const {id}=req.params;
    const log=await PatrolLog.findByPk(id);
    if(!log) return res.status(404).json({message:"Patrol log not found"});
    await log.destroy();
    res.json({success:true,message:"Patrol log deleted successfully"});
  }catch(error){
    console.error("Error deleting patrol log:",error);
    res.status(500).json({message:"Failed to delete patrol log",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Patrol Stats
// ------------------------
const getPatrolStats = async(req,res)=>{
  try{
    const {startDate,endDate,guardId}=req.query;
    const where={};
    if(startDate&&endDate) where.timestamp={ [Op.between]: [new Date(startDate),new Date(endDate)] };
    if(guardId) where.guardId=guardId;

    const stats=await PatrolLog.getStatusCounts(where);
    const totalLogs=await PatrolLog.count({where});
    const uniqueGuards=await PatrolLog.count({where,distinct:true,col:"guardId"});
    const uniqueCheckpoints=await PatrolLog.count({where,distinct:true,col:"checkpointId"});
    const recentActivity=await PatrolLog.getRecentActivity(7);
    const avgDuration=await PatrolLog.findOne({where:{...where,status:"completed",duration:{[Op.not]:null}},attributes:[[sequelize.fn("AVG",sequelize.col("duration")),"avgDuration"]],raw:true});
    const incidentCount=await PatrolLog.count({where:{...where,incidentReported:true}});

    res.json({success:true,data:{
      statusBreakdown:stats,
      totalLogs,
      uniqueGuards,
      uniqueCheckpoints,
      recentActivityCount:recentActivity.length,
      avgDurationMinutes:avgDuration?.avgDuration?Math.round(avgDuration.avgDuration):null,
      incidentReports:incidentCount,
      period:{startDate:startDate||"All time",endDate:endDate||"Present"}
    }});
  }catch(error){
    console.error("Error fetching patrol stats:",error);
    res.status(500).json({message:"Failed to fetch patrol statistics",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Bulk Create
// ------------------------
const bulkCreatePatrolLogs=async(req,res)=>{
  try{
    const {logs}=req.body;
    if(!Array.isArray(logs)||logs.length===0)
      return res.status(400).json({message:"Logs array is required and cannot be empty"});

    const validatedLogs=logs.map((log,index)=>{
      if(!log.guardId||!log.checkpointId)
        throw new Error(`Log at index ${index}: guardId and checkpointId are required`);
      return {...log,timestamp:log.timestamp||new Date(),status:log.status||"pending",notes:log.notes||""};
    });

    const createdLogs=await PatrolLog.bulkCreate(validatedLogs,{validate:true,returning:true});
    res.status(201).json({success:true,message:`${createdLogs.length} patrol logs created successfully`,data:createdLogs});
  }catch(error){
    console.error("Error bulk creating patrol logs:",error);
    res.status(500).json({message:"Failed to bulk create patrol logs",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Get logs by guard
// ------------------------
const getPatrolLogsByGuard=async(req,res)=>{
  try{
    const {guardId}=req.params;
    const {page=1,limit=10,status,startDate,endDate}=req.query;
    const where={guardId};
    if(status) where.status=status;
    if(startDate&&endDate) where.timestamp={ [Op.between]: [new Date(startDate),new Date(endDate)] };

    const offset=(page-1)*limit;
    const {rows:logs,count}=await PatrolLog.findAndCountAll({
      where,
      include:[
        {model:User,attributes:["id","name","email"]},
        {model:Checkpoint,attributes:["id","name","location"]}
      ],
      order:[["timestamp","DESC"]],
      limit:parseInt(limit),
      offset:parseInt(offset),
    });

    res.json({success:true,total:count,page:parseInt(page),pages:Math.ceil(count/limit),data:logs});
  }catch(error){
    console.error("Error fetching patrol logs by guard:",error);
    res.status(500).json({message:"Failed to fetch patrol logs for guard",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Get logs by checkpoint
// ------------------------
const getPatrolLogsByCheckpoint=async(req,res)=>{
  try{
    const {checkpointId}=req.params;
    const {page=1,limit=10,status,startDate,endDate}=req.query;
    const where={checkpointId};
    if(status) where.status=status;
    if(startDate&&endDate) where.timestamp={ [Op.between]: [new Date(startDate),new Date(endDate)] };

    const offset=(page-1)*limit;
    const {rows:logs,count}=await PatrolLog.findAndCountAll({
      where,
      include:[
        {model:User,attributes:["id","name","email"]},
        {model:Checkpoint,attributes:["id","name","location"]}
      ],
      order:[["timestamp","DESC"]],
      limit:parseInt(limit),
      offset:parseInt(offset),
    });

    res.json({success:true,total:count,page:parseInt(page),pages:Math.ceil(count/limit),data:logs});
  }catch(error){
    console.error("Error fetching patrol logs by checkpoint:",error);
    res.status(500).json({message:"Failed to fetch patrol logs for checkpoint",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Mark patrol completed
// ------------------------
const markPatrolCompleted=async(req,res)=>{
  try{
    const {id}=req.params;
    const {notes}=req.body;
    const log=await PatrolLog.findByPk(id);
    if(!log) return res.status(404).json({message:"Patrol log not found"});
    await log.update({status:"completed",notes:notes||log.notes,completedAt:new Date()});
    const updatedLog=await PatrolLog.findByPk(id,{include:[{model:User,attributes:["id","name","email"]},{model:Checkpoint,attributes:["id","name","location"]}]});
    res.json({success:true,message:"Patrol marked as completed",data:updatedLog});
  }catch(error){
    console.error("Error marking patrol as completed:",error);
    res.status(500).json({message:"Failed to mark patrol as completed",error:process.env.NODE_ENV==="development"?error.message:undefined});
  }
};

// ------------------------
// Get overdue patrols
// ------------------------
const getOverduePatrols=async(req,res)=>{
  try{
    const {hours=24}=req.query;
    const overdueTime=new Date(Date.now()-hours*60*60*1000);
    const overdueLogs=await PatrolLog.findAll({
      where:{status:"pending",timestamp:{[Op.lt]:overdueTime}},
      include:[
        {model:User,attributes:["id","name","email"]},
        {model:Checkpoint,attributes:["id","name","location"]}
      ],
      order:[["timestamp","ASC"]]
    });
    res.json({success:true,data:overdueLogs,overdueThreshold:`${hours} hours`});
  }catch(error){
    console.error("Error fetching overdue patrols:",error);
    res.status(500).json({message: "Failed to fetch overdue patrols",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ------------------------
// Start patrol (server-side)
// ------------------------
const startPatrolServer = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await PatrolLog.findByPk(id);
    if (!log) return res.status(404).json({ message: "Patrol log not found" });
    if (log.status !== "pending")
      return res.status(400).json({ message: "Patrol cannot be started because it is not pending" });

    await log.update({ status: "in-progress", startedAt: new Date() });

    const updatedLog = await PatrolLog.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        { model: Checkpoint, attributes: ["id", "name", "location"] },
      ],
    });

    res.json({ success: true, message: "Patrol started successfully", data: updatedLog });
  } catch (error) {
    console.error("Error starting patrol:", error);
    res.status(500).json({
      message: "Failed to start patrol",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ------------------------
// End patrol (server-side)
// ------------------------
const endPatrolServer = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await PatrolLog.findByPk(id);
    if (!log) return res.status(404).json({ message: "Patrol log not found" });
    if (log.status !== "in-progress")
      return res.status(400).json({ message: "Patrol cannot be ended because it is not in progress" });

    const endTime = new Date();
    const duration = Math.floor((endTime - new Date(log.startedAt)) / 60000); // duration in minutes

    await log.update({ status: "completed", completedAt: endTime, duration });

    const updatedLog = await PatrolLog.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        { model: Checkpoint, attributes: ["id", "name", "location"] },
      ],
    });

    res.json({ success: true, message: "Patrol ended successfully", data: updatedLog });
  } catch (error) {
    console.error("Error ending patrol:", error);
    res.status(500).json({
      message: "Failed to end patrol",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createPatrolLog,
  getAllPatrolLogs,
  getPatrolLogById,
  updatePatrolLog,
  deletePatrolLog,
  getPatrolStats,
  bulkCreatePatrolLogs,
  getPatrolLogsByGuard,
  getPatrolLogsByCheckpoint,
  markPatrolCompleted,
  getOverduePatrols,
  startPatrolServer,
  endPatrolServer,
};

