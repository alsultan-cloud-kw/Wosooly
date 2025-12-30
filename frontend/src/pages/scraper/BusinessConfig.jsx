import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../../api_config";

const BusinessConfig = () => {
  const [activeConfig, setActiveConfig] = useState(null);
  const [allConfigs, setAllConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [customKeywords, setCustomKeywords] = useState("");
  const [customPriceKeywords, setCustomPriceKeywords] = useState("");
  const [customOfferKeywords, setCustomOfferKeywords] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const predefinedTypes = [
    "Gold",
    "Jewelleries",
    "Watches",
    "Clothes",
    "Shoes",
    "Real Estate",
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const [activeResult, allResult] = await Promise.all([
        api.get("/competitor-analysis/business-config/active"),
        api.get("/competitor-analysis/business-config"),
      ]);

      if (activeResult.data.success) {
        setActiveConfig(activeResult.data.data);
      } else {
        setActiveConfig(null);
      }
      
      if (allResult.data.success) {
        setAllConfigs(allResult.data.data);
        
        if (allResult.data.data.length === 0) {
          toast.error("لا توجد أنواع أعمال متاحة. يرجى إضافة نوع عمل جديد.", { duration: 5000 });
        }
      } else {
        toast.error(`فشل تحميل الإعدادات: ${allResult.data.message}`);
      }
    } catch (error) {
      console.error("Error loading configs:", error);
      toast.error(`فشل تحميل الإعدادات: ${error.message || "خطأ غير معروف"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (businessType) => {
    if (!businessType || businessType.trim() === "") {
      toast.error("يرجى اختيار نوع عمل صحيح");
      return;
    }

    const toastId = toast.loading("جاري تفعيل نوع العمل...", { duration: 0 });
    try {
      const result = await api.post("/competitor-analysis/business-config/set-active", {
        businessType
      });
      
      if (result.data.success) {
        const updatedConfig = allConfigs.find(c => c.businessType === businessType);
        if (updatedConfig) {
          setActiveConfig({ ...updatedConfig, isActive: true });
        }
        
        await loadConfigs();
        
        toast.success(result.data.message || `تم تفعيل نوع العمل: ${businessType}`, { id: toastId, duration: 3000 });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.data.message || "فشل تفعيل نوع العمل", { id: toastId, duration: 4000 });
      }
    } catch (error) {
      console.error("Error in handleSetActive:", error);
      toast.error(`فشل تفعيل نوع العمل: ${error.message || "خطأ غير معروف"}`, { id: toastId, duration: 4000 });
    }
  };

  const handleEdit = (config) => {
    setEditingConfig({ ...config });
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    const toastId = toast.loading("جاري حفظ التغييرات...");
    try {
      const result = await api.put(`/competitor-analysis/business-config/${editingConfig.id}`, editingConfig);
      if (result.data.success) {
        await loadConfigs();
        setEditingConfig(null);
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error("فشل حفظ التغييرات", { id: toastId });
    }
  };

  const handleCreateCustom = async () => {
    if (!customBusinessType.trim() || !customKeywords.trim()) {
      toast.error("يرجى إدخال نوع العمل والكلمات المفتاحية");
      return;
    }

    const toastId = toast.loading("جاري إنشاء إعدادات مخصصة...");
    try {
      const result = await api.post("/competitor-analysis/business-config", {
        businessType: customBusinessType.trim(),
        keywords: customKeywords.trim(),
        priceKeywords: customPriceKeywords.trim() || undefined,
        offerKeywords: customOfferKeywords.trim() || undefined,
        isActive: false,
      });

      if (result.data.success) {
        await loadConfigs();
        setShowCustomForm(false);
        setCustomBusinessType("");
        setCustomKeywords("");
        setCustomPriceKeywords("");
        setCustomOfferKeywords("");
        toast.success(result.data.message, { id: toastId });
      } else {
        toast.error(result.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error("فشل إنشاء الإعدادات المخصصة", { id: toastId });
    }
  };

  const filteredConfigs = allConfigs.filter((config) =>
    config.businessType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.keywords.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">جاري تحميل الإعدادات...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">اختر نوع عملك</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع العمل الحالي
            </label>
            
            <div className="mb-2">
              <input
                type="text"
                placeholder="🔍 ابحث عن نوع النشاط..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <select
              value={activeConfig?.businessType || ""}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue && selectedValue.trim() !== "") {
                  handleSetActive(selectedValue).catch((error) => {
                    console.error("Error in handleSetActive:", error);
                    toast.error("فشل تفعيل نوع العمل");
                  });
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white cursor-pointer"
            >
              <option value="" disabled hidden>اختر نوع النشاط</option>
              {filteredConfigs.length > 0 ? (
                filteredConfigs.map((config) => (
                  <option key={config.id} value={config.businessType}>
                    {config.businessType} {activeConfig?.businessType === config.businessType ? "✓ (نشط)" : ""}
                  </option>
                ))
              ) : (
                <option value="" disabled>لا توجد نتائج للبحث</option>
              )}
            </select>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-1">
                عرض {filteredConfigs.length} من {allConfigs.length} نوع نشاط
              </p>
            )}
            {activeConfig ? (
              <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">الكلمات المفتاحية:</span> {activeConfig.keywords.split(",").slice(0, 5).join(", ")}
                  {activeConfig.keywords.split(",").length > 5 && "..."}
                </p>
              </div>
            ) : (
              <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ يرجى اختيار نوع النشاط من القائمة أعلاه لبدء استخدام التطبيق
                </p>
                {allConfigs.length === 0 && (
                  <p className="text-xs text-yellow-700 mt-2">
                    لا توجد أنواع أعمال متاحة. استخدم النموذج أدناه لإضافة نوع عمل جديد.
                  </p>
                )}
              </div>
            )}
            
          </div>

          <div className="border-t pt-4">
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              {showCustomForm ? "إخفاء النموذج" : "+ إضافة نوع عمل جديد"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">إضافة نوع عمل مخصص</h3>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {showCustomForm ? "إخفاء" : "+ إضافة مخصص"}
          </button>
        </div>

        {showCustomForm && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع العمل *
              </label>
              <input
                type="text"
                value={customBusinessType}
                onChange={(e) => setCustomBusinessType(e.target.value)}
                placeholder="مثال: Electronics, Furniture, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الكلمات المفتاحية (مفصولة بفواصل) *
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="مثال: إلكترونيات,electronics,gadgets,أجهزة"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                أدخل الكلمات المفتاحية المتعلقة بهذا النوع من الأعمال
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمات مفتاحية للأسعار (اختياري)
              </label>
              <input
                type="text"
                value={customPriceKeywords}
                onChange={(e) => setCustomPriceKeywords(e.target.value)}
                placeholder="مثال: سعر,price,تكلفة,cost"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمات مفتاحية للعروض (اختياري)
              </label>
              <input
                type="text"
                value={customOfferKeywords}
                onChange={(e) => setCustomOfferKeywords(e.target.value)}
                placeholder="مثال: خصم,discount,عرض,offer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleCreateCustom}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              إنشاء إعدادات مخصصة
            </button>
          </div>
        )}
      </div>

      {editingConfig && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            تعديل إعدادات: {editingConfig.businessType}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الكلمات المفتاحية
              </label>
              <textarea
                value={editingConfig.keywords}
                onChange={(e) =>
                  setEditingConfig({ ...editingConfig, keywords: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمات مفتاحية للأسعار
              </label>
              <textarea
                value={editingConfig.priceKeywords || ""}
                onChange={(e) =>
                  setEditingConfig({ ...editingConfig, priceKeywords: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمات مفتاحية للعروض
              </label>
              <textarea
                value={editingConfig.offerKeywords || ""}
                onChange={(e) =>
                  setEditingConfig({ ...editingConfig, offerKeywords: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                حفظ
              </button>
              <button
                onClick={() => setEditingConfig(null)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">جميع الإعدادات</h3>
        <div className="space-y-3">
          {allConfigs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {config.businessType}
                  {activeConfig?.businessType === config.businessType && (
                    <span className="ml-2 text-blue-600 text-sm">(نشط)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {config.keywords.split(",").length} كلمة مفتاحية
                </div>
              </div>
              <button
                onClick={() => handleEdit(config)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold text-sm transition-colors"
              >
                تعديل
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessConfig;

