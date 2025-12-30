import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../table/Table";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

const CustomerSpendingClassificationTablesExcel = ({ fileId = null }) => {
  const [groupedCustomers, setGroupedCustomers] = useState({});
  const [allCustomers, setAllCustomers] = useState([]);
  const [ranges, setRanges] = useState({
    VIP: { min: 1000, max: null },
    "High Spender": { min: 500, max: 999.99 },
    "Medium Spender": { min: 200, max: 499.99 },
    "Low Spender": { min: 0, max: 199.99 },
  });

  const { t } = useTranslation("customerAnalysis");
  const navigate = useNavigate();
  const tableHead = ["customer_name", "order_count", "total_spent"];
  const renderHead = (item, index) => <th key={index}>{t(item)}</th>;
  
  const handleCustomerRowClick = (customerId) => {
    // Check if user has advanced_analytics feature
    let availableFeatures = [];
    try {
      const featuresStr = localStorage.getItem("available_features");
      if (featuresStr) {
        availableFeatures = JSON.parse(featuresStr);
      }
    } catch (error) {
      console.error("Error parsing available_features from localStorage:", error);
      availableFeatures = [];
      localStorage.removeItem("available_features");
    }

    // Check if advanced_analytics is in available features
    if (!availableFeatures.includes("advanced_analytics")) {
      toast.error("Upgrade your plan to get advanced analysis! 🚀", {
        icon: "👑",
        duration: 4000,
        style: {
          borderRadius: "10px",
          background: "#ef4444",
          color: "#fff",
          fontWeight: "500",
        },
      });
      // Navigate to subscription page after a short delay
      setTimeout(() => {
        navigate("/subscription");
      }, 500);
      return;
    }

    // User has the feature, proceed with navigation
    navigate(`/customer-details/${customerId}`);
  };

  const renderBody = (item, index) => (
    <tr
      key={index}
      style={{ cursor: "pointer" }}
      onClick={() => handleCustomerRowClick(item.customer_id || item.customer_name)}
    >
      <td>{item.customer_name}</td>
      <td>{item.order_count}</td>
      <td>{item.total_spent?.toFixed(2)}</td>
    </tr>
  );

  // Get fileId from props or localStorage
  const activeFileId = fileId ?? (localStorage.getItem("active_excel_file_id") ? parseInt(localStorage.getItem("active_excel_file_id"), 10) : null);

  // Fetch data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const params = activeFileId ? { params: { file_id: activeFileId } } : {};
        const res = await api.get("/excel_customers/full-customer-classification", params);
        const data = res.data.rows || [];
        const formattedRows = data.map((row) => ({
          customer_name: row.customer_name,
          customer_id: row.customer_id,
          order_count: row.order_count,
          total_spent: row.total_spending ?? row.total_spent,
        }));
        setAllCustomers(formattedRows);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        setAllCustomers([]);
      }
    };
    fetchCustomers();
  }, [activeFileId]);

  // Group by spending ranges
  useEffect(() => {
    const bucketed = allCustomers.reduce((acc, item) => {
      const spend = Number(item.total_spent ?? 0);
      let key = "Unclassified";
    
      const vipMin = Number(ranges.VIP.min) || 0;
      if (spend >= vipMin) key = "VIP";
      else {
        const highMin = Number(ranges["High Spender"].min) || 0;
        const highMax = Number(ranges["High Spender"].max) || Infinity;
        if (spend >= highMin && spend <= highMax) key = "High Spender";
        else {
          const medMin = Number(ranges["Medium Spender"].min) || 0;
          const medMax = Number(ranges["Medium Spender"].max) || Infinity;
          if (spend >= medMin && spend <= medMax) key = "Medium Spender";
          else {
            const lowMin = Number(ranges["Low Spender"].min) || 0;
            const lowMax = Number(ranges["Low Spender"].max) || Infinity;
            if (spend >= lowMin && spend <= lowMax) key = "Low Spender";
          }
        }
      }
    
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    Object.keys(bucketed).forEach((k) => {
      bucketed[k].sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0));
    });

    setGroupedCustomers(bucketed);
  }, [allCustomers, ranges]);

  const classificationOrder = [
    { key: "VIP", label: t("customer_spending_classification.VIP.label") || "VIP" },
    { key: "High Spender", label: t("customer_spending_classification.HighSpender.label") || "High Spender" },
    { key: "Medium Spender", label: t("customer_spending_classification.MediumSpender.label") || "Medium Spender" },
    { key: "Low Spender", label: t("customer_spending_classification.LowSpender.label") || "Low Spender" },
  ];

  const onRangeChange = (group, bound, value) => {
    setRanges((prev) => ({
      ...prev,
      [group]: { ...prev[group], [bound]: value },
    }));
  };

  return (
    <div className="row">
      {classificationOrder.map(({ key, label }) =>
        groupedCustomers[key]?.length > 0 ? (
          <div className="col-6" key={key}>
            <div className="card">
              <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-green-800 tracking-wide">
                  {label} <span className="text-sm text-green-700">({groupedCustomers[key].length})</span>
                </h3>

                <div className="text-sm text-green-700 mt-2 flex items-center justify-center gap-2">
                  {["min", "max"].map((bound) => (
                    <div key={bound}>
                      {bound in ranges[key] && (
                        <>
                          <label>{bound.charAt(0).toUpperCase() + bound.slice(1)}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={ranges[key][bound] ?? ""}
                            onChange={(e) => onRangeChange(key, bound, e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card__body">
                <Table
                  limit="10"
                  headData={tableHead}
                  renderHead={renderHead}
                  bodyData={groupedCustomers[key]}
                  renderBody={renderBody}
                />
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};

export default CustomerSpendingClassificationTablesExcel;
