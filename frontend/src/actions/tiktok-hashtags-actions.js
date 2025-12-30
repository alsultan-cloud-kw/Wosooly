import api from "../../api_config";

export async function getTikTokHashtags(businessType) {
  try {
    const params = businessType ? { business_type: businessType } : {};
    const response = await api.get("/competitor-analysis/tiktok-hashtags", { params });
    return response.data;
  } catch (error) {
    console.error("Error getting TikTok hashtags:", error);
    return {
      success: false,
      hashtags: [],
      message: error.response?.data?.detail || "فشل في تحميل الهاشتاجات",
    };
  }
}

export async function setTikTokHashtags(businessType, hashtags) {
  try {
    const response = await api.post("/competitor-analysis/tiktok-hashtags", {
      business_type: businessType,
      hashtags,
    });
    return response.data;
  } catch (error) {
    console.error("Error setting TikTok hashtags:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل في حفظ الهاشتاجات",
    };
  }
}

export async function addTikTokHashtag(businessType, hashtag) {
  try {
    const response = await api.post("/competitor-analysis/tiktok-hashtags/add", {
      business_type: businessType,
      hashtag,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding TikTok hashtag:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل في إضافة الهاشتاج",
    };
  }
}

export async function removeTikTokHashtag(businessType, hashtag) {
  try {
    const response = await api.delete("/competitor-analysis/tiktok-hashtags/remove", {
      params: { business_type: businessType, hashtag },
    });
    return response.data;
  } catch (error) {
    console.error("Error removing TikTok hashtag:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل في حذف الهاشتاج",
    };
  }
}

export async function generateTikTokHashtagsForBusiness(businessType) {
  try {
    const response = await api.post("/competitor-analysis/tiktok-hashtags/generate", {
      business_type: businessType,
    });
    return response.data;
  } catch (error) {
    console.error("Error generating TikTok hashtags:", error);
    return {
      success: false,
      hashtags: [],
      message: error.response?.data?.detail || "فشل في إنشاء الهاشتاجات",
    };
  }
}

