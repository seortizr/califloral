const express = require("express");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

router.get("/wompi/return", paymentController.wompiReturn);

module.exports = router;
