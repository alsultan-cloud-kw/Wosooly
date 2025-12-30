import api from "../../api_config";

/**
 * Login to Instagram
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function loginToInstagram() {
  try {
    const response = await api.post("/competitor-analysis/instagram/login");
    return response.data;
  } catch (error) {
    console.error("Error logging in to Instagram:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Get the latest post from an Instagram account (even if not promotional)
 * @param {string} username - Instagram username
 * @param {string} brandName - Brand name
 * @returns {Promise<{caption: string, imageUrl?: string, postUrl: string, timestamp?: string} | null>}
 */
export async function getLatestInstagramPost(username, brandName) {
  try {
    const response = await api.get(
      `/competitor-analysis/instagram/${username}/latest-post`,
      {
        params: { brand_name: brandName },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error getting latest Instagram post:", error);
    return null;
  }
}

/**
 * Scrape a single Instagram account by username
 * @param {string} username - Instagram username
 * @param {string} brandName - Brand name
 * @returns {Promise<Array>} Array of brand offers
 */
export async function scrapeInstagramAccount(username, brandName) {
  try {
    const response = await api.post(
      "/competitor-analysis/scrape-instagram/by-username",
      {
        username,
        brand_name: brandName,
      }
    );
    return response.data.offers || [];
  } catch (error) {
    console.error("Error scraping Instagram account:", error);
    return [];
  }
}

/**
 * Scrape a single Instagram account by account ID
 * @param {number} accountId - Account ID from database
 * @returns {Promise<{success: boolean, totalOffers: number, message: string}>}
 */
export async function scrapeInstagramAccountById(accountId) {
  try {
    const response = await api.post(
      `/competitor-analysis/scrape-instagram/${accountId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error scraping Instagram account:", error);
    return {
      success: false,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Scrape all active Instagram accounts
 * @returns {Promise<{success: boolean, totalOffers: number, message: string}>}
 */
export async function scrapeAllInstagramAccounts() {
  try {
    const response = await api.post("/competitor-analysis/scrape-instagram/all");
    return response.data;
  } catch (error) {
    console.error("Error scraping Instagram accounts:", error);
    return {
      success: false,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

