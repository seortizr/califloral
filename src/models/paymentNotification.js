const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentNotification = sequelize.define(
  "PaymentNotification",
  {
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "COP",
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentProvider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "manual",
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    externalTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rawStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "PaymentNotifications",
  }
);

module.exports = PaymentNotification;
