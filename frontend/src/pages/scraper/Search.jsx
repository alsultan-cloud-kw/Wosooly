import React, { useState } from "react";
import api from "../../api_config";
import { toast } from "react-hot-toast";

const Search = ({ onProductAdded, products = [] }) => {
  const [searchPrompt, setSearchPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.post("/competitor-analysis/scrape-products", {
        url: searchPrompt,
      });
      if (result.data.success) {
        toast.success("تم جمع المنتج بنجاح");
        setSearchPrompt("");
        onProductAdded && onProductAdded(result.data.data);
      } else {
        toast.error(result.data.message || "فشل جمع المنتج");
      }
    } catch (error) {
      console.log(error);
      toast.error("حدث خطأ أثناء جمع المنتج");
    }
    setIsLoading(false);
  };

  const exportProducts = async () => {
    try {
      const result = await api.post("/competitor-analysis/export-products", {
        products,
      });
      if (result.data.success) {
        toast.success("تم التصدير بنجاح");
      } else {
        toast.error("فشل التصدير");
      }
    } catch (error) {
      console.log(error);
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full items-left gap-3">
      <input
        type="text"
        value={searchPrompt}
        onChange={(e) => setSearchPrompt(e.target.value)}
        placeholder="Enter product link"
        className="w-full p-3 border-4 border-neutral-200 rounded-lg text-gray-500"
      />
      <div className="flex gap-2 flex-2">
        <button
          onClick={handleSubmit}
          className={`${
            searchPrompt !== "" && !isLoading ? "cursor-pointer" : ""
          } bg-gray-800 w-[150px] disabled:bg-gray-400 rounded-md px-5 py-3 text-white`}
          disabled={searchPrompt === "" || isLoading}
        >
          {isLoading ? "Scraping..." : "Scrape"}
        </button>
        <button
          disabled={!products?.length || isLoading}
          onClick={exportProducts}
          className={`bg-gray-800 disabled:bg-gray-400 ${
            products?.length && !isLoading ? "cursor-pointer" : ""
          } rounded-md shadow-xs px-5 py-3 text-white`}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default Search;

