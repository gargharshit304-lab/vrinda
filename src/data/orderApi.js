import { apiRequest } from "./apiClient";

export const createOrderRequest = async ({ items, shippingAddress, paymentMethod, deliveryFee }) => {
  return apiRequest("/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      items,
      shippingAddress,
      paymentMethod,
      deliveryFee
    })
  });
};
