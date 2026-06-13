const { Cart, CartItem, Product, Order, OrderItem, Category, User } = require("../models");
const { loadSitePages, mapEmbedSrc } = require("../services/siteContentService");
const {
  getUserCart,
  buildCartViewModel,
  buildGuestCartViewModel,
  money,
} = require("../services/cartViewService");
const {
  computeShippingAmount,
  normalizeFulfillment,
  normalizeZone,
  zoneLabel,
} = require("../services/shippingService");
const {
  normalizePaymentMethod,
  paymentMethodLabel,
  isOnlinePaymentMethod,
  isManualPaymentMethod,
  resolveOrderStatus,
} = require("../services/paymentService");
const {
  getPaymentConfig,
  isWompiActive,
  isManualActive,
  isCheckoutEnabled,
} = require("../services/paymentConfigService");
const { createWompiPaymentLink } = require("../services/wompiService");
const { getAppBaseUrl, applyOrderPaymentUpdate } = require("./paymentController");
const { recordPaymentNotification, buildNotificationMessage } = require("../services/paymentNotificationService");

async function getFeaturedProducts() {
  let list = await Product.findAll({
    where: { isActive: true, isFeatured: true },
    order: [["id", "ASC"]],
    limit: 8,
  });
  if (list.length === 0) {
    list = await Product.findAll({
      where: { isActive: true },
      order: [["id", "ASC"]],
      limit: 8,
    });
  }
  return list.slice(0, 4);
}

async function home(req, res) {
  const featuredProducts = await getFeaturedProducts();
  const cartData = req.session.userId
    ? await buildCartViewModel(req.session.userId, req.session)
    : await buildGuestCartViewModel(req.session);
  return res.render("shop/home", {
    title: "CaliFloral",
    featuredProducts,
    cartData,
    message: null,
    error: null,
    navSection: "home",
  });
}

async function nosotrosPage(req, res) {
  const page = loadSitePages().nosotros;
  const cartData = req.session.userId
    ? await buildCartViewModel(req.session.userId, req.session)
    : await buildGuestCartViewModel(req.session);
  return res.render("shop/nosotros", {
    title: "Nosotros | CaliFloral",
    page,
    cartData,
    navSection: "nosotros",
  });
}

async function contactoPage(req, res) {
  const contact = loadSitePages().contacto;
  const mapUrl = mapEmbedSrc(contact);
  const cartData = req.session.userId
    ? await buildCartViewModel(req.session.userId, req.session)
    : await buildGuestCartViewModel(req.session);
  return res.render("shop/contacto", {
    title: "Contacto | CaliFloral",
    contact,
    mapUrl,
    cartData,
    navSection: "contacto",
  });
}

async function categoryProducts(req, res) {
  const slug = String(req.params.slug || "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(404).send("Categoria no encontrada.");
  }
  const category = await Category.findOne({ where: { slug, isActive: true } });
  if (!category) {
    return res.status(404).send("Categoria no encontrada.");
  }
  const products = await Product.findAll({
    where: { CategoryId: category.id, isActive: true },
    order: [["id", "ASC"]],
  });
  const cartData = req.session.userId
    ? await buildCartViewModel(req.session.userId, req.session)
    : await buildGuestCartViewModel(req.session);
  return res.render("shop/category", {
    title: `${category.name} | CaliFloral`,
    category,
    products,
    cartData,
    navSection: "catalog",
  });
}

async function addToCart(req, res) {
  const { productId } = req.body;
  const quantityToAdd = Math.max(1, Number(req.body.quantity) || 1);
  const product = await Product.findByPk(productId);
  if (!product) return res.redirect("/");

  if (req.session.userId) {
    const cart = await getUserCart(req.session.userId);
    const existing = await CartItem.findOne({
      where: { CartId: cart.id, ProductId: product.id },
    });

    if (existing) {
      existing.quantity += quantityToAdd;
      await existing.save();
    } else {
      await CartItem.create({ CartId: cart.id, ProductId: product.id, quantity: quantityToAdd });
    }
  } else {
    const guestCart = req.session.guestCart || [];
    const index = guestCart.findIndex((item) => Number(item.productId) === Number(product.id));
    if (index >= 0) {
      guestCart[index].quantity += quantityToAdd;
    } else {
      guestCart.push({ productId: Number(product.id), quantity: quantityToAdd });
    }
    req.session.guestCart = guestCart;
  }
  return res.redirect(req.get("Referer") || "/");
}

