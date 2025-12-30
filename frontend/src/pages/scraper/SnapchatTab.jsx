import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";

const SnapchatTab = ({ accounts }) => {
  const { t } = useTranslation("scraperSnapchat");
  const [stories, setStories] = useState([]);
  const [spotlights, setSpotlights] = useState([]);
  const [activeTab, setActiveTab] = useState("stories");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingProfile, setScrapingProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [analyzedImages, setAnalyzedImages] = useState([]);
  const [expandedAnalyses, setExpandedAnalyses] = useState(new Set());

  const loadSnapchatOffers = async () => {
    try {
      const result = await api.get("/competitor-analysis/offers");
      if (result.data.success) {
        const snapchatOffers = result.data.data.filter(
          (offer) => offer.source === "snapchat" || offer.sourceUrl?.includes("snapchat.com") || offer.sourceUrl?.includes("sc-jpl.com")
        );
        
        const storyOffers = snapchatOffers.filter(
          (offer) => !offer.sourceUrl?.includes("highlight") && !offer.title?.toLowerCase().includes("highlight") && !offer.sourceUrl?.includes("spotlight") && !offer.title?.toLowerCase().includes("spotlight")
        );
        const spotlightOffers = snapchatOffers.filter(
          (offer) => offer.sourceUrl?.includes("highlight") || offer.title?.toLowerCase().includes("highlight") || offer.sourceUrl?.includes("spotlight") || offer.title?.toLowerCase().includes("spotlight")
        );
        
        setStories(storyOffers);
        setSpotlights(spotlightOffers);
      }
    } catch (error) {
      console.error("Error loading Snapchat offers:", error);
    }
  };

  const loadAnalyzedImages = async () => {
    try {
      const result = await api.get("/competitor-analysis/analyzed-images");
      if (result.data.success) {
        setAnalyzedImages(result.data.data);
      }
    } catch (error) {
      console.error("Error loading analyzed images:", error);
    }
  };

  useEffect(() => {
    loadSnapchatOffers();
    loadAnalyzedImages();
  }, []);

  const toggleAnalysisExpanded = (imageId) => {
    const newExpanded = new Set(expandedAnalyses);
    if (newExpanded.has(imageId)) {
      newExpanded.delete(imageId);
    } else {
      newExpanded.add(imageId);
    }
    setExpandedAnalyses(newExpanded);
  };

  const getAnalysisForOffer = (offer) => {
    return analyzedImages.find(
      (img) => 
        img.sourceUrl === offer.sourceUrl || 
        (img.brandName === offer.brand && img.sourceUrl.includes(offer.sourceUrl?.split('/').pop() || ''))
    );
  };

  const handleScrapeProfile = async (account) => {
    if (!account.id) return;
    
    setIsScraping(true);
    setScrapingProfile(account.username);
    const toastId = toast.loading(
      t("toasts.scrape_profile_loading", { brandName: account.brandName }),
      { duration: 0 }
    );

    try {
      const result = await api.post(`/competitor-analysis/scrape-snapchat/${account.id}`);
      await loadSnapchatOffers();
      await loadAnalyzedImages();

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

  const handleClearOffers = async () => {
    if (!confirm(t("toasts.clear_offers_confirm"))) {
      return;
    }

    const toastId = toast.loading(t("toasts.clear_offers_loading"), {
      duration: 0,
    });
    try {
      const result = await api.delete("/competitor-analysis/offers/by-source/snapchat");
      await loadSnapchatOffers();
      
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error clearing Snapchat offers:", error);
      toast.error(t("toasts.clear_offers_failed"), { id: toastId });
    }
  };

  const offersByAccount = accounts.reduce((acc, account) => {
    acc[account.username] = {
      stories: stories.filter(
        (offer) => offer.brand === account.brandName || offer.sourceUrl?.includes(account.username)
      ),
      spotlights: spotlights.filter(
        (offer) => offer.brand === account.brandName || offer.sourceUrl?.includes(account.username)
      ),
    };
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t("header.title")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("header.summary", {
                accounts: accounts.length,
                stories: stories.length,
                spotlights: spotlights.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleClearOffers}
              disabled={isScraping || (stories.length === 0 && spotlights.length === 0)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isScraping || (stories.length === 0 && spotlights.length === 0)
                  ? "bg-gray-200 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
              }`}
            >
              {t("buttons.clear_offers")}
            </button>
          </div>
        </div>
      </div>

      {accounts.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t("accounts.active_accounts_title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const accountData = offersByAccount[account.username] || { stories: [], spotlights: [] };
              const isCurrentlyScraping = scrapingProfile === account.username;

              return (
                <div
                  key={account.id}
                  className={`border rounded-lg p-4 ${
                    selectedProfile === account.id
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{account.brandName}</h4>
                      <p className="text-sm text-gray-600">@{account.username}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("account_card.offers_count", {
                          stories: accountData.stories.length,
                          spotlights: accountData.spotlights.length,
                        })}
                      </p>
                    </div>
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-600 hover:text-yellow-800 text-sm"
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
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            {t("accounts.no_accounts")}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab("stories")}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === "stories"
                ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t("tabs.stories", { count: stories.length })}
          </button>
          <button
            onClick={() => setActiveTab("spotlights")}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === "spotlights"
                ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t("tabs.spotlights", { count: spotlights.length })}
          </button>
        </div>

        {activeTab === "stories" && (
          <div>
            {stories.length > 0 ? (
              <div className="space-y-4">
                {stories.map((offer, index) => {
                  const analysis = getAnalysisForOffer(offer);
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition-colors bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-800">{offer.brand}</h4>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              {t("stories.badge")}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2 font-medium">{offer.title}</p>
                          {offer.description && (
                            <div className="bg-gray-50 rounded p-3 mb-2">
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {offer.description}
                              </p>
                            </div>
                          )}
                          {analysis && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 mt-3">
                              <h5 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                                <span>🤖</span>
                                <span>{t("stories.analysis_title")}</span>
                              </h5>
                              <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                {analysis.analysisResult}
                              </p>
                            </div>
                          )}
                        </div>
                        {offer.discountPercentage && (
                          <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold whitespace-nowrap">
                            {t("stories.discount", {
                              value: offer.discountPercentage,
                            })}
                          </span>
                        )}
                      </div>
                      
                      {/* Snapchat Story URL - Prominently displayed */}
                      {(() => {
                        const storyUrl = offer.sourceUrl || offer.source_url;
                        if (!storyUrl) return null;
                        
                        return (
                          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <span>🔗</span>
                              <span>{t("stories.story_url") || "Snapchat Story URL:"}</span>
                            </p>
                            <a
                              href={storyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-yellow-600 hover:text-yellow-800 font-medium text-sm break-all hover:underline transition-colors mb-2"
                            >
                              <span className="truncate block">{storyUrl}</span>
                            </a>
                            <div>
                              <a
                                href={storyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                              >
                                <span>{t("stories.view_story") || "View Story"}</span>
                                <span className="text-xs">↗</span>
                              </a>
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <span className="flex items-center gap-1">
                          <span>👻</span>
                          <span>{t("stories.source")}</span>
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
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {t("stories.empty")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "spotlights" && (
          <div>
            {spotlights.length > 0 ? (
              <div className="space-y-4">
                {spotlights.map((offer, index) => {
                  const analysis = getAnalysisForOffer(offer);
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition-colors bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-800">{offer.brand}</h4>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                              {t("spotlights.badge")}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2 font-medium">{offer.title}</p>
                          {offer.description && (
                            <div className="bg-gray-50 rounded p-3 mb-2">
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {offer.description}
                              </p>
                            </div>
                          )}
                          {analysis && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 mt-3">
                              <h5 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                                <span>🤖</span>
                                <span>{t("spotlights.analysis_title")}</span>
                              </h5>
                              <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                {analysis.analysisResult}
                              </p>
                            </div>
                          )}
                        </div>
                        {offer.discountPercentage && (
                          <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold whitespace-nowrap">
                            {t("spotlights.discount", {
                              value: offer.discountPercentage,
                            })}
                          </span>
                        )}
                      </div>
                      
                      {/* Snapchat Spotlight URL - Prominently displayed */}
                      {(() => {
                        const spotlightUrl = offer.sourceUrl || offer.source_url;
                        if (!spotlightUrl) return null;
                        
                        return (
                          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <span>🔗</span>
                              <span>{t("spotlights.spotlight_url") || "Snapchat Spotlight URL:"}</span>
                            </p>
                            <a
                              href={spotlightUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-yellow-600 hover:text-yellow-800 font-medium text-sm break-all hover:underline transition-colors mb-2"
                            >
                              <span className="truncate block">{spotlightUrl}</span>
                            </a>
                            <div>
                              <a
                                href={spotlightUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                              >
                                <span>{t("spotlights.view_spotlight") || "View Spotlight"}</span>
                                <span className="text-xs">↗</span>
                              </a>
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <span className="flex items-center gap-1">
                          <span>⭐</span>
                          <span>{t("spotlights.source")}</span>
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
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {t("spotlights.empty")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SnapchatTab;

