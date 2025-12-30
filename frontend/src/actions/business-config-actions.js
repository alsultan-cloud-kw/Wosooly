import api from "../../api_config";

export async function getActiveBusinessConfig() {
  try {
    const response = await api.get("/competitor-analysis/business-config/active");
    return response.data;
  } catch (error) {
    console.error("Error getting active business config:", error);
    return {
      success: false,
      data: null,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function getAllBusinessConfigs() {
  try {
    const response = await api.get("/competitor-analysis/business-config");
    return response.data;
  } catch (error) {
    console.error("Error getting all business configs:", error);
    return {
      success: false,
      data: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function setActiveBusiness(businessType) {
  try {
    const response = await api.post("/competitor-analysis/business-config/set-active", {
      business_type: businessType,
    });
    return response.data;
  } catch (error) {
    console.error("Error setting active business:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function updateBusinessConfig(config) {
  try {
    const response = await api.put(`/competitor-analysis/business-config/${config.id}`, {
      business_type: config.businessType,
      keywords: config.keywords,
      price_keywords: config.priceKeywords,
      offer_keywords: config.offerKeywords,
      is_active: config.isActive,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating business config:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function createBusinessConfig(config) {
  try {
    const response = await api.post("/competitor-analysis/business-config", {
      business_type: config.businessType,
      keywords: config.keywords,
      price_keywords: config.priceKeywords,
      offer_keywords: config.offerKeywords,
      is_active: config.isActive !== false,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating business config:", error);
    return {
      success: false,
      data: null,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function getBusinessKeywords(businessType) {
  try {
    const params = businessType ? { business_type: businessType } : {};
    const response = await api.get("/competitor-analysis/business-config/keywords", { params });
    return response.data;
  } catch (error) {
    console.error("Error getting business keywords:", error);
    return {
      success: false,
      data: {
        keywords: [],
        priceKeywords: [],
        offerKeywords: [],
      },
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

