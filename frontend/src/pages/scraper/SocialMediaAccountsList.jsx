import React from "react";
import { useTranslation } from "react-i18next";

const SocialMediaAccountsList = ({
  accounts,
  onToggleActive,
  onDelete,
}) => {
  const { t } = useTranslation("scraperSocialMediaAccountsList");

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "instagram":
        return "📷";
      case "tiktok":
        return "🎵";
      case "snapchat":
        return "👻";
      default:
        return "📱";
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case "instagram":
        return t("platforms.instagram");
      case "tiktok":
        return t("platforms.tiktok");
      case "snapchat":
        return t("platforms.snapchat");
      default:
        return platform;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case "instagram":
        return "purple";
      case "tiktok":
        return "pink";
      case "snapchat":
        return "yellow";
      default:
        return "gray";
    }
  };

  const accountsByPlatform = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {});

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">{t("empty.title")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => (
        <div key={platform} className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>{getPlatformIcon(platform)}</span>
            <span>{t("sections.accounts_title", { platform: getPlatformName(platform) })}</span>
            <span className="text-sm font-normal text-gray-500">
              ({t("sections.count", { count: platformAccounts.length })})
            </span>
          </h3>
          <div className="space-y-3">
            {platformAccounts.map((account) => {
              const platformColor = getPlatformColor(account.platform);
              const activeBgClass = account.isActive
                ? platformColor === "purple"
                  ? "border-purple-200 bg-purple-50"
                  : platformColor === "pink"
                  ? "border-pink-200 bg-pink-50"
                  : platformColor === "yellow"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200 bg-gray-50"
                : "border-gray-200 bg-gray-50";

              return (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${activeBgClass}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPlatformIcon(account.platform)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{account.brandName}</h4>
                        <p className="text-sm text-gray-600">@{account.username}</p>
                      </div>
                      {account.isActive ? (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {t("status.active")}
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {t("status.inactive")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {t("buttons.view")}
                    </a>
                    <button
                      onClick={() => account.id && onToggleActive(account.id)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        account.isActive
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {account.isActive ? t("buttons.deactivate") : t("buttons.activate")}
                    </button>
                    <button
                      onClick={() => account.id && onDelete(account.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium"
                    >
                      {t("buttons.delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialMediaAccountsList;

