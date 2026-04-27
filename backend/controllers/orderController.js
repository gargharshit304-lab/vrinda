import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const buildOrderNumber = () => `ORD-${nanoid(10)}`;

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { items, shippingAddress, paymentMethod = "COD" } = req.body;

    if (!Array.isArray(items) || !items.length) {
      const error = new Error("At least one order item is required");
      error.statusCode = 400;
      throw error;
    }

    let order;
    let totalPrice = 0;

    await session.withTransaction(async () => {
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

        const product = await Product.findById(productId).session(session);
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
        await product.save({ session });

        normalizedItems.push({
          product: product._id,
          name: product.name,
          price: productPrice,
          quantity
        });
      }

      const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 0;
      totalPrice = subtotal + deliveryFee;

      const createdOrders = await Order.create(
        [
          {
            orderNumber: buildOrderNumber(),
            user: req.user?._id,
            items: normalizedItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            deliveryFee,
            totalAmount: totalPrice
          }
        ],
        { session }
      );

      [order] = createdOrders;
    });

    res.status(201).json({
      ...order.toObject(),
      totalPrice
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const getOrders = async (_req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
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
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    order.orderStatus = status || order.orderStatus;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};
