import React from "react";

const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-2 mb-6">
      <nav className="flex space-x-2 space-x-reverse overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-3 px-6 rounded-lg font-medium text-sm whitespace-nowrap transition-all
              ${
                activeTab === tab.id
                  ? "text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }
            `}
            style={
              activeTab === tab.id
                ? { 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#ffffff"
                  }
                : {}
            }
          >
            {tab.icon && <span className={`ml-2 ${activeTab === tab.id ? "text-white" : ""}`}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;

