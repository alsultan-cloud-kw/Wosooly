import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from "./pages/landing"
import RegisterPage from "./pages/register.jsx"
import LoginPage from './pages/signIn.jsx'
import Dashboard from "./pages/dashboard.jsx"
import Layout from './components/layout/Layout.jsx';
import ProductAnalysis from './pages/ProductAnalysis.jsx';
import CustomerAnalysis from './pages/CustomerAnalysis.jsx'
import OrderAnalysis from './pages/OrderAnalysis.jsx'

function App() {

  return (
 
    <Router>
    <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={ <RegisterPage />} />
        <Route path="/login" element={ <LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ProductAnalysis" element={<ProductAnalysis />} />
          <Route path="/CustomerAnalysis" element={<CustomerAnalysis />} />
          <Route path="/orderAnalysis" element={<OrderAnalysis />} />
        </Route>

    </Routes>
    </Router>
  )
}

export default App
