import { Navigate, useLocation } from "react-router-dom"

/**
 * ProtectedRoute - Protects routes that require authentication (for regular users)
 * Redirects to login if user is not authenticated
 * Redirects admins to admin dashboard
 */
export function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem("token")
  const userType = localStorage.getItem("user_type")

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  // If user is admin, redirect to admin dashboard
  if (userType === "admin") {
    return <Navigate to="/admin-dashboard" replace />
  }

  return children
}

