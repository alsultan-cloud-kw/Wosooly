import api from "../../api_config";

export async function scrapeDubizzleProducts(url) {
  try {
    const response = await api.post("/competitor-analysis/scrape/products", {
      url,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping products:", error);
    return {
      success: false,
      product: null,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

