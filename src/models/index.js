const sequelize = require("../config/database");
const User = require("./user");
const Category = require("./category");
const Product = require("./product");
const Cart = require("./cart");
const CartItem = require("./cartItem");
const Order = require("./order");
const OrderItem = require("./orderItem");
const PaymentConfig = require("./paymentConfig");
const PaymentNotification = require("./paymentNotification");

User.hasOne(Cart, { onDelete: "CASCADE" });
Cart.belongsTo(User);

Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
Cart.hasMany(CartItem, { onDelete: "CASCADE" });
CartItem.belongsTo(Cart);
CartItem.belongsTo(Product);
Product.hasMany(CartItem);

Category.hasMany(Product, { onDelete: "SET NULL" });
Product.belongsTo(Category);

User.hasMany(Order, { onDelete: "CASCADE" });
Order.belongsTo(User);

Order.hasMany(OrderItem, { onDelete: "CASCADE" });
OrderItem.belongsTo(Order);
Product.hasMany(OrderItem);
OrderItem.belongsTo(Product);

Order.hasMany(PaymentNotification, { onDelete: "CASCADE" });
PaymentNotification.belongsTo(Order);

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  PaymentConfig,
  PaymentNotification,
};
