import React, { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import Chart from 'react-apexcharts'
import api from '../../../../api_config'
import ForecastTable from './product_predictions'

const ProductSalesGraph = () => {
  const { id } = useParams()
  const location = useLocation()
  const { startDate, endDate, productName } = location.state || {}

  const [chartData, setChartData] = useState({
    categories: [],
    series: []
  })

  const [externalId, setExternalId] = useState(null)

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const res = await api.get(`/product-sales-over-time`, {
          params: {
            start_date: startDate,
            end_date: endDate,
            product_id: id
          }
        })
        
        const dates = res.data.map(item => item.date)
        const sales = res.data.map(item => item.total_sales)

        setChartData({
          categories: dates,
          series: [
            {
              name: productName || `Product #${id}`,
              data: sales
            }
          ]
        })
        console.log("response data", res.data)
        setExternalId(res.data[0].external_id)
      } catch (err) {
        console.error('Error fetching product sales data:', err)
      }
    }

    if (startDate && endDate && id) {
      fetchSalesData()
    }
  }, [id, startDate, endDate, productName])

  const options = {
    chart: {
      id: 'product-sales',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    xaxis: {
      categories: chartData.categories,
      title: { text: 'Date' }
    },
    yaxis: {
      title: { text: 'Total Sales' },
      min: 0
    },
    title: {
      text: `Sales Over Time`,
      align: 'center'
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth'
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        {productName || `Product #${id}`} - Sales Graph
      </h2>
      <Chart
        options={options}
        series={chartData.series}
        type="line"
        height={400}
      />
      {/* 🔥 Render forecast only if externalId is available */}
      {externalId && <ForecastTable productId={externalId} productName={productName} />}
    </div>
  )
}

export default ProductSalesGraph
