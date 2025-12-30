import api from "../../api_config";

export async function analyzeBrandImages(brandName, instagramUsername, websiteUrl) {
  try {
    const response = await api.post("/competitor-analysis/image-analysis/analyze-brand", {
      brand_name: brandName,
      instagram_username: instagramUsername,
      website_url: websiteUrl,
    });
    return response.data;
  } catch (error) {
    console.error("Error analyzing brand images:", error);
    return {
      success: false,
      analyzedImages: 0,
      offersFound: 0,
      message: error.response?.data?.detail || "خطأ غير معروف",
    };
  }
}

export async function getAnalyzedImages(brandName) {
  try {
    const params = brandName ? { brand_name: brandName } : {};
    const response = await api.get("/competitor-analysis/analyzed-images", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching analyzed images:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "فشل جلب الصور المحللة",
    };
  }
}

export async function analyzeSingleImage(imageUrl, brandName, source, sourceUrl, context) {
  try {
    const response = await api.post("/competitor-analysis/image-analysis/analyze-single", {
      image_url: imageUrl,
      brand_name: brandName,
      source,
      source_url: sourceUrl,
      context,
    });
    return response.data;
  } catch (error) {
    console.error("Error analyzing single image:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحليل الصورة",
    };
  }
}

export async function deleteAllAnalyzedImages() {
  try {
    const response = await api.delete("/competitor-analysis/analyzed-images/all");
    return response.data;
  } catch (error) {
    console.error("Error deleting analyzed images:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "خطأ غير معروف",
      deletedCount: 0,
    };
  }
}

