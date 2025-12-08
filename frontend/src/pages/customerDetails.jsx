import React, { useEffect, useState } from 'react';
import Table from '../components/table/Table';
import api from '../../api_config'
import Chart from 'react-apexcharts';
import { useNavigate, useParams } from 'react-router-dom';
// import WhatsAppMessaging from '../components/whatsapp_messaging';
import CustomerForecast from '../components/customers/woocommerce/CustomerProductSuggesion';
import { useTranslation } from 'react-i18next';

const CustomerDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState({
    customer: null,
    orders: [],
    top_products: [],
    all_products_summary: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();



  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get(`/customer-details/${id}`);
        setData(res.data);
        console.log("Fetched customer data:", res.data);
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!data.customer) return <div>No data available.</div>;

  const { customer, orders, top_products, all_products_summary } = data;

  const chartOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: top_products.map(p => p.product_name) },
    title: { text: 'Top Ordered Products', align: 'center' }
  };
  const chartSeries = [{
    name: 'Quantity Sold',
    data: top_products.map(p => p.total_quantity)
  }];

  const productSummaryHead = ['Product', 'Total Quantity'];
  const renderProductSummaryHead = (item, index) => <th key={index}>{item}</th>;
  const renderProductSummaryBody = (item, index) => (
    <tr
      key={index}
      onClick={() => navigate(`/productOrdergraph?customer_id=${id}&product_external_id=${item.product_id}`)}
      style={{ cursor: 'pointer' }}
    >
      <td>{item.product_name}</td>
      <td>{item.total_quantity}</td>
    </tr>
  );

  const orderTableHead = ['Order ID', 'Date', 'Status', 'Product', 'Qty', 'Price', 'Category'];
  const renderOrderHead = (item, idx) => <th key={idx}>{item}</th>;
  const renderOrderBody = (order, idx) => (
    order.items.map((item, i) => (
      <tr key={`${idx}-${i}`}>
        <td>{order.external_order_id}</td>
        <td>{new Date(order.order_date).toLocaleDateString()}</td>
        <td>{order.order_status}</td>
        <td>{item.product_name}</td>
        <td>{item.product_quantity}</td>
        <td>{item.product_price?.toFixed(2) ?? '-'}</td>
        <td>{item.product_category || '-'}</td>
      </tr>
    ))
  );

  return (
    <div className="col-12">
      <div className="card">
        <div className="card__header" style={{ textAlign: 'center' }}>
          <h3>Customer Details</h3>
          <p style={{ color: '#007bff', fontSize: '1.25rem', fontWeight: '600' }}>
            <strong>{customer.first_name} {customer.last_name}</strong>
          </p>
        </div>

        <div className="card__body">
          <p><strong>Name:</strong> {customer.first_name} {customer.last_name}</p>
          <p><strong>Phone:</strong> {customer.phone}</p>
          <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
          <p><strong>Address:</strong> {customer.address_1}, {customer.city}, {customer.country}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header"><h3>Top Ordered Products</h3></div>
        <div className="card__body">
          <Chart options={chartOptions} series={chartSeries} type="bar" height={350} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header"><h3>All Products Order Summary</h3></div>
        <div className="card__body">
          <Table
            limit="10"
            headData={productSummaryHead}
            renderHead={renderProductSummaryHead}
            bodyData={[...all_products_summary].sort((a, b) => b.total_quantity - a.total_quantity)}
            renderBody={renderProductSummaryBody}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header">
          <h3>Order History ({orders.length})</h3>
        </div>
        <div className="card__body">
          <Table
            limit="10"
            headData={orderTableHead}
            renderHead={renderOrderHead}
            bodyData={orders.flatMap((order, idx) => order.items.map((item, i) => ({
              order, item, idx, i
            })))}
            renderBody={({ order, item }, idx) => (
              <tr key={idx}>
                <td>{order.external_order_id}</td>
                <td>{new Date(order.order_date).toLocaleDateString()}</td>
                <td>{order.order_status}</td>
                <td>{item.product_name}</td>
                <td>{item.product_quantity}</td>
                <td>{item.product_price?.toFixed(2) ?? '-'}</td>
                <td>{item.product_category || '-'}</td>
              </tr>
            )}
          />
        </div>
      </div>

      {/* <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header"><h3>WhatsApp Messaging</h3></div>
        <div className="card__body"><WhatsAppMessaging phone={customer.phone}/></div>
      </div> */}

      {/* <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header"><h3>Customer Forecast</h3></div>
        <div className="card__body">
          <CustomerForecast customerId={id} />
        </div>
      </div> */}

    </div>
  );
};

export default CustomerDetails;
