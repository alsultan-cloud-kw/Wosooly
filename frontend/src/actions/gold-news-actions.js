import api from "../../api_config";

export async function getLatestGoldNews(limit = 20, region) {
  try {
    const params = { limit };
    if (region) params.region = region;
    const response = await api.get("/competitor-analysis/gold-news/latest", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching gold news:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch news",
    };
  }
}

export async function getDailyNewsSummary(date) {
  try {
    const params = date ? { date } : {};
    const response = await api.get("/competitor-analysis/gold-news/daily-summary", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    return {
      success: false,
      data: null,
      error: error.response?.data?.detail || "Failed to fetch summary",
    };
  }
}

export async function refreshGoldNews() {
  try {
    const response = await api.post("/competitor-analysis/gold-news/refresh");
    return response.data;
  } catch (error) {
    console.error("Error refreshing gold news:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

// News Source Actions
export async function getNewsSources(region, activeOnly = true) {
  try {
    const params = { active_only: activeOnly };
    if (region) params.region = region;
    const response = await api.get("/competitor-analysis/news-sources", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching news sources:", error);
    return {
      success: false,
      data: [],
      error: error.response?.data?.detail || "Failed to fetch news sources",
    };
  }
}

export async function addNewsSource(source) {
  try {
    const response = await api.post("/competitor-analysis/news-sources", {
      source_name: source.sourceName,
      source_url: source.sourceUrl,
      region: source.region,
      description: source.description,
      is_active: source.isActive !== false,
      auto_categorize: source.autoCategorize !== false,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding news source:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل إضافة مصدر الأخبار",
    };
  }
}

export async function deleteNewsSource(id) {
  try {
    const response = await api.delete(`/competitor-analysis/news-sources/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting news source:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل حذف مصدر الأخبار",
    };
  }
}

export async function toggleNewsSource(id) {
  try {
    const response = await api.patch(`/competitor-analysis/news-sources/${id}/toggle`);
    return response.data;
  } catch (error) {
    console.error("Error toggling news source:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحديث حالة مصدر الأخبار",
    };
  }
}

export async function updateNewsSourceRegion(id, region) {
  try {
    const response = await api.patch(`/competitor-analysis/news-sources/${id}/region`, {
      region,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating news source region:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "فشل تحديث تصنيف مصدر الأخبار",
    };
  }
}

export async function scrapeNewsFromConfiguredSources() {
  try {
    const response = await api.post("/competitor-analysis/news-sources/scrape");
    return response.data;
  } catch (error) {
    console.error("Error scraping news from sources:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

