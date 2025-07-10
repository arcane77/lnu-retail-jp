import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import BuildingAnalytics from "./BuildingAnalytics";
import Analytics from "./Analytics";
import ZoneAnalytics from "./ZoneAnalytics";
import IAQAnalytics from "./IAQAnalytics";
import { FaWind, FaWater, FaDoorOpen } from "react-icons/fa";
import WaterLeakHistorical from "./WaterLeakHistorical";
import MDRHistorical from "./MDRHistorical";
import axios from "axios";
import Header from "./Header";

const MainAnalytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("building"); // Default to building tab
  const [buildingName, setBuildingName] = useState("Lingnan Library"); // Default value
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const waterLeakRef = useRef();
  const mdrRef = useRef();

  // Date state for the new tabs
  const [dateRange, setDateRange] = useState({
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    month: `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`,
  });
  const [reportType, setReportType] = useState("daily");

  // Helper function to get week range (Sunday to Saturday) for a given date
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 for Sunday, 1 for Monday, etc.

    // Calculate the date of Sunday (start of week)
    const diff = d.getDate() - day;
    const sunday = new Date(d.setDate(diff));

    // Calculate the date of Saturday (end of week)
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    return {
      fromDate: sunday.toISOString().split("T")[0],
      toDate: saturday.toISOString().split("T")[0],
    };
  };

  // Helper function to get month range (first and last day of month)
  const getMonthRange = (yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // Last day of the month

    return {
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: lastDay.toISOString().split("T")[0],
    };
  };

  const handleDateChange = (startDate, endDate) => {
    setDateRange({
      ...dateRange,
      fromDate: startDate,
      toDate: endDate,
    });
  };

  const handleExportCSV = (componentType) => {
    if (componentType === "waterleak" && waterLeakRef.current) {
      waterLeakRef.current.exportToCSV();
    } else if (componentType === "mdr" && mdrRef.current) {
      mdrRef.current.exportToCSV();
    }
  };

  // Fetch building data on component mount
  useEffect(() => {
    const fetchBuildingData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices"
        );

        // Find an item with new_building field
        const buildingInfo = response.data.find((item) => item.new_building);
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
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}  
        showLiveCount={true}    
      />

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
                Optimus
              </h2>
            )}
          </div>

          {/* Tabs */}
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
                  className={`w-5 h-5 mr-2 ${
                    activeTab === "building" ? "text-blue-600" : "text-gray-600"
                  }`}
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
                建物​
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
                  className={`w-4 h-4 mr-2 ${
                    activeTab === "floors" ? "text-blue-600" : "text-gray-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
                床​
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
                  className={`w-4 h-4 mr-2 ${
                    activeTab === "zones" ? "text-blue-600" : "text-gray-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                ゾーン​
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
                  className={`w-4 h-4 mr-2 ${
                    activeTab === "iaq" ? "text-blue-600" : "text-gray-600"
                  }`}
                />
                IAQ
                {activeTab === "iaq" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "leakages"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("leakages")}
              >
                <svg
                  className={`w-4 h-4 mr-2 ${
                    activeTab === "leakages" ? "text-blue-600" : "text-gray-600"
                  }`}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2C12 2 6 10 6 14a6 6 0 0012 0c0-4-6-12-6-12z" />
                </svg>
                漏水
                {activeTab === "leakages" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
                )}
              </button>

              {/* New Emergency Exits Tab */}
              <button
                className={`px-6 py-4 text-sm md:text-base font-medium transition-all duration-200 ease-in-out flex items-center justify-center relative ${
                  activeTab === "emergency_exits"
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("emergency_exits")}
              >
                <FaDoorOpen
                  className={`w-4 h-4 mr-2 ${
                    activeTab === "emergency_exits"
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                />
               非常口​
                {activeTab === "emergency_exits" && (
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
            {activeTab === "leakages" && (
              <div className="leakages-tab">
                {/* Date Selection Controls */}
                {/* Date Selection Controls */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col md:flex-row md:items-end">
                      {/* Report Type */}
                      <div className="mb-4 md:mb-0">
                        <label className="text-sm  text-gray-600 mb-1 block">
                        レポートの種類​
                        </label>
                        <div className="flex space-x-2">
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "daily"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("daily");
                              const today = new Date()
                                .toISOString()
                                .split("T")[0];
                              handleDateChange(today, today);
                            }}
                          >
                            日毎​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "weekly"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("weekly");
                              // Calculate week range
                              const weekRange = getWeekRange(new Date());
                              handleDateChange(
                                weekRange.fromDate,
                                weekRange.toDate
                              );
                            }}
                          >
                            ウィークリー​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "monthly"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("monthly");
                              // Calculate month range
                              const today = new Date();
                              const monthStr = `${today.getFullYear()}-${String(
                                today.getMonth() + 1
                              ).padStart(2, "0")}`;
                              const monthRange = getMonthRange(monthStr);
                              setDateRange({
                                ...dateRange,
                                fromDate: monthRange.fromDate,
                                toDate: monthRange.toDate,
                                month: monthStr,
                              });
                            }}
                          >
                            マンスリー​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "custom"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => setReportType("custom")}
                          >
                            カスタム​
                          </button>
                        </div>
                      </div>

                      {/* Date Selection Fields */}
                      <div className="md:ml-16">
                        {reportType === "custom" ? (
                          <div className="flex flex-col md:flex-row">
                            <div className="mb-4 md:mb-0 relative">
                              <label className="text-sm text-gray-600 mb-1 block">
                              開始日
                              </label>
                              <input
                                type="date"
                                value={dateRange.fromDate}
                                onChange={(e) =>
                                  handleDateChange(
                                    e.target.value,
                                    dateRange.toDate
                                  )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div className="mb-4 md:mb-0 md:ml-6 relative">
                              <label className="text-sm  text-gray-600 mb-1 block">
                              終了日
                              </label>
                              <input
                                type="date"
                                value={dateRange.toDate}
                                onChange={(e) =>
                                  handleDateChange(
                                    dateRange.fromDate,
                                    e.target.value
                                  )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                min={dateRange.fromDate}
                              />
                            </div>
                          </div>
                        ) : reportType === "monthly" ? (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            月を選択
                            </label>
                            <input
                              type="month"
                              value={dateRange.month}
                              onChange={(e) => {
                                const monthRange = getMonthRange(
                                  e.target.value
                                );
                                setDateRange({
                                  ...dateRange,
                                  fromDate: monthRange.fromDate,
                                  toDate: monthRange.toDate,
                                  month: e.target.value,
                                });
                              }}
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        ) : reportType === "weekly" ? (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            週を選択 (Showing: {dateRange.fromDate} to{" "}
                              {dateRange.toDate})
                            </label>
                            <input
                              type="date"
                              value={dateRange.fromDate}
                              onChange={(e) => {
                                // Calculate the week for the selected date
                                const weekRange = getWeekRange(
                                  new Date(e.target.value)
                                );
                                handleDateChange(
                                  weekRange.fromDate,
                                  weekRange.toDate
                                );
                              }}
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            日付を選択​
                            </label>
                            <input
                              type="date"
                              value={dateRange.fromDate}
                              onChange={(e) =>
                                handleDateChange(e.target.value, e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Export Button */}
                    {reportType === "custom" && (
                      <div className="mt-4 md:mt-0">
                        <button
                          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => handleExportCSV("waterleak")}
                        >
                          Export CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Render WaterLeakHistorical component with date range */}
                <WaterLeakHistorical
                  ref={waterLeakRef}
                  dateRange={dateRange}
                  reportType={reportType}
                />
              </div>
            )}

            {/* New Emergency Exits Tab Content */}
            {activeTab === "emergency_exits" && (
              <div className="emergency-exits-tab">
                {/* Date Selection Controls - Same as Leakages tab */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col md:flex-row md:items-end">
                      {/* Report Type */}
                      <div className="mb-4 md:mb-0">
                        <label className="text-sm font-bold text-gray-600 mb-1 block">
                        レポートの種類​
                        </label>
                        <div className="flex space-x-2">
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "daily"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("daily");
                              const today = new Date()
                                .toISOString()
                                .split("T")[0];
                              handleDateChange(today, today);
                            }}
                          >
                            日毎​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "weekly"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("weekly");
                              // Calculate week range
                              const weekRange = getWeekRange(new Date());
                              handleDateChange(
                                weekRange.fromDate,
                                weekRange.toDate
                              );
                            }}
                          >
                            ウィークリー​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "monthly"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => {
                              setReportType("monthly");
                              // Calculate month range
                              const today = new Date();
                              const monthStr = `${today.getFullYear()}-${String(
                                today.getMonth() + 1
                              ).padStart(2, "0")}`;
                              const monthRange = getMonthRange(monthStr);
                              setDateRange({
                                ...dateRange,
                                fromDate: monthRange.fromDate,
                                toDate: monthRange.toDate,
                                month: monthStr,
                              });
                            }}
                          >
                            マンスリー​
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md ${
                              reportType === "custom"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                            onClick={() => setReportType("custom")}
                          >
                            カスタム​
                          </button>
                        </div>
                      </div>

                      {/* Date Selection Fields */}
                      <div className="md:ml-16">
                        {reportType === "custom" ? (
                          <div className="flex flex-col md:flex-row">
                            <div className="mb-4 md:mb-0 relative">
                              <label className="text-sm text-gray-600 mb-1 block">
                              開始日
                              </label>
                              <input
                                type="date"
                                value={dateRange.fromDate}
                                onChange={(e) =>
                                  handleDateChange(
                                    e.target.value,
                                    dateRange.toDate
                                  )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div className="mb-4 md:mb-0 md:ml-6 relative">
                              <label className="text-sm text-gray-600 mb-1 block">
                              終了日
                              </label>
                              <input
                                type="date"
                                value={dateRange.toDate}
                                onChange={(e) =>
                                  handleDateChange(
                                    dateRange.fromDate,
                                    e.target.value
                                  )
                                }
                                className="border border-gray-300 rounded-md px-3 py-2"
                                min={dateRange.fromDate}
                              />
                            </div>
                          </div>
                        ) : reportType === "monthly" ? (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            月を選択
                            </label>
                            <input
                              type="month"
                              value={dateRange.month}
                              onChange={(e) => {
                                const monthRange = getMonthRange(
                                  e.target.value
                                );
                                setDateRange({
                                  ...dateRange,
                                  fromDate: monthRange.fromDate,
                                  toDate: monthRange.toDate,
                                  month: e.target.value,
                                });
                              }}
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        ) : reportType === "weekly" ? (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            週を選択 (Showing: {dateRange.fromDate} to{" "}
                              {dateRange.toDate})
                            </label>
                            <input
                              type="date"
                              value={dateRange.fromDate}
                              onChange={(e) => {
                                // Calculate the week for the selected date
                                const weekRange = getWeekRange(
                                  new Date(e.target.value)
                                );
                                handleDateChange(
                                  weekRange.fromDate,
                                  weekRange.toDate
                                );
                              }}
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 md:mb-0">
                            <label className="text-sm text-gray-600 mb-1 block">
                            日付を選択​
                            </label>
                            <input
                              type="date"
                              value={dateRange.fromDate}
                              onChange={(e) =>
                                handleDateChange(e.target.value, e.target.value)
                              }
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Export Button  */}
                    {reportType === "custom" && (
                      <div className="mt-4 md:mt-0">
                        <button
                          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => handleExportCSV("mdr")}
                        >
                          Export CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Render MDRHistorical component with date range */}
                <MDRHistorical
                  ref={mdrRef}
                  dateRange={dateRange}
                  reportType={reportType}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainAnalytics;
