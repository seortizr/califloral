const bcrypt = require("bcryptjs");
const { Product, User, Cart, Category } = require("../models");

const CATEGORY_DEFS = [
  { name: "Ramos", slug: "ramos", iconClass: "fa-regular fa-hand-holding-heart", sortOrder: 1 },
  { name: "Rosas", slug: "rosas", iconClass: "fa-solid fa-spa", sortOrder: 2 },
  { name: "Regalos", slug: "regalos", iconClass: "fa-solid fa-gift", sortOrder: 3 },
  { name: "Plantas", slug: "plantas", iconClass: "fa-solid fa-seedling", sortOrder: 4 },
];

const DEMO_PRODUCTS = [
  {
    name: "Ramo Rosas Suaves",
    description: "Rosas y eucalipto en tonos romanticos.",
    price: 24.99,
    imageEmoji: "🌹",
    imageUrl:
      "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=80",
    categorySlug: "ramos",
    isFeatured: true,
  },
  {
    name: "Caja Girasol Feliz",
    description: "Arreglo brillante para levantar cualquier dia.",
    price: 18.5,
    imageEmoji: "🌻",
    imageUrl:
      "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=900&q=80",
    categorySlug: "rosas",
    isFeatured: true,
  },
  {
    name: "Bouquet Lavanda",
    description: "Flores secas con aroma suave y delicado.",
    price: 16.75,
    imageEmoji: "💐",
    imageUrl:
      "https://images.unsplash.com/photo-1494336934272-fd4d10abfddc?auto=format&fit=crop&w=900&q=80",
    categorySlug: "regalos",
    isFeatured: true,
  },
  {
    name: "Mix Pastel Fresh",
    description: "Combinacion fresca en colores menta y coral.",
    price: 29.9,
    imageEmoji: "🪻",
    imageUrl:
      "https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=900&q=80",
    categorySlug: "plantas",
    isFeatured: true,
  },
];

async function ensureCategories() {
  for (const def of CATEGORY_DEFS) {
    const [row, created] = await Category.findOrCreate({
      where: { slug: def.slug },
      defaults: { ...def, isActive: true },
    });
    if (!created) {
      await row.update({
        name: def.name,
        iconClass: def.iconClass,
        sortOrder: def.sortOrder,
        isActive: true,
      });
    }
  }
}

async function categoryIdBySlug() {
  const rows = await Category.findAll();
  return new Map(rows.map((c) => [c.slug, c.id]));
}

async function syncProductCategoriesFromExisting() {
  const categories = await Category.findAll({ order: [["sortOrder", "ASC"], ["id", "ASC"]] });
  if (!categories.length) return;

  const products = await Product.findAll({ order: [["id", "ASC"]] });
  let i = 0;
  for (const p of products) {
    if (!p.CategoryId) {
      const cat = categories[i % categories.length];
      await p.update({ CategoryId: cat.id });
    }
    i += 1;
  }
}

async function ensureFeaturedProducts() {
  const featured = await Product.count({ where: { isFeatured: true, isActive: true } });
  if (featured > 0) return;
  const first = await Product.findAll({ where: { isActive: true }, order: [["id", "ASC"]], limit: 4 });
  for (const p of first) {
    await p.update({ isFeatured: true });
  }
}

async function seedDemoProductsIfEmpty() {
  const productCount = await Product.count();
  if (productCount > 0) return;

  const slugToId = await categoryIdBySlug();
  const rows = DEMO_PRODUCTS.map((item) => {
    const { categorySlug, ...rest } = item;
    const CategoryId = slugToId.get(categorySlug) || null;
    return { ...rest, CategoryId, isActive: true };
  });

  await Product.bulkCreate(rows);
}

async function seedAdminUser() {
  const adminEmail = "admin@califloral.local";
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash("Admin1234!", 12);
    const admin = await User.create({
      name: "Administrador",
      email: adminEmail,
      passwordHash: hash,
      role: "admin",
    });
    await Cart.create({ UserId: admin.id });
  }
}

async function seedDatabase() {
  await ensureCategories();
  await seedDemoProductsIfEmpty();
  await syncProductCategoriesFromExisting();
  await ensureFeaturedProducts();
  await seedAdminUser();
}

module.exports = { seedDatabase };
