const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Op } = require("sequelize");
const { Product, Category, Order, OrderItem, User } = require("../models");
const { loadSitePages } = require("../services/siteContentService");
const { paymentMethodLabel } = require("../services/paymentService");
const { zoneLabel } = require("../services/shippingService");
const { buildOrderMapInfo } = require("../services/mapsService");
const {
  PROVIDERS,
  getPaymentConfig,
  savePaymentConfig,
  disconnectProvider,
  buildAdminView,
} = require("../services/paymentConfigService");
const { testWompiConnection } = require("../services/wompiService");
const { getAppBaseUrl } = require("./paymentController");
const {
  getAdminPaymentNotifications,
  getPaymentSummary,
} = require("../services/paymentNotificationService");

const ORDER_STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  preparing: "En preparacion",
  shipped: "En camino",
  completed: "Entregado",
  cancelled: "Cancelado",
};

const uploadDirectory = path.join(__dirname, "../public/uploads/products");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || "").startsWith("image/")) return cb(null, true);
    return cb(new Error("Solo se permiten archivos de imagen."));
  },
}).single("imageFile");

function removeLocalUploadedImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/products/")) return;
  const filename = path.basename(imageUrl);
  const absolutePath = path.join(uploadDirectory, filename);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function slugifyCategoryName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function buildDashboardPayload() {
  const [products, categories, allCategories] = await Promise.all([
    Product.findAll({
      include: [{ model: Category }],
      order: [["createdAt", "DESC"]],
    }),
    Category.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    }),
    Category.findAll({
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    }),
  ]);

  const groupedProducts = new Map();
  for (const category of categories) {
    groupedProducts.set(String(category.id), {
      id: category.id,
      name: category.name,
      products: [],
    });
  }
  groupedProducts.set("uncategorized", {
    id: null,
    name: "Sin categoria",
    products: [],
  });

  for (const product of products) {
    const key = product.CategoryId ? String(product.CategoryId) : "uncategorized";
    if (!groupedProducts.has(key)) {
      groupedProducts.set(key, {
        id: product.CategoryId || null,
        name: product.Category?.name || "Sin categoria",
        products: [],
      });
    }
    groupedProducts.get(key).products.push(product);
  }

  return {
    allProducts: products,
    categories,
    allCategories,
    groupedProducts: Array.from(groupedProducts.values()),
    featuredProducts: products.filter((product) => product.isFeatured),
  };
}

async function renderDashboard(req, res, statusCode = 200, feedback = {}) {
  const { allProducts, categories, allCategories, groupedProducts, featuredProducts } = await buildDashboardPayload();
  return res.status(statusCode).render("admin/products", {
    title: "Admin | Productos",
    allProducts,
    categories,
    allCategories,
    groupedProducts,
    featuredProducts,
    message: feedback.message || null,
    error: feedback.error || null,
    navSection: "",
    adminSection: "products",
  });
}

