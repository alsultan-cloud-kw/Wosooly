import api from "../../../api_config"; // adjust path based on your folder structure
import { toast } from "react-hot-toast";

export const login = (email, password) => async dispatch => {
  try {
    dispatch({ type: "AUTH_REQUEST" });

    const { data } = await api.post("/login", { email, password });

    // console.log("user_type", data)
    
    // Save token in localStorage
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("email", data.email);
    // localStorage.setItem("user_type", data.user_type);

    const payload = {
      access_token: data.access_token,
      email: data.email,
      plan_name: data.plan_name,
      available_features: data.available_features,
    };
    
    dispatch({
      type: "AUTH_SUCCESS",
      payload,
    });
    return { payload };  // ✅ IMPORTANT: return payload to component
  } catch (error) {
    const message = error.response?.data?.detail || "Login failed";

    dispatch({
      type: "AUTH_FAIL",
      payload: message,
    });

    return { error: message }; // ✅ return error to component
  }
};

export const register =
  (email, phone, password, client_name, company_details, store_url, consumer_key, consumer_secret, accepted_terms,plan) =>
  async (dispatch) => {
    try {
      dispatch({ type: "AUTH_REQUEST" });

      const { data } = await api.post("/register", {
        email,
        phone,
        password,
        client_name,
        company_details,
        store_url,
        consumer_key,
        consumer_secret,
        accepted_terms,
      });

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { token: data.access_token, email: data.email },
      });

      // ✅ Return full backend response to frontend
      return { payload: data };
    } catch (error) {
      let message = "Registration failed";
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        message = detail.map((err) => err.msg).join(", ");
      } else if (typeof detail === "string") {
        message = detail;
      }

      dispatch({
        type: "AUTH_FAIL",
        payload: message,
      });

      throw new Error(message); // ✅ also propagate to frontend catch
    }
  };

  export const logout = () => async (dispatch) => {
    try {
      // Call the backend logout endpoint
      await api.post("/logout");
      
      // Show success toast
      toast.success("Successfully logged out! 👋", {
        icon: "👋",
        duration: 3000,
        style: {
          borderRadius: "10px",
          background: "#10b981",
          color: "#fff",
        },
      });
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
      // Continue with logout even if API call fails
      // Still show success toast since we're clearing local storage
      toast.success("Successfully logged out! 👋", {
        icon: "👋",
        duration: 3000,
        style: {
          borderRadius: "10px",
          background: "#10b981",
          color: "#fff",
        },
      });
    }
    
    // Clear localStorage (always, regardless of API success/failure)
    localStorage.clear();
    
    // Dispatch logout action
    dispatch({ type: "LOGOUT" });
  };
