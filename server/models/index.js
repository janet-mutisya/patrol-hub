// server/models/index.js
const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  }
);

// Load models (match exact filenames)
const User = require("./user")(sequelize, DataTypes);
const Checkpoint = require("./checkpoint")(sequelize, DataTypes);
const PatrolLog = require("./patrol_logs")(sequelize, DataTypes);
const Report = require("./Report")(sequelize, DataTypes); 

// Collect models in db object
const db = {
  sequelize,
  Sequelize,
  User,
  Checkpoint,
  PatrolLog,
  Report, 
};

// Apply associations if defined
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
});

module.exports = db;
