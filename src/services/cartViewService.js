const { Cart, CartItem, Product } = require("../models");
const {
  computeShippingAmount,
  normalizeFulfillment,
  normalizeZone,
  DEFAULT_ZONE,
} = require("./shippingService");

function money(num) {
  return Number(num).toFixed(2);
}

async function getUserCart(userId) {
  let cart = await Cart.findOne({ where: { UserId: userId } });
  if (!cart) {
    cart = await Cart.create({ UserId: userId });
  }
  return cart;
}

function shippingForPrefs(fulfillment, zone, subtotal) {
  if (subtotal <= 0) return 0;
  return computeShippingAmount(fulfillment, zone);
}

async function buildCartViewModel(userId, session) {
  const prefs = session?.cartShippingPrefs || {};
  const fulfillment = normalizeFulfillment(prefs.fulfillment);
  const zone = normalizeZone(prefs.zone || DEFAULT_ZONE);

  const cart = await getUserCart(userId);
  const cartItems = await CartItem.findAll({
    where: { CartId: cart.id },
    include: [{ model: Product }],
  });

  const subtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.Product.price) * item.quantity,
    0
  );
  const shippingAmt = shippingForPrefs(fulfillment, zone, subtotal);
  const total = subtotal > 0 ? subtotal + shippingAmt : 0;

  return {
    cart,
    cartItems,
    subtotal: money(subtotal),
    subtotalRaw: subtotal,
    shipping: money(subtotal > 0 ? shippingAmt : 0),
    shippingRaw: subtotal > 0 ? shippingAmt : 0,
    total: money(total),
    totalRaw: total,
    fulfillment,
    deliveryZone: zone,
    isGuest: false,
  };
}

async function buildGuestCartViewModel(session) {
  const prefs = session?.cartShippingPrefs || {};
  const fulfillment = normalizeFulfillment(prefs.fulfillment);
  const zone = normalizeZone(prefs.zone || DEFAULT_ZONE);

  const guestCart = session.guestCart || [];
  if (!guestCart.length) {
    return {
      cart: null,
      cartItems: [],
      subtotal: "0.00",
      subtotalRaw: 0,
      shipping: "0.00",
      shippingRaw: 0,
      total: "0.00",
      totalRaw: 0,
      fulfillment,
      deliveryZone: zone,
      isGuest: true,
    };
  }

  const productIds = guestCart.map((item) => Number(item.productId));
  const products = await Product.findAll({ where: { id: productIds, isActive: true } });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const cartItems = guestCart
    .map((item) => {
      const product = productMap.get(Number(item.productId));
      if (!product) return null;
      return {
        id: `guest-${product.id}`,
        Product: product,
        quantity: Number(item.quantity) || 0,
      };
    })
    .filter(Boolean);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.Product.price) * item.quantity,
    0
  );
  const shippingAmt = shippingForPrefs(fulfillment, zone, subtotal);
  const total = subtotal > 0 ? subtotal + shippingAmt : 0;

  return {
    cart: null,
    cartItems,
    subtotal: money(subtotal),
    subtotalRaw: subtotal,
    shipping: money(subtotal > 0 ? shippingAmt : 0),
    shippingRaw: subtotal > 0 ? shippingAmt : 0,
    total: money(total),
    totalRaw: total,
    fulfillment,
    deliveryZone: zone,
    isGuest: true,
  };
}

module.exports = {
  money,
  getUserCart,
  buildCartViewModel,
  buildGuestCartViewModel,
};
