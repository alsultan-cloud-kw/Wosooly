import React from "react";
import { useTranslation } from "react-i18next";

const OffersList = ({ offers }) => {
  const { t } = useTranslation("scraperOffersList");
  const getSourceIcon = (source) => {
    switch (source) {
      case "facebook":
        return "📘";
      case "instagram":
        return "📷";
      case "twitter":
        return "🐦";
      case "tiktok":
        return "🎵";
      case "snapchat":
        return "👻";
      case "website":
        return "🌐";
      case "news":
        return "📰";
      default:
        return "📢";
    }
  };

  const extractAccountTag = (offer) => {
    const tagMatch = offer.title.match(/\[@(\w+)\]/) || offer.description?.match(/\[@(\w+)\]/);
    return tagMatch ? tagMatch[1] : null;
  };

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">{t("empty.no_offers")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => {
        const accountTag = extractAccountTag(offer);
        const displayTitle = offer.title.replace(/\[@\w+\]\s*/, '');
        
        return (
          <div
            key={offer.id}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-2xl">{getSourceIcon(offer.source)}</span>
                  <h3 className="text-xl font-bold text-gray-800">{offer.brand}</h3>
                  {accountTag && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold border border-purple-300">
                      @{accountTag}
                    </span>
                  )}
                  {offer.discountPercentage && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      -{offer.discountPercentage}%
                    </span>
                  )}
                </div>
                <h4 
                  className="text-lg font-semibold text-gray-700 mb-2"
                  dangerouslySetInnerHTML={{ __html: displayTitle }}
                />
              {offer.description && (
                <p 
                  className="text-gray-600 mb-3"
                  dangerouslySetInnerHTML={{ __html: offer.description }}
                />
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  {t("fields.source", { source: offer.source })}
                </span>
                {offer.validUntil && (
                  <span>
                    {t("fields.valid_until", {
                      date: new Date(offer.validUntil).toLocaleDateString(),
                    })}
                  </span>
                )}
              </div>
            </div>
            <a
              href={offer.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 text-blue-600 hover:text-blue-800 font-semibold"
            >
              {t("actions.view")}
            </a>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default OffersList;

