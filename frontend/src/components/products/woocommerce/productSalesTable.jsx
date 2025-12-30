import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Table from '../../table/Table';
import api from '../../../../api_config';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const ProductSalesTable = () => {
  const [products, setProducts] = useState([])
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)))
  const [endDate, setEndDate] = useState(new Date())
  const [grandTotal, setGrandTotal] = useState(0);

  const navigate = useNavigate()
  const { t } = useTranslation("productAnalysis");

  const fetchSales = async () => {
    try {
      const res = await api.get("/products-sales-table", {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      })
     
      setProducts(res.data)
      // ✅ Calculate grand total here
      const total = res.data.reduce((sum, item) => sum + (item.price * item.total_sales), 0);
      setGrandTotal(total);
    } catch (err) {
      console.error('Error fetching product sales:', err)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [startDate, endDate])

  const headData = ['id', 'name', 'category', 'price', 'total_quantity', 'total_amount']

  const renderHead = (item, index) => <th key={index}>{t(item)}</th>

  const handleRowClick = (item) => {
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
    navigate(`/product-sales/${item.id}`, {
      state: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        productName: item.name
      }
    });
  }

  const renderBody = (item, index) => (
    <tr key={index} onClick={() => handleRowClick(item)} style={{ cursor: 'pointer' }}>
      <td>{item.id}</td>
      <td>{item.name}</td>
      <td>{item.category}</td>
      <td>{item.price}</td>
      <td>{item.total_sales}</td>
      <td>{(item.price * item.total_sales).toFixed(2)}</td> 
    </tr>
  )

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t("product_sales_by_date")}</h2>

      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("start_date")}</label>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("end_date")}</label>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            className="border p-2 rounded"
          />
        </div>
      </div>
        <div className="col-12">
          <div className="card">
            <div className="card__header">
              <h3>{t("sales_per_product")}</h3>
            </div>
            <div className="flex justify-between items-center mb-4">
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
            <div className="card__footer">
              {/* <Link to='/'>view all</Link> */}
            </div>
          </div>
        </div>         
    </div>
  )
}

export default ProductSalesTable
