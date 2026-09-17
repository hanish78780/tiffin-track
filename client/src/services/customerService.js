import api from "./api";

export const customerService = {
  async getCustomers(params = {}) {
    const response = await api.get("/customers", { params });
    return response.data;
  },

  async getCustomerById(id) {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  async getCustomerByPhone(phone) {
    const response = await api.get(`/customers/phone/${encodeURIComponent(phone)}`);
    return response.data;
  },

  async createCustomer(customerData) {
    const response = await api.post("/customers", customerData);
    return response.data;
  },

  async updateCustomer(id, customerData) {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  async importCustomers(csvText) {
    const response = await api.post("/customers/import", { csv: csvText });
    return response.data;
  }
};

export default customerService;
