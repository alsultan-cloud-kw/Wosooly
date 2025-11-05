import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../../api_config';
import { useTranslation } from 'react-i18next';

const OrdersInRangeGraph = () => {

  const { t } = useTranslation("ordersAnalysis");

  const [granularity, setGranularity] = useState('daily');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (startDate && endDate) {
      const fetchData = async () => {
        try {
          const res = await api.get("/orders-in-range", {
            params: {
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              granularity: granularity
            }
          });
          setChartData(res.data);
        } catch (err) {
          console.error('Failed to fetch data:', err);
        }
      };

      fetchData();
    }
  }, [startDate, endDate, granularity]);

  // const totalOrders = chartData.length;
  const totalOrders = chartData.reduce((sum, item) => sum + (item.order_count || 0), 0);
  const totalAmount = chartData.reduce((sum, item) => sum + item.total_amount, 0);

  const chartOptions = {
    chart: {
      id: 'orders-line-chart',
      background: 'transparent',
      toolbar: { show: false }
    },
    xaxis: {
      categories: chartData.map(item => item.date),
      title: {
        text: t("date")
      }
    },
    yaxis: {
      title: {
        text: t("amountYAxis")
      },
      labels: {
        formatter: val => val.toFixed(3)
      }
    },
    tooltip: {
      y: {
        formatter: val => `KD ${val.toFixed(3)}`
      }
    },
    stroke: {
      curve: 'smooth'
    },
    grid: {
      show: true
    }
  };

  const series = [
    {
      name: 'Total Order Amount',
      data: chartData.map(item => item.total_amount)
    }
  ];

  // 📅 Utility for month/year selection
  const renderDatePickers = () => {
    if (granularity === 'daily') {
      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 500, marginBottom: '4px' }}>{t("startDate")}</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="yyyy-MM-dd"
              className="date-picker-input"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 500, marginBottom: '4px' }}>{t("endDate")}</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="yyyy-MM-dd"
              className="date-picker-input"
            />
          </div>
        </>
      );
    }

    if (granularity === 'monthly') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 500, marginBottom: '4px' }}>{t("month")}</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => {
              const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 12);
              const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
              setStartDate(firstDay);
              setEndDate(lastDay);
            }}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            className="date-picker-input"
          />
        </div>
      );
    }

    if (granularity === 'yearly') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 500, marginBottom: '4px' }}>{t("year")}</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => {
              const firstDay = new Date(date.getFullYear(), 0, 1);
              const lastDay = new Date(date.getFullYear(), 11, 31);
              setStartDate(firstDay);
              setEndDate(lastDay);
            }}
            dateFormat="yyyy"
            showYearPicker
            className="date-picker-input"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="card">
      <div className="card__header">
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            marginTop: '1rem',
            flexWrap: 'wrap',
            backgroundColor: '#f9f9f9',
            padding: '1rem',
            borderRadius: '8px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 500, marginBottom: '4px' }}>{t("analysisType")}</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
            >
              <option value="daily">{t("dailyAnalysis")}</option>
              <option value="monthly">{t("monthlyAnalysis")}</option>
              <option value="yearly">{t("yearlyAnalysis")}</option>
            </select>
          </div>
          {renderDatePickers()}
        </div>
      </div>
      <div className="card__body" style={{ marginTop: '1rem' }}>
        {chartData.length > 0 && (
  <div
    style={{
      marginTop: '1rem',
      backgroundColor: '#eef2f6',
      padding: '1rem',
      borderRadius: '8px',
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap'
    }}
  >
    <div>
      <strong>{t("totalOrders")}:</strong> {totalOrders}
    </div>
    <div>
      <strong>{t("totalAmount")}:</strong> KD {totalAmount.toFixed(3)}
    </div>
  </div>
)}
        <Chart options={chartOptions} series={series} type="line" height={350} />
      </div>
    </div>
  );
};

export default OrdersInRangeGraph;
