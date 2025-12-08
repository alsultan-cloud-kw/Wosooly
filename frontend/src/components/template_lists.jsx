import React, { useEffect, useState } from "react";
import api from "../../api_config";

function TemplatesList({ selectedTemplates, onSelect }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/templates');
        setTemplates(res.data); 
        // backend should return: [{id, template_name, body, category, language, variables, ...}]
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

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
    </div>
  );
}

export default TemplatesList;
