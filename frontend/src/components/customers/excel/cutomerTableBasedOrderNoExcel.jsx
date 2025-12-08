import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../table/Table";
import api from "../../../../api_config";
import { useTranslation } from "react-i18next";

const CustomerClassificationTablesExcel = () => {
  const [groupedCustomers, setGroupedCustomers] = useState({});
  const [allCustomers, setAllCustomers] = useState([]);
  const [columns, setColumns] = useState([]);
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
  const tableHead = ["customer_name", "order_count", "total_spent"];
  const renderHead = (item, index) => <th key={index}>{t(item)}</th>;
  // Fetch Excel API data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/excel_customers/full-customer-classification");
        const result = res.data;

        if (result && result.columns && result.rows) {
          setColumns(Object.keys(result.columns));

          const formattedRows = result.rows.map((row) => ({
            customer_name: row.customer_name,
            // customer_id: row.customer_id,
            order_count: row.order_count,
            total_spending: row.total_spending,
            // last_order_date: row.last_order_date?.split("T")[0] ?? null,
          }));

          setAllCustomers(formattedRows);
        } else {
          setColumns([]);
          setAllCustomers([]);
        }
      } catch (error) {
        console.error("Failed to fetch classified customers:", error);
        setColumns([]);
        setAllCustomers([]);
      }
    };

    fetchCustomers();
  }, []);

  // Classification logic
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

    if (bucketed["New"]) {
      bucketed["New"].sort(
        (a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
      );
    }

    Object.keys(bucketed).forEach((k) => {
      if (k !== "New") bucketed[k].sort((a, b) => b.orderCount - a.orderCount);
    });

    setGroupedCustomers(bucketed);
  }, [allCustomers, ranges]);

  const classificationOrder = [
    { key: "Loyal", label: t("customer_classification.Loyal.label") || "Loyal" },
    { key: "Frequent", label: t("customer_classification.Frequent.label") || "Frequent" },
    { key: "Occasional", label: t("customer_classification.Occasional.label") || "Occasional" },
    { key: "New", label: t("customer_classification.New.label") || "New" },
    { key: "Dead", label: t("customer_classification.Dead.label") || "Dead" },
    { key: "No Orders", label: t("customer_classification.NoOrders.label") || "No Orders" },
  ];

  const onRangeChange = (group, bound, value) => {
    const numValue = value === "" ? null : Number(value);

    setRanges((prev) => ({
      ...prev,
      [group]: { ...prev[group], [bound]: numValue !== null ? numValue : prev[group][bound] },
    }));
  };

  // const renderHead = (item, index) => <th key={index}>{t(item)}</th>;

  const renderBody = (item, index) => (
    <tr
      key={index}
      style={{ cursor: "pointer" }}
      onClick={() => navigate(`/customer-details/${item.customer_id}`)}
    >
      <td>{item.customer_name}</td>
      <td>{item.order_count}</td>
      <td>{item.total_spending?.toFixed(2)}</td>
      {/* <td>{item.churn_risk}</td> */}
    </tr>
  );

  return (
    <div className="row">
      {classificationOrder.map(({ key, label }) =>
        groupedCustomers[key]?.length > 0 ? (
          <div className="col-6" key={key}>
            <div className="card">
              <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 border border-indigo-300 rounded-xl px-4 py-3 mb-4 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-indigo-800 tracking-wide">
                  {label}{" "}
                  <span className="text-sm text-indigo-600">
                    ({groupedCustomers[key].length})
                  </span>
                </h3>

                <div className="text-sm text-indigo-700 mt-2 flex items-center justify-center gap-2">
                  {Object.keys(ranges).map((groupName) => {
                    if (groupName !== key) return null;
                    const range = ranges[groupName];
                    return (
                      <>
                        {"min" in range && (
                          <>
                            <label>Min</label>
                            <input
                              type="number"
                              value={range.min ?? ""}
                              onChange={(e) => onRangeChange(groupName, "min", e.target.value)}
                            />
                          </>
                        )}
                        {"max" in range && range.max !== undefined && (
                          <>
                            <label>Max</label>
                            <input
                              type="number"
                              value={range.max ?? ""}
                              onChange={(e) => onRangeChange(groupName, "max", e.target.value)}
                            />
                          </>
                        )}
                        {"equals" in range && (
                          <>
                            <label>Equals</label>
                            <input
                              type="number"
                              value={range.equals ?? ""}
                              onChange={(e) => onRangeChange(groupName, "equals", e.target.value)}
                            />
                          </>
                        )}
                      </>
                    );
                  })}
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

export default CustomerClassificationTablesExcel;
