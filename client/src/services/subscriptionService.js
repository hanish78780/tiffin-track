import api from "./api";

export const subscriptionService = {
  async getSubscriptions(params = {}) {
    const response = await api.get("/subscriptions", { params });
    return response.data;
  },

  async getSubscriptionById(id) {
    const response = await api.get(`/subscriptions/${id}`);
    return response.data;
  },

  async createSubscription(data) {
    const response = await api.post("/subscriptions", data);
    return response.data;
  },

  async pauseSubscription(id, { startDate, reason }) {
    const response = await api.post(`/subscriptions/${id}/pause`, { startDate, reason });
    return response.data;
  },

  async resumeSubscription(id, { resumeDate }) {
    const response = await api.post(`/subscriptions/${id}/resume`, { resumeDate });
    return response.data;
  }
};

export default subscriptionService;
