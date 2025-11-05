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

    const dispatch = useDispatch()

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

    useEffect(() => {
        const themeClass = mode_settings.find(e => e.class === localStorage.getItem('themeMode', 'theme-mode-light'))

        const colorClass = color_settings.find(e => e.class === localStorage.getItem('colorMode', 'theme-mode-light'))

        if (themeClass !== undefined) setcurrMode(themeClass.id)

        if (colorClass !== undefined) setcurrColor(colorClass.id)

        const savedLang = localStorage.getItem("appLanguage") || "en";
            setCurrLang(savedLang);
            i18n.changeLanguage(savedLang);

    }, []);

    
        const [currLang, setCurrLang] = useState(i18n.language || "en");

        const setLanguage = (lang) => {
            setCurrLang(lang.id);
            i18n.changeLanguage(lang.id);
            localStorage.setItem("appLanguage", lang.id);
        };

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
