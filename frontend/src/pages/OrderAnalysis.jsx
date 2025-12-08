// import React from 'react';
// import OrdersInRangeGraph from '../components/orders/ordersInRangeGraph';
// // import TopSellingProductsChartInbetween from '../components/products/topSellingProductsInbetween';
// import AttributionPieChart from '../components/orders/AttributionPieChart'
// import OrderTable from '../components/orders/ordersTable'
// import LocationBasedOrders from '../components/orders/LocationBasedOrders';
// import { useTranslation } from 'react-i18next';

// const OrderAnalysis = () => {
//   const { t } = useTranslation("ordersAnalysis");

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-semibold mb-4">{t("orderAnalysis")}</h2>
//       <OrdersInRangeGraph />
//       {/* <TopSellingProductsChartInbetween /> */}
//       <AttributionPieChart />
//       <OrderTable/>
//       {/* <LocationBasedOrders /> */}
//     </div>
//   );
// };

// export default OrderAnalysis;

import React from 'react';
import OrdersInRangeGraph from '../components/orders/woocommerce/ordersInRangeGraph';
import OrdersInRangeGraphExcel from '../components/orders/excel/ordersInRangeGraphExcel';
// import AttributionPieChart from '../components/orders/woocommerce/AttributionPieChart';
// import AttributionPieChartExcel from '../components/orders/excel/AttributionPieChartExcel';
import OrderTable from '../components/orders/woocommerce/ordersTable';
import OrdersTableExcel from '../components/orders/excel/ordersTableExcel';
// import LocationBasedOrders from '../components/orders/woocommerce/LocationBasedOrders';
import LocationBasedOrdersExcel from '../components/orders/excel/locationBasedOrdersExcel';
import { useTranslation } from 'react-i18next';

const OrderAnalysis = () => {
  const { t } = useTranslation("ordersAnalysis");
  const dataSource = localStorage.getItem("data_source"); // "excel" or "woocommerce"

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">{t("orderAnalysis")}</h2>

      {dataSource === "excel" ? (
        <>
          <OrdersInRangeGraphExcel />
          {/* <AttributionPieChartExcel /> */}
          <OrdersTableExcel />
          <LocationBasedOrdersExcel />
        </>
      ) : (
        <>
          <OrdersInRangeGraph />
          {/* <AttributionPieChart /> */}
          <OrderTable />
          {/* <LocationBasedOrders /> */}
        </>
      )}
    </div>
  );
};

export default OrderAnalysis;
