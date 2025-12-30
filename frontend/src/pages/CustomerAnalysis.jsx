import React, { useState, useEffect } from "react";
import TopCustomersChart from "../components/customers/woocommerce/topCustomer";
import TopCustomersChartExcel from "../components/customers/excel/topCustomerExcel";
import CustomersTable from "../components/customers/woocommerce/customersTable";
import CustomersTableExcel from "../components/customers/excel/customersTableExcel";
import CustomerClassificationTables from "../components/customers/woocommerce/cutomerTableBasedOrderNo";
import CustomerClassificationTablesExcel from "../components/customers/excel/cutomerTableBasedOrderNoExcel";
import CustomerSpendingClassificationTables from "../components/customers/woocommerce/CustomerSpendingClassificationTables";
import CustomerSpendingClassificationTablesExcel from "../components/customers/excel/CustomerSpendingClassificationTablesExcel";
import CustomerSearchBar from "../components/customers/CustomerSearchBar";
import CustomerFilters from "../components/customers/CustomerFilters";
import SectionHeader from "../components/customers/SectionHeader";
import api from "../../api_config";
import { useTranslation } from "react-i18next";

function CustomerAnalysis() {
  const { t } = useTranslation("customerAnalysis");

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [dataSource, setDataSource] = useState(localStorage.getItem("data_source"));
  const [activeFileId, setActiveFileId] = useState(localStorage.getItem("active_excel_file_id"));

  const [orderFilter, setOrderFilter] = useState({ min: null, max: null });
  const [spendingFilter, setSpendingFilter] = useState({ min: null, max: null });
  const [governorateFilter, setGovernorateFilter] = useState(null);

  // Watch for localStorage changes (dataSource and active_excel_file_id)
  useEffect(() => {
    const handleStorageChange = () => {
      const newDataSource = localStorage.getItem("data_source");
      const newActiveFileId = localStorage.getItem("active_excel_file_id");
      setDataSource(newDataSource);
      setActiveFileId(newActiveFileId);
    };

    // Listen for custom event from UserDashboard
    const handleDataSourceChanged = (event) => {
      const { dataSource: newDataSource, fileId } = event.detail;
      setDataSource(newDataSource);
      setActiveFileId(fileId ? fileId.toString() : null);
    };

    // Check for changes periodically (since storage events don't fire in same window)
    const interval = setInterval(handleStorageChange, 500);
    
    // Listen for custom event
    window.addEventListener("dataSourceChanged", handleDataSourceChanged);
    // Also listen for storage events (for cross-tab communication)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dataSourceChanged", handleDataSourceChanged);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        let rows = [];
        if (dataSource === "excel") {
          const fileId = activeFileId ? parseInt(activeFileId, 10) : null;
          const params = fileId ? { params: { file_id: fileId } } : {};
          const res = await api.get("/excel_customers/customers-table", params);
          rows = Array.isArray(res.data.rows) ? res.data.rows : [];
        } else {
          const res = await api.get("/customers-table");
          rows = Array.isArray(res.data) ? res.data : [];
        }
  
        setCustomers(rows);
        setFilteredCustomers(rows);
        setTotalCustomers(rows.length); // Total customers from API
      } catch (err) {
        console.error("Error fetching customers", err);
      }
    }
    fetchCustomers();
  }, [dataSource, activeFileId]);

  // 🔍 Search + Filters
  useEffect(() => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const digitSearch = rawSearch.replace(/\D/g, "");

    const filtered = customers.filter((customer) => {
      // 🔥 Support WooCommerce + Excel
      const nameField = customer.user || customer.customer_name || "";
      const name = nameField.toLowerCase();
  
      const phone = String(customer.phone || "").replace(/\D/g, "");
      const email = String(customer.email || "").toLowerCase();
  
      const orders = Number(customer.total_orders ?? customer.order_count ?? 0);
      const spending = Number(customer.total_spending ?? customer.total_amount ?? 0);
  
      const isNameMatch = name.includes(rawSearch);
      const isPhoneMatch = digitSearch && phone.includes(digitSearch);
  
      const passesSearch = !rawSearch || isNameMatch || isPhoneMatch;
  
      const passesOrderMin = orderFilter.min === null || orders >= orderFilter.min;
      const passesOrderMax = orderFilter.max === null || orders <= orderFilter.max;
  
      const passesSpendingMin = spendingFilter.min === null || spending >= spendingFilter.min;
      const passesSpendingMax = spendingFilter.max === null || spending <= spendingFilter.max;

      // Governorate filter - handle null/undefined and empty string
      const customerGovernorate = customer.governorate ? String(customer.governorate).trim() : null;
      const filterValue = governorateFilter ? String(governorateFilter).trim() : null;
      
      // If filter is set, customer must have matching governorate
      // If filter is empty/null, show all customers
      // Special case: "__uncategorized__" means show customers with no governorate
      let passesGovernorate = true;
      if (filterValue) {
        if (filterValue === "__uncategorized__") {
          // Show only customers without a governorate
          passesGovernorate = !customerGovernorate;
        } else {
          // Show only customers with matching governorate
          passesGovernorate = customerGovernorate && customerGovernorate === filterValue;
        }
      }
  
      return (
        passesSearch &&
        passesOrderMin &&
        passesOrderMax &&
        passesSpendingMin &&
        passesSpendingMax &&
        passesGovernorate
      );
  });

    setFilteredCustomers(filtered);
    // totalCustomers is already set from the API fetch, don't update it here
  }, [searchTerm, customers, orderFilter, spendingFilter, governorateFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setOrderFilter({ min: null, max: null });
    setSpendingFilter({ min: null, max: null });
    setGovernorateFilter(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">
        {t("customer_analysis")}
      </h2>

      {/* 🔄 EXCEL OR WOOCOMMERCE */}
      {dataSource === "excel" ? (
        <>
          {/* TOP CHART */}
          <TopCustomersChartExcel fileId={activeFileId ? parseInt(activeFileId, 10) : null} />

          {/* SEARCH */}
          <CustomerSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            t={t}
          />

          {/* FILTERS */}
          <CustomerFilters
            orderFilter={orderFilter}
            spendingFilter={spendingFilter}
            governorateFilter={governorateFilter}
            setOrderFilter={setOrderFilter}
            setSpendingFilter={setSpendingFilter}
            setGovernorateFilter={setGovernorateFilter}
            clearFilters={clearFilters}
            t={t}
          />

          {/* TABLE */}
          <CustomersTableExcel customers={filteredCustomers} totalCustomers={totalCustomers} />

          {/* CLASSIFICATION BY ORDERS */}
          <SectionHeader title={t("classification_by_orders")} />
          <CustomerClassificationTablesExcel fileId={activeFileId ? parseInt(activeFileId, 10) : null} />

          {/* CLASSIFICATION BY SPENDING */}
          <SectionHeader title={t("classification_by_spending")} />
          <CustomerSpendingClassificationTablesExcel fileId={activeFileId ? parseInt(activeFileId, 10) : null} />
        </>
      ) : (
        <>
          {/* TOP CHART (WooCommerce) */}
          <TopCustomersChart />

          {/* SEARCH */}
          <CustomerSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            t={t}
          />

          {/* FILTERS */}
          <CustomerFilters
            orderFilter={orderFilter}
            spendingFilter={spendingFilter}
            governorateFilter={governorateFilter}
            setOrderFilter={setOrderFilter}
            setSpendingFilter={setSpendingFilter}
            setGovernorateFilter={setGovernorateFilter}
            clearFilters={clearFilters}
            t={t}
          />

          {/* TABLE (Woocommerce) */}
          <CustomersTable customers={filteredCustomers} totalCustomers={totalCustomers} />

          {/* CLASSIFICATION BY ORDERS */}
          <SectionHeader title={t("classification_by_orders")} />
          <CustomerClassificationTables customers={filteredCustomers} />

          {/* CLASSIFICATION BY SPENDING */}
          <SectionHeader title={t("classification_by_spending")} />
          <CustomerSpendingClassificationTables/>
        </>
      )}
    </div>
  );
}

export default CustomerAnalysis;