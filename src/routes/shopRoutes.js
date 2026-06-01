const express = require("express");
const shopController = require("../controllers/shopController");
const { isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", shopController.home);
router.get("/nosotros", shopController.nosotrosPage);
router.get("/contacto", shopController.contactoPage);
router.get("/categoria/:slug", shopController.categoryProducts);
router.post("/cart/add", shopController.addToCart);
router.post("/cart/update", shopController.updateCartItem);
router.post("/checkout", isAuthenticated, shopController.checkout);
router.get("/orders", isAuthenticated, shopController.myOrders);

module.exports = router;
