import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const InstagramTab = ({ accounts }) => {
  const { t } = useTranslation("scraperInstagram");

  const [offers, setOffers] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingProfile, setScrapingProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [latestPosts, setLatestPosts] = useState({});
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    email: "",
  });
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  const loadInstagramOffers = async () => {
    try {
      const result = await api.get("/competitor-analysis/offers");
      if (result.data.success) {
        const instagramOffers = result.data.data.filter(
          (offer) => {
            // Handle both camelCase and snake_case field names
            const sourceUrl = offer.sourceUrl || offer.source_url;
            return offer.source === "instagram" || sourceUrl?.includes("instagram.com");
          }
        );
        // Debug: Log first offer to see structure
        if (instagramOffers.length > 0) {
          console.log("Sample Instagram offer:", instagramOffers[0]);
        }
        setOffers(instagramOffers);
      }
    } catch (error) {
      console.error("Error loading Instagram offers:", error);
    }
  };

  useEffect(() => {
    loadInstagramOffers();
    loadInstagramCredentials();
  }, []);

  const loadInstagramCredentials = async () => {
    try {
      const result = await api.get("/competitor-analysis/instagram/credentials");
      if (result.data.success && result.data.hasCredentials) {
        setCredentials({
          username: result.data.username || "",
          password: "", // Don't show password
          email: result.data.email || "",
        });
        setHasCredentials(true);
      } else {
        setHasCredentials(false);
      }
    } catch (error) {
      console.error("Error loading Instagram credentials:", error);
      setHasCredentials(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setIsLoadingCredentials(true);
    const toastId = toast.loading(t("credentials.saving") || "Saving credentials...");
    
    try {
      const result = await api.post("/competitor-analysis/instagram/credentials", {
        username: credentials.username,
        password: credentials.password,
        email: credentials.email || null,
      });
      
      if (result.data.success) {
        toast.success(result.data.message || t("credentials.saved") || "Credentials saved successfully", { id: toastId });
        setHasCredentials(true);
        setShowCredentialsForm(false);
        // Clear password field after saving
        setCredentials((prev) => ({ ...prev, password: "" }));
      } else {
        toast.error(result.data.message || t("credentials.saveFailed") || "Failed to save credentials", { id: toastId });
      }
    } catch (error) {
      console.error("Error saving Instagram credentials:", error);
      toast.error(
        error.response?.data?.detail || t("credentials.saveFailed") || "Failed to save credentials",
        { id: toastId }
      );
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleScrapeProfile = async (account) => {
    if (!account.id) return;
    
    // Check if credentials are added
    if (!hasCredentials) {
      toast.error(
        t("toasts.credentials_required") || 
        "Please add Instagram login credentials first before scraping. You can add them in the credentials section above.",
        { duration: 5000 }
      );
      setShowCredentialsForm(true); // Show the credentials form
      return;
    }
    
    setIsScraping(true);
    setScrapingProfile(account.username);
    const toastId = toast.loading(
      t("toasts.scrape_profile_loading", { brandName: account.brandName }),
      { duration: 0 }
    );

    try {
      const result = await api.post(
        `/competitor-analysis/scrape-instagram/${account.id}`
      );
      await loadInstagramOffers();
      
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

  const handleScrapeAll = async () => {
    // Check if credentials are added
    if (!hasCredentials) {
      toast.error(
        t("toasts.credentials_required") || 
        "Please add Instagram login credentials first before scraping. You can add them in the credentials section above.",
        { duration: 5000 }
      );
      // Delay showing the form slightly to ensure toast is visible
      setTimeout(() => {
        setShowCredentialsForm(true);
        // Scroll to credentials section
        const credentialsSection = document.querySelector('[data-credentials-section]');
        if (credentialsSection) {
          credentialsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }
    
    setIsScraping(true);
    const toastId = toast.loading(t("toasts.scrape_all_loading"), {
      duration: 0,
    });

    try {
      const result = await api.post("/competitor-analysis/scrape-instagram/all");
      await loadInstagramOffers();
      
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
      const result = await api.delete("/competitor-analysis/offers/by-source/instagram");
      await loadInstagramOffers();
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error clearing Instagram offers:", error);
      toast.error(t("toasts.clear_offers_failed"), { id: toastId });
    }
  };

  const activeAccounts = accounts.filter((a) => a.isActive && a.platform === "instagram");
  const offersByAccount = activeAccounts.reduce((acc, account) => {
    acc[account.username] = offers.filter(
      (offer) => {
        const sourceUrl = offer.sourceUrl || offer.source_url;
        return offer.brand === account.brandName || sourceUrl?.includes(account.username);
      }
    );
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Instagram Credentials Section */}
      <div className="bg-white rounded-lg shadow-md p-6" data-credentials-section>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {t("credentials.title") || "Instagram Login Credentials"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t("credentials.description") || "Add your Instagram credentials to scrape accounts"}
            </p>
          </div>
          <button
            onClick={() => setShowCredentialsForm(!showCredentialsForm)}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
          >
            {showCredentialsForm
              ? t("credentials.hide") || "Hide"
              : hasCredentials
              ? t("credentials.update") || "Update Credentials"
              : t("credentials.add") || "Add Credentials"}
          </button>
        </div>

        {showCredentialsForm && (
          <form onSubmit={handleSaveCredentials} className="space-y-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                {t("credentials.username") || "Username"}
              </Label>
              <Input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                required
                className="mt-1"
                placeholder={t("credentials.usernamePlaceholder") || "Enter Instagram username"}
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                {t("credentials.password") || "Password"}
              </Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                required={!hasCredentials}
                className="mt-1"
                placeholder={hasCredentials ? t("credentials.passwordPlaceholderUpdate") || "Leave blank to keep current password" : t("credentials.passwordPlaceholder") || "Enter Instagram password"}
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                {t("credentials.email") || "Email (Optional)"}
              </Label>
              <Input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1"
                placeholder={t("credentials.emailPlaceholder") || "Enter Instagram email (optional)"}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoadingCredentials}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isLoadingCredentials
                    ? "bg-gray-200 cursor-not-allowed text-gray-500"
                    : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
                }`}
              >
                {isLoadingCredentials
                  ? t("credentials.saving") || "Saving..."
                  : t("credentials.save") || "Save Credentials"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCredentialsForm(false);
                  loadInstagramCredentials(); // Reload to reset form
                }}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
              >
                {t("credentials.cancel") || "Cancel"}
              </button>
            </div>

            {hasCredentials && (
              <p className="text-xs text-gray-500 mt-2">
                {t("credentials.currentUsername") || "Current username"}: <strong>{credentials.username}</strong>
              </p>
            )}
          </form>
        )}

        {!showCredentialsForm && hasCredentials && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{t("credentials.currentUsername") || "Current username"}:</span>{" "}
              {credentials.username}
            </p>
            {credentials.email && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">{t("credentials.currentEmail") || "Email"}:</span> {credentials.email}
              </p>
            )}
          </div>
        )}
      </div>

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
              onClick={handleScrapeAll}
              disabled={isScraping || activeAccounts.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isScraping || activeAccounts.length === 0
                  ? "bg-gray-200 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
              }`}
            >
              {isScraping
                ? t("buttons.scrape_all_loading")
                : t("buttons.scrape_all")}
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

      {activeAccounts.length > 0 ? (
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
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            {t("accounts.no_accounts")}
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
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{offer.brand}</h4>
                    <p className="text-gray-700 text-sm mb-2 font-medium">{offer.title}</p>
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
                
                {/* Instagram Post URL - Prominently displayed */}
                {(() => {
                  const postUrl = offer.sourceUrl || offer.source_url;
                  if (!postUrl) return null;
                  
                  return (
                    <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <span>🔗</span>
                        <span>{t("offers_list.post_url") || "Instagram Post URL:"}</span>
                      </p>
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-purple-600 hover:text-purple-800 font-medium text-sm break-all hover:underline transition-colors mb-2"
                      >
                        <span className="truncate block">{postUrl}</span>
                      </a>
                      <div>
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                        >
                          <span>{t("offers_list.view_post") || "View Post"}</span>
                          <span className="text-xs">↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <span className="flex items-center gap-1">
                    <span>📷</span>
                    <span>{t("offers_list.source")}</span>
                  </span>
                  {offer.scrapedAt && (
                    <span className="text-gray-400">
                      {new Date(offer.scrapedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default InstagramTab;

