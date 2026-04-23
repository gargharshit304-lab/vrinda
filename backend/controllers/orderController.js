import Order from "../models/Order.js";

const buildOrderNumber = () => `ORD-${Date.now().toString().slice(-8)}`;

export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = "COD", deliveryFee = 0 } = req.body;

    if (!Array.isArray(items) || !items.length) {
      const error = new Error("At least one order item is required");
      error.statusCode = 400;
      throw error;
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

    const order = await Order.create({
      orderNumber: buildOrderNumber(),
      user: req.user?._id,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      deliveryFee,
      totalAmount: subtotal + Number(deliveryFee || 0)
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
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
