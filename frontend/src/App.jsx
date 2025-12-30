import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from "./pages/landing"
import RegisterPage from "./pages/register.jsx"
import LoginPage from './pages/signIn.jsx'
import ForgotPasswordPage from './pages/forgotPassword.jsx'
import ResetPasswordPage from './pages/resetPassword.jsx'
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
import { Toaster as HotToaster } from 'react-hot-toast'
import AdminDashboard from './pages/Admin/adminDashboard'
import AdminSignIn from './pages/Admin/signin'
import AdminRegister from './pages/Admin/register'
import AdminForgotPassword from './pages/Admin/forgotPassword'
import AdminResetPassword from './pages/Admin/resetPassword'
import ClientsPage from './components/admin/clients-table-separate'
import WooCommerceIntegrationsPage from './pages/Admin/woocommerce-integrations'
import AddInstagramProfile from './pages/scraper/AddInstagramProfile'
import DashboardScraper from './pages/scraper/Dashboard'
import Emailing from './pages/emailing'
import { ProtectedRoute } from './components/routes/ProtectedRoute'
import { AdminProtectedRoute } from './components/routes/AdminProtectedRoute'
import { PublicRoute } from './components/routes/PublicRoute'

function App() {

  return (
 
    <Router>
    <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/subscription" element={<PublicRoute><PricingPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/sign-in" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        
        {/* Admin public routes */}
        <Route path="/admin" element={<PublicRoute redirectTo="/admin-dashboard"><AdminSignIn /></PublicRoute>} />
        <Route path="/admin/forgot-password" element={<PublicRoute><AdminForgotPassword /></PublicRoute>} />
        <Route path="/admin/reset-password" element={<PublicRoute><AdminResetPassword /></PublicRoute>} />

        {/* Protected routes - require authentication */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* User routes - accessible to authenticated users */}
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
          <Route path="/emailing" element={<Emailing />} />
          <Route path="/dashboard-scraper" element={<DashboardScraper />} />
          <Route path="/add-instagram-profile" element={<AddInstagramProfile />} />
          
          {/* Data source setup routes */}
          <Route path="/datasource-selector" element={<SelectDataSourcePage />} />
          <Route path="/connect-woocommerce" element={<WooCommerceCredentialsForm />} />
          <Route path="/upload-excel" element={<ExcelUpload />} />
          <Route path="/column-mapping" element={<ColumnMappingPage />} />
          <Route path="/column-mapping/:fileId" element={<ColumnMappingPage />} />
          <Route path="/sign-in-data-selection" element={<SignInDataSelection />} />
        </Route>

        {/* Admin protected routes - require admin authentication */}
        <Route element={<AdminProtectedRoute><Layout /></AdminProtectedRoute>}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/admin/integrations" element={<WooCommerceIntegrationsPage />} />
        </Route>
    </Routes>
    <Toaster />
    <HotToaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
          borderRadius: '10px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: {
          duration: 5000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
        },
      }}
    />
    </Router>
  )
}

export default App
