import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";
import { Button } from "@/components/ui/button";
import GoldPriceCard from "./GoldPriceCard";
import OffersList from "./OffersList";
import AddInstagramProfile from "./AddInstagramProfile";
import InstagramProfilesList from "./InstagramProfilesList";
import AddSocialMediaAccount from "./AddSocialMediaAccount";
import SocialMediaAccountsList from "./SocialMediaAccountsList";
import BrandResearch from "./BrandResearch";
import ImageAnalysis from "./ImageAnalysis";
import OfferSuggestions from "./OfferSuggestions";
import InstagramTab from "./InstagramTab";
import TikTokTab from "./TikTokTab";
import SnapchatTab from "./SnapchatTab";
import WebsiteTab from "./WebsiteTab";
import Tabs from "./Tabs";
import BusinessConfig from "./BusinessConfig";
import PriceChart from "./PriceChart";

const DashboardScraper = () => {
  const { t } = useTranslation("scraperDashboard");

  const [activeTab, setActiveTab] = useState("overview");
  const [prices, setPrices] = useState([]);
  const [trends, setTrends] = useState([]);
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScrapingBrands, setIsScrapingBrands] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [instagramProfiles, setInstagramProfiles] = useState([]);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
  const [showAddSocialAccount, setShowAddSocialAccount] = useState(false);
  const [activeBusinessConfig, setActiveBusinessConfig] = useState(null);

  const tabs = [
    { id: "overview", label: t("tabs.overview"), icon: "📊" },
    { id: "offers", label: t("tabs.offers"), icon: "🎁" },
    { id: "research", label: t("tabs.research"), icon: "🔍" },
    { id: "instagram", label: t("tabs.instagram"), icon: "📷" },
    { id: "tiktok", label: t("tabs.tiktok"), icon: "🎵" },
    { id: "snapchat", label: t("tabs.snapchat"), icon: "👻" },
    { id: "websites", label: t("tabs.websites"), icon: "🌐" },
    // { id: "business-config", label: t("tabs.business_config"), icon: "⚙️" },
    { id: "settings", label: t("tabs.settings"), icon: "🔧" },
  ];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pricesResult, trendsResult, offersResult, profilesResult, accountsResult, clientInfoResult] = await Promise.all([
        api.get("/competitor-analysis/gold-prices/latest"),
        api.get("/competitor-analysis/gold-prices/trends", { params: { days: 30 } }),
        api.get("/competitor-analysis/offers"),
        api.get("/competitor-analysis/instagram-profiles"),
        api.get("/competitor-analysis/social-media-accounts", { params: { active_only: false } }),
        api.get("/me"),
      ]);

      if (pricesResult.data.success) {
        setPrices(pricesResult.data.data);
      }
      if (trendsResult.data.success) {
        setTrends(trendsResult.data.data);
      }
      if (offersResult.data.success) {
        let filteredOffers = offersResult.data.data;
        
        // Get business type from client info
        const clientBusinessType = clientInfoResult.data.success ? clientInfoResult.data.data?.company_details : null;
        
        // Note: If you need keyword filtering, you might still need business-config
        // For now, we'll just use the offers as-is
        setOffers(filteredOffers);
      }
      if (profilesResult.data && Array.isArray(profilesResult.data)) {
        setInstagramProfiles(profilesResult.data);
      }
      
      // Backend returns direct array, not wrapped in { success, data }
      // Normalize backend snake_case to frontend camelCase for consistency
      if (accountsResult.data && Array.isArray(accountsResult.data)) {
        const normalized = accountsResult.data.map((a) => ({
          id: a.id,
          username: a.username,
          brandName: a.brand_name,
          platform: a.platform,
          profileUrl: a.profile_url,
          isActive: a.is_active,
          createdAt: a.created_at,
        }));
        setSocialMediaAccounts(normalized);
      }
      // Set business type from client info
      if (clientInfoResult.data.success && clientInfoResult.data.data?.company_details) {
        setActiveBusinessConfig({
          businessType: clientInfoResult.data.data.company_details,
        });
      } else {
        setActiveBusinessConfig(null);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading(t("toasts.refresh_loading"), { duration: 0 });
    try {
      const result = await api.post("/competitor-analysis/gold-prices/refresh");
      if (result.data.success) {
        await loadData();
        toast.success(t("toasts.refresh_success", { message: result.data.message }), { id: toastId });
      } else {
        toast.error(t("toasts.refresh_error", { message: result.data.message }), { id: toastId });
      }
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error(t("toasts.refresh_failed"), { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScrapeBrands = async () => {
    setIsScrapingBrands(true);
    const toastId = toast.loading(t("toasts.scrape_loading"), { duration: 0 });
    try {
      const result = await api.post("/competitor-analysis/scrape-all");
      await loadData();
      if (result.data.success) {
        toast.success(t("toasts.scrape_success", { message: result.data.message }), { id: toastId });
      } else {
        toast.success(t("toasts.scrape_partial", { message: result.data.message }), { id: toastId });
      }
    } catch (error) {
      console.error("Error scraping brands:", error);
      toast.error(t("toasts.scrape_failed"), { id: toastId });
    } finally {
      setIsScrapingBrands(false);
    }
  };

  const handleDeleteAllOffers = async () => {
    if (!confirm(t("toasts.delete_all_offers_confirm"))) {
      return;
    }

    const toastId = toast.loading(t("toasts.delete_all_offers_loading"), { duration: 0 });
    try {
      const result = await api.delete("/competitor-analysis/offers/all");
      if (result.data.success) {
        await loadData();
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting offers:", error);
      toast.error(t("toasts.delete_all_offers_failed"), { id: toastId });
    }
  };

  const handleProfileAdded = async () => {
    await loadData();
    setShowAddProfile(false);
  };

  const handleToggleProfile = async (id) => {
    try {
      await api.patch(`/competitor-analysis/instagram-profiles/${id}/toggle`);
      await loadData();
    } catch (error) {
      toast.error(t("toasts.profile_update_failed"));
    }
  };

  const handleDeleteProfile = async (id) => {
    const toastId = toast.loading(t("toasts.delete_loading"));
    try {
      const result = await api.delete(`/competitor-analysis/instagram-profiles/${id}`);
      if (result.data.success) {
        await loadData();
        toast.success(t("toasts.delete_profile_success"), { id: toastId });
      } else {
        toast.error(result.data.message || t("toasts.delete_failed"), { id: toastId });
      }
    } catch (error) {
      toast.error(t("toasts.delete_error"), { id: toastId });
    }
  };

  const handleSocialAccountAdded = async () => {
    await loadData();
    setShowAddSocialAccount(false);
  };

  const handleToggleSocialAccount = async (id) => {
    try {
      await api.patch(`/competitor-analysis/social-media-accounts/${id}/toggle`);
      await loadData();
    } catch (error) {
      toast.error(t("toasts.account_update_failed"));
    }
  };

  const handleDeleteSocialAccount = async (id) => {
    if (!confirm(t("toasts.delete_account_confirm"))) {
      return;
    }

    const toastId = toast.loading(t("toasts.delete_loading"));
    try {
      const result = await api.delete(`/competitor-analysis/social-media-accounts/${id}`);
      if (result.data.success) {
        await loadData();
        toast.success(t("toasts.delete_account_success"), { id: toastId });
      } else {
        toast.error(result.data.message || t("toasts.delete_failed"), { id: toastId });
      }
    } catch (error) {
      toast.error(t("toasts.delete_error"), { id: toastId });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const VALID_KARATS = [18, 21, 22, 24];

  const groupedPrices = prices
    .filter((price) => VALID_KARATS.includes(price.karat))
    .reduce((acc, price) => {
      if (!acc[price.karat]) {
        acc[price.karat] = price;
      } else if (price.source === "MOCI") {
        acc[price.karat] = price;
      }
      return acc;
    }, {});

  const priceCards = Object.values(groupedPrices).sort((a, b) => a.karat - b.karat);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex justify-center items-center">
        <div className="text-gray-600 dark:text-gray-300">{t("loading.data")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-slate-100 rounded-lg shadow-md p-6 border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{t("stats.available_prices")}</p>
              <p className="text-3xl font-bold mt-2 text-gray-800">{priceCards.length}</p>
            </div>
            <div className="text-5xl opacity-60">💰</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-gray-100 rounded-lg shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{t("stats.active_offers")}</p>
              <p className="text-3xl font-bold mt-2 text-gray-800">{offers.length}</p>
            </div>
            <div className="text-5xl opacity-60">🎁</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-slate-100 rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{t("stats.instagram_profiles")}</p>
              <p className="text-3xl font-bold mt-2 text-gray-800">
                {socialMediaAccounts.filter((a) => a.platform === "instagram" && a.isActive).length}
              </p>
            </div>
            <div className="text-5xl opacity-60">📱</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 rounded-lg shadow-md p-6 border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{t("stats.business_type")}</p>
              <p className="text-2xl font-bold mt-2 text-gray-800">
                {activeBusinessConfig?.businessType || t("stats.business_type_not_set")}
              </p>
            </div>
            <div className="text-5xl opacity-60">⚙️</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t("header.title")}</h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("header.last_updated", { value: lastUpdated.toLocaleString() })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isScrapingBrands}
              className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md disabled:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:text-gray-500"
            >
              {isRefreshing ? t("buttons.refresh_loading") : t("buttons.refresh")}
            </Button>
            <Button
              onClick={handleScrapeBrands}
              disabled={isRefreshing || isScrapingBrands}
              className="bg-gradient-to-r from-slate-100 to-blue-100 hover:from-slate-200 hover:to-blue-200 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md disabled:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:text-gray-500"
            >
              {isScrapingBrands ? t("buttons.scrape_loading") : t("buttons.scrape")}
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {activeBusinessConfig && (
              // <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  {/* <div> */}
                    {/* <p className="text-sm opacity-90 font-medium">{t("overview.active_business_type")}</p>
                    <p className="text-3xl font-bold mt-2">{activeBusinessConfig.businessType}</p> */}
                    {/* {activeBusinessConfig.keywords && (
                      <p className="text-sm opacity-80 mt-2">
                        {t("overview.keywords_count", {
                          count: activeBusinessConfig.keywords.split(",").length,
                        })}
                      </p>
                    )} */}
                  {/* </div> */}
                  {/* <div className="text-5xl opacity-80">📊</div> */}
                </div>
              // </div>
            )}

            {activeBusinessConfig?.businessType === "Gold" && priceCards.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {t("overview.gold_prices_title", { businessType: activeBusinessConfig.businessType })}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {priceCards.map((price) => (
                    <GoldPriceCard
                      key={`${price.karat}-${price.source}`}
                      karat={price.karat}
                      price={price.pricePerGram}
                      currency={price.currency}
                      source={price.source}
                    />
                  ))}
                </div>
              </div>
            )}

            {trends.length > 0 && activeBusinessConfig?.businessType === "Gold" && (
              <PriceChart data={trends} />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                {t("overview.offers_summary_title")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t("overview.offers_summary_total")}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{offers.length}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t("overview.offers_summary_with_discount")}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {offers.filter(o => o.discountPercentage).length}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t("overview.offers_summary_sources")}</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {new Set(offers.map(o => o.source)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "offers" && (
          <div className="space-y-6">
            <OfferSuggestions />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {t("offers_tab.title")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleScrapeBrands}
                    disabled={isScrapingBrands}
                    className="bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md disabled:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:text-gray-500"
                  >
                    {isScrapingBrands ? t("buttons.scrape_loading") : t("buttons.offers_refresh")}
                  </Button>
                  <Button
                    onClick={handleDeleteAllOffers}
                    disabled={isScrapingBrands || offers.length === 0}
                    className="bg-gradient-to-r from-gray-100 to-slate-200 hover:from-gray-200 hover:to-slate-300 text-gray-800 border border-gray-300 shadow-sm hover:shadow-md disabled:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:text-gray-500"
                  >
                    {t("buttons.offers_delete_all")}
                  </Button>
                </div>
              </div>
              <OffersList offers={offers} />
            </div>
          </div>
        )}

        {activeTab === "research" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                {t("research_tab.deep_brand_research")}
              </h3>
              <BrandResearch />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                {t("research_tab.analyzed_images")}
              </h3>
              <ImageAnalysis />
            </div>
          </div>
        )}

        {activeTab === "instagram" && (
          <InstagramTab accounts={socialMediaAccounts.filter(a => a.platform === "instagram")} />
        )}

        {activeTab === "tiktok" && (
          <TikTokTab accounts={socialMediaAccounts.filter(a => a.platform === "tiktok")} />
        )}

        {activeTab === "snapchat" && (
          <SnapchatTab accounts={socialMediaAccounts.filter(a => a.platform === "snapchat" && a.isActive)} />
        )}

        {activeTab === "websites" && (
          <WebsiteTab />
        )}

        {/* {activeTab === "business-config" && (
          <div className="space-y-6">
            <BusinessConfig />
          </div>
        )} */}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {t("settings_tab.manage_social_accounts")}
                </h3>
                <Button
                  onClick={() => setShowAddSocialAccount(!showAddSocialAccount)}
                  className="bg-gradient-to-r from-blue-100 to-slate-200 hover:from-blue-200 hover:to-slate-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
                >
                  {showAddSocialAccount ? t("buttons.hide_add_account") : t("buttons.show_add_account")}
                </Button>
              </div>
              {showAddSocialAccount && (
                <div className="mb-6">
                  <AddSocialMediaAccount onAccountAdded={handleSocialAccountAdded} />
                </div>
              )}
              <SocialMediaAccountsList
                accounts={socialMediaAccounts}
                onToggleActive={handleToggleSocialAccount}
                onDelete={handleDeleteSocialAccount}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DashboardScraper;