import { apiRequest } from "./apiClient";
import { getAuthToken } from "./authStorage";
import { ADMIN_PRODUCTS_KEY, normalizeCatalogProduct } from "./productCatalog";

const readStoredProducts = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const fetchProducts = async (search = "") => {
  const normalizedQuery = search.trim().toLowerCase();
  const products = readStoredProducts().map(normalizeCatalogProduct).filter((item) => item.id);

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    return [product.name, product.category, product.tagline, product.description]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};

export const fetchProductById = async (productId) => {
  if (!productId) {
    return null;
  }

  const products = readStoredProducts().map(normalizeCatalogProduct).filter((item) => item.id);
  return products.find((product) => product.id === String(productId)) || null;
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
