import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import { useSelector } from "react-redux";
import StatusCard from "../components/status-card/statusCard";
import Table from "../components/table/Table";
import Badge from "../components/badge/Badge";
import { useTranslation } from "react-i18next";
import api from "../../api_config";

const chartOptions = {
  series: [
    {
      name: "Online Customers",
      data: [40, 70, 20, 90, 36, 80, 30, 91, 60],
    },
    {
      name: "Store Customers",
      data: [40, 30, 70, 80, 40, 16, 40, 20, 51, 10],
    },
  ],
  options: {
    color: ["#6ab04c", "#2980b9"],
    chart: {
      background: "transparent",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    },
    legend: {
      position: "top",
    },
    grid: {
      show: false,
    },
  },
};

const orderStatus = {
  cancelled: "danger",
  pending: "warning",
  completed: "success",
  failed: "danger",
  processing: "primary",
};

const renderCustomerBody = (item, index) => (
  <tr key={index}>
    <td>{item.user}</td>
    <td>{item.total_orders}</td>
    <td>{item.total_spending}</td>
  </tr>
);

const renderOrderBody = (item, index) => (
  <tr key={index}>
    <td>{item.id}</td>
    <td>{item.user}</td>
    <td>{item.price.replace("$", "KD ")}</td>
    <td>{item.date}</td>
    <td>
      <Badge type={orderStatus[item.status]} content={item.status} />
    </td>
  </tr>
);

/**
 * WooCommerce dashboard – original implementation
 */