async function updateCartItem(req, res) {
  const { itemId, productId, action } = req.body;
  if (req.session.userId) {
    const item = await CartItem.findByPk(itemId, { include: [{ model: Cart }] });
    if (!item || item.Cart.UserId !== req.session.userId) {
      return res.status(404).redirect("/");
    }

    if (action === "increase") {
      item.quantity += 1;
      await item.save();
    }
    if (action === "decrease") {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        await item.destroy();
      } else {
        await item.save();
      }
    }
    return res.redirect(req.get("Referer") || "/");
  }

  const guestCart = req.session.guestCart || [];
  const index = guestCart.findIndex((item) => Number(item.productId) === Number(productId));
  if (index < 0) return res.redirect("/");

  if (action === "increase") {
    guestCart[index].quantity += 1;
  }
  if (action === "decrease") {
    guestCart[index].quantity -= 1;
    if (guestCart[index].quantity <= 0) {
      guestCart.splice(index, 1);
    }
  }
  req.session.guestCart = guestCart;
  return res.redirect(req.get("Referer") || "/");
}

async function checkout(req, res) {
  const fulfillment = normalizeFulfillment(req.body.fulfillment);
  const zone = normalizeZone(req.body.deliveryZone);
  let shippingAddress = String(req.body.shippingAddress || "").trim();
  const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);

  req.session.cartShippingPrefs = { fulfillment, zone };

  const cartData = await buildCartViewModel(req.session.userId, req.session);
  const paymentConfig = await getPaymentConfig();

  if (!cartData.cartItems.length) {
    return res.redirect("/");
  }

  if (!isCheckoutEnabled(paymentConfig)) {
    const featuredProducts = await getFeaturedProducts();
    return res.status(400).render("shop/home", {
      title: "CaliFloral",
      featuredProducts,
      cartData,
      error: "Los pagos en linea estan desactivados. Contacta a la tienda.",
      message: null,
      navSection: "home",
    });
  }

  if (!paymentMethod) {
    const featuredProducts = await getFeaturedProducts();
    return res.status(400).render("shop/home", {
      title: "CaliFloral",
      featuredProducts,
      cartData,
      error: "Selecciona un metodo de pago.",
      message: null,
      navSection: "home",
    });
  }

  const wompiActive = isWompiActive(paymentConfig);
  const manualActive = isManualActive(paymentConfig);
  const onlineMethod = isOnlinePaymentMethod(paymentMethod);
  let paymentProvider = "manual";

  if (onlineMethod && wompiActive) {
    paymentProvider = "wompi";
  } else if (onlineMethod && manualActive) {
    paymentProvider = "manual";
  } else if (isManualPaymentMethod(paymentMethod) && manualActive) {
    paymentProvider = "manual";
  } else {
    const featuredProducts = await getFeaturedProducts();
    return res.status(400).render("shop/home", {
      title: "CaliFloral",
      featuredProducts,
      cartData,
      error: "Ese metodo de pago no esta disponible con la pasarela activa.",
      message: null,
      navSection: "home",
    });
  }

  if (fulfillment === "pickup") {
    if (!shippingAddress) {
      shippingAddress = "Recogida en sitio - CaliFloral";
    } else {
      shippingAddress = `Recogida en sitio - CaliFloral. Notas: ${shippingAddress}`;
    }
  } else {
    if (!shippingAddress) {
      const featuredProducts = await getFeaturedProducts();
      return res.status(400).render("shop/home", {
        title: "CaliFloral",
        featuredProducts,
        cartData,
        error: "Indica la direccion de entrega o elige recoger en sitio.",
        message: null,
        navSection: "home",
      });
    }
  }

  const subtotalNum = cartData.cartItems.reduce(
    (acc, item) => acc + Number(item.Product.price) * item.quantity,
    0
  );
  const shippingAmt = subtotalNum > 0 ? computeShippingAmount(fulfillment, zone) : 0;
  const totalNum = subtotalNum > 0 ? subtotalNum + shippingAmt : 0;

  const paymentReference = `CF-${paymentMethod.toUpperCase()}-${Date.now()}`;
  const orderStatus = resolveOrderStatus(paymentMethod, paymentProvider);

  const order = await Order.create({
    UserId: req.session.userId,
    totalAmount: money(totalNum),
    shippingAddress,
    paymentMethod,
    paymentReference,
    paymentProvider,
    status: orderStatus,
    fulfillmentType: fulfillment,
    deliveryZone: fulfillment === "pickup" ? null : zone,
    shippingAmount: money(shippingAmt),
  });

  for (const item of cartData.cartItems) {
    await OrderItem.create({
      OrderId: order.id,
      ProductId: item.Product.id,
      quantity: item.quantity,
      unitPrice: item.Product.price,
      productNameSnapshot: item.Product.name,
    });
  }

  if (paymentProvider === "wompi") {
    const user = await User.findByPk(req.session.userId);
    const amountInCents = Math.max(1, Math.round(totalNum * 100));
    const redirectUrl = `${getAppBaseUrl(req)}/payments/wompi/return?order=${order.id}`;

    try {
      const wompiLink = await createWompiPaymentLink({
        reference: paymentReference,
        amountInCents,
        customerEmail: user?.email || "cliente@califloral.com",
        redirectUrl,
        description: `Pedido CaliFloral #${order.id}`,
      });

      order.externalTransactionId = wompiLink.paymentLinkId || null;
      await order.save();

      await recordPaymentNotification({
        order,
        status: "pending",
        rawStatus: "PENDING",
        externalTransactionId: wompiLink.paymentLinkId,
        message: `Pago iniciado en Wompi por $${Number(order.totalAmount).toLocaleString("es-CO")}.`,
      });

      await CartItem.destroy({ where: { CartId: cartData.cart.id } });

      return res.redirect(wompiLink.checkoutUrl);
    } catch (error) {
      await applyOrderPaymentUpdate(order, {
        orderStatus: "failed",
        rawStatus: "ERROR",
        source: "checkout",
      });
      const featuredProducts = await getFeaturedProducts();
      const refreshedCart = await buildCartViewModel(req.session.userId, req.session);
      return res.status(502).render("shop/home", {
        title: "CaliFloral",
        featuredProducts,
        cartData: refreshedCart,
        error: `No se pudo iniciar el pago con Wompi: ${error.message}`,
        message: null,
        navSection: "home",
      });
    }
  }

  await CartItem.destroy({ where: { CartId: cartData.cart.id } });

  await recordPaymentNotification({
    order,
    status: orderStatus === "paid" ? "success" : "pending",
    rawStatus: orderStatus.toUpperCase(),
    message: buildNotificationMessage(
      orderStatus === "paid" ? "success" : "pending",
      paymentMethod,
      order.totalAmount
    ),
  });

  const featuredProducts = await getFeaturedProducts();
  const refreshedCart = await buildCartViewModel(req.session.userId, req.session);
  const successMessage =
    orderStatus === "paid"
      ? `Pago aprobado. Referencia: ${paymentReference}`
      : `Pedido registrado. Referencia: ${paymentReference}. Te contactaremos para confirmar el pago.`;

  return res.render("shop/home", {
    title: "CaliFloral",
    featuredProducts,
    cartData: refreshedCart,
    message: successMessage,
    error: null,
    navSection: "home",
  });
}

async function myOrders(req, res) {
  const orders = await Order.findAll({
    where: { UserId: req.session.userId },
    include: [{ model: OrderItem, include: [{ model: Product }] }],
    order: [["createdAt", "DESC"]],
  });
  const ordersView = orders.map((o) => {
    const plain = o.get({ plain: true });
    plain.deliveryZoneLabel = plain.deliveryZone ? zoneLabel(plain.deliveryZone) : "";
    plain.paymentMethodLabel = paymentMethodLabel(plain.paymentMethod);
    return plain;
  });
  return res.render("shop/orders", { title: "Mis pedidos", orders: ordersView });
}

module.exports = {
  home,
  nosotrosPage,
  contactoPage,
  categoryProducts,
  addToCart,
  updateCartItem,
  checkout,
  myOrders,
};
