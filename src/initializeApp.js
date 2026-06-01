const database = require("./config/database");
const { sequelize } = require("./models");
const { seedDatabase } = require("./services/seedService");
const { syncSessionStore } = require("./middlewares/securityMiddleware");

let readyPromise = null;

function shouldSyncAlter() {
  if (process.env.DB_SYNC_ALTER === "true") return true;
  if (process.env.DB_SYNC_ALTER === "false") return false;
  return process.env.NODE_ENV !== "production";
}

async function ensureAppReady() {
  if (!readyPromise) {
    readyPromise = initializeApp();
  }
  return readyPromise;
}

async function initializeApp() {
  const skipCreate = process.env.SKIP_DB_CREATE === "true" || Boolean(process.env.VERCEL);
  if (!skipCreate) {
    await database.ensureDatabaseExists();
  }

  await sequelize.sync({ alter: shouldSyncAlter() });
  await syncSessionStore();
  await seedDatabase();
}

module.exports = { ensureAppReady, initializeApp };
