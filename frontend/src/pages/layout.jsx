import React from "react";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Inter font (optional Google Fonts embed)
const interFont = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Inject font */}
        <div dangerouslySetInnerHTML={{ __html: interFont }} />

        <title>DataFlow Analytics - WooCommerce & Excel Data Analysis</title>
        <meta
          name="description"
          content="Transform your WooCommerce and Excel data into actionable insights. Analyze orders, customers, and products with powerful analytics."
        />
        <meta name="generator" content="v0.app" />

        {/* Icons */}
        <link
          rel="icon"
          href="/icon-light-32x32.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/icon-dark-32x32.png"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="icon"
          href="/icon.svg"
          type="image/svg+xml"
        />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>

      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
