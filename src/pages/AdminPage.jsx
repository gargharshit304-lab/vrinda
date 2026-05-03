import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Link, useNavigate } from "react-router-dom";
import AdminContactMessages from "./AdminContactMessages";
import AdminInventory from "./AdminInventory";
import AdminCouponsPage from "./AdminCouponsPage";
import { ADMIN_PRODUCTS_KEY, makeProductId, normalizeCatalogProduct } from "../data/productCatalog";
import { apiRequest } from "../data/apiClient";
import { fetchOrders as fetchAdminOrders } from "../data/orderApi";
import { deleteProduct } from "../data/productApi";
import { showToast } from "../data/toastEvents";

const AUTH_STORAGE_KEY = "vrinda.currentUser";

const STORAGE_KEYS = {
  products: ADMIN_PRODUCTS_KEY,
  orders: "vrinda.admin.orders"
};
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const sections = [
  { key: "overview", label: "Overview", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { key: "products", label: "Product Management", icon: "M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M8 6V4h8v2M3 12h18" },
  { key: "inventory", label: "Inventory", icon: "M9 3H5a2 2 0 0 0-2 2v4h4V3zm11 0h-4v4h4V3zM9 11H5v4h4v-4zm11 0h-4v4h4v-4zM9 19H5a2 2 0 0 0 2 2h2v-2zm11 0h-4v2h2a2 2 0 0 0 2-2z" },
  { key: "coupons", label: "Coupons", icon: "M4 4h16v3H4zM4 9h16v8H4zM6 13h12M6 17h8M20 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6" },
  { key: "orders", label: "Pending Orders", icon: "M3 4h18v17H3zM8 2v4M16 2v4M7 11h10M7 15h6" },
  { key: "analytics", label: "Analytics", icon: "M4 20V10M10 20V4M16 20v-7M22 20v-11" },
  { key: "contacts", label: "Contact Messages", icon: "M21 8v13H3V8M7 3h10l1 5H6l1-5z" },
  { key: "revenue", label: "Revenue Tracker", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }
];

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const readStore = (key) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeProduct = (product) => {
  try {
    return normalizeCatalogProduct(product);
  } catch {
    return null;
  }
};

const getEffectivePrice = (product) => {
  const basePrice = Number(product.price) || 0;
  const salePercent = Number(product.salePercent) || 0;
  if (!product.onSale || salePercent <= 0) {
    return basePrice;
  }
  return Math.max(1, Math.round(basePrice * (1 - salePercent / 100)));
};

const getOrderItems = (order) => (Array.isArray(order?.items) ? order.items : []);

const getOrderQuantity = (order) => getOrderItems(order).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);

const getOrderAmount = (order) => Number(order?.totalPrice ?? order?.totalAmount ?? order?.subtotal ?? 0);

const getOrderStatus = (order) => String(order?.status || order?.orderStatus || "pending");

const isCompletedOrder = (order) => {
  const status = getOrderStatus(order).toLowerCase();
  return status === "completed" || status === "delivered";
};

const isPendingOrder = (order) => {
  const status = getOrderStatus(order).toLowerCase();
  return status === "pending" || status === "processing" || status === "packed" || status === "shipped" || status === "out for delivery";
};

const getOrderStatusValue = (order) => {
  const status = getOrderStatus(order).toLowerCase();
  if (status === "processing") {
    return "pending";
  }
  if (status === "shipped") {
    return "out for delivery";
  }
  if (status === "completed") {
    return "delivered";
  }
  return status || "pending";
};

const getOrderStatusLabel = (order) => {
  const status = getOrderStatusValue(order);
  if (status === "out for delivery") {
    return "Out for Delivery";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const mapOrderStatusToApiValue = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pending") {
    return "Pending";
  }
  if (normalized === "packed") {
    return "Packed";
  }
  if (normalized === "out for delivery" || normalized === "shipped") {
    return "Out for Delivery";
  }
  if (normalized === "delivered") {
    return "Delivered";
  }
  return status;
};

const getOrderCustomerName = (order) => String(order?.user?.name || order?.shippingAddress?.fullName || "Customer");

const getOrderItemLabel = (item) => {
  const quantity = Number(item?.quantity) || 0;
  const name = String(item?.name || item?.product?.name || "Item");
  return quantity > 0 ? `${name} x ${quantity}` : name;
};

const getOrderItemKey = (order, item, index) => String(item?.product?._id || item?.product || item?.name || `${order?._id || "order"}-${index}`);

const formatOrderItems = (order) => {
  const items = getOrderItems(order);
  if (!items.length) {
    return "-";
  }

  return items.map((item, index) => (
    <div key={getOrderItemKey(order, item, index)} className="text-xs font-semibold text-sage-700">
      {getOrderItemLabel(item)}
    </div>
  ));
};

const makeSlug = (value) =>
  String(value || "product")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `product-${Date.now()}`;

const getLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const compareGrowth = (series, valueKey) => {
  const points = Array.isArray(series) ? series.filter((point) => point && point.date != null) : [];
  if (points.length < 2) {
    return null;
  }

  const previousValue = Number(points[points.length - 2]?.[valueKey]) || 0;
  const currentValue = Number(points[points.length - 1]?.[valueKey]) || 0;
  const delta = currentValue - previousValue;
  const percent = previousValue === 0 ? (currentValue === 0 ? 0 : 100) : (delta / Math.abs(previousValue)) * 100;

  return { currentValue, previousValue, delta, percent };
};

