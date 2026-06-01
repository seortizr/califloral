const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");

function isSqliteMode() {
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

const sequelize = new Sequelize(buildConfig());

/**
 * Crea la base de datos en MySQL si no existe (tipico XAMPP).
 * Las tablas las crea `sequelize.sync()` en server.js.
 */
async function ensureDatabaseExists() {
  if (isSqliteMode()) return;

  const dbName = mysqlDatabaseName();
  const { host, port, username, password } = mysqlConnectionOptions();
  const server = new Sequelize({
    dialect: "mysql",
    host,
    port,
    username,
    password,
    logging: false,
  });
  await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await server.close();
}

sequelize.ensureDatabaseExists = ensureDatabaseExists;

module.exports = sequelize;
