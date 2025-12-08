// src/components/customers/SectionHeader.jsx
import React from "react";

export default function SectionHeader({ title }) {
  return (
    <div className="flex justify-center my-8">
      <div className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 shadow-md rounded-2xl px-6 py-4 text-center w-full max-w-3xl">
        <h3 className="text-2xl font-bold text-blue-800 tracking-wide">{title}</h3>
      </div>
    </div>
  );
}
