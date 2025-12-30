import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";

const TikTokTab = ({ accounts }) => {
  const { t } = useTranslation("scraperTikTok");
  const [offers, setOffers] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingProfile, setScrapingProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const loadTikTokOffers = async () => {
    try {
      const result = await api.get("/competitor-analysis/offers");
      if (result.data.success) {
        const tiktokOffers = result.data.data.filter(
          (offer) => offer.source === "tiktok" || offer.sourceUrl?.includes("tiktok.com")
        );
        
        // Deduplicate offers based on sourceUrl or id
        const seen = new Set();
        const uniqueOffers = tiktokOffers.filter((offer) => {
          const key = offer.id || offer.sourceUrl || `${offer.brand}-${offer.title}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
        
        setOffers(uniqueOffers);
      }
    } catch (error) {
      console.error("Error loading TikTok offers:", error);
    }
  };

  useEffect(() => {
    loadTikTokOffers();
  }, []);

  const handleScrapeProfile = async (account) => {
    if (!account.id) return;

    setIsScraping(true);
    setScrapingProfile(account.username);
    const toastId = toast.loading(
      t("toasts.scrape_profile_loading", { brandName: account.brandName }),
      { duration: 0 }
    );

    try {
      const result = await api.post(
        `/competitor-analysis/scrape-tiktok/${account.id}`
      );
      await loadTikTokOffers();

      if (result.data.success) {
        toast.success(
          result.data.message ||
            t("toasts.scrape_profile_success", { brandName: account.brandName }),
          { id: toastId }
        );
      } else {
        toast.error(
          result.data.message ||
            t("toasts.scrape_profile_failed", { brandName: account.brandName }),
          { id: toastId }
        );
      }
    } catch (error) {
      console.error(`Error scraping ${account.username}:`, error);
      toast.error(
        t("toasts.scrape_profile_failed", { brandName: account.brandName }),
        { id: toastId }
      );
    } finally {
      setIsScraping(false);
      setScrapingProfile(null);
    }
  };

  const handleScrapeAllAccounts = async () => {
    setIsScraping(true);
    const toastId = toast.loading(t("toasts.scrape_all_loading"), {
      duration: 0,
    });

    try {
      const result = await api.post("/competitor-analysis/scrape-tiktok/all");
      await loadTikTokOffers();

      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error scraping all accounts:", error);
      toast.error(t("toasts.scrape_all_failed"), { id: toastId });
    } finally {
      setIsScraping(false);
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
      const result = await api.delete("/competitor-analysis/offers/by-source/tiktok");
      await loadTikTokOffers();
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error clearing TikTok offers:", error);
      toast.error(t("toasts.clear_offers_failed"), { id: toastId });
    }
  };

  const activeAccounts = accounts.filter((a) => a.isActive && a.platform === "tiktok");
  const offersByAccount = activeAccounts.reduce((acc, account) => {
    acc[account.username] = offers.filter(
      (offer) => offer.brand === account.brandName || offer.sourceUrl?.includes(account.username)
    );
    return acc;
  }, {});

  if (activeAccounts.length === 0) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t("header.no_accounts_title")}
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              {t("header.no_accounts_body", {
                settings: t("side_bar.settings", { ns: "side_bar" }),
              })}
            </p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t("header.title")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("header.summary", {
                accounts: activeAccounts.length,
                offers: offers.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleScrapeAllAccounts}
              disabled={isScraping || activeAccounts.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isScraping || activeAccounts.length === 0
                  ? "bg-gray-200 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
              }`}
            >
              {isScraping ? t("buttons.scrape_all_loading") : t("buttons.scrape_all")}
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
      </div>

      {activeAccounts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t("accounts.active_accounts_title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccounts.map((account) => {
              const accountOffers = offersByAccount[account.username] || [];
              const isCurrentlyScraping = scrapingProfile === account.username;

              return (
                <div
                  key={account.id}
                  className={`border rounded-lg p-4 ${
                    selectedProfile === account.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{account.brandName}</h4>
                      <p className="text-sm text-gray-600">@{account.username}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("accounts.offers_collected", {
                          count: accountOffers.length,
                        })}
                      </p>
                    </div>
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 text-sm"
                    >
                      🔗
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProfile(account.id === selectedProfile ? null : account.id);
                      handleScrapeProfile(account);
                    }}
                    disabled={isScraping}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
                      isCurrentlyScraping
                        ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold border-yellow-400 cursor-not-allowed"
                        : isScraping
                        ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                        : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {isCurrentlyScraping
                      ? t("buttons.scrape_loading")
                      : selectedProfile === account.id
                      ? t("buttons.scrape_updated")
                      : t("buttons.scrape")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {offers.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t("offers_list.title", { count: offers.length })}
          </h3>
          <div className="space-y-4">
            {offers.map((offer, index) => {
              const accountTagMatch = offer.title.match(/\[@(\w+)\]/) || offer.description?.match(/\[@(\w+)\]/);
              const accountTag = accountTagMatch ? accountTagMatch[1] : null;
              const displayTitle = offer.title.replace(/\[@\w+\]\s*/, '');

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-800">{offer.brand}</h4>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                          {t("offers_list.badge")}
                        </span>
                        {accountTag && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                            {t("offers_list.tag", { tag: accountTag })}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm mb-2 font-medium">{displayTitle}</p>
                      {offer.description && (
                        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                          {offer.description}
                        </p>
                      )}
                    </div>
                    {offer.discountPercentage && (
                      <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold whitespace-nowrap">
                        {t("offers_list.discount", {
                          value: offer.discountPercentage,
                        })}
                      </span>
                    )}
                  </div>
                  
                  {/* TikTok Video URL - Prominently displayed */}
                  {(() => {
                    const videoUrl = offer.sourceUrl || offer.source_url;
                    if (!videoUrl) return null;
                    
                    return (
                      <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <span>🔗</span>
                          <span>{t("offers_list.video_url") || "TikTok Video URL:"}</span>
                        </p>
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-purple-600 hover:text-purple-800 font-medium text-sm break-all hover:underline transition-colors mb-2"
                        >
                          <span className="truncate block">{videoUrl}</span>
                        </a>
                        <div>
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                          >
                            <span>{t("offers_list.view_video") || "View Video"}</span>
                            <span className="text-xs">↗</span>
                          </a>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <span className="flex items-center gap-1">
                      <span>🎵</span>
                      <span>{t("offers_list.source")}</span>
                    </span>
                    {offer.scrapedAt && (
                      <span className="text-gray-400">
                        {new Date(offer.scrapedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">
            {t("offers_list.empty_title")}
          </p>
          <p className="text-sm text-gray-400">
            {t("offers_list.empty_body")}
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

export default TikTokTab;