import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { addSocialMediaAccount } from "@/actions/gold-market-actions";

const AddSocialMediaAccount = ({ onAccountAdded }) => {
  const { t } = useTranslation("scraperAddSocialMediaAccount");
  const [username, setUsername] = useState("");
  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const extractUsername = (url, platform) => {
    if (platform === "instagram") {
      const patterns = [
        /instagram\.com\/([^/?]+)/,
        /instagram\.com\/p\/([^/?]+)/,
        /@([a-zA-Z0-9._]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1].replace("@", "");
        }
      }
    } else if (platform === "tiktok") {
      const patterns = [
        /tiktok\.com\/@([^/?]+)/,
        /@([a-zA-Z0-9._]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1].replace("@", "");
        }
      }
    } else if (platform === "snapchat") {
      const patterns = [
        /snapchat\.com\/add\/([^/?]+)/,
        /snapchat\.com\/@([^/?]+)/,
        /@([a-zA-Z0-9._]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1].replace("@", "");
        }
      }
    }

    if (!url.includes("http") && !url.includes("/")) {
      return url;
    }

    return null;
  };

  const getProfileUrl = (username, platform) => {
    const cleanUsername = username.replace("@", "").trim();
    switch (platform) {
      case "instagram":
        return `https://www.instagram.com/${cleanUsername}/`;
      case "tiktok":
        return `https://www.tiktok.com/@${cleanUsername}`;
      case "snapchat":
        return `https://www.snapchat.com/add/${cleanUsername}`;
      default:
        return "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !brandName.trim()) {
      setError(t("errors.missing_fields"));
      return;
    }

    const extractedUsername = extractUsername(username, platform);
    const finalUsername = extractedUsername || username.replace("@", "").trim();

    if (!finalUsername) {
      setError(t("errors.invalid_username"));
      return;
    }

    setIsSubmitting(true);
    try {
      const profileUrl = getProfileUrl(finalUsername, platform);

      const result = await addSocialMediaAccount({
        username: finalUsername,
        brandName: brandName.trim(),
        platform,
        profileUrl,
      });

      if (result.success) {
        setUsername("");
        setBrandName("");
        setPlatform("instagram");
        onAccountAdded && onAccountAdded();
        const toastKey = platform === "instagram" 
          ? "toasts.success_instagram" 
          : platform === "tiktok" 
          ? "toasts.success_tiktok" 
          : "toasts.success_snapchat";
        toast.success(result.message || t(toastKey));
      } else {
        const errorMsg = result.message || t("toasts.failed");
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || err.message || t("toasts.error");
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsernamePlaceholder = () => {
    if (platform === "instagram") {
      return t("form.username_placeholder_instagram");
    } else if (platform === "tiktok") {
      return t("form.username_placeholder_tiktok");
    } else {
      return t("form.username_placeholder_snapchat");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">{t("title")}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.platform_label")}
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="instagram">{t("platforms.instagram")}</option>
            <option value="tiktok">{t("platforms.tiktok")}</option>
            <option value="snapchat">{t("platforms.snapchat")}</option>
          </select>
        </div>
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
            {t("form.username_label")}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={getUsernamePlaceholder()}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("form.username_hint")}
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-semibold ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isSubmitting ? t("buttons.submit_loading") : t("buttons.submit")}
        </button>
      </form>
    </div>
  );
};

export default AddSocialMediaAccount;

