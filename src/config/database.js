const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");

function isSqliteMode() {
  if (process.env.VERCEL) return false;
  return String(process.env.DB_DIALECT || "").toLowerCase() === "sqlite";
}

function sqliteStoragePath() {
  const dataDir = path.join(__dirname, "../../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "califloral.sqlite");
}

function mysqlDatabaseName() {
  const raw = process.env.DB_NAME || "califloral";
  if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
    throw new Error("DB_NAME debe contener solo letras, numeros o guion bajo (ej: califloral).");
  }
  return raw;
}

function mysqlDialectOptions() {
  const options = {
    decimalNumbers: true,
    charset: "utf8mb4",
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  };

  if (process.env.DB_SSL === "true") {
    options.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    };
  }

  return options;
}

function mysqlPoolOptions() {
  if (process.env.VERCEL) {
    return { max: 2, min: 0, acquire: 30000, idle: 10000 };
  }
  return { max: 8, min: 0, acquire: 30000, idle: 10000 };
}

function mysqlConnectionOptions() {
  return {
    dialect: "mysql",
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: mysqlDatabaseName(),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD === undefined ? "" : process.env.DB_PASSWORD,
    logging: false,
    dialectOptions: mysqlDialectOptions(),
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
    pool: mysqlPoolOptions(),
  };
}

function buildConfig() {
  if (isSqliteMode()) {
    return {
      dialect: "sqlite",
      storage: sqliteStoragePath(),
      logging: false,
    };
  }
  return mysqlConnectionOptions();
}

function isUnknownDatabaseError(error) {
  const code = error?.original?.code || error?.parent?.code || "";
  return code === "ER_BAD_DB_ERROR" || /unknown database/i.test(String(error.message || ""));
}

function buildServerSequelize() {
  const { host, port, username, password } = mysqlConnectionOptions();
  return new Sequelize({
    dialect: "mysql",
    host,
    port,
    username,
    password,
    logging: false,
    dialectOptions: mysqlDialectOptions(),
  });
}

const sequelize = new Sequelize(buildConfig());

/**
 * Intenta crear la base si el usuario MySQL tiene permiso.
 * En hosting compartido (Hostinger/cPanel) la base suele existir ya; si falla, se continua.
 */
async function ensureDatabaseExists() {
  if (isSqliteMode()) return { created: false, skipped: true };

  const dbName = mysqlDatabaseName();
  const server = buildServerSequelize();

  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    return { created: true };
  } catch (error) {
    console.warn(
      "CREATE DATABASE no disponible (normal en hosting compartido si la base ya fue creada en el panel):",
      error.message
    );
    return { created: false, warning: error.message };
  } finally {
    await server.close();
  }
}

/**
 * Conecta a MySQL. Si la base no existe, intenta crearla y vuelve a conectar.
 */
async function connectWithAutoSetup(instance = sequelize) {
  if (isSqliteMode()) {
    await instance.authenticate();
    return;
  }

  try {
    await instance.authenticate();
    return;
  } catch (error) {
    if (!isUnknownDatabaseError(error)) {
      throw error;
    }
  }

  await ensureDatabaseExists();
  await instance.authenticate();
}

sequelize.ensureDatabaseExists = ensureDatabaseExists;
sequelize.connectWithAutoSetup = connectWithAutoSetup;

module.exports = sequelize;
