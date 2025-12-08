import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../../../api_config";
import Table from "../../table/Table";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";

const ProductSalesTableExcel = () => {
  const [products, setProducts] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState(new Date());
  const [grandTotal, setGrandTotal] = useState(0);

  const { t } = useTranslation("productAnalysis");

  const fetchSales = async () => {
    try {
      const res = await api.get("/excel_products/products-sales-table", {
        params: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
        },
      });

      const rows = res.data.rows || [];
      console.log("products sales table data", )
      setProducts(rows);

      const total = rows.reduce(
        (sum, item) => sum + item.price * item.total_quantity,
        0
      );
      setGrandTotal(total);
    } catch (err) {
      console.error("Error fetching product sales:", err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  const headData = [
    "id",
    "name",
    "category",
    "price",
    "total_quantity",
    "total_amount",
  ];

  const renderHead = (item, i) => <th key={i}>{t(item)}</th>;

  const renderBody = (item, i) => (
    <tr key={i}>
      <td>{item.id}</td>
      <td>{item.name}</td>
      <td>{item.category}</td>
      <td>{item.price}</td>
      <td>{item.quantity}</td>
      <td>{(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  );

  // -----------------------------------------
  // EXPORT TO EXCEL
  // -----------------------------------------
  const exportToExcel = () => {
    if (!products.length) return;

    const exportData = products.map((p) => ({
      ID: p.id,
      Name: p.name,
      Category: p.category,
      Price: p.price,
      Total_Quantity: p.quantity,
      Total_Amount: (p.price * p.quantity).toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "ProductSales");

    XLSX.writeFile(
      wb,
      `Product_Sales_${startDate.toISOString().slice(0, 10)}_to_${endDate
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  // -----------------------------------------

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        {t("product_sales_by_date_excel")}
      </h2>

      {/* DATE PICKERS */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("start_date")}
          </label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            className="border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("end_date")}
          </label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="border p-2 rounded"
          />
        </div>
      </div>

      {/* CARD */}
      <div className="card shadow">
        <div className="card__header flex justify-between items-center">
          <h3>{t("sales_per_product")}</h3>

          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {t("download_excel")}
          </button>
        </div>

        <div className="flex justify-between items-center mb-4 px-4">
          <h2 className="text-xl font-bold">{t("product_sales_by_date")}</h2>

          <div className="text-lg font-semibold">
            {t("grand_total_kd")} {grandTotal.toFixed(2)}
          </div>
        </div>

        <div className="card__body">
          <Table
            limit="10"
            headData={headData}
            renderHead={renderHead}
            bodyData={products}
            renderBody={renderBody}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductSalesTableExcel;
