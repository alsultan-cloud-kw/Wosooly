import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";

const TopSellingProductsChartInbetweenExcel = () => {
  const { t } = useTranslation("productAnalysis");

  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);

  // Default last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const fetchExcelData = async () => {
    try {
      const res = await api.get("/excel_products/top-selling-products-by-date", {
        params: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        },
      });

      // response is array like:
      // [{ name: "Product A", total_quantity_sold: 20, total_sales: 300 }, ...]
      const rows = Array.isArray(res.data) ? res.data : [];
      console.log("rows in the topselling",rows)
      const names = rows.map((p) => p.name || "Unknown");
      const sales = rows.map((p) => p.total_sales || 0);
      const quantity = rows.map((p) => p.total_quantity_sold || 0)

      setCategories(names);
      setSeries([
        {
          name: "Total Sales",
          data: sales,
        },
        // {
        //   name: "Quantity Sold",
        //   data: quantity,
        // },
      ]);
    } catch (err) {
      console.error("Excel range fetch error:", err);
      setCategories([]);
      setSeries([{ name: "Sales", data: [] }]);
    }
  };

  useEffect(() => {
    fetchExcelData();
  }, [startDate, endDate]);

  const options = {
    chart: { type: "bar" },
    xaxis: {
      categories: categories,
    },
    title: {
      text: t("top5SellingProducts"),
      align: "center",
    },
  };

  return (
    <div className="p-4">
      {/* Date Pickers */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">{t("from")}:</label>
        <DatePicker selected={startDate} onChange={(d) => setStartDate(d)} />

        <label className="text-sm font-medium">{t("to")}:</label>
        <DatePicker selected={endDate} onChange={(d) => setEndDate(d)} />
      </div>

      {/* Chart (always render) */}
      <Chart
        options={options}
        series={series.length ? series : [{ name: "Sales", data: [] }]}
        type="bar"
        height={350}
      />
    </div>
  );
};

export default TopSellingProductsChartInbetweenExcel;
