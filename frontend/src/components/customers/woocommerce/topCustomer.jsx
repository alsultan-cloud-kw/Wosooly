import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import api from "../../../../api_config"

const TopCustomersChart = () => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation("customerAnalysis");

  useEffect(() => {
    api.get("/top-customers")
      .then((res) => {
        // Handle both formats: direct array or object with rows property
        const data = Array.isArray(res.data) ? res.data : (res.data?.rows || []);
        
        if (!data || data.length === 0) {
          setCategories([]);
          setSeries([{ name: "Total Spent", data: [] }]);
          return;
        }
        
        const names = data.map((c) => c.user || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown');
        const totalSpent = data.map((c) => c.total_spending || 0);

        setCategories(names);
        setSeries([
          {
            name: "Total Spent",
            data: totalSpent,
          },
        ]);
      })
      .catch((err) => {
        console.error("Error fetching top customers:", err);
        setCategories([]);
        setSeries([{ name: "Total Spent", data: [] }]);
      });
  }, []);

  const options = {
    chart: {
      type: "bar",
    },
    xaxis: {
      categories: categories,
    },
    title: {
      text: t("top_5_customers_by_spending"),
      align: "center",
    },
    tooltip: {
      y: {
        formatter: (val) => `$${val.toFixed(2)}`
      }
    }
  };

  return <Chart options={options} series={series} type="bar" height={350} />;
};

export default TopCustomersChart;
