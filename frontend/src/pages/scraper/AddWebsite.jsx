import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";

const AddWebsite = ({ category, onClose }) => {
  const { t } = useTranslation("scraperAddWebsite");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!websiteUrl.trim() || !brandName.trim()) {
      toast.error(t("toasts.missing_fields"));
      return;
    }

    try {
      new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    } catch {
      toast.error(t("toasts.invalid_url"));
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(t("toasts.submitting"), { duration: 0 });

    try {
      const finalUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      const result = await api.post("/competitor-analysis/website-accounts", {
        website_url: finalUrl,
        brand_name: brandName.trim(),
        category,
        description: description.trim() || undefined,
        is_active: true,
      });

      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
        setWebsiteUrl("");
        setBrandName("");
        setDescription("");
        onClose && onClose();
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error adding website:", error);
      toast.error(t("toasts.submit_failed"), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {t("modal.title", {
              category:
                category === "local"
                  ? t("modal.category_local")
                  : t("modal.category_international"),
            })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("form.website_label")}
            </label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder={t("form.website_placeholder")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("form.brand_label")}
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t("form.brand_placeholder")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("form.description_label")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.description_placeholder")}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? t("buttons.submit_loading") : t("buttons.submit")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              {t("buttons.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWebsite;

