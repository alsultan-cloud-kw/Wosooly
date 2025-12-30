import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import api from "../../../api_config";
import { toast } from "react-hot-toast";
import '../../assets/css/sidebar.css';

const SidebarItem = ({ title, icon, route, active, premium, featureKey }) => {
  const { t } = useTranslation("side_bar");
  const navigate = useNavigate();

  const handleClick = async () => {

    // Check if this is a premium feature
    if (premium) {
      let availableFeatures = [];
      try {
        const featuresStr = localStorage.getItem("available_features");
        if (featuresStr) {
          availableFeatures = JSON.parse(featuresStr);
        }
      } catch (error) {
        console.error("Error parsing available_features from localStorage:", error);
        // If parsing fails, default to empty array
        availableFeatures = [];
        // Optionally clear the corrupted data
        localStorage.removeItem("available_features");
      }
      
      if (!availableFeatures.includes(featureKey)) {
        toast.error("You need to upgrade your plan to access this feature!", {
          icon: "👑",
          duration: 4000,
        });
        // Navigate after a short delay to ensure toast is visible
        setTimeout(() => {
          navigate("/subscription");
        }, 500);
        return; // Prevent navigation to the original route
      }
    }
    // Only for Messaging menu item
    if (title === "messaging") {
      try {
        const res = await api.get("/whatsapp/has-credentials");
        if (res.data.hasCredentials) {
          navigate("/messaging");
        } else {
          navigate("/whatsapp");
        }
      } catch (error) {
        console.error(error);
        navigate("/whatsapp"); // fallback
      }
      return;
    }

    // Normal navigation for other routes
    navigate(route);
  };

  return (
    <div className="sidebar__item" onClick={handleClick}>
      <div className={`sidebar__item-inner ${active ? "active" : ""}`}>
        <i className={icon}></i>
        <span>{t(title)}</span>
        {premium && <i className="bx bx-crown premium-icon" title="Premium Access"></i>}
      </div>
    </div>
  );
};

export default SidebarItem;

