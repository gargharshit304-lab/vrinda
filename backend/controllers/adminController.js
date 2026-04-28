import Order from "../models/Order.js";
import Product from "../models/Product.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getWeekdayShort = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-IN", { weekday: "short" });
};

const getOrderItems = (order) => (Array.isArray(order?.items) ? order.items : []);

const getOrderRevenue = (order) => {
  const totalPrice = Number(order?.totalPrice);
  if (Number.isFinite(totalPrice) && totalPrice >= 0) {
    return totalPrice;
  }

  const totalAmount = Number(order?.totalAmount);
  if (Number.isFinite(totalAmount) && totalAmount >= 0) {
    return totalAmount;
  }

  const subtotal = Number(order?.subtotal) || 0;
  const deliveryFee = Number(order?.deliveryFee) || 0;
  return subtotal + deliveryFee;
};

const getProductStock = (product) => Number(product?.stock ?? product?.unitsAvailable ?? product?.units ?? 0) || 0;

const buildWeeklySeries = (sourceMap, valueKey) =>
  WEEKDAYS.map((day) => ({
    date: day,
    [valueKey]: Number(sourceMap[day] || 0)
  }));

export const getAdminAnalytics = async (_req, res, next) => {
  try {
    const [orders, products] = await Promise.all([Order.find(), Product.find({}).select("name stock")]);

    const revenueMap = {};
    const ordersMap = {};
    const productSalesMap = new Map();

    WEEKDAYS.forEach((day) => {
      revenueMap[day] = 0;
      ordersMap[day] = 0;
    });

    let totalRevenue = 0;
    let totalProductsSold = 0;

    orders.forEach((order) => {
      const date = getWeekdayShort(order?.createdAt);
      if (date) {
        revenueMap[date] = (revenueMap[date] || 0) + getOrderRevenue(order);
        ordersMap[date] = (ordersMap[date] || 0) + 1;
      }

      totalRevenue += getOrderRevenue(order);

      getOrderItems(order).forEach((item) => {
        const productName = String(item?.name || item?.product?.name || "Product").trim() || "Product";
        const quantity = Number(item?.quantity) || 0;
        if (quantity <= 0) {
          return;
        }

        totalProductsSold += quantity;
        productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + quantity);
      });
    });

    const lowStock = products
      .map((product) => ({ name: String(product?.name || "Product"), stock: getProductStock(product) }))
      .filter((product) => product.stock < 5)
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

    const revenueByDate = buildWeeklySeries(revenueMap, "revenue");
    const ordersByDate = buildWeeklySeries(ordersMap, "count");

    const topProducts = Array.from(productSalesMap.entries())
      .map(([name, sold]) => ({ name, sold }))
      .sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name))
      .slice(0, 10);

    res.status(200).json({
      totalOrders: orders.length,
      totalRevenue,
      totalProductsSold,
      lowStock,
      revenueByDate,
      ordersByDate,
      topProducts
    });
  } catch (error) {
    next(error);
  }
};