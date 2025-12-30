import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";
import { scrapeWebsiteAccount, scrapeAllWebsiteAccounts } from "./../../../src/actions/scrape-websites-actions";
import AddWebsite from "./AddWebsite";

const WebsiteTab = () => {
  const { t } = useTranslation("scraperWebsites");

  const [activeCategory, setActiveCategory] = useState("local");
  const [websites, setWebsites] = useState([]);
  const [offers, setOffers] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingWebsite, setScrapingWebsite] = useState(null);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [showAddWebsite, setShowAddWebsite] = useState(false);

  const loadWebsites = async () => {
    try {
      const result = await api.get("/competitor-analysis/website-accounts", {
        params: { 
          category: activeCategory,
          active_only: false  // Get all websites (active and inactive)
        }
      });
      // Backend returns a plain array of website accounts (not wrapped in { success, data })
      const rawData = Array.isArray(result.data)
        ? result.data
        : result.data?.data || [];

      // Normalize backend snake_case to frontend camelCase for consistency
      const normalized = rawData.map((w) => ({
        id: w.id,
        websiteUrl: w.website_url,
        brandName: w.brand_name,
        category: w.category,
        description: w.description,
        isActive: w.is_active,
        createdAt: w.created_at,
      }));

      setWebsites(normalized);
    } catch (error) {
      console.error("Error loading websites:", error);
    }
  };

  const loadOffers = async () => {
    try {
      const result = await api.get("/competitor-analysis/offers");
      if (result.data.success) {
        const websiteOffers = result.data.data.filter(
          (offer) => offer.source === "website"
        );
        setOffers(websiteOffers);
      }
    } catch (error) {
      console.error("Error loading offers:", error);
    }
  };

  useEffect(() => {
    loadWebsites();
    loadOffers();
  }, [activeCategory]);

  const handleScrapeWebsite = async (website) => {
    if (!website.websiteUrl || !website.brandName) return;
    
    setIsScraping(true);
    setScrapingWebsite(website.websiteUrl);
    const toastId = toast.loading(
      t("toasts.scrape_website_loading", { brandName: website.brandName }),
      { duration: 0 }
    );

    try {
      const result = await scrapeWebsiteAccount(website.websiteUrl, website.brandName);
      await Promise.all([loadOffers(), loadWebsites()]);
      
      if (result.success) {
        toast.success(
          result.message ||
            t("toasts.scrape_website_success", { brandName: website.brandName }),
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(
          result.message ||
            t("toasts.scrape_website_failed", { brandName: website.brandName }),
          { id: toastId, duration: 5000 }
        );
      }
    } catch (error) {
      console.error(`Error scraping ${website.websiteUrl}:`, error);
      toast.error(
        t("toasts.scrape_website_failed", { brandName: website.brandName }),
        { id: toastId, duration: 5000 }
      );
    } finally {
      setIsScraping(false);
      setScrapingWebsite(null);
    }
  };

  const handleScrapeAll = async () => {
    if (activeWebsites.length === 0) {
      toast.error(
        t("toasts.scrape_all_empty", {
          category:
            activeCategory === "local"
              ? t("categories.local")
              : t("categories.international"),
        })
      );
      return;
    }

    setIsScraping(true);
    const toastId = toast.loading(
      t("toasts.scrape_all_loading", {
        category:
          activeCategory === "local"
            ? t("categories.local")
            : t("categories.international"),
      }),
      { duration: 0 }
    );

    try {
      const result = await scrapeAllWebsiteAccounts(activeCategory);
      await Promise.all([loadOffers(), loadWebsites()]);
      
      if (result.success) {
        toast.success(result.message, { id: toastId, duration: 5000 });
      } else {
        toast.error(
          result.message || t("toasts.scrape_all_not_found"),
          { id: toastId, duration: 5000 }
        );
      }
    } catch (error) {
      console.error("Error scraping all websites:", error);
      toast.error(t("toasts.scrape_all_failed"), {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("toasts.delete_site_confirm"))) return;
    
    try {
      const result = await api.delete(`/competitor-analysis/website-accounts/${id}`);
      if (result.data.success) {
        toast.success(result.data.message);
        await loadWebsites();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      toast.error(t("toasts.delete_site_failed"));
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const result = await api.patch(`/competitor-analysis/website-accounts/${id}/toggle`);
      if (result.data.success) {
        toast.success(result.data.message);
        await loadWebsites();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      toast.error(t("toasts.toggle_site_failed"));
    }
  };

  const handleClearOffers = async () => {
    if (!confirm(t("toasts.clear_offers_confirm"))) {
      return;
    }

    const toastId = toast.loading(t("toasts.clear_offers_loading"), {
      duration: 0,
    });
    try {
      const result = await api.delete("/competitor-analysis/offers/by-source/website");
      await loadOffers();
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error clearing website offers:", error);
      toast.error(t("toasts.clear_offers_failed"), { id: toastId });
    }
  };

  const activeWebsites = websites.filter((w) => w.isActive);
  // Show all websites, not just active ones
  const allWebsites = websites;
  const offersByWebsite = allWebsites.reduce((acc, website) => {
    acc[website.websiteUrl] = offers.filter(
      (offer) => offer.brand === website.brandName || offer.sourceUrl?.includes(website.websiteUrl)
    );
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t("header.title")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("header.summary", {
                active: activeWebsites.length,
                offers: offers.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddWebsite(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-100 to-slate-200 hover:from-blue-200 hover:to-slate-300 text-blue-800 border border-blue-300 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            >
              {t("buttons.add_website")}
            </button>
            <button
              onClick={handleScrapeAll}
              disabled={isScraping || activeWebsites.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isScraping || activeWebsites.length === 0
                  ? "bg-gray-200 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
              }`}
            >
              {isScraping ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🤖</span>
                  <span>{t("buttons.scrape_all_loading")}</span>
                </span>
              ) : (
                t("buttons.scrape_all")
              )}
            </button>
            <button
              onClick={handleClearOffers}
              disabled={isScraping || offers.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isScraping || offers.length === 0
                  ? "bg-gray-200 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
              }`}
            >
              {t("buttons.clear_offers")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-b">
          <button
            onClick={() => setActiveCategory("local")}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              activeCategory === "local"
                ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t("categories.local_with_flag")}
          </button>
          <button
            onClick={() => setActiveCategory("international")}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              activeCategory === "international"
                ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t("categories.international_with_flag")}
          </button>
        </div>
      </div>

      {showAddWebsite && (
        <AddWebsite
          category={activeCategory}
          onClose={() => {
            setShowAddWebsite(false);
            loadWebsites();
          }}
        />
      )}

      {allWebsites.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t("sections.active_websites_title", {
              category:
                activeCategory === "local"
                  ? t("categories.local")
                  : t("categories.international"),
            })}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allWebsites.map((website) => {
              const websiteOffers = offersByWebsite[website.websiteUrl] || [];
              const isCurrentlyScraping = scrapingWebsite === website.websiteUrl;

              return (
                <div
                  key={website.id}
                  className={`border rounded-lg p-4 transition-opacity ${
                    !website.isActive
                      ? "opacity-60 bg-gray-100 border-gray-300"
                      : selectedWebsite === website.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${website.isActive ? "text-gray-800" : "text-gray-500"}`}>
                          {website.brandName}
                        </h4>
                        {!website.isActive && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-semibold">
                            {t("cards.inactive") || "Inactive"}
                          </span>
                        )}
                      </div>
                      <a
                        href={website.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm break-all ${
                          website.isActive
                            ? "text-blue-600 hover:text-blue-800"
                            : "text-gray-400"
                        }`}
                      >
                        {website.websiteUrl}
                      </a>
                      {website.description && (
                        <p className={`text-xs mt-1 ${website.isActive ? "text-gray-500" : "text-gray-400"}`}>
                          {website.description}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${website.isActive ? "text-gray-500" : "text-gray-400"}`}>
                        {t("cards.offers_collected", {
                          count: websiteOffers.length,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleActive(website.id)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          website.isActive
                            ? "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                        }`}
                      >
                        {website.isActive ? "✓" : "○"}
                      </button>
                      <button
                        onClick={() => handleDelete(website.id)}
                        className="px-2 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (website.isActive) {
                        setSelectedWebsite(website.id === selectedWebsite ? null : website.id);
                        handleScrapeWebsite(website);
                      }
                    }}
                    disabled={isScraping || !website.isActive}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
                      !website.isActive
                        ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                        : isCurrentlyScraping
                        ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold border-yellow-400 cursor-not-allowed"
                        : isScraping
                        ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                        : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {!website.isActive ? (
                      t("cards.activate_to_scrape") || "Activate to scrape"
                    ) : isCurrentlyScraping ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">🤖</span>
                        <span>{t("cards.scrape_loading")}</span>
                      </span>
                    ) : selectedWebsite === website.id ? (
                      t("cards.scrape_updated")
                    ) : (
                      t("cards.scrape_single")
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            {t("empty.no_active", {
              category:
                activeCategory === "local"
                  ? t("categories.local")
                  : t("categories.international"),
            })}
          </p>
        </div>
      )}

      {offers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t("offers_list.title", { count: offers.length })}
          </h3>
          <div className="space-y-4">
            {offers.map((offer, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{offer.brand}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {t("offers_list.badge")}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{offer.title}</p>
                    {offer.description && (
                      <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                        {offer.description}
                      </p>
                    )}
                  </div>
                  {offer.discountPercentage && (
                    <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                      {t("offers_list.discount", {
                        value: offer.discountPercentage,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>🌐</span>
                    <span>{t("offers_list.source")}</span>
                  </span>
                  {offer.sourceUrl && (
                    <a
                      href={offer.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {t("offers_list.view_site")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteTab;

