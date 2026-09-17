import api from "./api";

export const billingService = {
  async getBill(customerId, month) {
    const response = await api.get(`/billing/${customerId}`, {
      params: { month }
    });
    return response.data;
  }
};

export default billingService;
