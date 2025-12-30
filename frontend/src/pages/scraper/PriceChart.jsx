import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PriceChart = ({ data, karats = [18, 21, 22, 24] }) => {
  const colors = {
    18: "#FFD700",
    21: "#FFA500",
    22: "#FF8C00",
    24: "#FF6347",
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">اتجاهات الأسعار (30 يوم)</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          لا توجد بيانات كافية لعرض الرسم البياني
        </div>
      </div>
    );
  }

  const stats = karats.map((karat) => {
    const values = data
      .map((d) => d[`${karat}K`])
      .filter((v) => v !== undefined && v !== null);
    
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    const first = values[0];
    const change = latest - first;
    const changePercent = first !== 0 ? ((change / first) * 100).toFixed(2) : "0.00";

    return { karat, min, max, avg, latest, change, changePercent };
  }).filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">اتجاهات أسعار الذهب (30 يوم)</h3>
        <p className="text-sm text-gray-600">
          يوضح هذا الرسم البياني تطور أسعار الذهب بجميع العيارات خلال آخر 30 يوم
        </p>
      </div>

      {stats.length > 0 && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.karat}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div className="text-sm font-semibold text-gray-700 mb-1">
                ذهب {stat.karat}K
              </div>
              <div className="text-lg font-bold text-gray-900">
                {stat.latest.toFixed(2)} د.ك
              </div>
              <div
                className={`text-xs mt-1 ${
                  stat.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.change >= 0 ? "↑" : "↓"} {Math.abs(parseFloat(stat.changePercent))}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stat.min.toFixed(2)} - {stat.max.toFixed(2)} د.ك
              </div>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tickFormatter={(value) => {
              try {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              } catch {
                return value;
              }
            }}
            label={{ value: "التاريخ", position: "insideBottom", offset: -5, style: { textAnchor: "middle" } }}
          />
          <YAxis
            stroke="#6b7280"
            label={{
              value: "السعر (دينار كويتي)",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            formatter={(value, name) => [
              `${value?.toFixed(2) || "N/A"} د.ك`,
              name,
            ]}
            labelFormatter={(label) => {
              try {
                const date = new Date(label);
                return `التاريخ: ${date.toLocaleDateString("ar-KW", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`;
              } catch {
                return `التاريخ: ${label}`;
              }
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
          />
          {karats.map((karat) => {
            const hasData = data.some((d) => d[`${karat}K`] !== undefined);
            if (!hasData) return null;
            
            return (
              <Line
                key={karat}
                type="monotone"
                dataKey={`${karat}K`}
                stroke={colors[karat]}
                strokeWidth={3}
                name={`ذهب ${karat}K`}
                dot={{ r: 4, fill: colors[karat] }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>كيفية قراءة الرسم البياني:</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-2 list-disc list-inside space-y-1">
          <li>كل خط يمثل عيار مختلف من الذهب (18K, 21K, 22K, 24K)</li>
          <li>المحور الأفقي (X) يعرض التواريخ</li>
          <li>المحور العمودي (Y) يعرض السعر بالدينار الكويتي</li>
          <li>يمكنك تمرير الماوس على النقاط لرؤية القيم الدقيقة</li>
          <li>الخط الصاعد يعني ارتفاع السعر، والخط الهابط يعني انخفاض السعر</li>
        </ul>
      </div>
    </div>
  );
};

export default PriceChart;