const formatGrowthText = (growth) => {
  if (!growth) {
    return "No prior data";
  }

  const sign = growth.delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(Math.round(growth.percent))}% from yesterday`;
};

const getGrowthClassName = (growth) => {
  if (!growth) {
    return "bg-sage-100 text-sage-600";
  }

  return growth.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
};

const buildDailyTotals = (orders, valueSelector) => {
  const totals = new Map();

  orders.forEach((order) => {
    const key = getLocalDateKey(order?.createdAt || order?.created || order?.updatedAt);
    if (!key) {
      return;
    }

    totals.set(key, (totals.get(key) || 0) + (Number(valueSelector(order)) || 0));
  });

  return totals;
};

const getProductId = (product) => String(product?.id || product?._id || "");

const buildFallbackTrendSeries = (series, valueKey) => {
  const points = Array.isArray(series) ? series.filter((point) => point && point.date) : [];

  if (points.length >= 2) {
    return points;
  }

  if (points.length === 1) {
    const point = points[0];
    const numericValue = Number(point?.[valueKey]) || 0;
    return [
      {
        date: `${point.date} -1`,
        [valueKey]: Math.max(0, Math.round(numericValue * 0.7))
      },
      {
        date: point.date,
        [valueKey]: numericValue
      }
    ];
  }

  // Create 7-day fallback with DD/M format (matches backend)
  const fallbackDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    fallbackDays.push({
      date: label,
      [valueKey]: 0
    });
  }
  return fallbackDays;
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [analyticsRange, setAnalyticsRange] = useState("7d");
  const [products, setProducts] = useState(() =>
    readStore(STORAGE_KEYS.products)
      .map(normalizeProduct)
      .filter(Boolean)
  );
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    date: "All",
    sort: "Newest"
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProductsSold: 0,
    lowStock: [],
    revenueByDate: [],
    ordersByDate: [],
    topProducts: [],
    revenueGrowth: 0,
    ordersGrowth: 0
  });
  const [productStatus, setProductStatus] = useState("");
  const [orderStatusMsg, setOrderStatusMsg] = useState("");
  const [preview, setPreview] = useState({ src: "", text: "No image selected." });
  const [additionalPreviews, setAdditionalPreviews] = useState([]);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      setHasAccess(false);
      setAuthChecked(true);
      navigate("/login", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user?.role === "admin") {
        setHasAccess(true);
        setAuthChecked(true);
        return;
      }
    } catch {
      // Invalid auth payload falls through to redirect.
    }

    setHasAccess(false);
    setAuthChecked(true);
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchAdminOrders();
        setOrders(data);
      } catch (error) {
        setOrderStatusMsg(error?.message || "Failed to load orders from the server.");
      }
    };

    loadOrders();
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await apiRequest(`/admin/analytics?range=${encodeURIComponent(analyticsRange)}`, {
          method: "GET",
          auth: true
        });

        const normalizedData = {
          totalOrders: Number(data?.totalOrders) || 0,
          totalRevenue: Number(data?.totalRevenue) || 0,
          totalProductsSold: Number(data?.totalProductsSold) || 0,
          lowStock: Array.isArray(data?.lowStock) ? data.lowStock : [],
          revenueByDate: Array.isArray(data?.revenueByDate) ? data.revenueByDate : [],
          ordersByDate: Array.isArray(data?.ordersByDate) ? data.ordersByDate : [],
          topProducts: Array.isArray(data?.topProducts) ? data.topProducts : [],
          revenueGrowth: Number(data?.revenueGrowth) || 0,
          ordersGrowth: Number(data?.ordersGrowth) || 0
        };

        console.log("Analytics Data:", normalizedData);
        console.log("Revenue Series Data:", normalizedData.revenueByDate);
        console.log("Orders Series Data:", normalizedData.ordersByDate);
        console.log("Growth Data:", {
          revenueGrowth: normalizedData.revenueGrowth,
          ordersGrowth: normalizedData.ordersGrowth
        });

        setAnalyticsData(normalizedData);
      } catch (error) {
        setOrderStatusMsg(error?.message || "Failed to load analytics from the server.");
        console.error("Analytics Load Error:", error);
      }
    };

    loadAnalytics();
  }, [analyticsRange]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim().toLowerCase());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  const [productForm, setProductForm] = useState({
    name: "",
    category: "Soaps",
    price: "",
    tagline: "",
    units: 0,
    salePercent: 0,
    onSale: false,
    description: "",
    mainImageDataUrl: "",
    additionalImageDataUrls: [],
    features: ["Deep cleansing", "Skin nourishing"],
    ingredients: "",
    howToUse: "",
    type: "",
    weightVolume: "",
    skinConcern: "",
    rating: ""
  });

  const persist = (nextProducts, nextOrders) => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(nextProducts));
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    window.dispatchEvent(new Event("vrinda-products-changed"));
    setProducts(nextProducts);
    setOrders(nextOrders);
  };

  const soldByProduct = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      if (!isCompletedOrder(order)) {
        return;
      }
      getOrderItems(order).forEach((item) => {
        const productId = String(item?.product?._id || item?.product || item?.productId || "");
        if (!productId) {
          return;
        }
        map.set(productId, (map.get(productId) || 0) + (Number(item?.quantity) || 0));
      });
    });
    return map;
  }, [orders]);

  const revenueStats = useMemo(() => {
    let completedRevenue = 0;
    let pendingPipeline = 0;
    let completedCount = 0;
    let pendingCount = 0;

    orders.forEach((order) => {
      const lineValue = getOrderAmount(order);
      if (isCompletedOrder(order)) {
        completedRevenue += lineValue;
        completedCount += 1;
      } else if (isPendingOrder(order)) {
        pendingPipeline += lineValue;
        pendingCount += 1;
      }
    });

    return {
      completedRevenue,
      pendingPipeline,
      completedCount,
      pendingCount,
      averageCompletedOrderValue: completedCount > 0 ? Math.round(completedRevenue / completedCount) : 0
    };
  }, [orders, products]);

  const topProduct = useMemo(() => {
    let top = { name: "-", sold: 0 };
    products.forEach((product) => {
      const sold = soldByProduct.get(product.id) || 0;
      if (sold > top.sold) {
        top = { name: product.name, sold };
      }
    });
    return top;
  }, [products, soldByProduct]);

  const analyticsRows = useMemo(() => {
    const rows = products
      .map((product) => ({ id: product.id, name: product.name, sold: soldByProduct.get(product.id) || 0 }))
      .sort((a, b) => b.sold - a.sold);
    const max = rows.length ? Math.max(...rows.map((item) => item.sold), 0) : 0;
    return rows.map((item) => ({ ...item, width: max > 0 ? Math.round((item.sold / max) * 100) : 0 }));
  }, [products, soldByProduct]);

  const pendingOrders = orders.filter((order) => isPendingOrder(order)).length;

  const filteredOrders = useMemo(() => {
    const now = new Date();

    const matchesDate = (orderDate) => {
      if (filters.date === "All") {
        return true;
      }

      const createdDate = new Date(orderDate);
      if (Number.isNaN(createdDate.getTime())) {
        return false;
      }

      if (filters.date === "Today") {
        return createdDate.toDateString() === now.toDateString();
      }

      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (filters.date === "Last 7 days") {
        return diffDays <= 7;
      }

      if (filters.date === "Last 30 days") {
        return diffDays <= 30;
      }

      return true;
    };

    const rows = orders.filter((order) => {
      const orderId = String(order?._id || order?.id || order?.orderNumber || "").toLowerCase();
      const customer = getOrderCustomerName(order).toLowerCase();
      const statusLabel = getOrderStatusLabel(order);
      const createdAt = order?.createdAt || order?.created || order?.updatedAt;

      const matchesSearch = !debouncedSearch || orderId.includes(debouncedSearch) || customer.includes(debouncedSearch);
      const matchesStatus = filters.status === "All" || statusLabel === filters.status;

      return matchesSearch && matchesStatus && matchesDate(createdAt);
    });

    rows.sort((a, b) => {
      const aTime = new Date(a?.createdAt || a?.created || a?.updatedAt || 0).getTime() || 0;
      const bTime = new Date(b?.createdAt || b?.created || b?.updatedAt || 0).getTime() || 0;
      return filters.sort === "Oldest" ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [orders, filters.status, filters.date, filters.sort, debouncedSearch]);

  const totalOrders = analyticsData.totalOrders || orders.length;
  const totalRevenue = analyticsData.totalRevenue || revenueStats.completedRevenue || 0;
  const totalProductsSold = analyticsData.totalProductsSold || Array.from(soldByProduct.values()).reduce((s, v) => s + v, 0);
  const lowStockProducts = analyticsData.lowStock.length
    ? analyticsData.lowStock
    : products.filter((p) => {
    const qty = Number(p.unitsAvailable || p.stock || p.units || 0);
    return Number.isFinite(qty) && qty < 5;
    });

  const revenueSeries = useMemo(
    () => {
      const series = buildFallbackTrendSeries(analyticsData.revenueByDate, "revenue");
      console.log("Revenue Series (for LineChart):", series);
      return series;
    },
    [analyticsData.revenueByDate]
  );

  const ordersSeries = useMemo(
    () => {
      const rawSeries = buildFallbackTrendSeries(analyticsData.ordersByDate, "count");
      console.log("Orders Series (for BarChart):", rawSeries);
      return rawSeries;
    },
    [analyticsData.ordersByDate]
  );

  const revenueGrowth = useMemo(() => {
    const percentChange = Number(analyticsData.revenueGrowth) || 0;
    if (percentChange === 0 && analyticsData.totalRevenue === 0) {
      return null;
    }
    return {
      currentValue: analyticsData.totalRevenue,
      previousValue: analyticsData.totalRevenue / (1 + percentChange / 100) || 0,
      delta: analyticsData.totalRevenue - (analyticsData.totalRevenue / (1 + percentChange / 100) || 0),
      percent: percentChange
    };
  }, [analyticsData.revenueGrowth, analyticsData.totalRevenue]);

  const ordersGrowth = useMemo(() => {
    const percentChange = Number(analyticsData.ordersGrowth) || 0;
    if (percentChange === 0 && analyticsData.totalOrders === 0) {
      return null;
    }
    return {
      currentValue: analyticsData.totalOrders,
      previousValue: analyticsData.totalOrders / (1 + percentChange / 100) || 0,
      delta: analyticsData.totalOrders - (analyticsData.totalOrders / (1 + percentChange / 100) || 0),
      percent: percentChange
    };
  }, [analyticsData.ordersGrowth, analyticsData.totalOrders]);

  const productsSoldGrowth = useMemo(() => {
    const dailyUnits = buildDailyTotals(orders, (order) =>
      getOrderItems(order).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
    );

    const sorted = Array.from(dailyUnits.entries())
      .map(([date, sold]) => ({ date, sold }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-2);

    return compareGrowth(sorted, "sold");
  }, [orders]);

  const lowStockGrowth = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const todaySoldByProduct = new Map();

    orders.forEach((order) => {
      const orderDateKey = getLocalDateKey(order?.createdAt || order?.created || order?.updatedAt);
      if (orderDateKey !== todayKey) {
        return;
      }

      getOrderItems(order).forEach((item) => {
        const productId = getProductId(item?.product) || String(item?.productId || "");
        if (!productId) {
          return;
        }

        todaySoldByProduct.set(productId, (todaySoldByProduct.get(productId) || 0) + (Number(item?.quantity) || 0));
      });
    });

    const currentLowStockCount = lowStockProducts.length;
    const previousLowStockCount = products.reduce((count, product) => {
      const productId = getProductId(product);
      const currentStock = Number(product?.stock || product?.unitsAvailable || product?.units || 0) || 0;
      const yesterdayStock = currentStock + (todaySoldByProduct.get(productId) || 0);
      return yesterdayStock < 5 ? count + 1 : count;
    }, 0);

    return {
      currentValue: currentLowStockCount,
      previousValue: previousLowStockCount,
      delta: currentLowStockCount - previousLowStockCount,
      percent:
        previousLowStockCount === 0
          ? currentLowStockCount === 0
            ? 0
            : 100
          : ((currentLowStockCount - previousLowStockCount) / Math.abs(previousLowStockCount)) * 100
    };
  }, [lowStockProducts.length, orders, products]);

  const addProduct = async (event) => {
    event.preventDefault();
    const name = productForm.name.trim();
    const category = productForm.category.trim();
    const tagline = productForm.tagline.trim();
    const description = productForm.description.trim();
    const ingredients = productForm.ingredients.trim();
    const howToUse = productForm.howToUse.trim();
    const type = productForm.type.trim();
    const weightVolume = productForm.weightVolume.trim();
    const skinConcern = productForm.skinConcern.trim();
    const price = Number(productForm.price);
    const unitsAvailable = Number(productForm.units);
    const salePercent = Number(productForm.salePercent);
    const rating = Number(productForm.rating);
    const features = productForm.features.map((item) => item.trim()).filter(Boolean);

    if (!name || !category || !tagline || !description || !Number.isFinite(price) || price < 1) {
      setProductStatus("Please fill all product fields correctly.");
      return;
    }
    if (!Number.isInteger(unitsAvailable) || unitsAvailable < 0) {
      setProductStatus("Units available must be 0 or more.");
      return;
    }
    if (!Number.isFinite(salePercent) || salePercent < 0 || salePercent > 90) {
      setProductStatus("Sale discount must be between 0 and 90.");
      return;
    }
    if (productForm.onSale && salePercent <= 0) {
      setProductStatus("Enter a sale discount above 0 when sale is enabled.");
      return;
    }
    if (!mainImageFile) {
      setProductStatus("Upload an image from your device before saving.");
      return;
    }
    if (!ingredients || !howToUse || !type || !weightVolume || !skinConcern) {
      setProductStatus("Please complete ingredients, how to use, and product details sections.");
      return;
    }
    if (!features.length) {
      setProductStatus("Add at least one feature/benefit.");
      return;
    }
    if (productForm.rating && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
      setProductStatus("Rating must be between 0 and 5.");
      return;
    }

    const slugBase = makeSlug(name);
    const productPayload = new FormData();
    productPayload.append("name", name);
    productPayload.append("slug", `${slugBase}-${Date.now().toString(36)}`);
    productPayload.append("price", String(price));
    productPayload.append("stock", String(unitsAvailable));
    productPayload.append("description", description);
    productPayload.append("image", mainImageFile);
    additionalImageFiles.forEach((file) => {
      productPayload.append("images", file);
    });

    let createdProduct;

    try {
      setIsUploadingProduct(true);
      createdProduct = await apiRequest("/products", {
        method: "POST",
        auth: true,
        body: productPayload
      });
    } catch (error) {
      setProductStatus(error.message || "Failed to save product to backend.");
      return;
    } finally {
      setIsUploadingProduct(false);
    }

    const createdImages = Array.isArray(createdProduct?.images) ? createdProduct.images.filter(Boolean) : [];
    const createdMainImage = createdProduct?.image || createdImages[0] || "";

    const nextProducts = [
      {
        id: createdProduct?._id || makeProductId(name),
        name,
        category,
        tagline,
        description,
        price,
        unitsAvailable,
        onSale: productForm.onSale,
        salePercent,
        rating: Number.isFinite(rating) ? rating : 4.6,
        reviewCount: 0,
        features,
        ingredients,
        howToUse,
        type,
        weightVolume,
        skinConcern,
        mainImageDataUrl: createdMainImage,
        additionalImageDataUrls: createdImages.slice(1),
        imageDataUrl: createdMainImage,
        images: createdImages.length ? createdImages : [createdMainImage].filter(Boolean)
      },
      ...products
    ];

    persist(nextProducts, orders);
    setProductStatus("Product saved successfully and synced to shop.");
    setProductForm({
      name: "",
      category: "Soaps",
      price: "",
      tagline: "",
      units: 0,
      salePercent: 0,
      onSale: false,
      description: "",
      mainImageDataUrl: "",
      additionalImageDataUrls: [],
      features: ["Deep cleansing", "Skin nourishing"],
      ingredients: "",
      howToUse: "",
      type: "",
      weightVolume: "",
      skinConcern: "",
      rating: ""
    });
    setMainImageFile(null);
    setAdditionalImageFiles([]);
    setPreview({ src: "", text: "No image selected." });
    setAdditionalPreviews([]);
    setFeatureInput("");
  };

  const removeProduct = async (id) => {
    try {
      await deleteProduct(id);
    } catch (error) {
      if (error?.status !== 404) {
        setProductStatus(error.message || "Failed to delete product from backend.");
        return;
      }
    }

    const nextProducts = products.filter((product) => product.id !== id);
    const cachedProducts = readStore(STORAGE_KEYS.products).filter((product) => String(product?.id || product?._id || "") !== String(id));

    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(cachedProducts));
    persist(nextProducts, orders);
    window.dispatchEvent(new Event("vrinda-products-changed"));
    setProductStatus("Product deleted successfully.");
    showToast("Product deleted successfully", "success");
  };

  const updateStatus = async (id, status) => {
    const orderId = String(id || "");
    if (!orderId) {
      setOrderStatusMsg("Order ID is missing.");
      return;
    }

    // Prevent multiple simultaneous requests
    if (updatingOrderId === orderId) {
      return;
    }

    console.log("Updating order:", orderId, "status:", status);

    setUpdatingOrderId(orderId);
    setOrderStatusMsg("");

    try {
      const mappedStatus = mapOrderStatusToApiValue(status);
      console.log("Mapped status value:", mappedStatus);

      const response = await apiRequest(`/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ status: mappedStatus })
      });

      console.log("Status update response:", response);

      // Update state locally for immediate UI feedback
      const updatedOrders = orders.map((order) =>
        (order._id === orderId || order.id === orderId) ? { ...order, status: mappedStatus } : order
      );
      setOrders(updatedOrders);
      setOrderStatusMsg("Order status updated successfully!");

      // Refresh orders from backend after a short delay
      setTimeout(async () => {
        try {
          const data = await fetchAdminOrders();
          setOrders(data);
          console.log("Orders refreshed from backend");
        } catch (refreshError) {
          console.error("Failed to refresh orders:", refreshError);
        }
      }, 500);
      // If order is marked as Delivered, also refresh inventory
      if (mapOrderStatusToApiValue(status) === "Delivered") {
        console.log("[AdminPage] Order marked as Delivered. Refreshing inventory...");
        setTimeout(async () => {
          try {
            // Fetch latest products from backend to get updated inventory
            const response = await apiRequest("/products", {
              method: "GET",
              auth: true
            });

            if (Array.isArray(response)) {
              console.log("[AdminPage] Inventory refreshed:", response.length, "products loaded");
              const normalizedProducts = response
                .map(normalizeCatalogProduct)
                .filter(Boolean);
              setProducts(normalizedProducts);
              showToast("Inventory updated after delivery", "success");
            }
          } catch (inventoryError) {
            console.error("[AdminPage] Failed to refresh inventory:", inventoryError);
            // Don't show error toast - inventory refresh is not critical
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Status update error:", error);
      const errorMsg = error?.message || "Failed to update order status.";
      setOrderStatusMsg(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleMainImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview({ src: "", text: "No image selected." });
      setMainImageFile(null);
      setProductForm((old) => ({ ...old, mainImageDataUrl: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProductStatus("Invalid file type. Choose an image from your device.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const input = event.target;
      input.value = "";
      setPreview({ src: "", text: "No image selected." });
      setMainImageFile(null);
      setProductForm((old) => ({ ...old, mainImageDataUrl: "" }));
      setProductStatus("Image size should be less than 2MB");
      window.alert("Image size should be less than 2MB");
      return;
    }

    const src = URL.createObjectURL(file);
    setMainImageFile(file);
    setPreview({ src, text: file.name });
    setProductForm((old) => ({ ...old, mainImageDataUrl: src }));
    setProductStatus("Image ready. Submit the form to save product.");
  };

  const handleAdditionalImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      setAdditionalImageFiles([]);
      setProductForm((old) => ({ ...old, additionalImageDataUrls: [] }));
      setAdditionalPreviews([]);
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setProductStatus("Additional images must be valid image files.");
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_SIZE_BYTES)) {
      const input = event.target;
      input.value = "";
      setAdditionalImageFiles([]);
      setProductForm((old) => ({ ...old, additionalImageDataUrls: [] }));
      setAdditionalPreviews([]);
      setProductStatus("Image size should be less than 2MB");
      window.alert("Image size should be less than 2MB");
      return;
    }

    const entries = files.map((file) => ({ name: file.name, src: URL.createObjectURL(file) }));
    setAdditionalImageFiles(files);
    setAdditionalPreviews(entries);
    setProductForm((old) => ({ ...old, additionalImageDataUrls: entries.map((entry) => entry.src) }));
  };

  const addFeaturePoint = () => {
    const value = featureInput.trim();
    if (!value) {
      return;
    }
    setProductForm((old) => ({ ...old, features: [...old.features, value] }));
    setFeatureInput("");
  };

  const removeFeaturePoint = (index) => {
    setProductForm((old) => ({ ...old, features: old.features.filter((_, idx) => idx !== index) }));
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-sm font-semibold text-sage-700">Checking admin access...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-[min(1200px,94vw)] pt-4">
        <div className="glass-card flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-soft">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-sage-200/80 bg-white/85 px-4 py-2 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to Website</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/shop"
              className="rounded-full border border-sage-200/80 bg-white/85 px-4 py-2 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              View Shop
            </Link>
            <a
              href="/shop"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-sage-200/80 bg-white/85 px-4 py-2 text-sm font-bold text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              View Shop (New Tab)
            </a>
          </div>
        </div>
      </header>

      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="relative border-b border-sage-200 bg-gradient-to-b from-[#fcfaf5] to-[#ede5d8] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 pl-2">
            <h1 className="font-display text-4xl font-bold text-sage-800">Vrinda</h1>
            <p className="text-xs font-semibold text-sage-600">Admin control panel</p>
          </div>

          <nav className="grid gap-2">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition ${
                  activeSection === section.key
                    ? "border-sage-700 bg-sage-700 text-white shadow"
                    : "border-sage-200 bg-white/80 text-sage-800 hover:-translate-y-0.5 hover:shadow"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={section.icon} />
                </svg>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-3 p-4 md:p-6">
          <section className="glass-card p-6">
            <h2 className="font-display text-5xl font-bold leading-none text-sage-800">Admin Dashboard</h2>
            <p className="mt-2 text-sm text-sage-600">
              Manage products, pending orders, demand analytics, and revenue in INR. Logic stays client-side with localStorage.
            </p>
          </section>

          {activeSection === "overview" && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Current Orders Left</p>
                <strong className="mt-2 block font-display text-4xl text-sage-700">{pendingOrders}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Total Orders</p>
                <strong className="mt-2 block font-display text-4xl text-sage-700">{orders.length}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Top Demand Product</p>
                <strong className="mt-2 block font-display text-3xl text-sage-700">{topProduct.name}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Revenue Tracker (INR)</p>
                <strong className="mt-2 block font-display text-3xl text-sage-700">{formatInr(revenueStats.completedRevenue)}</strong>
              </article>
            </section>
          )}

          {activeSection === "products" && (
            <section className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Add Product</h3>
                <form onSubmit={addProduct} className="mt-4 space-y-3">
                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Basic Details</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Product Name
                        <input
                          value={productForm.name}
                          onChange={(e) => setProductForm((old) => ({ ...old, name: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Category
                        <select
                          value={productForm.category}
                          onChange={(e) => setProductForm((old) => ({ ...old, category: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        >
                          <option>Soaps</option>
                          <option>Candles</option>
                          <option>Bath & Body</option>
                          <option>Gift Sets / Accessories</option>
                          <option>Herbal Care</option>
                        </select>
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Price (INR)
                        <input
                          type="number"
                          min="1"
                          value={productForm.price}
                          onChange={(e) => setProductForm((old) => ({ ...old, price: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Short Tagline
                        <input
                          value={productForm.tagline}
                          onChange={(e) => setProductForm((old) => ({ ...old, tagline: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Images</h4>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm font-bold text-sage-800">
                        Main Product Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImage}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2"
                          required
                        />
                      </label>
                      <div className="flex items-center gap-3 text-sm text-sage-600">
                        {preview.src ? <img src={preview.src} alt="preview" className="h-14 w-14 rounded-lg object-cover" /> : null}
                        <span>{preview.text}</span>
                      </div>
                      <label className="text-sm font-bold text-sage-800">
                        Additional Images (thumbnails)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAdditionalImages}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2"
                        />
                      </label>
                      {!!additionalPreviews.length && (
                        <div className="flex flex-wrap gap-2">
                          {additionalPreviews.map((item) => (
                            <img key={item.src} src={item.src} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Description</h4>
                    <label className="mt-3 block text-sm font-bold text-sage-800">
                      Long Description
                      <textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm((old) => ({ ...old, description: e.target.value }))}
                        className="mt-1 min-h-24 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        required
                      />
                    </label>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Features / Benefits</h4>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        className="w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm outline-none focus:border-sage-400"
                        placeholder="Add feature point"
                      />
                      <button type="button" onClick={addFeaturePoint} className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white">
                        Add
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {productForm.features.map((feature, idx) => (
                        <div key={`${feature}-${idx}`} className="flex items-center justify-between rounded-xl border border-sage-200 bg-white px-3 py-2">
                          <span className="text-sm font-semibold text-sage-700">{feature}</span>
                          <button type="button" onClick={() => removeFeaturePoint(idx)} className="text-xs font-bold text-rose-700">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Ingredients & Usage</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Ingredients
                        <textarea
                          value={productForm.ingredients}
                          onChange={(e) => setProductForm((old) => ({ ...old, ingredients: e.target.value }))}
                          className="mt-1 min-h-20 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        How to Use
                        <textarea
                          value={productForm.howToUse}
                          onChange={(e) => setProductForm((old) => ({ ...old, howToUse: e.target.value }))}
                          className="mt-1 min-h-20 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Product Details</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="text-sm font-bold text-sage-800">
                        Type
                        <input
                          value={productForm.type}
                          onChange={(e) => setProductForm((old) => ({ ...old, type: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Weight / Volume
                        <input
                          value={productForm.weightVolume}
                          onChange={(e) => setProductForm((old) => ({ ...old, weightVolume: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Skin Type / Concern
                        <input
                          value={productForm.skinConcern}
                          onChange={(e) => setProductForm((old) => ({ ...old, skinConcern: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Pricing, Stock & Extras</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Stock Quantity
                        <input
                          type="number"
                          min="0"
                          value={productForm.units}
                          onChange={(e) => setProductForm((old) => ({ ...old, units: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Rating (0 to 5, optional)
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={productForm.rating}
                          onChange={(e) => setProductForm((old) => ({ ...old, rating: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        />
                      </label>
                      <label className="md:col-span-2 text-sm font-bold text-sage-800">
                        Sale Discount (%)
                        <input
                          type="number"
                          min="0"
                          max="90"
                          value={productForm.salePercent}
                          onChange={(e) => setProductForm((old) => ({ ...old, salePercent: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        />
                      </label>
                      <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-sage-700">
                        <input
                          type="checkbox"
                          checked={productForm.onSale}
                          onChange={(e) => setProductForm((old) => ({ ...old, onSale: e.target.checked }))}
                        />
                        Mark this product as on sale
                      </label>
                    </div>
                  </section>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={isUploadingProduct}
                      className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUploadingProduct ? "Uploading..." : "Save Product"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm({
                          name: "",
                          category: "Soaps",
                          price: "",
                          tagline: "",
                          units: 0,
                          salePercent: 0,
                          onSale: false,
                          description: "",
                          mainImageDataUrl: "",
                          additionalImageDataUrls: [],
                          features: ["Deep cleansing", "Skin nourishing"],
                          ingredients: "",
                          howToUse: "",
                          type: "",
                          weightVolume: "",
                          skinConcern: "",
                          rating: ""
                        });
                        setMainImageFile(null);
                        setAdditionalImageFiles([]);
                        setPreview({ src: "", text: "No image selected." });
                        setAdditionalPreviews([]);
                        setFeatureInput("");
                        setProductStatus("Form reset.");
                      }}
                      className="pill-btn"
                    >
                      Reset
                    </button>
                  </div>

                  <p className="min-h-5 text-sm font-bold text-sage-700">{productStatus}</p>
                </form>
              </article>

              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Products</h3>
                <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  {!products.length ? (
                    <p className="text-sm text-sage-600">No products yet. Add your first product with image upload from device.</p>
                  ) : (
                    products.map((product) => {
                      const effective = getEffectivePrice(product);
                      const showSale = product.onSale && product.salePercent > 0;
                      return (
                        <article key={product.id} className="rounded-xl border border-sage-200 bg-white p-2 transition hover:-translate-y-0.5 hover:shadow">
                          <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2">
                            <img src={product.imageDataUrl} alt={product.name} className="h-16 w-16 rounded-lg object-cover" />
                            <div>
                              <h4 className="font-extrabold text-sage-800">{product.name}</h4>
                              <p className="line-clamp-2 text-xs text-sage-600">{product.description}</p>
                              <p className="text-xs font-bold text-sage-700">
                                {formatInr(effective)}
                                {showSale ? <span className="ml-2 text-sage-500 line-through">{formatInr(product.price)}</span> : null}
                              </p>
                              {showSale ? (
                                <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                                  On Sale {product.salePercent}%
                                </span>
                              ) : null}
                              <p className="text-[11px] font-bold text-earth-700">Units available: {product.unitsAvailable}</p>
                              <p className="text-[11px] font-bold text-earth-700">Sold (completed): {soldByProduct.get(product.id) || 0}</p>
                            </div>
                            <button onClick={() => removeProduct(product.id)} className="rounded-full border border-sage-200 px-3 py-1 text-xs font-extrabold">
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          )}

          {activeSection === "inventory" && <AdminInventory products={products} />}

          {activeSection === "coupons" && <AdminCouponsPage />}

          {activeSection === "orders" && (
            <section className="glass-card p-5">
              <h3 className="font-display text-4xl font-semibold text-sage-800">Pending Orders</h3>
              <div className="mt-3 grid gap-3 rounded-xl border border-sage-200/80 bg-white/70 p-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sage-700">
                  Search
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => setFilters((old) => ({ ...old, search: event.target.value }))}
                    placeholder="Order ID / Customer"
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800 outline-none focus:border-sage-400"
                  />
                </label>

                <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sage-700">
                  Status
                  <select
                    value={filters.status}
                    onChange={(event) => setFilters((old) => ({ ...old, status: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800 outline-none focus:border-sage-400"
                  >
                    <option>All</option>
                    <option>Pending</option>
                    <option>Packed</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </label>

                <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sage-700">
                  Date
                  <select
                    value={filters.date}
                    onChange={(event) => setFilters((old) => ({ ...old, date: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800 outline-none focus:border-sage-400"
                  >
                    <option>All</option>
                    <option>Today</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                  </select>
                </label>

                <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sage-700">
                  Sort
                  <select
                    value={filters.sort}
                    onChange={(event) => setFilters((old) => ({ ...old, sort: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800 outline-none focus:border-sage-400"
                  >
                    <option>Newest</option>
                    <option>Oldest</option>
                  </select>
                </label>
              </div>

              <div className="orders-container mt-3 rounded-xl border border-sage-200 bg-white/80">
                <table className="min-w-[680px] w-full text-left text-sm">
                  <thead className="orders-table-head text-xs uppercase tracking-wider text-sage-600">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Amount (INR)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredOrders.length ? (
                      <tr>
                        <td className="p-3 text-sage-600" colSpan={7}>
                          No orders match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const orderId = String(order?._id || order?.id || order?.orderNumber || "-");
                        const items = getOrderItems(order);
                        const quantity = getOrderQuantity(order);
                        const amount = getOrderAmount(order);
                        const statusValue = getOrderStatusValue(order);
                        const statusLabel = getOrderStatusLabel(order);
                        const isPending = statusValue === "pending";
                        const isPacked = statusValue === "packed";
                        const isOutForDelivery = statusValue === "out for delivery";
                        const isDelivered = statusValue === "delivered";
                        const badgeClass = `status-${statusValue.replace(/\s+/g, "-")}`;
                        return (
                          <tr key={orderId} className="border-t border-sage-100 align-top">
                            <td className="p-3 text-xs font-bold text-sage-700">{orderId}</td>
                            <td className="p-3">{getOrderCustomerName(order)}</td>
                            <td className="p-3">
                              {items.length ? <div className="space-y-1">{formatOrderItems(order)}</div> : "-"}
                            </td>
                            <td className="p-3">{quantity}</td>
                            <td className="p-3">{formatInr(amount)}</td>
                            <td className="p-3">
                              <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateStatus(order._id || order.id || order.orderNumber, "Packed")}
                                  disabled={!isPending || updatingOrderId === (order._id || order.id || order.orderNumber)}
                                  className={`rounded-full px-3 py-2 text-xs font-extrabold text-white transition ${
                                    isPending && updatingOrderId !== (order._id || order.id || order.orderNumber)
                                      ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                                  }`}
                                >
                                  {updatingOrderId === (order._id || order.id || order.orderNumber) ? "Updating..." : "Mark Packed"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(order._id || order.id || order.orderNumber, "Out for Delivery")}
                                  disabled={!isPacked || updatingOrderId === (order._id || order.id || order.orderNumber)}
                                  className={`rounded-full px-3 py-2 text-xs font-extrabold text-white transition ${
                                    isPacked && updatingOrderId !== (order._id || order.id || order.orderNumber)
                                      ? "bg-orange-500 hover:bg-orange-600 cursor-pointer"
                                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                                  }`}
                                >
                                  {updatingOrderId === (order._id || order.id || order.orderNumber) ? "Updating..." : "Out for Delivery"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(order._id || order.id || order.orderNumber, "Delivered")}
                                  disabled={!isOutForDelivery || updatingOrderId === (order._id || order.id || order.orderNumber)}
                                  className={`rounded-full px-3 py-2 text-xs font-extrabold text-white transition ${
                                    isOutForDelivery && updatingOrderId !== (order._id || order.id || order.orderNumber)
                                      ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                                  }`}
                                >
                                  {updatingOrderId === (order._id || order.id || order.orderNumber) ? "Updating..." : "Delivered"}
                                </button>
                                {isDelivered ? (
                                  <span className="rounded-full bg-gray-200 px-3 py-2 text-xs font-extrabold text-gray-600">
                                    All actions disabled
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "analytics" && (
            <section className="glass-card p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="font-display text-4xl font-semibold text-sage-800">Analytics Dashboard</h3>
                  <p className="mt-1 text-sm text-sage-600">Review performance over the selected time range.</p>
                </div>
                <label className="inline-flex flex-col gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-sage-600">
                  Time Range
                  <select
                    value={analyticsRange}
                    onChange={(event) => {
                      setAnalyticsRange(event.target.value);
                      console.log("Analytics range changed to:", event.target.value);
                    }}
                    className="min-w-44 rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm font-semibold text-sage-800 outline-none transition focus:border-sage-400"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </label>
              </div>
              {!orders.length && !products.length ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-sage-200 bg-gradient-to-br from-white via-[#f6fbf7] to-[#eaf6ee] p-8 text-sage-700 shadow-soft">
                  <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 shadow-sm ring-1 ring-sage-100">
                      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19V5" />
                        <path d="M4 19h16" />
                        <path d="M8 15l3-3 3 2 4-6" />
                        <path d="M17 8h1.5V6.5" />
                      </svg>
                    </div>
                    <div className="max-w-xl">
                      <p className="text-xl font-display font-semibold text-sage-800">Start selling products to see analytics insights 📈</p>
                      <p className="mt-2 text-sm leading-6 text-sage-600">
                        Once customers place orders, this dashboard will fill with revenue trends, order counts, top products, and inventory signals.
                      </p>
                    </div>
                    <Link
                      to="/shop"
                      className="inline-flex items-center justify-center rounded-full bg-sage-700 px-5 py-3 text-sm font-extrabold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
                    >
                      Go to Shop
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {/* Summary cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Total Orders</p>
                          <strong className="mt-1 block font-display text-3xl text-sage-700">{totalOrders}</strong>
                          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getGrowthClassName(ordersGrowth)}`}>
                            {ordersGrowth ? `Orders ${formatGrowthText(ordersGrowth)}` : "No prior data"}
                          </span>
                        </div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-700">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v4H3z"/><path d="M6 7v13"/><path d="M18 7v13"/></svg>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Total Revenue</p>
                          <strong className="mt-1 block font-display text-3xl text-sage-700">{formatInr(totalRevenue)}</strong>
                          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getGrowthClassName(revenueGrowth)}`}>
                            {revenueGrowth ? `Revenue ${formatGrowthText(revenueGrowth)}` : "No prior data"}
                          </span>
                        </div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-700">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Products Sold</p>
                          <strong className="mt-1 block font-display text-3xl text-sage-700">{totalProductsSold}</strong>
                          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getGrowthClassName(productsSoldGrowth)}`}>
                            {productsSoldGrowth ? `Units ${formatGrowthText(productsSoldGrowth)}` : "No prior data"}
                          </span>
                        </div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-700">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6"/><path d="M3 21h18"/></svg>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Low Stock</p>
                          <strong className="mt-1 block font-display text-3xl text-rose-700">{lowStockProducts.length}</strong>
                          <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getGrowthClassName(lowStockGrowth)}`}>
                            {lowStockGrowth ? `Inventory ${formatGrowthText(lowStockGrowth)}` : "Live inventory snapshot"}
                          </span>
                        </div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M5 7h14"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {console.log("CHART DEBUG:", {
                      revenueSeries,
                      ordersSeries,
                      revenueSeriesLength: revenueSeries?.length,
                      orderSeriesLength: ordersSeries?.length,
                      firstRevenuePoint: revenueSeries?.[0],
                      firstOrderPoint: ordersSeries?.[0]
                    })}
                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <h4 className="text-sm font-extrabold text-sage-700">Revenue (daily)</h4>
                      <div style={{ height: 260 }} className="mt-3">
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={revenueSeries}>
                            <defs>
                              <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#14532d" />
                                <stop offset="55%" stopColor="#2f855a" />
                                <stop offset="100%" stopColor="#86efac" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#cfe8d8" strokeOpacity={0.35} strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(v) => v ? `₹${v}` : "0"} />
                            <Tooltip
                              formatter={(v) => formatInr(v)}
                              contentStyle={{
                                borderRadius: 18,
                                border: "1px solid rgba(209, 227, 214, 0.95)",
                                boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
                                background: "rgba(255, 255, 255, 0.98)"
                              }}
                              itemStyle={{ color: "#14532d", fontWeight: 700 }}
                              labelStyle={{ color: "#166534", fontWeight: 800 }}
                              cursor={{ stroke: "rgba(104, 211, 145, 0.35)", strokeWidth: 1 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="url(#revenueLineGradient)"
                              strokeWidth={4}
                              dot={{ r: 3, fill: "#2f855a", stroke: "#e8f7ee", strokeWidth: 2 }}
                              activeDot={{ r: 6, fill: "#14532d", stroke: "#dcfce7", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <h4 className="text-sm font-extrabold text-sage-700">Orders (daily)</h4>
                      <div style={{ height: 260 }} className="mt-3">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={ordersSeries}>
                            <defs>
                              <linearGradient id="ordersBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14532d" />
                                <stop offset="100%" stopColor="#86efac" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#cfe8d8" strokeOpacity={0.35} strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip
                              formatter={(v) => (typeof v === 'number' ? `${v} order${v !== 1 ? 's' : ''}` : v)}
                              contentStyle={{
                                borderRadius: 18,
                                border: "1px solid rgba(209, 227, 214, 0.95)",
                                boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
                                background: "rgba(255, 255, 255, 0.98)"
                              }}
                              itemStyle={{ color: "#14532d", fontWeight: 700 }}
                              labelStyle={{ color: "#166534", fontWeight: 800 }}
                              cursor={{ fill: "rgba(104, 211, 145, 0.1)" }}
                            />
                            <Bar dataKey="count" fill="url(#ordersBarGradient)" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Lists */}
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <h4 className="text-sm font-extrabold text-sage-700">Top Selling Products</h4>
                      <div className="mt-3 grid gap-2">
                        {(analyticsData.topProducts.length ? analyticsData.topProducts : analyticsRows).length === 0 ? (
                          <p className="text-sm text-sage-600">No product sales yet.</p>
                        ) : (
                          (analyticsData.topProducts.length ? analyticsData.topProducts : analyticsRows).slice(0, 8).map((row, idx) => (
                            <div key={row.id || row.name} className={`flex items-center justify-between rounded-xl p-3 ${idx === 0 ? "bg-sage-50" : "bg-white"}`}>
                              <div>
                                <div className="text-sm font-extrabold text-sage-800">{row.name}</div>
                                <div className="text-xs text-sage-600">{Number(row.sold || 0)} units</div>
                              </div>
                              <div className="text-sm font-extrabold text-sage-700">{Number(row.sold || 0)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft">
                      <h4 className="text-sm font-extrabold text-sage-700">Low Stock Alerts</h4>
                      <div className="mt-3 grid gap-2">
                        {!lowStockProducts.length ? (
                          <p className="text-sm text-sage-600">All products have healthy stock levels.</p>
                        ) : (
                          lowStockProducts.map((p) => (
                            <div key={p.id || p.name} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 p-3">
                              <div>
                                <div className="text-sm font-extrabold text-rose-700">{p.name}</div>
                                <div className="text-xs text-rose-600">Only {Number(p.stock || p.unitsAvailable || p.units || 0)} left</div>
                              </div>
                              <div className="text-sm font-extrabold text-rose-700">Restock</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === "contacts" && (
            <AdminContactMessages />
          )}

          {activeSection === "revenue" && (
            <section className="grid gap-3 xl:grid-cols-2">
              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Revenue Tracker</h3>
                <div className="mt-4 grid gap-2">
                  <Metric title="Total Revenue (Completed)" value={formatInr(revenueStats.completedRevenue)} />
                  <Metric title="Pending Pipeline Value" value={formatInr(revenueStats.pendingPipeline)} />
                  <Metric title="Average Completed Order Value" value={formatInr(revenueStats.averageCompletedOrderValue)} />
                  <Metric title="Completed Orders" value={String(revenueStats.completedCount)} />
                </div>
              </article>

              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Revenue Notes</h3>
                <div className="mt-4 grid gap-2">
                  <Metric title="Total Orders" value={String(orders.length)} />
                  <Metric title="Current Pending Orders" value={String(pendingOrders)} />
                </div>
                <p className="mt-3 rounded-xl border border-dashed border-sage-300 p-3 text-sm text-sage-600">
                  {revenueStats.completedRevenue > 0
                    ? `Completed revenue is ${formatInr(revenueStats.completedRevenue)}. Pending pipeline stands at ${formatInr(revenueStats.pendingPipeline)}.`
                    : "No revenue trends yet. Add completed orders to start tracking."}
                </p>
              </article>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <article className="rounded-xl border border-sage-200 bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-600">{title}</p>
      <strong className="mt-1 block font-display text-3xl text-sage-700">{value}</strong>
    </article>
  );
}
