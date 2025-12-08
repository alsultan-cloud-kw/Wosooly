import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from '../../../../api_config';
import { useTranslation } from 'react-i18next';

const TopSellingProductsChartInbetween = () => {
  const { t } = useTranslation("productAnalysis");

  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);

  // ✅ Default last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const fetchData = async () => {
    try {
      const res = await api.get("/top-products-inbetween", {
        params: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        },
      });

      const rows = Array.isArray(res.data) ? res.data : res.data.rows || [];
      
      const names = (rows || []).map((p) => p.name || "Unknown");
      const sales = (rows || []).map((p) => p.total_quantity_sold || 0);

      setCategories(names);
      setSeries([{ name: "Sales", data: sales }]);
    } catch (err) {
      console.error("Failed to fetch top products:", err);
      // fallback empty data
      setCategories([]);
      setSeries([{ name: "Sales", data: [] }]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const options = {
    chart: { type: "bar" },
    xaxis: { categories },
    title: { text: t("top5SellingProducts"), align: "center" },
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">{t("from")}:</label>
        <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} />
        <label className="text-sm font-medium">{t("to")}:</label>
        <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} />
      </div>
      {/* Always render chart, even with empty data */}
      <Chart
        options={options}
        series={series.length > 0 ? series : [{ name: "Sales", data: [] }]}
        type="bar"
        height={350}
      />
    </div>
  );
};

export default TopSellingProductsChartInbetween;
