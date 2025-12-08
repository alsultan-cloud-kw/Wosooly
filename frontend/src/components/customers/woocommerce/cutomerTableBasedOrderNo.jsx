import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../table/Table";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";

const CustomerClassificationTables = () => {
  const [groupedCustomers, setGroupedCustomers] = useState({});
  const navigate = useNavigate();
  const { t } = useTranslation("customerAnalysis");

  const tableHead = ["customer_name", "total_orders", "churn_risk"];

  const renderHead = (item, index) => <th key={index}>{t(item)}</th>;

  const renderBody = (item, index, navigate) => (
    <tr
      key={index}
      onClick={() => navigate(`/customer-details/${item.customer_id}`)}
      style={{ cursor: "pointer" }}
    >
      <td>{item.customer_name}</td>
      <td>{item.order_count}</td>
      <td>{item.churn_risk}</td>
      {/* <td>{item.segment}</td> */}
    </tr>
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/full-customer-classification");
        const data = res.data;

        console.log("Fetched classified customers:", data);

        const grouped = data.reduce((acc, item) => {
          const key = item.classification || "Unclassified";
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        // Sort "New" customers by last_order_date DESC
        if (grouped["New"]) {
          grouped["New"].sort(
            (a, b) => new Date(b.last_order_date) - new Date(a.last_order_date)
          );
        }

        // Sort all other groups by order_count DESC
        Object.keys(grouped).forEach((key) => {
          if (key !== "New") {
            grouped[key].sort((a, b) => b.order_count - a.order_count);
          }
        });

        setGroupedCustomers(grouped);
      } catch (error) {
        console.error("Failed to fetch classified customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  const classificationOrder = [
    { key: "Loyal", label: t("customer_classification.Loyal.label"), criteria: t("customer_classification.Loyal.criteria") },
    { key: "Frequent", label: t("customer_classification.Frequent.label"), criteria: t("customer_classification.Frequent.criteria") },
    { key: "Occasional", label: t("customer_classification.Occasional.label"), criteria: t("customer_classification.Occasional.criteria") },
    { key: "New", label: t("customer_classification.New.label"), criteria: t("customer_classification.New.criteria") },
    { key: "Dead", label: t("customer_classification.Dead.label"), criteria: t("customer_classification.Dead.criteria") },
    { key: "No Orders", label: t("customer_classification.NoOrders.label"), criteria: t("customer_classification.NoOrders.criteria") },
  ];

  return (
    <div className="row">
  {classificationOrder.map(({ key, label, criteria }) =>
    groupedCustomers[key]?.length > 0 ? (
      <div className="col-6" key={key}>
        <div className="card">
          <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 border border-indigo-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
            <h3 className="text-xl font-semibold text-indigo-800 tracking-wide">
              {label} <span className="text-sm text-indigo-600">({groupedCustomers[key].length})</span>
            </h3>
            <p className="text-sm text-indigo-700 mt-1 italic">{criteria}</p>
          </div>
          <div className="card__body">
            <Table
              limit="10"
              headData={tableHead}
              renderHead={renderHead}
              bodyData={groupedCustomers[key]}
              renderBody={(item, index) =>
                renderBody(item, index, navigate)
              }
            />
          </div>
        </div>
      </div>
    ) : null
  )}
</div>
  );
};

export default CustomerClassificationTables;