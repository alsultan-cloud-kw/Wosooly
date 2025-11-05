import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import api from "../../../api_config";
import { useTranslation } from "react-i18next";

const AttributionPieChart = () => {

  const { t } = useTranslation("ordersAnalysis");

  const [series, setSeries] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/attribution-summary");
        const data = res.data;

        const labelList = data.map(item => item.mapped_referrer);
        const seriesList = data.map(item => item.count);

        setLabels(labelList);
        setSeries(seriesList);
      } catch (error) {
        console.error("Error fetching attribution summary:", error);
      }
    };

    fetchData();
  }, []);

  const options = {
    chart: {
      type: "pie",
    },
    labels: labels,
    legend: {
      position: "bottom",
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 300,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };

    return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-2xl p-4 bg-white rounded-xl shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">{t("referrerAttribution")}</h2>
        {series.length > 0 ? (
          <Chart options={options} series={series} type="pie" width="100%" />
        ) : (
          <p>{t("loadingChart")}</p>
        )}
      </div>
    </div>
  );
};

export default AttributionPieChart;
