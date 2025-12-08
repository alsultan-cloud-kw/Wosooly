import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import api from '../../../../api_config';
import { useTranslation } from 'react-i18next';

const TopSellingProductsChartExcel = () => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation("productAnalysis");

  useEffect(() => {
    api.get("/excel_products/top-selling-products").then((res) => {
      const names = res.data.map((p) => p.name);
      const sales = res.data.map((p) => p.total_sales ?? 0);

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
    chart: { type: "bar" },
    xaxis: { categories },
    title: {
      text: t("top5SellingProducts"),
      align: "center",
    },
  };

  return <Chart options={options} series={series} type="bar" height={350} />;
};

export default TopSellingProductsChartExcel;
