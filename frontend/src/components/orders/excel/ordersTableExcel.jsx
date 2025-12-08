import React, { useState, useEffect } from 'react'
import Table from '../../table/Table'
import api from '../../../../api_config'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useTranslation } from 'react-i18next';

const OrdersTableExcel = () => {

  const { t } = useTranslation("ordersAnalysis");
  
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  const fetchOrders = async () => {
    try {
      const res = await api.get("/excel_orders/orders-data")
      setOrders(res.data || [])
      setFilteredOrders(res.data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setOrders([])
      setFilteredOrders([])
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filterByDateRange = () => {
    if (startDate && endDate) {
      const filtered = orders.filter((order) => {
        if (!order.date) return false
        
        // Parse the formatted date string (e.g., "15 Jan 2024")
        // Try to parse the date - handle various formats
        let orderDate
        try {
          orderDate = new Date(order.date)
          // If date is invalid, try parsing with different format
          if (isNaN(orderDate.getTime())) {
            // Try parsing as "dd MMM yyyy" format
            const parts = order.date.split(' ')
            if (parts.length === 3) {
              const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
              }
              const day = parseInt(parts[0])
              const month = months[parts[1]] || 0
              const year = parseInt(parts[2])
              orderDate = new Date(year, month, day)
            } else {
              return false
            }
          }
        } catch (e) {
          return false
        }
        
        // Set time to start/end of day for proper comparison
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        
        // Reset time for order date
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        
        return orderDateOnly >= start && orderDateOnly <= end
      })
      setFilteredOrders(filtered)
    } else {
      setFilteredOrders(orders)
    }
  }

  useEffect(() => {
    filterByDateRange()
  }, [startDate, endDate, orders])

  const headData = ['orderId', 'customer', 'date', 'amount', 'status']

  const renderHead = (item, index) => <th key={index}>{t(item)}</th>

  const renderBody = (item, index) => (
    <tr key={index}>
      <td>{item.id}</td>
      <td>{item.user}</td>
      <td>{item.date}</td>
      <td>{item.Amount}</td>
      <td>
        <span
          className={`badge ${
            item.status === 'processing' || item.status === 'pending'
              ? 'bg-yellow-500'
              : item.status === 'failed' || item.status === 'cancelled'
              ? 'bg-red-500'
              : 'bg-green-500'
          } text-white px-2 py-1 rounded`}
        >
          {item.status || 'completed'}
        </span>
      </td>
    </tr>
  )

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t("pageTitle")}</h2>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium mb-1">{t("startDate")}</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            className="border px-3 py-2 rounded"
            dateFormat="dd MMM yyyy"
            placeholderText={t("startDatePlaceholder") || "Select start date"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("endDate")}</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="border px-3 py-2 rounded"
            dateFormat="dd MMM yyyy"
            placeholderText={t("endDatePlaceholder") || "Select end date"}
          />
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card__header">
            <h3>{t("tableTitle") || "Orders Table"}</h3>
            <p className="text-sm text-gray-600 mt-2">
                {t("showing") || "Showing"} <span className="font-semibold">{filteredOrders.length}</span> {t("order") || "order"}
                {filteredOrders.length !== 1 ? 's' : ''} {t("inSelectedDateRange") || "in selected date range"}
            </p>
          </div>
          <div className="card__body">
            <Table
              limit="10"
              headData={headData}
              renderHead={renderHead}
              bodyData={filteredOrders}
              renderBody={renderBody}
            />
          </div>
          <div className="card__footer">{/* Optional footer */}</div>
        </div>
      </div>
    </div>
  )
}

export default OrdersTableExcel
