import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../../api_config";
import AddNewsSource from "./AddNewsSource";

const NewsSourcesTab = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sources, setSources] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSources = async () => {
    setIsLoading(true);
    try {
      const params = activeCategory === "all" ? {} : { region: activeCategory };
      const result = await api.get("/competitor-analysis/news-sources", { params });
      if (result.data.success) {
        setSources(result.data.data);
      }
    } catch (error) {
      console.error("Error loading news sources:", error);
      toast.error("فشل تحميل مصادر الأخبار");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [activeCategory]);

  const handleScrapeAll = async () => {
    setIsScraping(true);
    const toastId = toast.loading("جاري جمع الأخبار من جميع المصادر...", { duration: 0 });

    try {
      const result = await api.post("/competitor-analysis/scrape-news");
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId, duration: 5000 });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error scraping news:", error);
      toast.error("فشل في جمع الأخبار", { id: toastId });
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصدر؟")) {
      return;
    }

    const toastId = toast.loading("جاري الحذف...");
    try {
      const result = await api.delete(`/competitor-analysis/news-sources/${id}`);
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
        loadSources();
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting news source:", error);
      toast.error("فشل حذف المصدر", { id: toastId });
    }
  };

  const handleToggleActive = async (id) => {
    const toastId = toast.loading("جاري التحديث...");
    try {
      const result = await api.patch(`/competitor-analysis/news-sources/${id}/toggle`);
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
        loadSources();
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error toggling news source:", error);
      toast.error("فشل تحديث حالة المصدر", { id: toastId });
    }
  };

  const handleUpdateRegion = async (id, region) => {
    const toastId = toast.loading("جاري التحديث...");
    try {
      const result = await api.patch(`/competitor-analysis/news-sources/${id}/region`, {
        region: region || null
      });
      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
        loadSources();
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error updating region:", error);
      toast.error("فشل تحديث التصنيف", { id: toastId });
    }
  };

  const filteredSources =
    activeCategory === "all"
      ? sources
      : sources.filter((s) => s.region === activeCategory);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">مصادر الأخبار</h2>
            <p className="text-sm text-gray-500 mt-1">
              إدارة مصادر الأخبار لمتابعة أخبار الذهب في الكويت والعالم
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddSource(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              ➕ إضافة مصدر جديد
            </button>
            <button
              onClick={handleScrapeAll}
              disabled={isScraping || filteredSources.length === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                isScraping || filteredSources.length === 0
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isScraping ? "🤖 جاري الجمع..." : "📰 جمع الأخبار من جميع المصادر"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeCategory === "all"
                ? "bg-yellow-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            الكل ({sources.length})
          </button>
          <button
            onClick={() => setActiveCategory("local")}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeCategory === "local"
                ? "bg-green-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            محلي ({sources.filter((s) => s.region === "local").length})
          </button>
          <button
            onClick={() => setActiveCategory("international")}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeCategory === "international"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            دولي ({sources.filter((s) => s.region === "international").length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">لا توجد مصادر أخبار</p>
          <button
            onClick={() => setShowAddSource(true)}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold"
          >
            إضافة مصدر جديد
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                source.isActive ? "border-green-500" : "border-gray-300"
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{source.sourceName}</h3>
                    {source.isActive ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                        نشط
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                        غير نشط
                      </span>
                    )}
                    {source.region && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          source.region === "local"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {source.region === "local" ? "محلي" : "دولي"}
                      </span>
                    )}
                    {source.autoCategorize && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                        AI تصنيف
                      </span>
                    )}
                  </div>
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm mb-2 block"
                  >
                    {source.sourceUrl}
                  </a>
                  {source.description && (
                    <p className="text-gray-600 text-sm mb-2">{source.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!source.region && (
                    <select
                      value={source.region || ""}
                      onChange={(e) =>
                        handleUpdateRegion(
                          source.id,
                          e.target.value === "" ? null : e.target.value
                        )
                      }
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">دع AI يقرر</option>
                      <option value="local">محلي</option>
                      <option value="international">دولي</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleToggleActive(source.id)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      source.isActive
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {source.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddSource && (
        <AddNewsSource
          onSuccess={() => {
            setShowAddSource(false);
            loadSources();
          }}
          onCancel={() => setShowAddSource(false)}
        />
      )}
    </div>
  );
};

export default NewsSourcesTab;

