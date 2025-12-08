import React, { useEffect, useState } from 'react'
import Table from '../../table/Table'
import api from '../../../../api_config'
import { useTranslation } from 'react-i18next';

const LocationBasedOrdersExcel = () => {
  const { t } = useTranslation("ordersAnalysis");
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get("/excel_orders/orders-by-location")
        const data = res.data || []
        
        // Sort orders descending by order_count
        const sorted = data.sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
        setOrders(sorted)

        // Calculate total orders count
        const total = sorted.reduce((sum, item) => sum + (item.order_count || 0), 0)
        setTotalOrders(total)

        setLoading(false)
      } catch (err) {
        console.error('Error fetching location-based orders:', err)
        setError(err.message || 'Failed to fetch orders')
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const headData = ["city", "orders"]
  const renderHead = (item, index) => <th key={index}>{t(item)}</th>

  const renderBody = (item, index) => (
    <tr key={index}>
      <td>{item.city || 'N/A'}</td>
      <td>{item.order_count || 0}</td>
    </tr>
  )

  if (loading) return <div className="p-4">{t("loading") || "Loading..."}</div>
  if (error) return <div className="p-4 text-red-500">{t("error") || "Error"}: {error}</div>

  return (
    <div className="col-12">
      <div className="card">
        <div className="card__header">
          <h3>{t("title_location") || "Orders by Location"}</h3>
          {totalOrders > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {t("totalOrders") || "Total Orders"}: <span className="font-semibold">{totalOrders}</span>
            </p>
          )}
        </div>
        <div className="card__body">
          {orders.length > 0 ? (
            <Table
              limit="10"
              headData={headData}
              renderHead={renderHead}
              bodyData={orders}
              renderBody={renderBody}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              {t("noDataAvailable") || "No location data available"}
            </div>
          )}
        </div>
        <div className="card__footer">{/* Optional footer content */}</div>
      </div>
    </div>
  )
}

export default LocationBasedOrdersExcel
