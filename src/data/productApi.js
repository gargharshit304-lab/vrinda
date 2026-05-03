import { apiRequest } from "./apiClient";
import { getAuthToken } from "./authStorage";
import { readAdminProducts, normalizeCatalogProduct } from "./productCatalog";

const normalizeApiProduct = (product) => {
  if (!product || typeof product !== "object") {
    return null;
  }

  const id = String(product.id || product._id || "");
  if (!id) {
    return null;
  }

  return {
    ...product,
    id,
    _id: product._id || id,
    image: product.image || product.images?.[0] || "",
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : product.image ? [product.image] : [],
    status: product.status || "active"
  };
};

const normalizeProductForShop = (product) => {
  if (!product) {
    return null;
  }

  const normalized = product._id || product.id ? normalizeApiProduct(product) : normalizeCatalogProduct(product);
  if (!normalized || !normalized.id) {
    return null;
  }

  const status = String(normalized.status || "active").toLowerCase();
  const isDeleted = normalized.isDeleted === true;

  if (status === "inactive" || isDeleted) {
    return null;
  }

  return normalized;
};

const mergeUniqueProducts = (primaryProducts, fallbackProducts) => {
  const map = new Map();

  [...primaryProducts, ...fallbackProducts].forEach((product) => {
    const normalized = normalizeProductForShop(product);
    if (normalized && !map.has(normalized.id)) {
      map.set(normalized.id, normalized);
    }
  });

  return Array.from(map.values());
};

export const fetchProducts = async (search = "") => {
  try {
    // Fetch products from backend API
    console.log("[fetchProducts] Fetching from /api/products...");
    const data = await apiRequest("/products", { method: "GET" });
    console.log("[fetchProducts] API response:", data);
    const backendProducts = Array.isArray(data) ? data : [];
    const products = backendProducts.length > 0
      ? backendProducts.map(normalizeProductForShop).filter(Boolean)
      : mergeUniqueProducts(readAdminProducts(), []);

    // If search query is provided, filter products
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  } catch (error) {
    console.error("[fetchProducts] API call failed:", error.message);
    const localProducts = readAdminProducts();
    return mergeUniqueProducts(localProducts, []);
  }
};

export const fetchProductById = async (productId) => {
  if (!productId) {
    return null;
  }

  try {
    // Fetch specific product from backend API
    const data = await apiRequest(`/products/${encodeURIComponent(productId)}`, {
      method: "GET"
    });
    return normalizeProductForShop(data);
  } catch (error) {
    console.warn(`[fetchProductById] API call failed for ${productId}:`, error.message);
    const localProducts = readAdminProducts();
    return normalizeProductForShop(localProducts.find((product) => String(product.id) === String(productId))) || null;
  }
};

export const deleteProduct = async (productId) => {
  if (!productId) {
    return null;
  }

  return apiRequest(`/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    auth: true
  });
};

export const fetchSimilarProducts = async (productId) => {
  if (!productId) {
    return [];
  }

  const data = await apiRequest(`/products/similar/${encodeURIComponent(productId)}`, {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
};

export const updateProductStock = async (productId, quantity) => {
  if (!productId || quantity === undefined || quantity === null) {
    return null;
  }

  const numQuantity = Number(quantity);

  if (!Number.isFinite(numQuantity) || numQuantity === 0) {
    throw new Error("Quantity must be a non-zero number");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Unauthorized: token missing");
  }

  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/stock`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ quantity: numQuantity })
  });

  let data = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Failed to update stock");
    error.status = response.status;
    throw error;
  }

  return data;
};
