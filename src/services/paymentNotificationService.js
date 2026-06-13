const { PaymentNotification, Order, User } = require("../models");
const { paymentMethodLabel } = require("./paymentService");

const STATUS_LABELS = {
  success: "Pago exitoso",
  failed: "Pago fallido",
  pending: "Pago pendiente",
};

function mapOrderStatusToNotificationStatus(orderStatus) {
  if (orderStatus === "paid") return "success";
  if (orderStatus === "failed" || orderStatus === "cancelled") return "failed";
  return "pending";
}

function buildNotificationMessage(status, paymentMethod, amount) {
  const label = paymentMethodLabel(paymentMethod);
  const formatted = Number(amount).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  if (status === "success") {
    return `Pago exitoso por $${formatted} via ${label}.`;
  }
  if (status === "failed") {
    return `Pago fallido por $${formatted} via ${label}.`;
  }
  return `Pago pendiente por $${formatted} via ${label}.`;
}

async function recordPaymentNotification({
  order,
  status,
  message,
  rawStatus,
  externalTransactionId,
}) {
  if (!order) return null;

  const notificationStatus = status || mapOrderStatusToNotificationStatus(order.status);
  const finalMessage =
    message || buildNotificationMessage(notificationStatus, order.paymentMethod, order.totalAmount);

  const existing = await PaymentNotification.findOne({
    where: {
      OrderId: order.id,
      status: notificationStatus,
      paymentReference: order.paymentReference,
    },
    order: [["createdAt", "DESC"]],
  });

  if (existing && existing.message === finalMessage) {
    return existing;
  }

  return PaymentNotification.create({
    OrderId: order.id,
    status: notificationStatus,
    amount: order.totalAmount,
    currency: "COP",
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider || "manual",
    paymentReference: order.paymentReference,
    externalTransactionId: externalTransactionId || order.externalTransactionId || null,
    message: finalMessage,
    rawStatus: rawStatus || order.status,
  });
}

async function getAdminPaymentNotifications({ statusFilter = "" } = {}) {
  const where = {};
  if (statusFilter === "success" || statusFilter === "failed" || statusFilter === "pending") {
    where.status = statusFilter;
  }

  const notifications = await PaymentNotification.findAll({
    where,
    include: [
      {
        model: Order,
        include: [{ model: User, attributes: ["id", "name", "email"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });

  return notifications.map((item) => {
    const plain = item.get({ plain: true });
    plain.statusLabel = STATUS_LABELS[plain.status] || plain.status;
    plain.methodLabel = paymentMethodLabel(plain.paymentMethod);
    plain.createdAtFormatted = new Date(plain.createdAt).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    plain.customerName = plain.Order?.User?.name || "—";
    plain.customerEmail = plain.Order?.User?.email || "—";
    plain.orderId = plain.Order?.id || null;
    return plain;
  });
}

async function getPaymentSummary() {
  const notifications = await PaymentNotification.findAll();
  let totalCollected = 0;
  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  for (const item of notifications) {
    if (item.status === "success") {
      successCount += 1;
      totalCollected += Number(item.amount);
    } else if (item.status === "failed") {
      failedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    totalCollected,
    successCount,
    failedCount,
    pendingCount,
  };
}

module.exports = {
  STATUS_LABELS,
  recordPaymentNotification,
  getAdminPaymentNotifications,
  getPaymentSummary,
  buildNotificationMessage,
  mapOrderStatusToNotificationStatus,
};
