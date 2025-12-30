import React from "react";
import { useTranslation } from "react-i18next";

const ResearchResultModal = ({ result, onClose }) => {
  const { t } = useTranslation("scraperResearchResultModal");
  
  if (!result) return null;

  const extractedInfo = result.extractedInfo
    ? typeof result.extractedInfo === "string"
      ? JSON.parse(result.extractedInfo)
      : result.extractedInfo
    : null;

  const citations = result.citations || [];
  const searchQueries = result.searchQueries || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{result.brandName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(result.createdAt || "").toLocaleDateString("ar-KW", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {searchQueries.length > 0 && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-bold text-gray-800 mb-2 text-sm">{t("search_queries.title")}</h4>
              <div className="flex flex-wrap gap-2">
                {searchQueries.map((query, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                  >
                    {query}
                  </span>
                ))}
              </div>
            </div>
          )}

          {citations.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-bold text-gray-800 mb-2 text-sm">{t("citations.title")}</h4>
              <div className="space-y-2">
                {citations.map((citation, index) => (
                  <a
                    key={index}
                    href={citation.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-white rounded hover:bg-green-100 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <span className="font-semibold">[{index + 1}]</span> {citation.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {extractedInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-3">{t("extracted_info.title")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {extractedInfo.offers && extractedInfo.offers.length > 0 && (
                  <div>
                    <span className="font-semibold">{t("extracted_info.offers")}</span> {extractedInfo.offers.length}
                  </div>
                )}
                {extractedInfo.prices && extractedInfo.prices.length > 0 && (
                  <div>
                    <span className="font-semibold">{t("extracted_info.prices")}</span> {extractedInfo.prices.length}
                  </div>
                )}
                {extractedInfo.socialMedia && extractedInfo.socialMedia.length > 0 && (
                  <div>
                    <span className="font-semibold">{t("extracted_info.social_media")}</span>{" "}
                    {extractedInfo.socialMedia.length}
                  </div>
                )}
                {extractedInfo.website && (
                  <div>
                    <span className="font-semibold">{t("extracted_info.website")}</span> {t("extracted_info.available")}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-gray-800 mb-3">{t("full_result.title")}</h3>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {result.researchResult}
              </div>
            </div>
          </div>

          {extractedInfo && (
            <div className="mt-6 space-y-4">
              {extractedInfo.offers && extractedInfo.offers.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">{t("discovered.offers")}</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {extractedInfo.offers.map((offer, index) => (
                      <li key={index}>{offer}</li>
                    ))}
                  </ul>
                </div>
              )}

              {extractedInfo.prices && extractedInfo.prices.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">{t("discovered.prices")}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {extractedInfo.prices.map((price, index) => (
                      <div
                        key={index}
                        className="p-2 bg-yellow-50 rounded border border-yellow-200"
                      >
                        <span className="font-semibold">{price.karat}K:</span> {price.price}{" "}
                        {t("currency")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedInfo.socialMedia && extractedInfo.socialMedia.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">{t("discovered.social_media")}</h4>
                  <div className="space-y-2">
                    {extractedInfo.socialMedia.map((social, index) => (
                      <a
                        key={index}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-gray-50 rounded hover:bg-gray-100 text-blue-600"
                      >
                        {social.platform}: {social.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {extractedInfo.website && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">{t("discovered.website")}</h4>
                  <a
                    href={extractedInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {extractedInfo.website}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchResultModal;

