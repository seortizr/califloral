const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define("Order", {
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "paid",
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  shippingAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fulfillmentType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "delivery",
  },
  deliveryZone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shippingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
});

module.exports = Order;
