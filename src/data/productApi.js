import { apiRequest } from "./apiClient";
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
