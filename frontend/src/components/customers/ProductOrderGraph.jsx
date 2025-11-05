import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Chart from 'react-apexcharts';
import axios from 'axios';
import API_BASE_URL from '../../../api_config';

const ProductOrderGraph = () => {
  const [searchParams] = useSearchParams();
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);

  const customer_id = searchParams.get('customer_id');
  const product_external_id = searchParams.get('product_external_id');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/customer-product-orders?customer_id=${customer_id}&product_external_id=${product_external_id}`
        );
        setOrderData(res.data);
      } catch (err) {
        console.error('Error fetching product order data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customer_id, product_external_id]);

  if (loading) return <div>Loading chart...</div>;
  if (orderData.length === 0) return <div>No order data available.</div>;

  const chartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: true }
    },
    xaxis: {
      categories: orderData.map(item => item.date),
      title: { text: 'Date' }
    },
    yaxis: {
      title: { text: 'Quantity Ordered' }
    },
    title: {
      text: 'Order Quantity Over Time',
      align: 'center'
    },
    dataLabels: {
      enabled: true
    },
    stroke: {
      curve: 'smooth'
    }
  };

  const chartSeries = [
    {
      name: 'Quantity',
      data: orderData.map(item => item.quantity)
    }
  ];

  return (
    <div className="card" style={{ margin: '2rem' }}>
      <div className="card__header">
        <h3>Product Order Trend</h3>
      </div>
      <div className="card__body">
        <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
      </div>
    </div>
  );
};

export default ProductOrderGraph;
