const database = require("./config/database");
const { sequelize, PaymentConfig, PaymentNotification, Order } = require("./models");
const { seedDatabase } = require("./services/seedService");
const { syncSessionStore } = require("./middlewares/securityMiddleware");

let readyPromise = null;

function shouldSyncAlter() {
  if (process.env.DB_SYNC_ALTER === "true") return true;
  return false;
}

async function ensureAppReady() {
  if (!readyPromise) {
    readyPromise = initializeApp().catch((error) => {
      readyPromise = null;
      throw error;
    });
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
      "Faltan variables de base de datos. Configura DB_HOST, DB_USER, DB_PASSWORD y DB_NAME."
    );
  }
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} supero ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function syncPaymentModuleTables() {
  await PaymentConfig.sync();
  await PaymentNotification.sync();
  await Order.sync({ alter: true });
}

async function initializeApp() {
  assertDatabaseConfigured();

  const timeoutMs = Number(process.env.DB_INIT_TIMEOUT || 20000);

  await withTimeout(database.connectWithAutoSetup(sequelize), timeoutMs, "Conexion MySQL");
  await withTimeout(sequelize.sync({ alter: shouldSyncAlter() }), timeoutMs, "Sincronizacion de tablas");
  await withTimeout(syncPaymentModuleTables(), timeoutMs, "Tablas de pagos");
  await withTimeout(syncSessionStore(), timeoutMs, "Sesiones");
  await withTimeout(seedDatabase(), timeoutMs, "Datos iniciales");
}

module.exports = { ensureAppReady, initializeApp, syncPaymentModuleTables };
