import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../table/Table";
import api from "../../../api_config";
import { useTranslation } from "react-i18next";

const CustomerSpendingClassificationTables = () => {
  const [groupedCustomers, setGroupedCustomers] = useState({});

  const { t } = useTranslation("customerAnalysis");
  const navigate = useNavigate();

  const tableHead = ["customer_name", "total_orders", "total_spending", "churn_risk"];

  const renderHead = (item, index) => <th key={index}>{t(item)}</th>;

  const renderBody = (item, index, navigate) => (
  <tr
    key={index}
    onClick={() => navigate(`/customer-details/${item.customer_id}`)}
    style={{ cursor: "pointer" }}
  >
    <td>{item.customer_name}</td>
    <td>{item.order_count}</td>
    <td>{item.total_spent?.toFixed(2)}</td>
    <td>{item.churn_risk}</td>

  </tr>
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/full-customer-classification");
        const data = res.data;

        // Group customers by spending classification
        const grouped = data.reduce((acc, item) => {
          const key = item.spending_classification || "Unclassified";
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

         // Sort each group by total_spent descending
        Object.keys(grouped).forEach((key) => {
            grouped[key].sort((a, b) => b.total_spent - a.total_spent);
        });

        setGroupedCustomers(grouped);
      } catch (error) {
        console.error("Failed to fetch spending classified customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  const classificationOrder = [
    { key: "VIP", label: t("customer_spending_classification.VIP.label"), criteria: t("customer_spending_classification.VIP.criteria") },
    { key: "High Spender", label: t("customer_spending_classification.HighSpender.label"), criteria: t("customer_spending_classification.HighSpender.criteria") },
    { key: "Medium Spender", label: t("customer_spending_classification.MediumSpender.label"), criteria: t("customer_spending_classification.MediumSpender.criteria") },
    { key: "Low Spender", label: t("customer_spending_classification.LowSpender.label"), criteria: t("customer_spending_classification.LowSpender.criteria") }
  ];

  return (
    <div className="row">
      {classificationOrder.map(({ key, label, criteria }) =>
        groupedCustomers[key]?.length > 0 ? (
          <div className="col-6" key={key}>
            <div className="card">
              <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-green-800 tracking-wide">
                  {label} <span className="text-sm text-green-700">({groupedCustomers[key].length})</span>
                </h3>
                <p className="text-sm text-green-700 mt-1 italic">{criteria}</p>
              </div>
              <div className="card__body">
                <Table
                  limit="10"
                  headData={tableHead}
                  renderHead={renderHead}
                  bodyData={groupedCustomers[key]}
                  renderBody={(item, index) => renderBody(item, index, navigate)}
                />
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};

export default CustomerSpendingClassificationTables;
