import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../table/Table";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";

const CustomerSpendingClassificationTables = () => {
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

  // Fetch raw customer classification once
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/full-customer-classification");
        const data = Array.isArray(res.data) ? res.data : [];
        setAllCustomers(data);
      } catch (error) {
        console.error("Failed to fetch spending classified customers:", error);
        setAllCustomers([]);
      }
    };

    fetchCustomers();
  }, []);

  // Group by dynamic spending ranges
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
      bucketed[k].sort(
        (a, b) => (Number(b.total_spent ?? 0) - Number(a.total_spent ?? 0))
      );
    });

    setGroupedCustomers(bucketed);
  }, [allCustomers, ranges]);

  const classificationOrder = [
    {
      key: "VIP",
      label: t("customer_spending_classification.VIP.label"),
      criteria: t("customer_spending_classification.VIP.criteria"),
    },
    {
      key: "High Spender",
      label: t("customer_spending_classification.HighSpender.label"),
      criteria: t("customer_spending_classification.HighSpender.criteria"),
    },
    {
      key: "Medium Spender",
      label: t("customer_spending_classification.MediumSpender.label"),
      criteria: t("customer_spending_classification.MediumSpender.criteria"),
    },
    {
      key: "Low Spender",
      label: t("customer_spending_classification.LowSpender.label"),
      criteria: t("customer_spending_classification.LowSpender.criteria"),
    },
  ];

  const onRangeChange = (group, bound, value) => {
    setRanges((prev) => ({
      ...prev,
      [group]: { ...prev[group], [bound]: value },
    }));
  };

  return (
    <div className="row">
      {classificationOrder.map(({ key, label, criteria }) => {
        const items = groupedCustomers[key] || [];
        const range = ranges[key];

        return (
          <div className="col-6" key={key}>
            <div className="card">
              <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-green-800 tracking-wide">
                  {label}{" "}
                  <span className="text-sm text-green-700">
                    ({items.length})
                  </span>
                </h3>
                {/* <p className="text-sm text-green-700 mt-1 italic">{criteria}</p> */}

                {/* Dynamic spending range controls */}
                {range && (
                  <div className="text-sm text-green-700 mt-2 flex items-center justify-center gap-2">
                    {["min", "max"].map((bound) => (
                      <div key={bound}>
                        {bound in range && (
                          <>
                            <label>
                              {bound.charAt(0).toUpperCase() + bound.slice(1)}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={range[bound] ?? ""}
                              onChange={(e) =>
                                onRangeChange(key, bound, e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card__body">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No customers in this classification.
                  </p>
                ) : (
                  <Table
                    limit="10"
                    headData={tableHead}
                    renderHead={renderHead}
                    bodyData={items}
                    renderBody={(item, index) => renderBody(item, index, navigate)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomerSpendingClassificationTables;
