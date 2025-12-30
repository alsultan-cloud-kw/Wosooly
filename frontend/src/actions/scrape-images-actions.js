import api from "../../api_config";

export async function scrapeAndAnalyzeBrandImages(brandName, instagramUsername, websiteUrl) {
  try {
    const response = await api.post("/competitor-analysis/scrape/images", {
      brand_name: brandName,
      instagram_username: instagramUsername,
      website_url: websiteUrl,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping and analyzing brand images:", error);
    return {
      success: false,
      analyzedImages: 0,
      offersFound: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

