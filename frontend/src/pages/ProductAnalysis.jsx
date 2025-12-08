import React from 'react';
import TopSellingProductsChart from '../components/products/woocommerce/topSellingProducts';
import TopSellingProductsChartExcel from "../components/products/excel/topSellingProductsExcel";
import TopSellingProductsChartInbetween from '@/components/products/woocommerce/topSellingProductsInbetween';
import TopSellingProductsChartInbetweenExcel from '../components/products/excel/topSellingProductsInbetweenExcel';
import ProductSalesTable from '../components/products/woocommerce/productSalesTable';
import ProductSalesTableExcel from '../components/products/excel/ProductSalesTableExcel'
// import ProductTable from '../components/products/productsTable'
import { useTranslation } from 'react-i18next';

const ProductAnalysis = () => {
  const { t } = useTranslation("productAnalysis");
  const dataSource = localStorage.getItem("data_source"); // "excel" or "woocommerce"
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">{t('productSalesAnalysis')}</h2>
       {/* Conditionally Render Chart */}
       {dataSource === "excel" ? (
        <>
          <TopSellingProductsChartExcel />
          <TopSellingProductsChartInbetweenExcel />
          <ProductSalesTableExcel />
        </>
      ) : (
        <>
          <TopSellingProductsChart /> // WooCommerce default
          <TopSellingProductsChartInbetween />
          <ProductSalesTable />
        </>
      )}
      
      {/* <ProductTable /> */}
    </div>
  );
};

export default ProductAnalysis;
