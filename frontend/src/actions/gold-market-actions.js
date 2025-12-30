import api from "../../api_config";

// ============================================
// Gold Price Actions
// ============================================

export async function getLatestGoldPrices(source) {
  try {
    const params = source ? { source } : {};
    const response = await api.get("/competitor-analysis/gold-prices/latest", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching latest gold prices:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch prices",
    };
  }
}

export async function getGoldPriceHistory(karat, days = 30) {
  try {
    const response = await api.get("/competitor-analysis/gold-prices/history", {
      params: { karat, days },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching price history:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch history",
    };
  }
}

export async function getGoldPriceTrends(days = 30) {
  try {
    const response = await api.get("/competitor-analysis/gold-prices/trends", {
      params: { days },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching price trends:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch trends",
    };
  }
}

export async function refreshGoldPrices() {
  try {
    const response = await api.post("/competitor-analysis/gold-prices/refresh");
    return response.data;
  } catch (error) {
    console.error("Error refreshing gold prices:", error);
    return {
      success: false,
      prices: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function cleanupInvalidKarats() {
  try {
    const response = await api.post("/competitor-analysis/gold-prices/cleanup-invalid");
    return response.data;
  } catch (error) {
    console.error("Error cleaning up invalid karats:", error);
    return {
      success: false,
      deletedCount: 0,
      message: error.response?.data?.detail || "فشل في حذف الأسعار غير الصحيحة",
    };
  }
}

// ============================================
// Brand Offers Actions
// ============================================

export async function getActiveOffers(brand) {
  try {
    const params = brand ? { brand } : {};
    const response = await api.get("/competitor-analysis/offers", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching offers:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch offers",
    };
  }
}

export async function addBrandOffer(offer) {
  try {
    const response = await api.post("/competitor-analysis/offers", offer);
    return response.data;
  } catch (error) {
    console.error("Error adding offer:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to add offer",
    };
  }
}

export async function cleanupExpiredOffers() {
  try {
    const response = await api.post("/competitor-analysis/offers/cleanup-expired");
    return response.data;
  } catch (error) {
    console.error("Error cleaning up offers:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to cleanup offers",
    };
  }
}

export async function deleteAllOffers() {
  try {
    const response = await api.delete("/competitor-analysis/offers/all");
    return response.data;
  } catch (error) {
    console.error("Error deleting all offers:", error);
    return {
      success: false,
      deletedCount: 0,
      message: error.response?.data?.detail || "فشل في حذف العروض",
    };
  }
}

export async function deleteOffersBySource(source) {
  try {
    const response = await api.delete(`/competitor-analysis/offers/by-source/${source}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting offers by source:", error);
    return {
      success: false,
      deletedCount: 0,
      message: error.response?.data?.detail || `فشل في حذف عروض ${source}`,
    };
  }
}

export async function deleteOffersBySourcePattern(pattern) {
  try {
    const response = await api.delete("/competitor-analysis/offers/by-pattern", {
      params: { pattern },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting offers by pattern:", error);
    return {
      success: false,
      deletedCount: 0,
      message: error.response?.data?.detail || "فشل في حذف العروض",
    };
  }
}

// ============================================
// Brand Scraping Actions
// ============================================

export async function refreshBrandWebsites() {
  try {
    const response = await api.post("/competitor-analysis/scrape/websites");
    return response.data;
  } catch (error) {
    console.error("Error refreshing brand websites:", error);
    return {
      success: false,
      totalPrices: 0,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function refreshInstagramAccounts() {
  try {
    const response = await api.post("/competitor-analysis/scrape/instagram");
    return response.data;
  } catch (error) {
    console.error("Error refreshing Instagram accounts:", error);
    return {
      success: false,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function refreshAllBrandData() {
  try {
    const response = await api.post("/competitor-analysis/scrape/all");
    return response.data;
  } catch (error) {
    console.error("Error refreshing all brand data:", error);
    return {
      success: false,
      websites: { success: false, totalPrices: 0, totalOffers: 0, message: "Error" },
      instagram: { success: false, totalOffers: 0, message: "Error" },
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

// ============================================
// Price Alert Actions
// ============================================

export async function getPriceAlerts() {
  try {
    const response = await api.get("/competitor-analysis/price-alerts");
    return response.data;
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch alerts",
    };
  }
}

export async function createPriceAlert(alert) {
  try {
    const response = await api.post("/competitor-analysis/price-alerts", alert);
    return response.data;
  } catch (error) {
    console.error("Error creating alert:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to create alert",
    };
  }
}

// ============================================
// Instagram Profile Actions
// ============================================

export async function getInstagramProfiles() {
  try {
    const response = await api.get("/competitor-analysis/instagram-profiles");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching Instagram profiles:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch profiles",
    };
  }
}

export async function addInstagramProfile(profile) {
  try {
    const response = await api.post("/competitor-analysis/instagram-profiles", {
      username: profile.username,
      brand_name: profile.brandName,
      profile_url: profile.profileUrl,
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || "تم إضافة البروفايل بنجاح",
      };
    }

    return {
      success: false,
      message: response.data?.message || "فشل إضافة البروفايل",
    };
  } catch (error) {
    console.error("Error adding Instagram profile via API:", error);
    const detail =
      error.response?.data?.detail ||
      error.message ||
      "حدث خطأ أثناء إضافة البروفايل";
    return {
      success: false,
      message: detail,
    };
  }
}

export async function deleteInstagramProfile(id) {
  try {
    const response = await api.delete(`/competitor-analysis/instagram-profiles/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting Instagram profile:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل حذف البروفايل",
    };
  }
}

export async function toggleInstagramProfile(id) {
  try {
    const response = await api.patch(`/competitor-analysis/instagram-profiles/${id}/toggle`);
    return response.data;
  } catch (error) {
    console.error("Error toggling Instagram profile:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحديث حالة البروفايل",
    };
  }
}

// ============================================
// Social Media Account Actions (unified for Instagram, TikTok, Snapchat)
// ============================================

export async function getSocialMediaAccounts(platform) {
  try {
    const params = platform ? { platform } : {};
    const response = await api.get("/competitor-analysis/social-media-accounts", { params });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching social media accounts:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch accounts",
    };
  }
}

export async function addSocialMediaAccount(account) {
  try {
    const response = await api.post("/competitor-analysis/social-media-accounts", {
      username: account.username,
      brand_name: account.brandName,
      platform: account.platform,
      profile_url: account.profileUrl,
      is_active: account.isActive !== false,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding social media account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل إضافة الحساب",
    };
  }
}

export async function deleteSocialMediaAccount(id) {
  try {
    const response = await api.delete(`/competitor-analysis/social-media-accounts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting social media account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل حذف الحساب",
    };
  }
}

export async function toggleSocialMediaAccount(id) {
  try {
    const response = await api.patch(`/competitor-analysis/social-media-accounts/${id}/toggle`);
    return response.data;
  } catch (error) {
    console.error("Error toggling social media account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحديث حالة الحساب",
    };
  }
}

export async function getSnapchatAnalyzedImages(brandName) {
  try {
    const params = brandName ? { brand_name: brandName } : {};
    const response = await api.get("/competitor-analysis/analyzed-images/snapchat", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching Snapchat analyzed images:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "فشل جلب الصور المحللة",
    };
  }
}

// ============================================
// Website Account Actions
// ============================================

export async function getWebsiteAccounts(category) {
  try {
    const params = category ? { category } : {};
    const response = await api.get("/competitor-analysis/website-accounts", { params });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Error fetching website accounts:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch websites",
    };
  }
}

export async function addWebsiteAccount(website) {
  try {
    const response = await api.post("/competitor-analysis/website-accounts", {
      website_url: website.websiteUrl,
      brand_name: website.brandName,
      category: website.category,
      description: website.description,
      is_active: website.isActive !== false,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding website account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل إضافة الموقع",
    };
  }
}

export async function deleteWebsiteAccount(id) {
  try {
    const response = await api.delete(`/competitor-analysis/website-accounts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting website account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل حذف الموقع",
    };
  }
}

export async function toggleWebsiteAccount(id) {
  try {
    const response = await api.patch(`/competitor-analysis/website-accounts/${id}/toggle`);
    return response.data;
  } catch (error) {
    console.error("Error toggling website account:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحديث حالة الموقع",
    };
  }
}
