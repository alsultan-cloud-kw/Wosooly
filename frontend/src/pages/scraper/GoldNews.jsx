import React, { useState } from "react";

const GoldNews = ({
  news = [],
  summary = null,
  onRefresh,
  isRefreshing = false,
}) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [newsFilter, setNewsFilter] = useState("all");

  const filteredNews =
    newsFilter === "all"
      ? news
      : news.filter((n) => n.region === newsFilter);

  const localNews = news.filter((n) => n.region === "local");
  const internationalNews = news.filter((n) => n.region === "international");
  const politicalNews = news.filter((n) => n.category === "political-impact");
  const economicNews = news.filter((n) => n.category === "economic-impact");
  const todayNews = news.filter((n) => {
    const newsDate = new Date(n.publishedAt);
    const today = new Date();
    return newsDate.toDateString() === today.toDateString();
  });

  const getRegionBadge = (region) => {
    return region === "local" ? (
      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
        محلي
      </span>
    ) : (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
        دولي
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === "summary"
                ? "bg-yellow-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📊 الملخص اليومي
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === "news"
                ? "bg-yellow-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📰 الأخبار ({news.length})
          </button>
        </div>
      </div>

      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">أخبار محلية</p>
                  <p className="text-3xl font-bold mt-2">{localNews.length}</p>
                </div>
                <div className="text-4xl opacity-80">🇰🇼</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">أخبار دولية</p>
                  <p className="text-3xl font-bold mt-2">{internationalNews.length}</p>
                </div>
                <div className="text-4xl opacity-80">🌍</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">أحداث سياسية</p>
                  <p className="text-3xl font-bold mt-2">{politicalNews.length}</p>
                </div>
                <div className="text-4xl opacity-80">🏛️</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">أخبار اليوم</p>
                  <p className="text-3xl font-bold mt-2">{todayNews.length}</p>
                </div>
                <div className="text-4xl opacity-80">📅</div>
              </div>
            </div>
          </div>

          {localNews.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow-md p-6 border-r-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                📊 إحصائيات السوق المحلي الكويتي
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي الأخبار المحلية</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{localNews.length}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">أخبار اقتصادية</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{economicNews.filter(n => n.region === "local").length}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">أحداث سياسية محلية</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{politicalNews.filter(n => n.region === "local").length}</p>
                </div>
              </div>
            </div>
          )}

          {summary ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">الملخص اليومي</h3>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        isRefreshing
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      {isRefreshing ? "جاري التحديث..." : "🔄 تحديث"}
                    </button>
                  )}
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {summary.summary}
                  </p>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  تاريخ: {new Date(summary.date).toLocaleDateString("ar-KW")} | عدد الأخبار: {summary.newsCount}
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg shadow-md p-6 border-r-4 border-yellow-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  💼 رأي الخبراء
                </h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {summary.expertOpinion}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-r-4 border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🔮 التوقعات
                </h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {summary.expectations}
                  </p>
                </div>
              </div>

              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">النقاط الرئيسية</h3>
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-yellow-600 font-bold mt-1">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 mb-4">لا يوجد ملخص يومي متاح</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
                    isRefreshing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-yellow-600 hover:bg-yellow-700 text-white"
                  }`}
                >
                  {isRefreshing ? "جاري التحديث..." : "🔄 إنشاء ملخص جديد"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewsFilter("all")}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  newsFilter === "all"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                الكل ({news.length})
              </button>
              <button
                onClick={() => setNewsFilter("local")}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  newsFilter === "local"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                محلي ({news.filter((n) => n.region === "local").length})
              </button>
              <button
                onClick={() => setNewsFilter("international")}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  newsFilter === "international"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                دولي ({news.filter((n) => n.region === "international").length})
              </button>
            </div>
          </div>

          {filteredNews.length > 0 ? (
            <div className="space-y-4">
              {filteredNews.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getRegionBadge(article.region)}
                        <span className="text-sm text-gray-500">
                          {new Date(article.publishedAt).toLocaleDateString("ar-KW")}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>المصدر: {article.source}</span>
                      </div>
                    </div>
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-yellow-600 hover:text-yellow-700 font-semibold whitespace-nowrap"
                    >
                      قراءة المزيد →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">لا توجد أخبار متاحة</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoldNews;

