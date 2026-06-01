const bcrypt = require("bcryptjs");
const { User, Cart, CartItem } = require("../models");
const { buildGuestCartViewModel } = require("../services/cartViewService");

function safeReturnPathFromReferer(req) {
  const ref = req.get("Referer");
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const host = req.get("host");
    if (!host || u.host !== host) return null;
    if (u.pathname.startsWith("/auth/")) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

async function mergeGuestCartIntoUserCart(session, userId) {
  const guestCart = session.guestCart || [];
  if (!guestCart.length) return;

  let cart = await Cart.findOne({ where: { UserId: userId } });
  if (!cart) {
    cart = await Cart.create({ UserId: userId });
  }

  for (const guestItem of guestCart) {
    const pid = Number(guestItem.productId);
    const existing = await CartItem.findOne({
      where: { CartId: cart.id, ProductId: pid },
    });
    if (existing) {
      existing.quantity += Number(guestItem.quantity) || 0;
      await existing.save();
    } else {
      await CartItem.create({
        CartId: cart.id,
        ProductId: pid,
        quantity: Number(guestItem.quantity) || 0,
      });
    }
  }

  session.guestCart = [];
}

async function showLogin(req, res) {
  try {
    const guestCart = req.session.guestCart || [];
    if (guestCart.length && !req.session.returnTo) {
      const back = safeReturnPathFromReferer(req);
      if (back) req.session.returnTo = back;
    }
    const cartData = await buildGuestCartViewModel(req.session);
    return res.render("auth/login", {
      title: "Iniciar sesion",
      error: null,
      cartData,
      guestCartPending: guestCart.length > 0,
      navSection: "",
    });
  } catch {
    return res.status(500).send("No se pudo cargar el inicio de sesion.");
  }
}

async function showRegister(req, res) {
  try {
    const guestCart = req.session.guestCart || [];
    if (guestCart.length && !req.session.returnTo) {
      const back = safeReturnPathFromReferer(req);
      if (back) req.session.returnTo = back;
    }
    const cartData = await buildGuestCartViewModel(req.session);
    return res.render("auth/register", {
      title: "Crear cuenta",
      error: null,
      cartData,
      guestCartPending: guestCart.length > 0,
      navSection: "",
    });
  } catch {
    return res.status(500).send("No se pudo cargar el registro.");
  }
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).render("auth/register", {
        title: "Crear cuenta",
        error: "Completa todos los campos y usa una clave de 8+ caracteres.",
        cartData: await buildGuestCartViewModel(req.session),
        guestCartPending: (req.session.guestCart || []).length > 0,
        navSection: "",
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).render("auth/register", {
        title: "Crear cuenta",
        error: "El correo ya esta registrado.",
        cartData: await buildGuestCartViewModel(req.session),
        guestCartPending: (req.session.guestCart || []).length > 0,
        navSection: "",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "customer" });
    await Cart.create({ UserId: user.id });

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    await mergeGuestCartIntoUserCart(req.session, user.id);
    const returnTo = req.session.returnTo || "/";
    req.session.returnTo = null;
    return res.redirect(returnTo);
  } catch (error) {
    return res.status(500).render("auth/register", {
      title: "Crear cuenta",
      error: "Error interno al crear la cuenta.",
      cartData: await buildGuestCartViewModel(req.session),
      guestCartPending: (req.session.guestCart || []).length > 0,
      navSection: "",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Iniciar sesion",
        error: "Credenciales invalidas.",
        cartData: await buildGuestCartViewModel(req.session),
        guestCartPending: (req.session.guestCart || []).length > 0,
        navSection: "",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).render("auth/login", {
        title: "Iniciar sesion",
        error: "Credenciales invalidas.",
        cartData: await buildGuestCartViewModel(req.session),
        guestCartPending: (req.session.guestCart || []).length > 0,
        navSection: "",
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    await mergeGuestCartIntoUserCart(req.session, user.id);
    const returnTo = req.session.returnTo || "/";
    req.session.returnTo = null;
    return res.redirect(returnTo);
  } catch (error) {
    return res.status(500).render("auth/login", {
      title: "Iniciar sesion",
      error: "Error interno al iniciar sesion.",
      cartData: await buildGuestCartViewModel(req.session),
      guestCartPending: (req.session.guestCart || []).length > 0,
      navSection: "",
    });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/auth/login");
  });
}

module.exports = {
  showLogin,
  showRegister,
  register,
  login,
  logout,
};
