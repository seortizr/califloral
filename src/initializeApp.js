const database = require("./config/database");
const { sequelize } = require("./models");
const { seedDatabase } = require("./services/seedService");
const { syncSessionStore } = require("./middlewares/securityMiddleware");

let readyPromise = null;

function shouldSyncAlter() {
  if (process.env.DB_SYNC_ALTER === "false") return false;
  return true;
}

async function ensureAppReady() {
  if (!readyPromise) {
    readyPromise = initializeApp();
  }
  return readyPromise;
}

function assertDatabaseConfigured() {
  if (process.env.DB_DIALECT === "sqlite") {
    if (process.env.VERCEL) {
      throw new Error(
        "SQLite no funciona en Vercel. Configura MySQL con DB_HOST, DB_USER, DB_PASSWORD y DB_NAME."
      );
    }
    return;
  }

  const hasRemoteConfig = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
  if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !hasRemoteConfig) {
    throw new Error(
      "Faltan variables de base de datos. Configura DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en Vercel."
    );
  }
}

async function initializeApp() {
  assertDatabaseConfigured();

  await database.connectWithAutoSetup(sequelize);

  await sequelize.sync({ alter: shouldSyncAlter() });
  await syncSessionStore();
  await seedDatabase();
}

module.exports = { ensureAppReady, initializeApp };
