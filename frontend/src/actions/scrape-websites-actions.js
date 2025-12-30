import api from "../../api_config";

/**
 * Scrape a single website (equivalent to scrapeWebsite in scrape-websites.ts)
 */
export async function scrapeWebsite(websiteUrl, brandName) {
  try {
    const response = await api.post("/competitor-analysis/scrape/website", {
      website_url: websiteUrl,
      brand_name: brandName,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping website:", error);
    return {
      success: false,
      offers: [],
      prices: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Scrape a single website account (wrapper around scrapeWebsite)
 * Mirrors scrapeWebsiteAccount in scrape-websites.ts
 */
export async function scrapeWebsiteAccount(websiteUrl, brandName) {
  return scrapeWebsite(websiteUrl, brandName);
}

/**
 * Trigger scraping for all active website accounts.
 * Mirrors scrapeAllWebsiteAccounts in scrape-websites.ts.
 */
export async function scrapeAllWebsiteAccounts(category) {
  try {
    // Always send a body, even if category is undefined/null
    const body = category ? { category } : {};
    const response = await api.post("/competitor-analysis/scrape/brand-websites", body);
    return response.data;
  } catch (error) {
    console.error("Error scraping all website accounts:", error);
    return {
      success: false,
      totalPrices: 0,
      totalOffers: 0,
      message: error.response?.data?.detail || error.message || "Unknown error",
    };
  }
}
