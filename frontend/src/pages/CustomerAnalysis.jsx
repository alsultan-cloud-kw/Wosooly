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
  const dataSource = localStorage.getItem("data_source"); // "excel" or "woocommerce"
  const { t } = useTranslation("customerAnalysis");

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [orderFilter, setOrderFilter] = useState({ min: null, max: null });
  const [spendingFilter, setSpendingFilter] = useState({ min: null, max: null });

  useEffect(() => {
    async function fetchCustomers() {
      try {
        let rows = [];
        if (dataSource === "excel") {
          const res = await api.get("/excel_customers/customers-table");
          rows = Array.isArray(res.data.rows) ? res.data.rows : [];
        } else {
          const res = await api.get("/customers-table");
          rows = Array.isArray(res.data) ? res.data : [];
        }
  
        setCustomers(rows);
        setFilteredCustomers(rows);
      } catch (err) {
        console.error("Error fetching customers", err);
      }
    }
    fetchCustomers();
  }, [dataSource]);

  // 🔍 Search + Filters
  useEffect(() => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const digitSearch = rawSearch.replace(/\D/g, "");

    const filtered = customers.filter((customer) => {
      // 🔥 Support WooCommerce + Excel
      const nameField = customer.user || customer.customer_name || "";
      const name = nameField.toLowerCase();
  
      const phone = (customer.phone || "").replace(/\D/g, "");
  
      const orders = Number(customer.total_orders ?? customer.order_count ?? 0);
      const spending = Number(customer.total_spending ?? customer.total_amount ?? 0);
  
      const isNameMatch = name.includes(rawSearch);
      const isPhoneMatch = digitSearch && phone.includes(digitSearch);
  
      const passesSearch = !rawSearch || isNameMatch || isPhoneMatch;
  
      const passesOrderMin = orderFilter.min === null || orders >= orderFilter.min;
      const passesOrderMax = orderFilter.max === null || orders <= orderFilter.max;
  
      const passesSpendingMin = spendingFilter.min === null || spending >= spendingFilter.min;
      const passesSpendingMax = spendingFilter.max === null || spending <= spendingFilter.max;
  
      return (
        passesSearch &&
        passesOrderMin &&
        passesOrderMax &&
        passesSpendingMin &&
        passesSpendingMax
      );
  });

    setFilteredCustomers(filtered);
  }, [searchTerm, customers, orderFilter, spendingFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setOrderFilter({ min: null, max: null });
    setSpendingFilter({ min: null, max: null });
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
          <TopCustomersChartExcel />

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
            setOrderFilter={setOrderFilter}
            setSpendingFilter={setSpendingFilter}
            clearFilters={clearFilters}
            t={t}
          />

          {/* TABLE */}
          <CustomersTableExcel customers={filteredCustomers} />

          {/* CLASSIFICATION BY ORDERS */}
          <SectionHeader title={t("classification_by_orders")} />
          <CustomerClassificationTablesExcel/>

          {/* CLASSIFICATION BY SPENDING */}
          <SectionHeader title={t("classification_by_spending")} />
          <CustomerSpendingClassificationTablesExcel />
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
            setOrderFilter={setOrderFilter}
            setSpendingFilter={setSpendingFilter}
            clearFilters={clearFilters}
            t={t}
          />

          {/* TABLE (Woocommerce) */}
          <CustomersTable customers={filteredCustomers} />

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
