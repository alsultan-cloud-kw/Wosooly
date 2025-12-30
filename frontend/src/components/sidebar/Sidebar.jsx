import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { User } from 'lucide-react'
import './sidebar.css'
import logo from '../../assets/images/logo of feeds.jpg'
import sidebar_items from '../../assets/JsonData/sidebar_routes.json'
import { useTranslation } from 'react-i18next';
import { logout } from '../../redux/actions/AuthActions'
import SidebarItem from './SidebarItem';

// const SidebarItem = props => {
//     const { t } = useTranslation("side_bar");
//     const active = props.active ? 'active' : ''

//     return (
//         <div className="sidebar__item">
//             <div className={`sidebar__item-inner ${active}`}>
//                 <i className={props.icon}></i>
//                 <span>{t(props.title)}</span>
//             </div>
//         </div>
//     )
// }

const Sidebar = () => {
    
    const { t } = useTranslation("side_bar");
    const location = useLocation()
    const navigate = useNavigate()
    const activePath = location.pathname
    const dispatch = useDispatch()

    const handleLogout = () => {
        // Clear localStorage immediately for instant logout
        localStorage.clear();
        
        // Navigate immediately
        navigate("/", { replace: true });
        
        // Dispatch logout action in background (API call)
        // This will try to clear localStorage again (already cleared, so no issue)
        dispatch(logout()).catch(err => {
            console.error("Logout API call failed:", err);
        });
    }
      // ✅ Get user_type from localStorage
  const userType = localStorage.getItem("user_type");

  // ✅ Conditionally filter sidebar items
  const visibleItems = sidebar_items.filter(item => {
    // if (item.key === 'logout') return false; // handled separately
    // if (item.key === 'Messaging' && userType !== 'admin') return false; // hide if not admin
    return true;
  });

  // ================================
    // Profile Dropdown State
    // ================================
    const [openDropdown, setOpenDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setOpenDropdown(prev => !prev);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);


  return (
    <div className="sidebar">

      {/* ==========================
                PROFILE AVATAR WITH DROPDOWN
            ============================ */}
            <div className="sidebar__profile" ref={dropdownRef}>
                <div
                    className="sidebar__avatar"
                    onClick={toggleDropdown}
                >
                    <User className="sidebar__avatar-icon" />
                </div>

                {openDropdown && (
                    <div className="sidebar__dropdown">
                        {/* <p className="dropdown-item" onClick={() => navigate("/profile")}>
                            Profile
                        </p> */}
                        <p className="dropdown-item" onClick={() => {
                            const userType = localStorage.getItem("user_type")
                            navigate(userType === "admin" ? "/admin-dashboard" : "/user-dashboard")
                        }}>
                            Dashboard
                        </p>
                        <p className="dropdown-item logout" onClick={handleLogout}>
                            Logout
                        </p>
                    </div>
                )}
            </div>

      <div className="sidebar__logo">
        {t("appName")}
      </div>

      <div className="sidebar__menu">
        {visibleItems.map((item, index) => (
          <SidebarItem
            key={index}
            title={item.key}
            icon={item.icon}
            route={item.route}
            active={
              item.route === activePath ||
              (activePath === "/messaging" && item.route === "/whatsapp")
            } // highlight Messaging item correctly
            premium={item.premium} // pass it
            featureKey={item.featureKey}
          />
        ))}
      </div>

      <div
        className="sidebar__footer"
        onClick={handleLogout}
        style={{ cursor: 'pointer' }}
      >
        {/* <SidebarItem
          title={'logout'}
          icon={'bx bx-log-out'}
          active={false}
        /> */}
      </div>
    </div>
  );
};

export default Sidebar;
