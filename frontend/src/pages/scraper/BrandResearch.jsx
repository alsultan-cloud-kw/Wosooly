import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";
import ResearchResultModal from "./ResearchResultModal";

const BrandResearch = () => {
  const { t } = useTranslation("scraperBrandResearch");
  const [brandName, setBrandName] = useState("");
  const [context, setContext] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);

  const handleResearch = async (e) => {
    e.preventDefault();
    setError("");

    if (!brandName.trim()) {
      setError(t("form.error_required_brand"));
      return;
    }

    setIsResearching(true);
    const toastId = toast.loading(t("toasts.research_loading"), {
      duration: 0,
    });

    try {
      const result = await api.post("/competitor-analysis/deep-research", {
        brandName: brandName.trim(),
        context: context.trim() || undefined,
      });

      if (result.data.success) {
        await loadResults();
        setBrandName("");
        setContext("");
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
        setError(result.data.message);
      }
    } catch (err) {
      const errorMessage = t("toasts.research_generic_error");
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsResearching(false);
    }
  };

  const loadResults = async () => {
    try {
      const result = await api.get("/competitor-analysis/deep-research");
      if (result.data.success) {
        // Normalize backend snake_case to frontend camelCase
        const normalized = result.data.data.map((item) => ({
          id: item.id,
          brandName: item.brand_name,
          researchQuery: item.research_query,
          researchResult: item.research_result,
          extractedInfo: item.extracted_info || null,
          citations: item.citations || [],
          searchQueries: item.search_queries || [],
          interactionId: item.interaction_id,
          status: item.status,
          createdAt: item.created_at,
        }));
        setResults(normalized);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {t("form.title")}
        </h3>
        <form onSubmit={handleResearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("form.brand_label")}
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t("form.brand_placeholder")}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("form.context_label")}
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t("form.context_placeholder")}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isResearching}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-all border ${
              isResearching
                ? "bg-gray-200 cursor-not-allowed text-gray-500 border-gray-300"
                : "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border-blue-300 shadow-sm hover:shadow-md"
            }`}
            >
            {isResearching ? t("form.submit_loading") : t("form.submit")}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {t("results.title", { count: results.length })}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={loadResults}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
              >
                {t("results.refresh")}
              </button>
              <button
                onClick={async () => {
                  if (confirm(t("toasts.delete_all_confirm"))) {
                    const toastId = toast.loading(t("toasts.delete_all_loading"), {
                      duration: 0,
                    });
                    try {
                      const result = await api.delete("/competitor-analysis/deep-research");
                      if (result.data.success) {
                        setResults([]);
                        toast.success(result.data.message, { id: toastId });
                      } else {
                        toast.error(result.data.message, { id: toastId });
                      }
                    } catch (error) {
                      toast.error(t("toasts.delete_all_failed"), { id: toastId });
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-slate-100 to-gray-200 hover:from-slate-200 hover:to-gray-300 text-slate-800 border border-slate-300 shadow-sm hover:shadow-md"
              >
                {t("results.delete_all")}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {results.slice(0, 5).map((result) => (
              <div
                key={result.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{result.brandName}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(result.createdAt || "").toLocaleDateString("ar-KW")}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      result.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {result.status === "completed"
                      ? t("results.status_completed")
                      : result.status}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap">
                    {result.researchResult || result.research_result}
                  </p>
                </div>
                {result.researchQuery && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 italic">
                      {t("results.query_label") || "السياق:"} {result.researchQuery}
                    </p>
                  </div>
                )}
                {result.extractedInfo && 
                 typeof result.extractedInfo === "object" && 
                 result.extractedInfo !== null &&
                 Object.keys(result.extractedInfo).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-3 text-xs">
                      {result.extractedInfo.offers && result.extractedInfo.offers.length > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {result.extractedInfo.offers.length} {t("results.offers_found") || "عروض"}
                        </span>
                      )}
                      {result.extractedInfo.prices && result.extractedInfo.prices.length > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          {result.extractedInfo.prices.length} {t("results.prices_found") || "أسعار"}
                        </span>
                      )}
                      {result.extractedInfo.socialMedia && result.extractedInfo.socialMedia.length > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {result.extractedInfo.socialMedia.length} {t("results.social_media") || "وسائل تواصل"}
                        </span>
                      )}
                      {result.extractedInfo.website && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          {t("results.website_found") || "موقع إلكتروني"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setSelectedResult(result)}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
                >
                  {t("results.view_full")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedResult && (
        <ResearchResultModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
      </div>
    </div>
  );
};

export default BrandResearch;

