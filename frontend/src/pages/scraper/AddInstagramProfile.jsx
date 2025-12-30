import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { addInstagramProfile } from "@/actions/gold-market-actions";

const AddInstagramProfile = ({ onProfileAdded }) => {
  const [profileUrl, setProfileUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const extractUsername = (url) => {
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

    if (!url.includes("http") && !url.includes("/")) {
      return url;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!profileUrl.trim() || !brandName.trim()) {
      setError("يرجى إدخال رابط البروفايل واسم العلامة التجارية");
      return;
    }

    const username = extractUsername(profileUrl);
    if (!username) {
      setError(
        "رابط إنستجرام غير صحيح. يرجى إدخال رابط صحيح مثل: https://www.instagram.com/username/"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const fullUrl = profileUrl.startsWith("http")
        ? profileUrl
        : `https://www.instagram.com/${username}/`;

      const result = await addInstagramProfile({
        username,
        brandName: brandName.trim(),
        profileUrl: fullUrl,
      });

      if (result.success) {
        setProfileUrl("");
        setBrandName("");
        onProfileAdded && onProfileAdded();
        toast.success("تم إضافة البروفايل بنجاح!");
      } else {
        const errorMsg = result.message || "فشل إضافة البروفايل";
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء إضافة البروفايل");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        إضافة بروفايل إنستجرام
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم العلامة التجارية
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="مثال: جوائش العرباش"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رابط بروفايل إنستجرام
          </label>
          <input
            type="text"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.instagram.com/username/ أو @username"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            يمكنك إدخال الرابط الكامل أو اسم المستخدم فقط
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
          {isSubmitting ? "جاري الإضافة..." : "إضافة البروفايل"}
        </button>
      </form>
    </div>
  );
};

export default AddInstagramProfile;