function WooDashboardContent() {
  const [orders, setOrders] = useState([]);
  const [statusCards, setStatusCards] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [salesComparison, setSalesComparison] = useState(null);

  const { t, i18n } = useTranslation("landing");
  const themeReducer = useSelector((state) => state.theme?.mode || "light");

  const topCustomerHead = ["user", "totalOrders", "totalSpending"];
  const renderCustomerHead = (item, index) => <th key={index}>{t(item)}</th>;

  useEffect(() => {
    const fetchLatestOrders = async () => {
      try {
        const { data } = await api.get("/latest-orders");
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    fetchLatestOrders();
  }, []);

  useEffect(() => {
    api
      .get("/top-customers")
      .then((response) => {
        setTopCustomers(response.data);
      })
      .catch((error) => console.error("Failed to fetch top customers:", error));
  }, []);

  useEffect(() => {
    const fetchStatusCards = async () => {
      try {
        const totalOrdersRes = await api.get("/total-orders-count");
        const { count } = totalOrdersRes.data[0];
        const totalSalesRes = await api.get("/total-sales");
        const { totalamount } = totalSalesRes.data[0];
        const aovRes = await api.get("/aov");
        const { amount } = aovRes.data[0];
        const totalCustomersRes = await api.get("/total-customers");
        const { countcustomers } = totalCustomersRes.data[0];

        const cards = [
          {
            title: t("totalSales"),
            count: totalamount,
            icon: "bx bx-shopping-bag",
          },
          {
            title: t("averageOrderValue"),
            count: amount,
            icon: "bx bx-cart",
          },
          {
            title: t("totalCustomers"),
            count: countcustomers,
            icon: "bx bx-dollar-circle",
          },
          {
            title: t("totalOrders"),
            count,
            icon: "bx bx-receipt",
          },
        ];

        setStatusCards(cards);
      } catch (error) {
        console.error("Failed to fetch status card data", error);
      }
    };

    fetchStatusCards();
  }, [i18n.language, t]);

  useEffect(() => {
    api
      .get("/sales-comparison")
      .then((res) => {
        setSalesComparison(res.data);
      })
      .catch((err) => console.error("Failed to fetch sales comparison data:", err));
  }, []);

  const getSalesChartData = (data) => {
    if (
      !data ||
      !Array.isArray(data.previousMonth) ||
      !Array.isArray(data.currentMonth)
    ) {
      return {
        series: [],
        options: chartOptions.options,
      };
    }

    const prevDays = data.previousMonth.map((item) => item.day || 0);
    const currDays = data.currentMonth.map((item) => item.day || 0);

    const maxDay = Math.max(...prevDays, ...currDays, 0);

    const labels = Array.from({ length: Math.max(maxDay, 1) }, (_, i) => `${i + 1}`);
    const prevSeries = Array(Math.max(maxDay, 1)).fill(0);
    const currSeries = Array(Math.max(maxDay, 1)).fill(0);

    data.previousMonth.forEach(({ day, total }) => {
      if (day && total != null) prevSeries[day - 1] = total;
    });

    data.currentMonth.forEach(({ day, total }) => {
      if (day && total != null) currSeries[day - 1] = total;
    });

    return {
      series: [
        {
          name: t("previousMonth"),
          data: prevSeries,
        },
        {
          name: t("thisMonth"),
          data: currSeries,
        },
      ],
      options: {
        chart: {
          background: "transparent",
        },
        stroke: {
          curve: "smooth",
        },
        dataLabels: {
          enabled: false,
        },
        xaxis: {
          categories: labels,
          title: {
            text: t("dayOfMonth"),
          },
        },
        yaxis: {
          title: {
            text: t("salesKD"),
          },
          labels: {
            formatter: (val) => Number(val).toFixed(3),
          },
        },
        legend: {
          position: "top",
        },
        theme: {
          mode: themeReducer === "theme-mode-dark" ? "dark" : "light",
        },
        tooltip: {
          y: {
            formatter: (val) => `KD ${val.toFixed(2)}`,
          },
        },
        grid: {
          show: false,
        },
      },
    };
  };

  const orderHeaders = ["orderId", "user", "totalPrice", "date", "status"];
  const renderOrderHead = (item, index) => <th key={index}>{t(item)}</th>;

  return (
    <div>
      <h2 className="page-header">{t("dashboard")}</h2>
      <div className="row">
        <div className="col-6">
          <div className="row">
            {statusCards.map((item, index) => (
              <div className="col-6" key={index}>
                <StatusCard icon={item.icon} count={item.count} title={item.title} />
              </div>
            ))}
          </div>
        </div>
        <div className="col-6">
          <div className="card full-height">
            {salesComparison ? (
              <Chart
                options={getSalesChartData(salesComparison).options}
                series={getSalesChartData(salesComparison).series}
                type="line"
                height="100%"
              />
            ) : (
              <p>{t("loadingChart")}</p>
            )}
          </div>
        </div>

        <div className="col-4">
          <div className="card">
            <div className="card__header">
              <h3>{t("topCustomers")}</h3>
            </div>
            <div className="card__body">
              <Table
                headData={topCustomerHead}
                renderHead={renderCustomerHead}
                bodyData={topCustomers}
                renderBody={renderCustomerBody}
              />
            </div>
            <div className="card__footer">
              <Link to="/CustomerAnalysis">{t("viewAll")}</Link>
            </div>
          </div>
        </div>

        <div className="col-8">
          <div className="card">
            <div className="card__header">
              <h3>{t("latestOrders")}</h3>
            </div>
            <div className="card__body">
              <Table
                headData={orderHeaders}
                renderHead={renderOrderHead}
                bodyData={Array.isArray(orders) ? orders : []}
                renderBody={renderOrderBody}
              />
            </div>
            <div className="card__footer">
              <Link to="/orderAnalysis">{t("viewAll")}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Excel dashboard – uses /dashboard/* APIs you described
 */
function ExcelDashboardContent() {
  const [orders, setOrders] = useState([]);
  const [orderHeaders, setOrderHeaders] = useState([]);
  const [statusCards, setStatusCards] = useState([]);
  const [salesComparison, setSalesComparison] = useState(null);
  const [topCustHeaders, setTopCustHeaders] = useState([]);
  const [topCustRows, setTopCustRows] = useState([]);
  const [activeFileId, setActiveFileId] = useState(localStorage.getItem("active_excel_file_id"));

  const { t, i18n } = useTranslation("landing");
  const themeReducer = useSelector((state) => state.theme?.mode || "light");

  // Watch for localStorage changes (active_excel_file_id)
  useEffect(() => {
    const handleStorageChange = () => {
      const newActiveFileId = localStorage.getItem("active_excel_file_id");
      setActiveFileId(newActiveFileId);
    };

    // Listen for custom event from UserDashboard
    const handleDataSourceChanged = (event) => {
      const { fileId } = event.detail;
      setActiveFileId(fileId ? fileId.toString() : null);
    };

    // Check for changes periodically
    const interval = setInterval(handleStorageChange, 500);
    
    // Listen for custom event
    window.addEventListener("dataSourceChanged", handleDataSourceChanged);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dataSourceChanged", handleDataSourceChanged);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
        const params = { limit: 5 };
        if (fileId) params.file_id = fileId;
        
        const { data } = await api.get("/dashboard_excel/latest-rows", {
          params,
        });

        const rows = Array.isArray(data.rows) ? data.rows : [];
        console.log("Excel latest rows:", rows);

        if (rows.length === 0) {
          setOrderHeaders([]);
          setOrders([]);
          return;
        }

        const keys = Object.keys(rows[0].data || {});
        setOrderHeaders(keys.map((k) => k.replaceAll("_", " ").toUpperCase()));

        const formattedRows = rows.map((item) =>
          keys.map((k) => item.data?.[k] ?? "")
        );

        setOrders(formattedRows);
      } catch (err) {
        console.error("Error fetching latest rows:", err);
      }
    })();
  }, [activeFileId]);

  useEffect(() => {
    (async () => {
      try {
        const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
        const params = { limit: 5 };
        if (fileId) params.file_id = fileId;
        
        const { data } = await api.get("/dashboard_excel/top-customers", {
          params,
        });

        const rows = Array.isArray(data.rows) ? data.rows : [];
        if (rows.length === 0) {
          setTopCustHeaders([]);
          setTopCustRows([]);
          return;
        }

        const headers = Object.keys(rows[0]);
        setTopCustHeaders(headers.map((h) => h.replaceAll("_", " ").toUpperCase()));

        const formattedRows = rows.map((row) =>
          headers.map((h) => row[h] ?? "")
        );
        setTopCustRows(formattedRows);
      } catch (err) {
        console.error("Error fetching top customers:", err);
      }
    })();
  }, [activeFileId]);

  useEffect(() => {
    const fetchStatusCards = async () => {
      try {
        const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
        const params = fileId ? { params: { file_id: fileId } } : {};
        
        const { data: countData } = await api.get("/dashboard_excel/total-orders-count", params);
        const count = (countData && typeof countData.count === "number")
          ? countData.count
          : 0;
        console.log("Excel total orders:", count);
        const { data: salesData } = await api.get("/dashboard_excel/total-sales", params);
        const { total_sales } = salesData;
        const { data: productsData } = await api.get("/dashboard_excel/total-products", params);
        const { total_products } = productsData;
        const { data: customersData } = await api.get("/dashboard_excel/total-customers", params);
        const { total_customers } = customersData;

        const cards = [
          {
            title: t("totalSales"),
            count: total_sales,
            icon: "bx bx-shopping-bag",
          },
          {
            title: "Total Products",
            count: total_products,
            icon: "bx bx-cart",
          },
          {
            title: t("totalCustomers"),
            count: total_customers,
            icon: "bx bx-dollar-circle",
          },
          {
            title: t("totalOrders"),
            count,
            icon: "bx bx-receipt",
          },
        ];

        setStatusCards(cards);
      } catch (error) {
        console.error("Failed to fetch status card data", error);
      }
    };

    fetchStatusCards();
  }, [i18n.language, t, activeFileId]);

  useEffect(() => {
    api
      .get("/sales-comparison")
      .then((res) => {
        setSalesComparison(res.data);
      })
      .catch((err) => console.error("Failed to fetch sales comparison data:", err));
  }, []);

  const getSalesChartData = (data) => {
    if (
      !data ||
      !Array.isArray(data.previousMonth) ||
      !Array.isArray(data.currentMonth)
    ) {
      return {
        series: [],
        options: chartOptions.options,
      };
    }

    const prevDays = data.previousMonth.map((item) => item.day || 0);
    const currDays = data.currentMonth.map((item) => item.day || 0);

    // Ensure we always have a safe, positive length
    const maxDay = Math.max(...prevDays, ...currDays, 0);
    const safeMaxDay = Math.max(maxDay, 1);

    const labels = Array.from({ length: safeMaxDay }, (_, i) => `${i + 1}`);

    const prevSeries = Array(safeMaxDay).fill(0);
    const currSeries = Array(safeMaxDay).fill(0);

    data.previousMonth.forEach(({ day, total }) => {
      if (day && total != null && day >= 1 && day <= safeMaxDay) {
        prevSeries[day - 1] = total;
      }
    });

    data.currentMonth.forEach(({ day, total }) => {
      if (day && total != null && day >= 1 && day <= safeMaxDay) {
        currSeries[day - 1] = total;
      }
    });

    return {
      series: [
        {
          name: t("previousMonth"),
          data: prevSeries,
        },
        {
          name: t("thisMonth"),
          data: currSeries,
        },
      ],
      options: {
        chart: {
          background: "transparent",
        },
        stroke: {
          curve: "smooth",
        },
        dataLabels: {
          enabled: false,
        },
        xaxis: {
          categories: labels,
          title: {
            text: t("dayOfMonth"),
          },
        },
        yaxis: {
          title: {
            text: t("salesKD"),
          },
          labels: {
            formatter: (val) => Number(val).toFixed(3),
          },
        },
        legend: {
          position: "top",
        },
        theme: {
          mode: themeReducer === "theme-mode-dark" ? "dark" : "light",
        },
        tooltip: {
          y: {
            formatter: (val) => `KD ${val.toFixed(2)}`,
          },
        },
        grid: {
          show: false,
        },
      },
    };
  };

  return (
    <div>
      <h2 className="page-header">{t("dashboard")}</h2>
      <div className="row">
        <div className="col-6">
          <div className="row">
            {statusCards.length > 0 ? (
              statusCards.map((item, index) => (
                <div className="col-6" key={index}>
                  <StatusCard
                    icon={item.icon}
                    count={item.count ?? t("noData")}
                    title={item.title}
                  />
                </div>
              ))
            ) : (
              <p className="text-center w-full">{t("noData")}</p>
            )}
          </div>
        </div>

        <div className="col-6">
          <div className="card full-height">
            {salesComparison ? (
              <Chart
                options={getSalesChartData(salesComparison).options}
                series={getSalesChartData(salesComparison).series}
                type="line"
                height="100%"
              />
            ) : (
              <p>{t("loadingChart")}</p>
            )}
          </div>
        </div>

        <div className="col-4">
          <div className="card">
            <div className="card__header">
              <h3>{t("topCustomers")}</h3>
            </div>
            <div className="card__body">
              {topCustRows.length > 0 ? (
                <Table
                  headData={topCustHeaders}
                  renderHead={(h, i) => <th key={i}>{h}</th>}
                  bodyData={topCustRows}
                  renderBody={(row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>
                          {cIdx === row.length - 1
                            ? `KD ${Number(cell).toFixed(2)}`
                            : cell}
                        </td>
                      ))}
                    </tr>
                  )}
                />
              ) : (
                <p className="text-center">{t("noData")}</p>
              )}
            </div>
            <div className="card__footer">
              <Link to="/CustomerAnalysis">{t("viewAll")}</Link>
            </div>
          </div>
        </div>

        <div className="col-8">
          <div className="card">
            <div className="card__header">
              <h3>{t("latestData")}</h3>
            </div>
            <div className="card__body">
              {orders.length > 0 ? (
                <Table
                  headData={orderHeaders}
                  renderHead={(h, i) => <th key={i}>{h}</th>}
                  bodyData={orders}
                  renderBody={(row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>
                          {cell == null ? "" : String(cell)}
                        </td>
                      ))}
                    </tr>
                  )}
                />
              ) : (
                <p className="text-center">{t("noData")}</p>
              )}
            </div>
            <div className="card__footer">
              <Link to="/orderAnalysis">{t("viewAll")}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper – picks Woo or Excel dashboard based on stored data_source
 */
const Dashboard = () => {
  const [source, setSource] = useState("woocommerce");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("data_source");
      if (stored === "excel" || stored === "woocommerce") {
        setSource(stored);
      }
    } catch (e) {
      console.warn("Unable to read data_source", e);
    }
  }, []);

  if (source === "excel") {
    return <ExcelDashboardContent />;
  }

  return <WooDashboardContent />;
};

export default Dashboard;
