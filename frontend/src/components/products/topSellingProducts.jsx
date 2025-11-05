import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import api from '../../../api_config';
import { useTranslation } from 'react-i18next';

const TopSellingProductsChart = () => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);

  const { t } = useTranslation("productAnalysis");

  useEffect(() => {
    api.get("/top-selling-products").then((res) => {
      const names = res.data.map((p) => p.name);
      const sales = res.data.map((p) => p.total_quantity_sold || p.total_sales);

      setCategories(names);
      setSeries([
        {
          name: "Sales",
          data: sales,
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
      text: t("top5SellingProducts"),
      align: "center",
    },
  };

  return <Chart options={options} series={series} type="bar" height={350} />;
};

export default TopSellingProductsChart;
