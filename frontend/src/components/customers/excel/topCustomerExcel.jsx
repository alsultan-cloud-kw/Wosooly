import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import api from "../../../../api_config"

const TopCustomersChartExcel = ({ fileId = null }) => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation("customerAnalysis");

  useEffect(() => {
    const params = fileId ? { params: { file_id: fileId } } : {};
    api.get("/dashboard_excel/top-customers", params).then((res) => {
      const data = res.data.rows
      const names = data.map((c) => c.user);
      const totalSpent = data.map((c) => c.total_spending);

      setCategories(names);
      setSeries([
        {
          name: "Total Spent",
          data: totalSpent,
        },
      ]);
    }).catch((err) => {
      console.error("Error fetching top customers:", err);
      setCategories([]);
      setSeries([]);
    });
  }, [fileId]);

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

export default TopCustomersChartExcel;
