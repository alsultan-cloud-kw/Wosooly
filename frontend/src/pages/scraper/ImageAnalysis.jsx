import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../../../api_config";

const ImageAnalysis = () => {
  const { t } = useTranslation("scraperImageAnalysis");
  const [analyzedImages, setAnalyzedImages] = useState([]);

  const loadAnalyzedImages = async () => {
    try {
      const result = await api.get("/competitor-analysis/analyzed-images");
      if (result.data.success) {
        // Normalize backend snake_case to frontend camelCase
        const normalized = result.data.data.map((img) => ({
          id: img.id,
          brandName: img.brand_name || img.brandName,
          imageUrl: img.image_url || img.imageUrl,
          source: img.source,
          sourceUrl: img.source_url || img.sourceUrl,
          analysisResult: img.analysis_result || img.analysisResult,
          extractedInfo: img.extracted_info || img.extractedInfo || null,
          isPromotional: img.is_promotional !== undefined ? img.is_promotional : (img.isPromotional !== undefined ? img.isPromotional : false),
          createdAt: img.created_at || img.createdAt,
        }));
        
        // Debug: Log to see what we're getting
        console.log("[ImageAnalysis] Loaded images:", normalized.length);
        if (normalized.length > 0) {
          console.log("[ImageAnalysis] First image:", {
            id: normalized[0].id,
            brandName: normalized[0].brandName,
            imageUrl: normalized[0].imageUrl,
            hasImageUrl: !!normalized[0].imageUrl,
          });
        }
        
        setAnalyzedImages(normalized);
      } else {
        console.warn("[ImageAnalysis] API returned success=false:", result.data);
      }
    } catch (error) {
      console.error("Error loading analyzed images:", error);
    }
  };

  useEffect(() => {
    loadAnalyzedImages();
  }, []);

  return (
    <div className="space-y-6">
      {analyzedImages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            {t("empty.no_images") || "لا توجد صور محللة حالياً. قم بجمع الصور من Snapchat أو TikTok لرؤيتها هنا."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {t("header.title", { count: analyzedImages.length })}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={loadAnalyzedImages}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                {t("buttons.refresh")}
              </button>
              <button
                onClick={async () => {
                  if (confirm(t("toasts.clear_confirm"))) {
                    const toastId = toast.loading(t("toasts.clear_loading"), {
                      duration: 0,
                    });
                    try {
                      const result = await api.delete(
                        "/competitor-analysis/analyzed-images"
                      );
                      if (result.data.success) {
                        setAnalyzedImages([]);
                        toast.success(result.data.message, { id: toastId });
                      } else {
                        toast.error(result.data.message, { id: toastId });
                      }
                    } catch (error) {
                      toast.error(t("toasts.clear_failed"), { id: toastId });
                    }
                  }
                }}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
              >
                {t("buttons.delete_all")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyzedImages.slice(0, 9).map((image) => {
              // Handle both camelCase and snake_case for backward compatibility
              const imageUrl = image.imageUrl || image.image_url;
              const brandName = image.brandName || image.brand_name;
              const analysisResult = image.analysisResult || image.analysis_result;
              const sourceUrl = image.sourceUrl || image.source_url;
              const isPromotional = image.isPromotional !== undefined ? image.isPromotional : image.is_promotional;
              
              return (
                <div
                  key={image.id}
                  className={`border rounded-lg overflow-hidden ${
                    isPromotional ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={brandName || "Analyzed image"}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        console.error("Image failed to load:", imageUrl);
                        e.target.style.display = "none";
                        // Show placeholder div instead
                        const placeholder = document.createElement("div");
                        placeholder.className = "w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400";
                        placeholder.textContent = "Image not available";
                        e.target.parentNode.appendChild(placeholder);
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                      {t("cards.no_image") || "No image URL"}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {brandName || "Unknown Brand"}
                      </span>
                      {isPromotional && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                          {t("cards.promotional_badge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {analysisResult || t("cards.no_analysis") || "No analysis available"}
                    </p>
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {t("cards.view_source")}
                      </a>
                    )}
                    {image.source && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("cards.source") || "Source:"} {image.source}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;

