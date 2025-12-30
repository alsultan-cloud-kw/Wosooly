import api from "../../api_config";

export async function researchBrandAndSave(brandName, context) {
  try {
    const response = await api.post("/competitor-analysis/deep-research", {
      brand_name: brandName,
      research_query: context || `بحث عن ${brandName}`,
    });
    return response.data;
  } catch (error) {
    console.error("Error in researchBrandAndSave:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "خطأ غير معروف",
    };
  }
}

export async function getResearchResults(brandName) {
  try {
    const params = brandName ? { brand_name: brandName } : {};
    const response = await api.get("/competitor-analysis/deep-research", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching research results:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "فشل جلب النتائج",
    };
  }
}

export async function getLatestResearch(brandName) {
  try {
    const response = await api.get(`/competitor-analysis/deep-research/latest/${brandName}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching latest research:", error);
    return {
      success: false,
      data: null,
      error: error.response?.data?.detail || "فشل جلب النتائج",
    };
  }
}

export async function deleteAllResearchResults() {
  try {
    const response = await api.delete("/competitor-analysis/deep-research/all");
    return response.data;
  } catch (error) {
    console.error("Error deleting research results:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "خطأ غير معروف",
      deletedCount: 0,
    };
  }
}

