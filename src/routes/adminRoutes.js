const express = require("express");
const adminController = require("../controllers/adminController");
const { isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/products", isAdmin, adminController.productDashboard);
router.get("/orders", isAdmin, adminController.ordersDashboard);
router.get("/payments", isAdmin, adminController.paymentsDashboard);
router.get("/payment-notifications", isAdmin, adminController.paymentNotificationsDashboard);
router.post("/payments", isAdmin, adminController.savePaymentSettings);
router.post("/payments/test-wompi", isAdmin, adminController.testWompiSettings);
router.post("/payments/disconnect/:provider", isAdmin, adminController.disconnectPaymentGateway);
router.post(
  "/products",
  isAdmin,
  adminController.uploadProductImage,
  adminController.handleUploadError,
  adminController.createProduct
);
router.post(
  "/products/:id/update",
  isAdmin,
  adminController.uploadProductImage,
  adminController.handleUploadError,
  adminController.updateProduct
);
router.post("/products/:id/toggle", isAdmin, adminController.toggleProduct);
router.post("/products/:id/featured", isAdmin, adminController.toggleFeatured);
router.post("/products/:id/delete", isAdmin, adminController.deleteProduct);
router.post("/categories", isAdmin, adminController.createCategory);
router.post("/categories/:id/update", isAdmin, adminController.updateCategory);
router.post("/categories/:id/delete", isAdmin, adminController.deleteCategory);

module.exports = router;
