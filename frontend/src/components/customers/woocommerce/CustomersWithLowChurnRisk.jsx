import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../table/Table";
import axios from "axios";
import API_BASE_URL from "../../../api_config";
import { useTranslation } from "react-i18next";

const LowChurnCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { t } = useTranslation("customerAnalysis");

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/customers_with_low_churnRisk`);
        setCustomers(res.data);
      } catch (err) {
        setError("Failed to fetch customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const tableHead = [
  "customerId",
  "customerName",
  "phone",
  "orderCount",
  "totalSpent",
  "lastOrderDate",
  "classification",
  "spendingClassification",
  "churnRisk",
//   "Segment",
];

const renderHead = (item, index) => <th key={index}>{t(item)}</th>;

const renderBody = (item, index, navigate) => (
  <tr
    key={index}
    onClick={() => navigate(`/customer-details/${item.customer_id}`)}
    style={{ cursor: "pointer" }}
  >
    <td>{item.customer_id}</td>
    <td>{item.customer_name}</td>
    <td>{item.phone}</td>
    <td>{item.order_count}</td>
    <td>KD: {item.total_spent.toFixed(2)}</td>
    <td>{new Date(item.last_order_date).toLocaleDateString()}</td>
    <td>{item.classification}</td>
    <td>{item.spending_classification}</td>
    <td>{item.churn_risk}</td>
    {/* <td>{item.segment}</td> */}
  </tr>
);

  if (loading) return <p className="text-gray-500">{t("loading")}</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (customers.length === 0)
    return <p className="text-gray-500">{t("empty")}</p>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
            <h3 className="text-xl font-semibold text-blue-800 tracking-wide">
              {t("title")} <span className="text-sm text-blue-700">({customers.length})</span>
            </h3>
            <p className="text-sm text-blue-700 mt-1 italic">
              {t("subtitle")}
            </p>
          </div>
          <div className="card__body">
            <Table
              limit={10}
              headData={tableHead}
              renderHead={renderHead}
              bodyData={customers}
              renderBody={(item, index) => renderBody(item, index, navigate)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowChurnCustomers;