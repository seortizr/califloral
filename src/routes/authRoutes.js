const express = require("express");
const authController = require("../controllers/authController");
const { isGuest, isAuthenticated } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/login", isGuest, authController.showLogin);
router.post("/login", isGuest, authController.login);
router.get("/register", isGuest, authController.showRegister);
router.post("/register", isGuest, authController.register);
router.get("/logout", isAuthenticated, authController.logout);
router.post("/logout", isAuthenticated, authController.logout);

module.exports = router;
