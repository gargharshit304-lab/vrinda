import { apiRequest } from "./apiClient";

const fallbackFeatures = ["Deep cleansing", "Skin nourishing", "Chemical-free", "Suitable for all skin types"];

export const normalizeApiProduct = (product) => {
  const primaryImage = product?.image || product?.images?.[0] || "";
  const images = Array.isArray(product?.images) && product.images.length ? product.images : [primaryImage].filter(Boolean);

  return {
    id: String(product?._id || product?.id || ""),
    productId: String(product?._id || product?.id || ""),
    name: String(product?.name || "Unnamed Product"),
    category: String(product?.category || "All Products"),
    price: Number(product?.price) || 0,
    tagline: String(product?.tagline || product?.description || ""),
    copy: String(product?.tagline || product?.description || ""),
    description: String(product?.description || ""),
    image: primaryImage,
    images: images.length ? images : [""],
    features: Array.isArray(product?.features) && product.features.length ? product.features : fallbackFeatures,
    ingredients: String(product?.ingredients || "Natural botanicals and essential oils."),
    howToUse: String(product?.howToUse || "Apply gently and follow regular routine."),
    type: String(product?.type || "Herbal Care"),
    weightVolume: String(product?.weightVolume || "100 g"),
    skinConcern: String(product?.skinConcern || "All skin types"),
    rating: Number(product?.rating) || 4.6,
    reviewCount: Number(product?.reviewCount) || 0,
    onSale: Boolean(product?.onSale),
    salePercent: Number(product?.salePercent) || 0
  };
};

export const fetchProducts = async (search = "") => {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const data = await apiRequest(`/products${query}`);
  return Array.isArray(data) ? data.map(normalizeApiProduct).filter((item) => item.id) : [];
};

export const fetchProductById = async (productId) => {
  if (!productId) {
    return null;
  }

  const data = await apiRequest(`/products/${encodeURIComponent(productId)}`);
  return data ? normalizeApiProduct(data) : null;
};
