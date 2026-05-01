import { apiRequest } from "./apiClient";

export const createOrderRequest = async ({ items, shippingAddress, paymentMethod }) => {
  console.log("[orderApi] Creating order with payload:", { items, shippingAddress, paymentMethod });
  return apiRequest("/orders", {
    method: "POST",
    auth: true,
    body: {
      items,
      shippingAddress,
      paymentMethod
    }
  });
};

export const fetchOrders = async () => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : "";

  const data = await apiRequest("/orders", {
    auth: true,
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  });

  return Array.isArray(data) ? data : [];
};

export const fetchMyOrders = async () => {
  const data = await apiRequest("/orders/my", {
    auth: true
  });

  return Array.isArray(data) ? data : [];
};

export const fetchOrderById = async (id) => {
  if (!id) {
    throw new Error("Order id is required");
  }

  return apiRequest(`/orders/${encodeURIComponent(id)}`, {
    auth: true
  });
};
