import React from "react";

const GoldPriceCard = ({
  karat,
  price,
  currency,
  source,
  change,
}) => {
  const changeColor = change
    ? change > 0
      ? "text-green-600"
      : change < 0
      ? "text-red-600"
      : "text-gray-600"
    : "text-gray-600";

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">ذهب {karat}K</h3>
          <p className="text-sm text-gray-500 mt-1">المصدر: {source}</p>
        </div>
        {change !== undefined && (
          <span className={`text-sm font-semibold ${changeColor}`}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">
          {price.toFixed(2)} {currency}
        </p>
        <p className="text-sm text-gray-600 mt-1">للغرام الواحد</p>
      </div>
    </div>
  );
};

export default GoldPriceCard;

