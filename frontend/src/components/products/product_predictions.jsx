import React, { useEffect, useState } from 'react'
import Table from '../table/Table'
import API_BASE_URL from '../../../api_config'

const ForecastTable = ({ productId, productName }) => {
  const [forecastData, setForecastData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const headData = [
    'Date',
    'Forecasted Units',
    'Lower Bound',
    'Upper Bound',
    'Previous Day Units',
    'Uncertainty',
    'CV',
    'Offer Applied'
  ]

  const renderHead = (item, index) => <th key={index}>{item}</th>

  const renderBody = (item, index) => (
    <tr key={index}>
      <td>{item.date}</td>
      <td>{item.forecasted_units?.toFixed(0)}</td>
      <td>{item.lower_bound?.toFixed(0)}</td>
      <td>{item.upper_bound?.toFixed(0)}</td>
      <td>{item.previous_day_units !== null ? item.previous_day_units.toFixed(0) : '-'}</td>
      <td>{item.uncertainty?.toFixed(1)}</td>
      <td>{item.cv?.toFixed(2)}</td>
      <td>{item.offer_applied}</td>
    </tr>
  )

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/forecast-with-offer/${productId}`)
        if (!response.ok) throw new Error('Failed to fetch forecast data')
        const data = await response.json()

        const sanitizedForecast = data.map(item => ({
          ...item,
          forecasted_units: Math.max(0, item.forecasted_units),
          lower_bound: Math.max(0, item.lower_bound),
          upper_bound: Math.max(0, item.upper_bound)
        }))

        setForecastData(sanitizedForecast)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [productId])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>
  if (forecastData.length === 0) return <p>No forecast data available.</p>

  return (
    <div>
      <h2>30-Day Forecast for Product: {productName}</h2>
      <Table
        limit="10"
        headData={headData}
        renderHead={renderHead}
        bodyData={forecastData}
        renderBody={renderBody}
      />
    </div>
  )
}

export default ForecastTable
