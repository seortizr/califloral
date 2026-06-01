const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cart = sequelize.define("Cart", {
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "open",
  },
});

module.exports = Cart;
