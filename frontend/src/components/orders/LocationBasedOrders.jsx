import React, { useEffect, useState } from 'react'
import Table from '../table/Table' // Adjust path if needed
import API_BASE_URL from '../../../api_config'
import { useTranslation } from 'react-i18next';

function OrdersTable() {
  const { t } = useTranslation("ordersAnalysis");
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/orders-by-city`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Network response was not ok")
        }
        return res.json()
      })
      .then(data => {
        // Sort orders descending by 'orders'
        const sorted = data.sort((a, b) => b.orders - a.orders)
        setOrders(sorted)

        // ✅ Calculate total orders count
        const total = sorted.reduce((sum, item) => sum + item.order_count, 0)
        setTotalOrders(total)

        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const headData = ["city", "orders"]
  const renderHead = (item, index) => <th key={index}>{t(item)}</th>

  const renderBody = (item, index) => (
    <tr key={index}>
      <td>{item.city}</td>
      {/* <td>{item.coordinates.join(', ')}</td> */}
      <td>{item.order_count}</td>
    </tr>
  )

  if (loading) return <div className="p-4">{t("loading")}</div>
  if (error) return <div className="p-4 text-red-500">{t("error")}: {error}</div>

  return (
    <div className="col-12">
      {/* <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Orders by City</h2>
        <div className="text-lg font-semibold">
          Total Orders: {totalOrders}
        </div>
      </div> */}
      <div className="card">
        <div className="card__header">
          <h3>{t("title_location")}</h3>
          {/* <p className="text-sm text-gray-600 mt-2">
            Showing <span className="font-semibold">{orders.length}</span> order
            {orders.length !== 1 ? 's' : ''} in selected date range
          </p> */}
        </div>
        <div className="card__body">
          <Table
            limit="10"
            headData={headData}
            renderHead={renderHead}
            bodyData={orders}
            renderBody={renderBody}
          />
        </div>
        <div className="card__footer">{/* Optional footer content */}</div>
      </div>
    </div>
  )
}

export default OrdersTable
