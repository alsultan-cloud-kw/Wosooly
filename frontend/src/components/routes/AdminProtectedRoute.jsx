import { Navigate, useLocation } from "react-router-dom"

/**
 * AdminProtectedRoute - Protects routes that require admin authentication
 * Redirects to admin login if user is not authenticated or not an admin
 */
export function AdminProtectedRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem("token")
  const userType = localStorage.getItem("user_type")

  // If no token, redirect to admin login
  if (!token) {
    return <Navigate to="/admin" state={{ from: location }} replace />
  }

  // If user is not an admin, redirect to user dashboard
  if (userType !== "admin") {
    return <Navigate to="/user-dashboard" replace />
  }

  return children
}

