import React, { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../api_config";

const AddNewsSource = ({ onSuccess, onCancel }) => {
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [region, setRegion] = useState(null);
  const [description, setDescription] = useState("");
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sourceName.trim() || !sourceUrl.trim()) {
      toast.error("يرجى إدخال اسم المصدر والرابط");
      return;
    }

    try {
      new URL(sourceUrl);
    } catch {
      toast.error("يرجى إدخال رابط صحيح");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("جاري إضافة مصدر الأخبار...");

    try {
      const result = await api.post("/competitor-analysis/news-sources", {
        sourceName: sourceName.trim(),
        sourceUrl: sourceUrl.trim(),
        region: region || null,
        description: description.trim() || undefined,
        autoCategorize,
        isActive: true,
      });

      if (result.data.success) {
        toast.success(result.data.message, { id: toastId });
        onSuccess && onSuccess();
        setSourceName("");
        setSourceUrl("");
        setRegion(null);
        setDescription("");
        setAutoCategorize(true);
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      console.error("Error adding news source:", error);
      toast.error("فشل إضافة مصدر الأخبار", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">إضافة مصدر أخبار جديد</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المصدر <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="مثال: الأنباء الكويتية"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط الموقع <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التصنيف (اختياري)
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="region"
                    value=""
                    checked={region === null}
                    onChange={() => setRegion(null)}
                    className="mr-2"
                  />
                  <span>دع AI يقرر</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="region"
                    value="local"
                    checked={region === "local"}
                    onChange={() => setRegion("local")}
                    className="mr-2"
                  />
                  <span>محلي</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="region"
                    value="international"
                    checked={region === "international"}
                    onChange={() => setRegion("international")}
                    className="mr-2"
                  />
                  <span>دولي</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                إذا تركتها فارغة، سيستخدم AI لتصنيف الأخبار تلقائياً
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoCategorize}
                  onChange={(e) => setAutoCategorize(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  السماح للذكاء الاصطناعي بتصنيف الأخبار تلقائياً
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف (اختياري)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر عن المصدر..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {isSubmitting ? "جاري الإضافة..." : "إضافة"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNewsSource;

