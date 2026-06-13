const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentConfig = sequelize.define(
  "PaymentConfig",
  {
    activeProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "manual",
    },
    manualTransferEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    manualCodEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    wompiEnvironment: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "sandbox",
    },
    wompiPublicKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wompiPrivateKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wompiIntegritySecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wompiEventsSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "PaymentConfigs",
  }
);

module.exports = PaymentConfig;
