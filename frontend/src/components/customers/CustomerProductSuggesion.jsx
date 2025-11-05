import { useEffect, useState } from "react";
import API_BASE_URL from "../../../api_config";

export default function CustomerForecast({ customerId }) {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchForecast = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/forecast/customer-with-offer/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch forecast data");
      const data = await res.json();

      // Group by product_id, but also store product_name
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            product_name: item.product_name,
            data: []
          };
        }
        acc[item.product_id].data.push(item);
        return acc;
      }, {});

      setForecastData(grouped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchForecast();
}, [customerId]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!forecastData || Object.keys(forecastData).length === 0) {
  return <p className="text-gray-500">No data available</p>;
    }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">
        {/* Customer {customerId} — Forecasts */}
      </h2>
      {Object.entries(forecastData).map(([productId, { product_name, data }]) => (
        <div key={productId} className="mb-6 border rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">
            {product_name} 
            {/* (ID: {productId}) */}
            </h3>
            <table className="w-full border-collapse">
            <thead>
                <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-right">Forecasted Units</th>
                <th className="border p-2 text-right">Lower Bound</th>
                <th className="border p-2 text-right">Upper Bound</th>
                <th className="border p-2 text-left">Offer</th>
                </tr>
            </thead>
            <tbody>
                {data.map((f, idx) => (
                <tr key={idx}>
                    <td className="border p-2">{f.date}</td>
                    <td className="border p-2 text-right">
                    {Math.max(0, f.forecasted_units).toFixed(0)}
                    </td>
                    <td className="border p-2 text-right">
                    {Math.max(0, f.lower_bound).toFixed(0)}
                    </td>
                    <td className="border p-2 text-right">
                    {Math.max(0, f.upper_bound).toFixed(0)}
                    </td>
                    <td className="border p-2">{f.offer_applied || "-"}</td> {/* Display offer */}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        ))}
    </div>
  );
}
