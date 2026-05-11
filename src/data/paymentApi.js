import { apiRequest } from "./apiClient";

export const createRazorpayOrder = async (amount, orderId) => {
  return apiRequest("/payment/create-order", {
    method: "POST",
    auth: true,
    body: { amount, orderId }
  });
};

export const verifyRazorpayPayment = async (payload) => {
  return apiRequest("/payment/verify", {
    method: "POST",
    auth: true,
    body: payload
  });
};
