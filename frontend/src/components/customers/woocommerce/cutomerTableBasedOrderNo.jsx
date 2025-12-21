import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../table/Table";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";

const CustomerClassificationTables = () => {
  const [groupedCustomers, setGroupedCustomers] = useState({});
  const [allCustomers, setAllCustomers] = useState([]);
  const [ranges, setRanges] = useState({
    Loyal: { min: 16, max: null },
    Frequent: { min: 10, max: 15 },
    Occasional: { min: 5, max: 9 },
    New: { min: 1, max: 4 },
    Dead: { min: null, max: 0 },
    NoOrders: { equals: 0 },
  });

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

  // Fetch raw classified customers once
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/full-customer-classification");
        const data = Array.isArray(res.data) ? res.data : [];

        setAllCustomers(data);
      } catch (error) {
        console.error("Failed to fetch classified customers:", error);
        setAllCustomers([]);
      }
    };

    fetchCustomers();
  }, []);

  // Re-classify customers on the client using dynamic order-count ranges
  useEffect(() => {
    const bucketed = allCustomers.reduce((acc, item) => {
      const count = Number(item.order_count ?? 0);
      let key = "Unclassified";

      if (ranges.Loyal.min !== null && count >= ranges.Loyal.min) key = "Loyal";
      else if (
        ranges.Frequent.min !== null &&
        count >= ranges.Frequent.min &&
        ranges.Frequent.max !== null &&
        count <= ranges.Frequent.max
      )
        key = "Frequent";
      else if (
        ranges.Occasional.min !== null &&
        count >= ranges.Occasional.min &&
        ranges.Occasional.max !== null &&
        count <= ranges.Occasional.max
      )
        key = "Occasional";
      else if (
        ranges.New.min !== null &&
        count >= ranges.New.min &&
        ranges.New.max !== null &&
        count <= ranges.New.max
      )
        key = "New";
      else if (
        (ranges.Dead.min === null || count >= ranges.Dead.min) &&
        (ranges.Dead.max === null || count <= ranges.Dead.max)
      )
        key = "Dead";
      else if (count === (ranges.NoOrders.equals ?? 0)) key = "No Orders";

      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Sort each bucket by order_count DESC for consistent display
    Object.keys(bucketed).forEach((k) => {
      bucketed[k].sort((a, b) => Number(b.order_count ?? 0) - Number(a.order_count ?? 0));
    });

    setGroupedCustomers(bucketed);
  }, [allCustomers, ranges]);

  const classificationOrder = [
    {
      key: "Loyal",
      label: t("customer_classification.Loyal.label"),
      criteria: t("customer_classification.Loyal.criteria"),
    },
    {
      key: "Frequent",
      label: t("customer_classification.Frequent.label"),
      criteria: t("customer_classification.Frequent.criteria"),
    },
    {
      key: "Occasional",
      label: t("customer_classification.Occasional.label"),
      criteria: t("customer_classification.Occasional.criteria"),
    },
    {
      key: "New",
      label: t("customer_classification.New.label"),
      criteria: t("customer_classification.New.criteria"),
    },
    {
      key: "Dead",
      label: t("customer_classification.Dead.label"),
      criteria: t("customer_classification.Dead.criteria"),
    },
    {
      key: "No Orders",
      label: t("customer_classification.NoOrders.label"),
      criteria: t("customer_classification.NoOrders.criteria"),
    },
  ];

  const onRangeChange = (group, bound, value) => {
    const numValue = value === "" ? null : Number(value);

    setRanges((prev) => ({
      ...prev,
      [group]: { ...prev[group], [bound]: numValue },
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
              <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 border border-indigo-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-indigo-800 tracking-wide">
                  {label}{" "}
                  <span className="text-sm text-indigo-600">({items.length})</span>
                </h3>
                {/* <p className="text-sm text-indigo-700 mt-1 italic">{criteria}</p> */}

                {/* Dynamic range controls for this classification */}
                {range && (
                  <div className="text-sm text-indigo-700 mt-2 flex items-center justify-center gap-2">
                    {"min" in range && (
                      <>
                        <label>Min</label>
                        <input
                          type="number"
                          value={range.min ?? ""}
                          onChange={(e) => onRangeChange(key, "min", e.target.value)}
                        />
                      </>
                    )}
                    {"max" in range && range.max !== undefined && (
                      <>
                        <label>Max</label>
                        <input
                          type="number"
                          value={range.max ?? ""}
                          onChange={(e) => onRangeChange(key, "max", e.target.value)}
                        />
                      </>
                    )}
                    {"equals" in range && (
                      <>
                        <label>Equals</label>
                        <input
                          type="number"
                          value={range.equals ?? ""}
                          onChange={(e) => onRangeChange(key, "equals", e.target.value)}
                        />
                      </>
                    )}
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

export default CustomerClassificationTables;