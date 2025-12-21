import React, {useRef, useState, useEffect} from 'react'
import './thememenu.css'
import { useDispatch } from 'react-redux'
import ThemeAction from '../../redux/actions/ThemeAction'
import { useTranslation } from "react-i18next";

const language_settings = [
    { id: 'en', name: 'English' },
    { id: 'ar', name: 'العربية' }
];

const clickOutsideRef = (content_ref, toggle_ref) => {
    document.addEventListener('mousedown', (e) => {
        // user click toggle
        if (toggle_ref.current && toggle_ref.current.contains(e.target)) {
            content_ref.current.classList.toggle('active')
        } else {
            // user click outside toggle and content
            if (content_ref.current && !content_ref.current.contains(e.target)) {
                content_ref.current.classList.remove('active')
            }
        }
    })
}

const ThemeMenu = () => {
    const { t,i18n } = useTranslation("landing");
    const menu_ref = useRef(null)
    const menu_toggle_ref = useRef(null)

    clickOutsideRef(menu_ref, menu_toggle_ref)

    const setActiveMenu = () => menu_ref.current.classList.add('active')

    const closeMenu = () => menu_ref.current.classList.remove('active')

    const [currMode, setcurrMode] = useState('light')

    const [currColor, setcurrColor] = useState('blue')

    const [currLang, setCurrLang] = useState(i18n.language || "en");

    const dispatch = useDispatch()

    const mode_settings = [
            {
                id: 'light',
                name: t("light"),
                background: 'light-background',
                class: 'theme-mode-light'
            },
            {
                id: 'dark',
                name: t("dark"),
                background: 'dark-background',
                class: 'theme-mode-dark'
            }
        ]

        const color_settings = [
            {
                id: 'blue',
                name: t("blue"),
                background: 'blue-color',
                class: 'theme-color-blue'
            },
            {
                id: 'red',
                name: t("red"),
                background: 'red-color',
                class: 'theme-color-red'
            },
            {
                id: 'cyan',
                name: t("cyan"),
                background: 'cyan-color',
                class: 'theme-color-cyan'
            },
            {
                id: 'green',
                name: t("green"),
                background: 'green-color',
                class: 'theme-color-green'
            },
            {
                id: 'orange',
                name: t("orange"),
                background: 'orange-color',
                class: 'theme-color-orange'
            },
        ]

    const setMode = mode => {
        setcurrMode(mode.id)
        localStorage.setItem('themeMode', mode.class)
        dispatch(ThemeAction.setMode(mode.class))
    }

    const setColor = color => {
        setcurrColor(color.id)
        localStorage.setItem('colorMode', color.class)
        dispatch(ThemeAction.setColor(color.class))
    }

    const setLanguage = (lang) => {
        setCurrLang(lang.id);
        i18n.changeLanguage(lang.id);
        // Use consistent 'language' key, also update 'appLanguage' for backward compatibility
        localStorage.setItem("language", lang.id);
        localStorage.setItem("appLanguage", lang.id);
    };

    // Initialize theme and color from localStorage (only once on mount)
    useEffect(() => {
        const savedThemeMode = localStorage.getItem('themeMode');
        const savedColorMode = localStorage.getItem('colorMode');
        
        if (savedThemeMode) {
            const themeClass = mode_settings.find(e => e.class === savedThemeMode);
            if (themeClass) {
                setcurrMode(themeClass.id);
            }
        }

        if (savedColorMode) {
            const colorClass = color_settings.find(e => e.class === savedColorMode);
            if (colorClass) {
                setcurrColor(colorClass.id);
            }
        }
    }, []); // Only run once on mount

    // Initialize language from localStorage and set up listener (only once on mount)
    useEffect(() => {
        // Use consistent 'language' key, fallback to 'appLanguage' for backward compatibility
        const savedLang = localStorage.getItem("language") || localStorage.getItem("appLanguage") || "en";
        
        // Only update if language actually changed to prevent infinite loops
        if (savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang);
            setCurrLang(savedLang);
        }

        // Listen for language changes from other components
        const handleLanguageChange = (lng) => {
            // Only update state if it's different to prevent unnecessary re-renders
            setCurrLang(prevLang => {
                if (lng !== prevLang) {
                    return lng;
                }
                return prevLang;
            });
        };
        
        i18n.on('languageChanged', handleLanguageChange);

        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, []); // Empty dependency array - only run once on mount

    return (
        <div>
            <button ref={menu_toggle_ref} className="dropdown__toggle" onClick={() => setActiveMenu()}>
                <i className='bx bx-palette'></i>
            </button>
            <div ref={menu_ref} className="theme-menu">
                <h4>{t("themeSettings")}</h4>
                <button className="theme-menu__close" onClick={() => closeMenu()}>
                    <i className='bx bx-x'></i>
                </button>
                <div className="theme-menu__select">
                    <span>{t("chooseMode")}</span>
                    <ul className="mode-list">
                        {
                            mode_settings.map((item, index) => (
                                <li key={index} onClick={() => setMode(item)}>
                                    <div className={`mode-list__color ${item.background} ${item.id === currMode ? 'active' : ''}`}>
                                        <i className='bx bx-check'></i>
                                    </div>
                                    <span>{item.name}</span>
                                </li>
                            ))
                        }
                    </ul>
                </div>
                <div className="theme-menu__select">
                    <span>{t("chooseColor")}</span>
                    <ul className="mode-list">
                        {
                            color_settings.map((item, index) => (
                                <li key={index} onClick={() => setColor(item)}>
                                    <div className={`mode-list__color ${item.background} ${item.id === currColor ? 'active' : ''}`}>
                                        <i className='bx bx-check'></i>
                                    </div>
                                    <span>{item.name}</span>
                                </li>
                            ))
                        }
                    </ul>
                </div>
                <div className="theme-menu__select">
                    <span>{t("chooseLanguage")}</span>
                    <ul className="mode-list">
                        {language_settings.map((item, index) => (
                            <li key={index} onClick={() => setLanguage(item)}>
                                <div className={`mode-list__color ${item.id === currLang ? 'active' : ''}`}>
                                    <i className="bx bx-check"></i>
                                </div>
                                <span>{item.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    )
}

export default ThemeMenu