async function createCategory(req, res) {
  try {
    const { name, iconClass, sortOrder } = req.body;
    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return renderDashboard(req, res, 400, { error: "El nombre de la categoria es obligatorio." });
    }

    const baseSlug = slugifyCategoryName(trimmedName) || "categoria";
    let slug = baseSlug;
    let index = 1;
    while (await Category.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }

    await Category.create({
      name: trimmedName,
      slug,
      iconClass: (iconClass || "").trim() || "fa-solid fa-seedling",
      sortOrder: Number(sortOrder) || 0,
      isActive: true,
    });

    return res.redirect("/admin/products");
  } catch (_error) {
    return renderDashboard(req, res, 500, { error: "No se pudo crear la categoria." });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, iconClass, sortOrder, isActive } = req.body;
    const category = await Category.findByPk(id);
    if (!category) return res.redirect("/admin/products");

    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return renderDashboard(req, res, 400, { error: "El nombre de la categoria es obligatorio." });
    }

    if (trimmedName !== category.name) {
      const baseSlug = slugifyCategoryName(trimmedName) || "categoria";
      let slug = baseSlug;
      let index = 1;
      while (await Category.findOne({ where: { slug, id: { [Op.ne]: category.id } } })) {
        slug = `${baseSlug}-${index}`;
        index += 1;
      }
      category.slug = slug;
    }

    category.name = trimmedName;
    category.iconClass = (iconClass || "").trim() || "fa-solid fa-seedling";
    category.sortOrder = Number(sortOrder) || 0;
    category.isActive = isActive === "on";
    await category.save();
    return res.redirect("/admin/products");
  } catch (_error) {
    return renderDashboard(req, res, 500, { error: "No se pudo actualizar la categoria." });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.redirect("/admin/products");
    await category.destroy();
    return res.redirect("/admin/products");
  } catch (_error) {
    return renderDashboard(req, res, 500, {
      error: "No se pudo eliminar la categoria. Revisa si tiene productos asociados.",
    });
  }
}

async function productDashboard(req, res) {
  return renderDashboard(req, res);
}

async function ordersDashboard(req, res) {
  const fulfillmentFilter = String(req.query.fulfillment || "").toLowerCase();
  const where = {};
  if (fulfillmentFilter === "delivery" || fulfillmentFilter === "pickup") {
    where.fulfillmentType = fulfillmentFilter;
  }

  const orders = await Order.findAll({
    where,
    include: [
      { model: User, attributes: ["id", "name", "email"] },
      { model: OrderItem },
    ],
    order: [["createdAt", "DESC"]],
  });

  const storeContact = loadSitePages().contacto;
  const ordersView = orders.map((order) => {
    const plain = order.get({ plain: true });
    plain.deliveryZoneLabel = plain.deliveryZone ? zoneLabel(plain.deliveryZone) : "";
    plain.paymentMethodLabel = paymentMethodLabel(plain.paymentMethod);
    plain.statusLabel = ORDER_STATUS_LABELS[plain.status] || plain.status;
    plain.createdAtFormatted = new Date(plain.createdAt).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    plain.mapInfo = buildOrderMapInfo(plain, {
      storeContact,
      zoneLabel: plain.deliveryZoneLabel,
    });
    return plain;
  });

  return res.render("admin/orders", {
    title: "Admin | Pedidos",
    orders: ordersView,
    filterFulfillment: fulfillmentFilter === "delivery" || fulfillmentFilter === "pickup" ? fulfillmentFilter : "",
    navSection: "",
    adminSection: "orders",
  });
}

async function paymentsDashboard(req, res) {
  const config = buildAdminView(await getPaymentConfig(true));
  const summary = await getPaymentSummary();
  const recentNotifications = await getAdminPaymentNotifications({ statusFilter: "" });
  return res.render("admin/payments", {
    title: "Admin | Pasarelas de pago",
    config,
    providers: Object.values(PROVIDERS),
    appUrl: getAppBaseUrl(req),
    summary,
    recentNotifications: recentNotifications.slice(0, 8),
    message: req.query.message || null,
    error: req.query.error || null,
    navSection: "",
    adminSection: "payments",
  });
}

async function paymentNotificationsDashboard(req, res) {
  const statusFilter = String(req.query.status || "").toLowerCase();
  const notifications = await getAdminPaymentNotifications({ statusFilter });
  const summary = await getPaymentSummary();

  return res.render("admin/payment-notifications", {
    title: "Admin | Notificaciones de pago",
    notifications,
    summary,
    statusFilter: ["success", "failed", "pending"].includes(statusFilter) ? statusFilter : "",
    navSection: "",
    adminSection: "payment-notifications",
  });
}

async function savePaymentSettings(req, res) {
  try {
    await savePaymentConfig(req.body);
    return res.redirect("/admin/payments?message=Configuracion+guardada");
  } catch (error) {
    return res.redirect(`/admin/payments?error=${encodeURIComponent(error.message || "No se pudo guardar")}`);
  }
}

