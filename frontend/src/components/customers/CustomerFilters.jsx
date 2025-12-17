// src/components/customers/CustomerFilters.jsx
import React from "react";

// Kuwait Governorates
const KUWAIT_GOVERNORATES = [
  { value: "", label: "All Governorates" },
  { value: "Capital", label: "Capital" },
  { value: "Hawalli", label: "Hawalli" },
  { value: "Farwaniya", label: "Farwaniya" },
  { value: "Ahmadi", label: "Ahmadi" },
  { value: "Jahra", label: "Jahra" },
  { value: "Mubarak Al-Kabeer", label: "Mubarak Al-Kabeer" },
  { value: "__uncategorized__", label: "Uncategorized (No Governorate)" },
];

export default function CustomerFilters({
  orderFilter,
  spendingFilter,
  governorateFilter,
  setOrderFilter,
  setSpendingFilter,
  setGovernorateFilter,
  clearFilters,
  t,
}) {
  return (
    <div className="mb-6 max-w-4xl">
      <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 shadow-md rounded-2xl px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-800">
            {t("filter_customers")}
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm bg-white px-3 py-1 rounded shadow-sm border hover:bg-gray-50"
          >
            {t("clear_filters")}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Governorate Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("governorate") || "Governorate"}
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg shadow-sm bg-white"
              value={governorateFilter || ""}
              onChange={(e) => {
                const value = e.target.value;
                setGovernorateFilter(value === "" ? null : value);
              }}
            >
              {KUWAIT_GOVERNORATES.map((gov) => (
                <option key={gov.value} value={gov.value}>
                  {gov.label}
                </option>
              ))}
            </select>
          </div>
          {/* Orders Min */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("orders")} ≥
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded-lg shadow-sm"
              value={orderFilter.min ?? ""}
              placeholder={t("any")}
              onChange={(e) =>
                setOrderFilter((prev) => ({
                  ...prev,
                  min: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>

          {/* Orders Max */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("orders")} ≤
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded-lg shadow-sm"
              value={orderFilter.max ?? ""}
              placeholder={t("any")}
              onChange={(e) =>
                setOrderFilter((prev) => ({
                  ...prev,
                  max: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>

          {/* Spending Min */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("spent")} ≥
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg shadow-sm"
              value={spendingFilter.min ?? ""}
              placeholder={t("any")}
              onChange={(e) =>
                setSpendingFilter((prev) => ({
                  ...prev,
                  min: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>

          {/* Spending Max */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("spent")} ≤
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg shadow-sm"
              value={spendingFilter.max ?? ""}
              placeholder={t("any")}
              onChange={(e) =>
                setSpendingFilter((prev) => ({
                  ...prev,
                  max: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
