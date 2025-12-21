import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach JWT token automatically if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ If admin has selected a client, inject client_id for customer-related endpoints
  const userType = localStorage.getItem("user_type");
  const selectedClientId = localStorage.getItem("admin_selected_client_id");

  if (
    userType === "admin" &&
    selectedClientId &&
    config.url
  ) {
    // List of endpoints that support client_id parameter
    const endpointsWithClientId = [
      // Customer endpoints
      "/customers-table",
      "/customer-details/",
      "/customer-order-items-summary/",
      "/customer-product-orders",
      "/customer-classification",
      "/spending-customer-classification",
      "/full-customer-classification",
      "/customers_with_low_churnRisk",
      // Order endpoints
      "/latest-orders",
      "/total-orders-count",
      "/total-sales",
      "/aov",
      "/total-customers",
      "/top-customers",
      "/sales-comparison",
      "/orders-in-range",
      "/orders-data",
      "/attribution-summary",
      "/orders-by-location",
      "/orders-by-city",
      // Product endpoints
      "/top-selling-products",
      "/top-products-inbetween",
      "/products-sales-table",
      "/products-table",
      "/product-details/",
      "/product-sales-over-time"
    ];

    // Check if this is an endpoint that supports client_id
    const isSupportedEndpoint = endpointsWithClientId.some(endpoint => 
      config.url.includes(endpoint)
    );

    if (isSupportedEndpoint) {
      // Preserve existing params, don't override if already set
      config.params = config.params || {};
      if (config.params.client_id === undefined) {
        config.params.client_id = parseInt(selectedClientId, 10);
      }
    }
  }

  return config;
});

export default api;