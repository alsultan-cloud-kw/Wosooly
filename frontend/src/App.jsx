import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from "./pages/landing"
import RegisterPage from "./pages/register.jsx"
import LoginPage from './pages/signIn.jsx'
import Dashboard from "./pages/dashboard.jsx"
import Layout from './components/layout/Layout.jsx';
import ProductAnalysis from './pages/ProductAnalysis.jsx';
import CustomerAnalysis from './pages/CustomerAnalysis.jsx';
import CustomerDetails from './pages/customerDetails'
import OrderAnalysis from './pages/OrderAnalysis.jsx'
import PricingPage from './pages/subscription.jsx'
import Chat from './pages/chat.jsx'
import Whatsapp from './pages/whatsapp_credentials'
import ProductSalesGraph from './components/products/woocommerce/ProductSalesGraph'
import Messaging from './pages/messaging'
import SelectDataSourcePage from './pages/DataSourceSelector'
import WooCommerceCredentialsForm from './pages/ConnectWcomm'
import ExcelUpload from './pages/ExcelUpload'
import ColumnMappingPage from './pages/columnMapping'
import SignInDataSelection from './pages/sign_in_data_selection'
import UserDashboard from './pages/UserDahsboard'
import { Toaster } from './components/ui/toast'
import AdminDashboard from './pages/Admin/adminDashboard'
import AdminSignIn from './pages/Admin/signin'
import AdminRegister from './pages/Admin/register'
import ClientsPage from './components/admin/clients-table-separate'
import WooCommerceIntegrationsPage from './pages/Admin/woocommerce-integrations'

function App() {

  return (
 
    <Router>
    <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/subscription" element={<PricingPage />} />
        <Route path="/register" element={ <RegisterPage />} />
        <Route path="/login" element={ <LoginPage />} />
        <Route path="/datasource-selector" element={<SelectDataSourcePage />} />
        <Route path="/connect-woocommerce" element={<WooCommerceCredentialsForm />} />
        <Route path="/upload-excel" element={<ExcelUpload />} />
        <Route path="/column-mapping" element={<ColumnMappingPage />} />
        <Route path="/column-mapping/:fileId" element={<ColumnMappingPage />} />
        <Route path="/sign-in-data-selection" element={<SignInDataSelection />} />
        <Route path="/admin" element={<AdminSignIn />} />

        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/ProductAnalysis" element={<ProductAnalysis />} />
          <Route path="/product-sales/:id" element={<ProductSalesGraph />} />
          <Route path="/CustomerAnalysis" element={<CustomerAnalysis />} />
          <Route path="/customer-details/:id" element={<CustomerDetails />} />
          <Route path="/orderAnalysis" element={<OrderAnalysis />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/whatsapp" element={<Whatsapp />} />
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/clients" element= {<ClientsPage />} />
          <Route path="/admin/integrations" element={<WooCommerceIntegrationsPage />} />
        </Route>
    </Routes>
    <Toaster />
    </Router>
  )
}

export default App
