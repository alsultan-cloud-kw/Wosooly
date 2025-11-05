import React from 'react';
import TopSellingProductsChart from '../components/products/topSellingProducts';
import TopSellingProductsChartInbetween from '../components/products/topSellingProductsInbetween';
import ProductSalesTable from '../components/products/productSalesTable';
// import ProductTable from '../components/products/productsTable'
import { useTranslation } from 'react-i18next';

const ProductAnalysis = () => {
  const { t } = useTranslation("productAnalysis");

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">{t('productSalesAnalysis')}</h2>
      <TopSellingProductsChart />
      <TopSellingProductsChartInbetween />
      <ProductSalesTable />
      {/* <ProductTable /> */}
    </div>
  );
};

export default ProductAnalysis;
