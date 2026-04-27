import { apiRequest } from "./apiClient";

export const createOrderRequest = async ({ items, shippingAddress, paymentMethod }) => {
  return apiRequest("/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      items,
      shippingAddress,
      paymentMethod
    })
  });
};

export const fetchOrders = async () => {
  const data = await apiRequest("/orders", {
    auth: true
  });

  return Array.isArray(data) ? data : [];
};

export const fetchMyOrders = async () => {
  const data = await apiRequest("/orders/my", {
    auth: true
  });

  return Array.isArray(data) ? data : [];
};
