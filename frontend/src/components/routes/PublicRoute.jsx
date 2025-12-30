import { Navigate, useLocation } from "react-router-dom"

/**
 * PublicRoute - For public routes (login, register, etc.)
 * Redirects authenticated users away from public pages
 * Exception: subscription page is accessible to authenticated users
 */
export function PublicRoute({ children, redirectTo = null }) {
  const token = localStorage.getItem("token")
  const userType = localStorage.getItem("user_type")
  const location = useLocation()
  const currentPath = location.pathname

  // Allow authenticated users to access subscription page
  if (token && currentPath === "/subscription") {
    return children
  }

  // If user is authenticated, redirect to appropriate dashboard
  if (token) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    
    // Default redirect based on user type
    if (userType === "admin") {
      return <Navigate to="/admin-dashboard" replace />
    }
    return <Navigate to="/user-dashboard" replace />
  }

  return children
}

