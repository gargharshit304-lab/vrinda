import razorpay, { razorpayKeyId } from "../config/razorpay.js";
import crypto from "crypto";
import Order from "../models/Order.js";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    console.log("[createRazorpayOrder] Incoming request", {
      path: req.path,
      method: req.method,
      body: req.body && {
        amount: req.body.amount,
        orderId: req.body.orderId
      }
    });

    const { amount, orderId } = req.body || {};

    if (!amount || !orderId) {
      console.warn("[createRazorpayOrder] Missing amount or orderId", { amount, orderId });
      return res.status(400).json({ message: "amount and orderId are required" });
    }

    // Use the singleton exported from config
    console.log("[createRazorpayOrder] Razorpay instance present:", !!razorpay);

    if (!razorpay) {
      console.error("[createRazorpayOrder] Razorpay instance not initialized. Returning 503.");
      return res.status(503).json({ message: "Razorpay not configured on server" });
    }

    const paise = Math.round(Number(amount) * 100);
    const options = { amount: paise, currency: "INR", receipt: `vrinda_order_${Date.now()}` };

    console.log("[createRazorpayOrder] Creating Razorpay order for amount (paise):", paise);

    let rOrder;
    try {
      rOrder = await razorpay.orders.create(options);
      console.log("[createRazorpayOrder] Razorpay order created", { id: rOrder.id, amount: rOrder.amount });
    } catch (err) {
      console.error("[createRazorpayOrder] Error creating Razorpay order:", err && err.message);
      return res.status(500).json({ message: "Failed to create Razorpay order", error: err && err.message });
    }

    return res.status(200).json({ success: true, order: rOrder, id: rOrder.id, amount: rOrder.amount, currency: rOrder.currency, key: razorpayKeyId });
  } catch (error) {
    console.error("[createRazorpayOrder] Error:", error && error.message);
    next(error);
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = "paid";
    order.isPaid = true;
    order.paidAt = new Date();
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.paymentMethod = "RAZORPAY";

    await order.save();

    return res.status(200).json({ success: true, message: "Payment verified", order });
  } catch (error) {
    next(error);
  }
};
