import { showToast } from "./toastEvents";

const CART_STORAGE_KEY = "vrinda.cart.items";

const readJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const getCartStorageKey = () => CART_STORAGE_KEY;

export const getCartItems = () => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  const parsed = readJson(raw, []);
  return Array.isArray(parsed)
    ? parsed
        .filter((item) => item && (item.id || item.productId))
        .map((item) => {
          const normalizedId = String(item.productId || item.id);
          return {
            ...item,
            id: normalizedId,
            productId: normalizedId,
            quantity: Math.max(1, Number(item.quantity) || 1)
          };
        })
    : [];
};

export const setCartItems = (items) => {
  if (typeof window === "undefined") {
    return [];
  }
  const nextItems = Array.isArray(items) ? items : [];
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new Event("vrinda-cart-changed"));
  return nextItems;
};

export const addToCart = (product, quantity = 1) => {
  const productId = String(product?.id || product?.productId || "");
  if (!productId) {
    return [];
  }

  const currentItems = getCartItems();
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const existingIndex = currentItems.findIndex((item) => (item.productId || item.id) === productId);
  const basePrice = Number(product.price) || 0;
  const salePercent = Number(product.salePercent) || 0;
  const effectivePrice = product.onSale && salePercent > 0
    ? Math.max(1, Math.round(basePrice * (1 - salePercent / 100)))
    : basePrice;
  const cartItem = {
    id: productId,
    productId,
    name: product.name,
    price: effectivePrice,
    image: product.images?.[0] || product.mainImageDataUrl || product.imageDataUrl || product.image || "",
    quantity: nextQuantity
  };

  if (existingIndex >= 0) {
    const existingItem = currentItems[existingIndex];
    currentItems[existingIndex] = {
      ...existingItem,
      ...cartItem,
      quantity: existingItem.quantity + nextQuantity
    };
    const nextItems = setCartItems(currentItems);
    showToast("Item added to cart", "success");
    return nextItems;
  }

  const nextItems = setCartItems([...currentItems, cartItem]);
  showToast("Item added to cart", "success");
  return nextItems;
};

export const updateCartItemQuantity = (productId, quantity) => {
  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const normalizedId = String(productId || "");
  const nextItems = getCartItems().map((item) =>
    (item.productId || item.id) === normalizedId ? { ...item, quantity: nextQuantity } : item
  );
  return setCartItems(nextItems);
};

export const removeCartItem = (productId) => {
  const normalizedId = String(productId || "");
  const nextItems = getCartItems().filter((item) => (item.productId || item.id) !== normalizedId);
  const result = setCartItems(nextItems);
  showToast("Item removed", "neutral");
  return result;
};

export const clearCart = () => setCartItems([]);