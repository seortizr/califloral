const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CartItem = sequelize.define("CartItem", {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
});

module.exports = CartItem;
