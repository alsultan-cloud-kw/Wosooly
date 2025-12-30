import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";

const OfferSuggestions = () => {
  const { t } = useTranslation("scraperOfferSuggestions");
  const [suggestions, setSuggestions] = useState([]);
  const [marketAnalysis, setMarketAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [businessType, setBusinessType] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [historicalSuggestions, setHistoricalSuggestions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadSuggestions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const toastId = toast.loading(t("toasts.loading"), { duration: 0 });

    try {
      const result = await api.get("/competitor-analysis/offer-suggestions");
      if (result.data.success) {
        const suggestionsData = result.data.suggestions || [];
        setSuggestions(suggestionsData);
        setMarketAnalysis(result.data.marketAnalysis || "");
        setBusinessType(result.data.businessType || null);
        toast.success(
          t("toasts.success", { count: suggestionsData.length }),
          { id: toastId }
        );
      } else {
        // Filter out business type errors since we use company_details directly
        const errorMsg = result.data.error || result.data.marketAnalysis || t("toasts.error_generic");
        const isBusinessTypeError = errorMsg && (
          errorMsg.includes("business type") || 
          errorMsg.includes("نوع العمل") ||
          errorMsg.includes("company_details") ||
          errorMsg.includes("تفاصيل الشركة")
        );
        
        // Only show error if it's not about business type (since we use company_details)
        if (!isBusinessTypeError) {
          setErrorMessage(errorMsg);
          toast.error(errorMsg, { id: toastId });
        } else {
          // If it's a business type error, clear error message and try to proceed
          setErrorMessage(null);
          toast.dismiss(toastId);
        }
        setSuggestions([]);
        setMarketAnalysis("");
        setBusinessType(result.data.businessType || null);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
      const errorMsg = error.response?.data?.error || error.response?.data?.marketAnalysis || t("toasts.error_loading");
      
      // Filter out business type errors since we use company_details directly
      const isBusinessTypeError = errorMsg && (
        errorMsg.includes("business type") || 
        errorMsg.includes("نوع العمل") ||
        errorMsg.includes("company_details") ||
        errorMsg.includes("تفاصيل الشركة")
      );
      
      // Only show error if it's not about business type
      if (!isBusinessTypeError) {
        setErrorMessage(errorMsg);
        toast.error(errorMsg, { id: toastId });
      } else {
        setErrorMessage(null);
        toast.dismiss(toastId);
      }
      setSuggestions([]);
      setMarketAnalysis("");
      setBusinessType(error.response?.data?.businessType || null);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case "high":
        return "عاجل";
      case "medium":
        return "متوسط";
      case "low":
        return "منخفض";
      default:
        return urgency;
    }
  };

  const loadHistoricalSuggestions = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await api.get("/competitor-analysis/offer-suggestions/history");
      if (result.data.success) {
        setHistoricalSuggestions(result.data.data || []);
      }
    } catch (error) {
      console.error("Error loading historical suggestions:", error);
      toast.error(t("toasts.error_loading_history"));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteSuggestion = async (suggestionId) => {
    if (!window.confirm(t("confirmations.delete_suggestion"))) {
      return;
    }

    try {
      const result = await api.delete(`/competitor-analysis/offer-suggestions/${suggestionId}`);
      if (result.data.success) {
        toast.success(t("toasts.delete_success"));
        // Reload historical suggestions
        loadHistoricalSuggestions();
      }
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      toast.error(t("toasts.delete_error"));
    }
  };

  const deleteAllSuggestions = async () => {
    if (!window.confirm(t("confirmations.delete_all_suggestions"))) {
      return;
    }

    try {
      const result = await api.delete("/competitor-analysis/offer-suggestions");
      if (result.data.success) {
        toast.success(t("toasts.delete_all_success"));
        setHistoricalSuggestions([]);
      }
    } catch (error) {
      console.error("Error deleting all suggestions:", error);
      toast.error(t("toasts.delete_all_error"));
    }
  };

  useEffect(() => {
    // Load historical suggestions on mount
    loadHistoricalSuggestions();
  }, []);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-purple-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {t("header.title")}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {businessType 
              ? t("header.subtitle_with_business", {
                  businessType: businessType,
                })
              : t("header.subtitle_generic")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) {
                loadHistoricalSuggestions();
              }
            }}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
          >
            {showHistory ? t("buttons.hide_history") : t("buttons.show_history")}
            {historicalSuggestions.length > 0 && (
              <span className="ml-2 bg-blue-300 px-2 py-0.5 rounded-full text-xs text-blue-900">
                {historicalSuggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={loadSuggestions}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
              isLoading
                ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
            }`}
          >
            {isLoading ? t("buttons.refresh_loading") : t("buttons.refresh")}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="bg-white rounded-lg p-6 mb-6 border-2 border-indigo-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-gray-800">
              {t("history.title")}
            </h4>
            {historicalSuggestions.length > 0 && (
              <button
                onClick={deleteAllSuggestions}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
              >
                {t("buttons.delete_all")}
              </button>
            )}
          </div>
          {isLoadingHistory ? (
            <div className="text-center py-4 text-gray-600">
              {t("loading.text")}
            </div>
          ) : historicalSuggestions.length > 0 ? (
            <div className="space-y-4">
              {historicalSuggestions.map((historyItem) => (
                <div
                  key={historyItem.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-gray-600">
                        {new Date(historyItem.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("history.business_type")}: {historyItem.businessType}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSuggestion(historyItem.id)}
                      className="px-3 py-1 rounded text-xs font-semibold transition-all bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
                    >
                      {t("buttons.delete")}
                    </button>
                  </div>
                  {historyItem.marketAnalysis && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        {t("market_analysis.title")}:
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {historyItem.marketAnalysis}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {historyItem.suggestions?.length || 0} {t("history.suggestions_count")}
                    </span>
                    <button
                      onClick={() => {
                        setSuggestions(historyItem.suggestions || []);
                        setMarketAnalysis(historyItem.marketAnalysis || "");
                        setBusinessType(historyItem.businessType);
                        setShowHistory(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
                    >
                      {t("buttons.view")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t("empty.no_suggestions_title")}</p>
            </div>
          )}
        </div>
      )}

      {!showHistory && (
        <>
          {marketAnalysis && (
            <div className="bg-white rounded-lg p-4 mb-6 border-r-4 border-purple-500">
              <h4 className="font-bold text-gray-800 mb-2">
                {t("market_analysis.title")}
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">{marketAnalysis}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-600">{t("loading.text")}</div>
            </div>
          ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {t("cards.suggestion_label", { index: index + 1 })}
                    </span>
                    {suggestion.perspective && (
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {suggestion.perspective}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(
                        suggestion.urgency
                      )}`}
                    >
                      {t(`urgency.${suggestion.urgency}`)}
                    </span>
                    {suggestion.discountPercentage && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {t("cards.discount", {
                          value: suggestion.discountPercentage,
                        })}
                      </span>
                    )}
                    {suggestion.targetKarat && businessType === "Gold" && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {suggestion.targetKarat}K
                      </span>
                    )}
                    {suggestion.suggestedChannel && (
                      <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {suggestion.suggestedChannel}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">
                    {suggestion.title}
                  </h4>
                  <p className="text-gray-700 mb-3">{suggestion.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {suggestion.targetCompetitor && (
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-orange-900 mb-1">
                          {t("cards.target_competitor_label")}
                        </p>
                        <p className="text-sm text-orange-800">{suggestion.targetCompetitor}</p>
                      </div>
                    )}
                    {suggestion.targetEvent && (
                      <div className="bg-cyan-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-cyan-900 mb-1">
                          {t("cards.event_label")}
                        </p>
                        <p className="text-sm text-cyan-800">{suggestion.targetEvent}</p>
                      </div>
                    )}
                    {suggestion.duration && (
                      <div className="bg-teal-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-teal-900 mb-1">
                          {t("cards.duration_label")}
                        </p>
                        <p className="text-sm text-teal-800">{suggestion.duration}</p>
                      </div>
                    )}
                    {suggestion.differentiation && (
                      <div className="bg-violet-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-violet-900 mb-1">
                          {t("cards.differentiation_label")}
                        </p>
                        <p className="text-sm text-violet-800">{suggestion.differentiation}</p>
                      </div>
                    )}
                    {suggestion.addedValue && (
                      <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-xs font-semibold text-amber-900 mb-1">
                          {t("cards.added_value_label")}
                        </p>
                        <p className="text-sm text-amber-800">{suggestion.addedValue}</p>
                      </div>
                    )}
                    {suggestion.marketingStrategy && (
                      <div className="bg-rose-50 rounded-lg p-2 md:col-span-2">
                        <p className="text-xs font-semibold text-rose-900 mb-1">
                          {t("cards.marketing_strategy_label")}
                        </p>
                        <p className="text-sm text-rose-800">{suggestion.marketingStrategy}</p>
                      </div>
                    )}
                  </div>

                  {suggestion.reasoning && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        {t("cards.reasoning_label")}
                      </p>
                      <p className="text-sm text-blue-800">{suggestion.reasoning}</p>
                    </div>
                  )}
                  {suggestion.expectedImpact && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        {t("cards.expected_impact_label")}
                      </p>
                      <p className="text-sm text-green-800">{suggestion.expectedImpact}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center">
          {errorMessage ? (
            <>
              <p className="text-yellow-600 mb-4 font-semibold">
                {t("empty.needs_business_type_title")}
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {errorMessage}
              </p>
              <button
                onClick={loadSuggestions}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all border ${
                  isLoading
                    ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                    : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
                }`}
              >
                {t("buttons.refresh")}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-4">
                {t("empty.no_suggestions_title")}
              </p>
              <button
                onClick={loadSuggestions}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all border ${
                  isLoading
                    ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                    : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
                }`}
              >
                {t("buttons.create_new")}
              </button>
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default OfferSuggestions;

