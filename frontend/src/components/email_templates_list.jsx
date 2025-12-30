import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api_config";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

function EmailTemplatesList({ selectedTemplates, onSelect, onCreateNew, onEdit, onDelete, refreshTrigger }) {
  const { t } = useTranslation("emailing");
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [refreshTrigger]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/email-templates');
      console.log("Fetched templates:", res.data); // Debug: Check if templates have IDs
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to fetch email templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTemplate = (tpl) => {
    const exists = selectedTemplates.find(
      (t) => t.template_name === tpl.template_name
    );
    if (exists) {
      onSelect(
        selectedTemplates.filter((t) => t.template_name !== tpl.template_name)
      );
    } else {
      onSelect([...selectedTemplates, tpl]);
    }
  };

  const handleDelete = async (templateId, templateName) => {
    if (!templateId) {
      console.error("Template ID is missing");
      alert(t("templatesList.deleteError"));
      return;
    }
    
    if (window.confirm(t("templatesList.deleteConfirm", { name: templateName }))) {
      try {
        await api.delete(`/email-templates/${templateId}`);
        // Remove from selected if it was selected
        onSelect(selectedTemplates.filter((t) => t.template_name !== templateName));
        fetchTemplates();
      } catch (err) {
        console.error("Failed to delete template:", err);
        alert(err.response?.data?.detail || t("templatesList.deleteFailed"));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("emailTemplates")}</h3>
        <Button
          onClick={onCreateNew}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("templatesList.newTemplate")}
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p>{t("templatesList.noTemplates")}</p>
          <Button
            onClick={onCreateNew}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            {t("templatesList.createFirst")}
          </Button>
        </div>
      ) : (
        templates.map((tpl) => {
          const isSelected = selectedTemplates.some(
            (t) => t.template_name === tpl.template_name
          );
          return (
            <div
              key={tpl.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }`}
              onClick={() => toggleTemplate(tpl)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                      {tpl.template_name}
                    </h3>
                    {!tpl.is_active && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {t("inactive")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("subject")}: {tpl.subject}
                  </p>
                  {tpl.category && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full mr-2">
                      {tpl.category}
                    </span>
                  )}
                  {tpl.language && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                      {tpl.language}
                    </span>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {tpl.body?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </p>
                </div>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => onEdit(tpl)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(tpl.id, tpl.template_name)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default EmailTemplatesList;

