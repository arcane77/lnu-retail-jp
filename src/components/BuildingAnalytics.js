import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import LiveBuilding from "./LiveBuilding";
import HourlyBuildingOccupancy from "./HourlyBuildingOccupancy";
import PeakBuildingDaily from "./PeakBuildinDaily";
import AvgBuildingDaily from "./AvgBuildingDaily";
import Header from "./Header";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

const floors = ["1F", "MF", "2F", "3F"]; // All available floors
const floorNames = {
  MF: "M/F",
  "1F": "1/F",
  "2F": "2/F",
  "3F": "3/F",
};

const COLORS = ["#0088FE", "#82C0CC", "#FFBB28", "#FF8042", "#8884D8"];

// Custom tooltip component for bar chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-blue-600">
          <span className="font-medium">Average Occupancy:</span>{" "}
          {payload[0].value.toFixed(2)}%
        </p>
        <p className="text-[#82C0CC]">
          <span className="font-medium">Total Occupancy:</span>{" "}
          {Math.round(payload[0].payload.peakOccupancy)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for floor comparison chart
const CustomFloorBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold text-gray-800">{floorNames[payload[0].name]}</p>
        <p className="text-[#82C0CC]">
          <span className="font-medium">Peak Occupancy:</span>{" "}
          {Math.round(payload[0].payload.peakOccupancy)}
        </p>
        <p className="text-blue-600">
          <span className="font-medium">Average Occupancy:</span>{" "}
          {payload[0].payload.avgOccupancyPercentage.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

const BuildingAnalytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buildingData, setBuildingData] = useState({
    totalOccupancy: 0,
    peakOccupancy: 0,
    avgOccupancyPercentage: 0,
    floorDataMap: {},
    totalMaxCapacity: 0,
  });

  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [error, setError] = useState(null);

  // Store raw API data
  const [rawApiData, setRawApiData] = useState([]);

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get date range based on report type
  const getDateRange = () => {
    if (reportType === "daily") {
      return {
        startDate: formatDate(selectedDate),
        endDate: formatDate(selectedDate),
      };
    } else if (reportType === "weekly") {
      // Calculate Sunday-Saturday week containing the selected date
      const week_start = startOfWeek(selectedDate);
      const week_end = endOfWeek(selectedDate);
      return {
        startDate: formatDate(week_start),
        endDate: formatDate(week_end),
      };
    } else if (reportType === "monthly") {
      // Calculate first-last day of month containing the selected date
      const month_start = startOfMonth(selectedDate);
      const month_end = endOfMonth(selectedDate);
      return {
        startDate: formatDate(month_start),
        endDate: formatDate(month_end),
      };
    } else {
      // For custom, use the explicitly selected start and end dates
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }
  };

  // Initialize date ranges when report type changes
  useEffect(() => {
    if (reportType === "daily") {
      // For daily, just use the selected date
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    } else if (reportType === "weekly") {
      // Set default week range (Sunday-Saturday)
      const week_start = startOfWeek(selectedDate);
      const week_end = endOfWeek(selectedDate);
      setStartDate(week_start);
      setEndDate(week_end);
    } else if (reportType === "monthly") {
      // Set default month range
      const month_start = startOfMonth(selectedDate);
      const month_end = endOfMonth(selectedDate);
      setStartDate(month_start);
      setEndDate(month_end);
    }
    // For custom, don't change dates automatically
  }, [reportType, selectedDate]);

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();
      const response = await axios.get(
        `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/historical?start_date=${startDate}&end_date=${endDate}`
      );

      if (response.data) {
        // Save the raw data for use in charts
        setRawApiData(response.data);

        // Process API data for regular building stats
        processApiData(response.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process API data to get building-level metrics (sum of all floors)
  const processApiData = (data) => {
    // Group by floor
    const groupedByFloor = {};
    let buildingTotalOccupancy = 0;
    let buildingPeakOccupancy = 0;
    let buildingTotalPercentage = 0;
    let buildingZoneCount = 0;

    // Track floor max capacities
    const floorMaxCapacities = new Map();

    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip Main-Entrance zone and Relocated zone as requested
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      )
        return;

      if (!groupedByFloor[floor_id]) {
        groupedByFloor[floor_id] = {
          zones: [],
          totalOccupancy: 0,
          peakOccupancy: 0,
          totalPercentage: 0,
          zoneCount: 0,
          maxCapacity: 0,
        };
      }

      // Get floor max capacity from API data if not already set
      if (!floorMaxCapacities.has(floor_id) && zoneData.length > 0) {
        const floorMaxCapacity = zoneData[0].max_capacity || 0;
        floorMaxCapacities.set(floor_id, floorMaxCapacity);
        groupedByFloor[floor_id].maxCapacity = floorMaxCapacity;
      }

      // Process data for each zone
      zoneData.forEach((entry) => {
        const {
          timestamp,
          total_occupancy,
          occupancy_percentage,
          max_capacity,
        } = entry;

        // Use exact data from API for all calculations, including negative values
        groupedByFloor[floor_id].totalOccupancy += total_occupancy;
        buildingTotalOccupancy += total_occupancy;

        // Update peak occupancy if this value is higher for this floor
        if (total_occupancy > groupedByFloor[floor_id].peakOccupancy) {
          groupedByFloor[floor_id].peakOccupancy = total_occupancy;

          // Update building peak occupancy if this is the highest across all floors
          if (total_occupancy > buildingPeakOccupancy) {
            buildingPeakOccupancy = total_occupancy;
          }
        }

        // Use exact occupancy percentage from API
        groupedByFloor[floor_id].totalPercentage += occupancy_percentage;
        buildingTotalPercentage += occupancy_percentage;

        // Add to zone count (used for averaging)
        groupedByFloor[floor_id].zoneCount++;
        buildingZoneCount++;

        // Store zone data with exact values from API
        groupedByFloor[floor_id].zones.push({
          zone_name,
          timestamp,
          total_occupancy,
          occupancy_percentage,
          max_capacity,
        });
      });
    });

    // Calculate total building max capacity by summing each floor's capacity
    const totalMaxCapacity = Array.from(floorMaxCapacities.values()).reduce(
      (sum, capacity) => sum + capacity,
      0
    );

    // Calculate average percentages for each floor
    Object.keys(groupedByFloor).forEach((floorId) => {
      const floor = groupedByFloor[floorId];

      // Calculate average occupancy percentage
      floor.avgOccupancyPercentage =
        floor.zoneCount > 0 ? floor.totalPercentage / floor.zoneCount : 0;
    });

    // Calculate building average occupancy percentage
    const buildingAvgOccupancyPercentage =
      buildingZoneCount > 0 ? buildingTotalPercentage / buildingZoneCount : 0;

    // Set building data
    setBuildingData({
      totalOccupancy: buildingTotalOccupancy,
      peakOccupancy: buildingPeakOccupancy,
      avgOccupancyPercentage: buildingAvgOccupancyPercentage,
      floorDataMap: groupedByFloor,
      totalMaxCapacity: totalMaxCapacity,
    });
  };

  // Update data when relevant states change
  useEffect(() => {
    fetchData();
  }, [reportType]);

  // Fetch data when date selection changes
  useEffect(() => {
    if (
      reportType === "daily" ||
      reportType === "weekly" ||
      reportType === "monthly"
    ) {
      fetchData();
    }
  }, [selectedDate]);

  // Fetch data when date range changes for custom
  useEffect(() => {
    if (reportType === "custom") {
      fetchData();
    }
  }, [startDate, endDate]);

  // Export CSV function
  const exportToCSV = () => {
    try {
      // Prepare data for export
      let csvData = [];

      if (reportType === "daily") {
        // For daily reports, we don't typically export trend data
        // But we can export floor comparison data
        csvData = floorComparisonData.map((floor) => ({
          Floor: floorNames[floor.name],
          "Peak Occupancy": floor.peakOccupancy.toFixed(0),
          "Average Occupancy (%)": floor.avgOccupancyPercentage.toFixed(0),
        }));
      } else {
        // For weekly/monthly/custom reports, export the trend data
        csvData = barChartData.map((item) => ({
          Date: item.date,
          "Average Occupancy (%)": item.averageOccupancy.toFixed(0),
          "Peak Occupancy": item.peakOccupancy.toFixed(0),
        }));

        // Add a separator row and floor comparison data
        csvData.push({
          Date: "",
          "Average Occupancy (%)": "",
          "Peak Occupancy": "",
        });

        csvData.push({
          Date: "FLOOR BREAKDOWN",
          "Average Occupancy (%)": "",
          "Peak Occupancy": "",
        });

        // Add floor comparison data
        floorComparisonData.forEach((floor) => {
          csvData.push({
            Date: floorNames[floor.name],
            "Average Occupancy (%)": floor.avgOccupancyPercentage.toFixed(0),
            "Peak Occupancy": floor.peakOccupancy.toFixed(0),
          });
        });
      }

      // Convert to CSV
      if (csvData.length === 0) {
        alert("No data available for export");
        return;
      }

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => headers.map((header) => row[header]).join(",")),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const { startDate, endDate } = getDateRange();
      const filename = `Building_Occupancy_${reportType}_${startDate}_to_${endDate}.csv`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Error exporting data. Please try again.");
    }
  };

  // Process data for the building trend bar chart
  const barChartData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) {
      return [];
    }

    // Key insight: The way timestamps are keyed in the map is crucial
    // We need to group by DATE, not by full timestamp

    // Create a map to store data by DATE (not full timestamp)
    const dailyMap = new Map();

    // First, pre-fill the map with all dates in the selected range
    // This ensures we have entries for every day, even if no data exists
    const { startDate, endDate } = getDateRange();
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      const dateStr = formatDate(day);
      dailyMap.set(dateStr, {
        date: dateStr,
        totalOccupancy: 0,
        peakOccupancy: 0,
        totalPercentage: 0,
        count: 0,
      });
    }

    // Now process the actual data
    rawApiData.forEach((item) => {
      const { zone_name, data: zoneData } = item;

      // ONLY include Main-Entrance zone data
      if (zone_name !== "Main-Entrance") {
        return;
      }

      // Process each timestamp entry for Main-Entrance
      zoneData.forEach((entry) => {
        const { timestamp, total_occupancy, occupancy_percentage } = entry;

        // Extract just the date part for grouping by day
        const datePart = timestamp.split("T")[0]; // Gets YYYY-MM-DD

        // Skip if outside our pre-filled date range
        if (!dailyMap.has(datePart)) {
          return;
        }

        // Get the entry for this date
        const dateEntry = dailyMap.get(datePart);

        // Add to total occupancy and percentage
        dateEntry.totalOccupancy += total_occupancy;
        dateEntry.totalPercentage += occupancy_percentage;

        // Update peak if this is higher
        if (total_occupancy > dateEntry.peakOccupancy) {
          dateEntry.peakOccupancy = total_occupancy;
        }

        // Count data points for this day
        dateEntry.count += 1;
      });
    });

    // Calculate daily averages and convert to array
    const result = Array.from(dailyMap.values()).map((entry) => ({
      date: entry.date,
      averageOccupancy:
        entry.count > 0 ? entry.totalPercentage / entry.count : 0,
      peakOccupancy: entry.peakOccupancy,
    }));

    // Sort by date chronologically
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [rawApiData, getDateRange]);

  // Update the Y-axis max calculation for better scaling
  const maxAvgOccupancy = useMemo(() => {
    if (barChartData.length === 0) return 5; // Default value

    const max = Math.max(...barChartData.map((item) => item.averageOccupancy));
    // Round up to nearest 5
    return Math.ceil(max / 5) * 5;
  }, [barChartData]);

  // Process data for the floor comparison bar chart
  const floorComparisonData = useMemo(() => {
    if (
      !buildingData.floorDataMap ||
      Object.keys(buildingData.floorDataMap).length === 0
    ) {
      return [];
    }

    return floors.map((floorId) => {
      const floorData = buildingData.floorDataMap[floorId] || {
        totalOccupancy: 0,
        peakOccupancy: 0,
        avgOccupancyPercentage: 0,
      };

      return {
        name: floorId,
        peakOccupancy: floorData.peakOccupancy || 0,
        avgOccupancyPercentage: floorData.avgOccupancyPercentage || 0,
      };
    });
  }, [buildingData.floorDataMap]);

  // Format the date for display on the X-axis
  const formatXAxis = (dateStr) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "MMM d");
    } catch (error) {
      return dateStr;
    }
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
      <main className="pt-2 pb-12">
        <div className="max-w-9xl mx-auto">
          {/* Controls Section */}
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
                      onClick={() => setReportType("daily")}
                    >
                      日毎​
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "weekly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("weekly")}
                    >
                      ウィークリー​
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "monthly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("monthly")}
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

                {/* Date Selection - with specific spacing and calendar icon */}
                <div className="md:ml-16">
                  {/* For Today, Weekly and Monthly - use a single date picker */}
                  {(reportType === "daily" ||
                    reportType === "weekly" ||
                    reportType === "monthly") && (
                    <div className="mb-4 md:mb-0">
                      <label className="text-sm font-bold text-gray-600 mb-1 block">
                        {reportType === "daily"
                          ? "日付を選択​"
                          : reportType === "weekly"
                          ? "週を選択"
                          : "月を選択"}
                      </label>
                      <div className="flex items-center relative">
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          dateFormat="yyyy-MM-dd"
                          className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                          showMonthYearPicker={reportType === "monthly"}
                        />
                        {/* Calendar Icon */}
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Custom - use two date pickers with calendar icons */}
                  {reportType === "custom" && (
                    <div className="flex flex-col md:flex-row">
                      <div className="mb-4 md:mb-0 relative">
                        <label className="text-sm text-gray-600 mb-1 block">
                        開始日
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            dateFormat="yyyy-MM-dd"
                            className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                          />
                          {/* Calendar Icon */}
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 md:mb-0 md:ml-6 relative">
                        <label className="text-sm text-gray-600 mb-1 block">
                        終了日
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            dateFormat="yyyy-MM-dd"
                            className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                          />
                          {/* Calendar Icon */}
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons Section */}
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  onClick={fetchData}
                >
                 申し込む​
                </button>

                {/* Export CSV Button - only show for custom */}
                {reportType === "custom" && (
                  <button
                    className="px-4 py-2 rounded-md bg-transparent border-[2px] border-blue-500 text-blue-600 font-medium hover:bg-blue-600 hover:text-white"
                    onClick={exportToCSV}
                  >
                   CSV出力
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Date Info Banner */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <p className="text-blue-800 flex items-center">
              <svg
                className="pr-2"
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                width="25"
                height="25"
                viewBox="0,0,256,256"
              >
                <g
                  fill="#0e4a98"
                  fillRule="nonzero"
                  stroke="none"
                  strokeWidth="1"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeMiterlimit="10"
                  strokeDasharray=""
                  strokeDashoffset="0"
                  fontFamily="none"
                  fontWeight="none"
                  fontSize="none"
                  textAnchor="none"
                >
                  <g transform="scale(5.12,5.12)">
                    <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM25,11c-1.65685,0 -3,1.34315 -3,3c0,1.65685 1.34315,3 3,3c1.65685,0 3,-1.34315 3,-3c0,-1.65685 -1.34315,-3 -3,-3zM21,21v2h1h1v13h-1h-1v2h1h1h4h1h1v-2h-1h-1v-15h-1h-4z"></path>
                  </g>
                </g>
              </svg>{" "}
              {reportType === "daily" && (
                <>
                  次のデータを表示中：{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
              {reportType === "weekly" && (
                <>
                   週間データを表示中：{" "}
                  {startDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {endDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
              {reportType === "monthly" && (
                <>
                  月間データを表示中：{" "}
                  {startDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </>
              )}
              {reportType === "custom" && (
                <>
                  カスタム日付範囲のデータを表示中：{" "}
                  {startDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {endDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </p>
          </div>

          {/* Building Data Section */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
              <p className="text-lg">データを読み込み中.</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div
                className={`grid grid-cols-1 ${
                  reportType === "daily" ? "md:grid-cols-3" : "md:grid-cols-2"
                } gap-6 mb-6`}
              >
                {/* Live Building Occupancy - Only shown for "daily" report type */}
                {reportType === "daily" && <LiveBuilding />}

                {/* Peak Building Occupancy Card */}
                <PeakBuildingDaily
                  selectedDate={selectedDate}
                  reportType={reportType}
                />

                {/* Average Building Occupancy Card - Using the new component */}
                <AvgBuildingDaily
                  selectedDate={selectedDate}
                  reportType={reportType}
                />
              </div>

              {reportType === "daily" && (
                <HourlyBuildingOccupancy selectedDate={selectedDate} />
              )}

              {/* Floor Comparison Chart - Kept unchanged as requested */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                フロア占有率の概要​
                </h2>
                <div className="h-[460px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={floorComparisonData}
                      margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickFormatter={(value) => floorNames[value]}
                        width={100}
                      />
                      <Tooltip content={<CustomFloorBarTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="peakOccupancy"
                        name="ピーク稼働率​"
                        fill="#2463EB"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                      <Bar
                        dataKey="avgOccupancyPercentage"
                        name="平均稼働率​ (%)"
                        fill="#82C0CC"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Building Trend Chart - Only for Weekly, Monthly, and Custom */}
              {reportType !== "daily" && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {reportType === "weekly"
                      ? "ウィークリー​"
                      : reportType === "monthly"
                      ? "マンスリー​"
                      : "カスタム​"}{" "}
                    建物占有
                  </h2>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatXAxis}
                          angle={0}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis
                          label={{
                            value: "Occupancy (%)",
                            angle: -90,
                            position: "insideLeft",
                            style: { textAnchor: "middle" },
                          }}
                          domain={[0, maxAvgOccupancy]}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="averageOccupancy"
                          name="建物占有 %"
                          fill="#2463EB"
                          radius={[4, 4, 0, 0]}
                          barSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BuildingAnalytics;
