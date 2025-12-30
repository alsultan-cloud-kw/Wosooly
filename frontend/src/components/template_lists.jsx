import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import api from "../../api_config";

const TemplatesList = forwardRef(({ selectedTemplates, onSelect, refreshTrigger }, ref) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/templates');
      setTemplates(res.data); 
      // backend should return: [{id, template_name, body, category, language, variables, ...}]
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refetch function via ref
  useImperativeHandle(ref, () => ({
    refetch: fetchTemplates
  }));

  useEffect(() => {
    fetchTemplates();
  }, [refreshTrigger]); // Refetch when refreshTrigger changes

  const toggleTemplate = (tpl) => {
    const exists = selectedTemplates.find(
      (t) => t.template_name === tpl.template_name
    );
    if (exists) {
      onSelect(
        selectedTemplates.filter((t) => t.template_name !== tpl.template_name)
      );
    } else {
      onSelect([...selectedTemplates, tpl]); // keep full object for UI
    }
  };

  return (
    <div className="space-y-3">
      {templates.map((tpl) => {
        const isSelected = selectedTemplates.some(
          (t) => t.template_name === tpl.template_name
        );
        return (
          <div
            key={tpl.template_name}
            className={`p-3 border rounded cursor-pointer ${
              isSelected ? "bg-blue-100 border-blue-500" : "hover:bg-gray-50"
            }`}
            onClick={() => toggleTemplate(tpl)}
          >
            <h3 className="font-semibold">{tpl.template_name}</h3>
            <p className="text-xs text-gray-500">
              {tpl.category} • {tpl.language}
            </p>
            <p className="text-sm text-gray-700 truncate">{tpl.body}</p>
          </div>
        );
      })}
      {isLoading && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Loading templates...
        </div>
      )}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No templates available
        </div>
      )}
    </div>
  );
});

TemplatesList.displayName = "TemplatesList";

export default TemplatesList;
