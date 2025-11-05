import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import api from "../../../api_config"

const TopCustomersChart = () => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation("customerAnalysis");

  useEffect(() => {
    api.get("/top-customers").then((res) => {
      const names = res.data.map((c) => c.user);
      const totalSpent = res.data.map((c) => c.total_spending);

      setCategories(names);
      setSeries([
        {
          name: "Total Spent",
          data: totalSpent,
        },
      ]);
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
