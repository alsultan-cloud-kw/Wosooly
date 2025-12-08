// src/components/customers/CustomerSearchBar.jsx
import React from "react";

export default function CustomerSearchBar({ searchTerm, setSearchTerm, t }) {
  return (
    <div className="mb-6 max-w-xl">
      <input
        type="text"
        placeholder={t("search_by_name_or_phone")}
        className="w-full px-4 py-2 border rounded shadow-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
}
