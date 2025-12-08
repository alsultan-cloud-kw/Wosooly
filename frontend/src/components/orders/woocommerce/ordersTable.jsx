import React, { useState, useEffect } from 'react'
import Table from '../../table/Table'
import api from '../../../../api_config'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useTranslation } from 'react-i18next';

const OrderTable = () => {

  const { t } = useTranslation("ordersAnalysis");
  
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  const simplifyReferrer = (url) => {
  if (!url) return ''

  const mappings = {
    'google.com': 'google',
    'instagram.com': 'instagram',
    'l.instagram.com': 'instagram',
    'souqalsultan.com': 'souqalsultan',
    'linktr.ee': 'linktree',
    'kpay.com.kw': 'knet',
    'facebook.com': 'facebook',
    'fbclid=': 'facebook',
  }

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname

    // Match known domains
    for (const key in mappings) {
      if (hostname.includes(key) || url.includes(key)) {
        return mappings[key]
      }
    }

    return hostname // fallback to the hostname itself
  } catch (e) {
    return url // fallback to raw URL if invalid
  }
}

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders-data")

       // Preprocess attribution_referrer
    const enrichedData = res.data.map((order) => ({
      ...order,
      attribution_referrer: simplifyReferrer(order.attribution_referrer),
    }))

      setOrders(enrichedData)
      setFilteredOrders(enrichedData)
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filterByDateRange = () => {
    if (startDate && endDate) {
      const filtered = orders.filter((order) => {
        const orderDate = new Date(order.date)
        return orderDate >= startDate && orderDate <= endDate
      })
      setFilteredOrders(filtered)
    } else {
      setFilteredOrders(orders)
    }
  }

  useEffect(() => {
    filterByDateRange()
  }, [startDate, endDate, orders])

  const headData = ['orderId', 'customer', 'date', 'amount', 'status', 'attributionReferrer']

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
            item.status === 'processing'
              ? 'bg-yellow-500'
              : item.status === 'failed'
              ? 'bg-red-500'
              : 'bg-green-500'
          } text-white px-2 py-1 rounded`}
        >
          {item.status}
        </span>
      </td>
      <td>{item.attribution_referrer}</td>
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
            placeholderText={t("startDatePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("endDate")}</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="border px-3 py-2 rounded"
            dateFormat="dd MMM yyyy"
            placeholderText={t("endDatePlaceholder")}
          />
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card__header">
            <h3>{t("tableTitle")}</h3>
            <p className="text-sm text-gray-600 mt-2">
                {t("showing")} <span className="font-semibold">{filteredOrders.length}</span> {t("order")}
                {filteredOrders.length !== 1 ? 's' : ''} {t("inSelectedDateRange")}
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

export default OrderTable