async function testWompiSettings(req, res) {
  try {
    if (req.body?.wompiPublicKey) {
      await savePaymentConfig(req.body);
    }
    const result = await testWompiConnection();
    return res.redirect(
      `/admin/payments?message=${encodeURIComponent(`Wompi conectado: ${result.merchantName} (${result.environment})`)}`
    );
  } catch (error) {
    return res.redirect(`/admin/payments?error=${encodeURIComponent(error.message || "Fallo la prueba")}`);
  }
}

async function disconnectPaymentGateway(req, res) {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    await disconnectProvider(provider);
    return res.redirect(`/admin/payments?message=${encodeURIComponent("Pasarela desconectada")}`);
  } catch (error) {
    return res.redirect(`/admin/payments?error=${encodeURIComponent(error.message || "No se pudo desconectar")}`);
  }
}

async function createProduct(req, res) {
  try {
    const { name, description, price, imageUrl, imageEmoji, categoryId } = req.body;
    if (!name || !description || !price) {
      return renderDashboard(req, res, 400, {
        error: "Nombre, descripcion y precio son obligatorios.",
      });
    }

    const imageFromFile = req.file?.filename ? `/uploads/products/${req.file.filename}` : null;
    const finalImageUrl = imageFromFile || (imageUrl || "").trim() || null;

    await Product.create({
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl: finalImageUrl,
      imageEmoji: imageEmoji || "🌸",
      CategoryId: categoryId ? Number(categoryId) : null,
      isFeatured: req.body.isFeatured === "on",
      isActive: true,
    });

    return res.redirect("/admin/products");
  } catch (_error) {
    return renderDashboard(req, res, 500, { error: "No se pudo crear el producto." });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, imageEmoji, categoryId } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.redirect("/admin/products");

    const manualUrl = (imageUrl || "").trim();
    if (req.file?.filename) {
      removeLocalUploadedImage(product.imageUrl);
      product.imageUrl = `/uploads/products/${req.file.filename}`;
    } else if (manualUrl) {
      removeLocalUploadedImage(product.imageUrl);
      product.imageUrl = manualUrl;
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.imageEmoji = imageEmoji || "🌸";
    product.CategoryId = categoryId ? Number(categoryId) : null;
    await product.save();

    return res.redirect("/admin/products");
  } catch (_error) {
    return renderDashboard(req, res, 500, { error: "No se pudo actualizar el producto." });
  }
}

async function toggleProduct(req, res) {
  const { id } = req.params;
  const product = await Product.findByPk(id);
  if (!product) return res.redirect("/admin/products");
  product.isActive = !product.isActive;
  await product.save();
  return res.redirect("/admin/products");
}

async function toggleFeatured(req, res) {
  const { id } = req.params;
  const product = await Product.findByPk(id);
  if (!product) return res.redirect("/admin/products");
  product.isFeatured = !product.isFeatured;
  await product.save();
  return res.redirect("/admin/products");
}

async function deleteProduct(req, res) {
  const { id } = req.params;
  const product = await Product.findByPk(id);
  if (!product) return res.redirect("/admin/products");
  removeLocalUploadedImage(product.imageUrl);
  await product.destroy();
  return res.redirect("/admin/products");
}

function handleUploadError(err, req, res, next) {
  if (!err) return next();
  return renderDashboard(req, res, 400, {
    error: err.message || "No se pudo cargar la imagen.",
  });
}

module.exports = {
  uploadProductImage,
  handleUploadError,
  productDashboard,
  ordersDashboard,
  paymentsDashboard,
  paymentNotificationsDashboard,
  savePaymentSettings,
  testWompiSettings,
  disconnectPaymentGateway,
  createProduct,
  updateProduct,
  toggleProduct,
  toggleFeatured,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
};
