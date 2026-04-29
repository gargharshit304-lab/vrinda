import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const buildOrderNumber = () => `ORD-${nanoid(10)}`;

const canonicalOrderStatuses = {
  pending: { status: "Pending", orderStatus: "processing" },
  processing: { status: "Pending", orderStatus: "processing" },
  packed: { status: "Packed", orderStatus: "packed" },
  "out for delivery": { status: "Out for Delivery", orderStatus: "shipped" },
  shipped: { status: "Out for Delivery", orderStatus: "shipped" },
  delivered: { status: "Delivered", orderStatus: "delivered" }
};

const normalizeOrderStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return canonicalOrderStatuses[normalized] || null;
};

const pushStatusHistory = (order, status, timestamp = new Date()) => {
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const lastEntry = history[history.length - 1];

  if (lastEntry?.status !== status) {
    history.push({ status, updatedAt: timestamp });
  }

  order.statusHistory = history;
};

export const createOrder = async (req, res, next) => {
  try {
    if (req.user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins are not allowed to place orders"
      });
    }

    const { items, shippingAddress, paymentMethod = "COD" } = req.body;

    if (!Array.isArray(items) || !items.length) {
      const error = new Error("At least one order item is required");
      error.statusCode = 400;
      throw error;
    }

    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productId = String(item?.productId || item?.product || "").trim();
      const quantity = Number(item?.quantity);

      if (!quantity || quantity <= 0) {
        const error = new Error("Quantity must be greater than 0");
        error.statusCode = 400;
        throw error;
      }

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        const error = new Error("Product unavailable or insufficient stock");
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.findById(productId);
      const isActive = product?.status === "active";
      const hasEnoughStock = Number(product?.stock) >= quantity;

      if (!product || !isActive || !hasEnoughStock) {
        const error = new Error("Product unavailable or insufficient stock");
        error.statusCode = 400;
        throw error;
      }

      const productPrice = Number(product.price) || 0;
      subtotal += productPrice * quantity;

      product.stock -= quantity;
      await product.save();

      normalizedItems.push({
        product: product._id,
        name: product.name,
        price: productPrice,
        quantity
      });
    }

    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 0;
    const totalPrice = subtotal + deliveryFee;

    if (totalPrice <= 0) {
      const error = new Error("Invalid order");
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.create({
      orderNumber: buildOrderNumber(),
      user: req.user?._id,
      items: normalizedItems,
      shippingAddress,
      paymentMethod,
      status: "Pending",
      statusHistory: [{ status: "Pending", updatedAt: new Date() }],
      orderStatus: "processing",
      subtotal,
      deliveryFee,
      totalAmount: totalPrice
    });

    res.status(201).json({
      ...order.toObject(),
      totalPrice
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === "admin";

    let query = Order.find(isAdmin ? {} : { user: req.user._id })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    if (isAdmin) {
      query = query.populate("user", "name email role");
    }

    const orders = await query;

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email role")
      .populate("items.product", "name image price");
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user && order.user && order.user.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      const error = new Error("Forbidden: cannot access this order");
      error.statusCode = 403;
      throw error;
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, orderStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const nextStatus = normalizeOrderStatus(status || orderStatus);

    if (!nextStatus) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    order.status = nextStatus.status;
    order.orderStatus = nextStatus.orderStatus;
    pushStatusHistory(order, nextStatus.status);
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email role")
      .populate("items.product", "name image price");

    res.status(200).json(populatedOrder || order);
  } catch (error) {
    next(error);
  }
};
