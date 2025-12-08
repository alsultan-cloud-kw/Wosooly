import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import api from "../../../api_config";
import '../../assets/css/sidebar.css';

const SidebarItem = ({ title, icon, route, active, premium, featureKey }) => {
  const { t } = useTranslation("side_bar");
  const navigate = useNavigate();

  const handleClick = async () => {

    // Check if this is a premium feature
    if (premium) {
      const availableFeatures = JSON.parse(localStorage.getItem("available_features") || "[]");
      if (!availableFeatures.includes(featureKey)) {
        alert("You need to upgrade your plan to access this feature!");
        navigate("/subscription")
        return; // Prevent navigation
      }
    }
    // Only for Messaging menu item
    if (title === "Messaging") {
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

