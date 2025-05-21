import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import BuildingAnalytics from "./BuildingAnalytics";
import Analytics from "./Analytics"; 
import ZoneAnalytics from "./ZoneAnalytics";
import IAQAnalytics from "./IAQAnalytics"; 
import { FaWind } from "react-icons/fa";
import axios from "axios";

const MainAnalytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("building"); // Default to building tab
  const [buildingName, setBuildingName] = useState("Lingnan Library"); // Default value
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch building data on component mount
  useEffect(() => {
    const fetchBuildingData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices"
        );
        
        // Find an item with new_building field
        const buildingInfo = response.data.find(item => item.new_building);
        if (buildingInfo && buildingInfo.new_building) {
          setBuildingName(buildingInfo.new_building);
        } else if (response.data.length > 0 && response.data[0].building) {
          // Fallback to building field if new_building doesn't exist
          setBuildingName(response.data[0].building);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching building data:", err);
        setError("Failed to fetch building data");
        setLoading(false);
      }
    };

    fetchBuildingData();
  }, []);

  // Tab switching handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />

      {/* Header */}
      <header className="bg-[#ffffff] custom-shadow h-14 lg:h-20 xl:h-[100px] fixed top-0 left-0 w-full z-10 flex items-center justify-between">
        <div className="flex items-center h-full">
          <button
            className={`flex flex-col justify-center items-start space-y-1 pl-8 ${
              isSidebarOpen ? "hidden" : ""
            }`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
          </button>
        </div>
        <img
          src="/library-logo-final_2024.png"
          alt="LNU Logo"
          className="h-6 sm:h-10 lg:h-12 xl:h-14 mx-auto"
        />
      </header>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 px-4 md:px-8 pb-12">
        <div className="max-w-9xl mx-auto">
          {/* Location & Title */}
          <div className="mb-6">
            <h4 className="text-lg text-gray-600 mb-1">Hong Kong SAR</h4>
            {loading ? (
              <div className="h-10 w-64 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-800">
                {buildingName}
              </h2>
            )}
          </div>

          {/* Modern Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap border-b border-gray-200">
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "building"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("building")}
              >
                <svg 
                  className={`w-5 h-5 mr-2 ${activeTab === "building" ? "text-blue-600" : "text-gray-600"}`}
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="M19 21V9L9 3v18" />
                  <path d="M9 3L19 9" />
                </svg>
                Building
                {activeTab === "building" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>
              
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "floors"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("floors")}
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${activeTab === "floors" ? "text-blue-600" : "text-gray-600"}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                Floors
                {activeTab === "floors" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>
              
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "zones"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("zones")}
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${activeTab === "zones" ? "text-blue-600" : "text-gray-600"}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Zones
                {activeTab === "zones" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "iaq"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("iaq")}
              >
                <FaWind 
                  className={`w-4 h-4 mr-2 ${activeTab === "iaq" ? "text-blue-600" : "text-gray-600"}`}
                />
                IAQ
                {activeTab === "iaq" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content Container */}
          <div className="tab-content-container">
            {activeTab === "building" && (
              <div className="building-tab">
                <BuildingAnalytics />
              </div>
            )}
            
            {activeTab === "floors" && (
              <div className="floors-tab">
                <Analytics />
              </div>
            )}
            
            {activeTab === "zones" && (
              <div className="zones-tab">
                <ZoneAnalytics />
              </div>
            )}
            {activeTab === "iaq" && (
              <div className="iaq-tab">
                <IAQAnalytics />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainAnalytics;