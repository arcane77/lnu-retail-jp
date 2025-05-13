import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import HourlyData from "./HourlyFloorOccupancy";
import LiveFloor from "./LiveFloor";
import PeakFloorDaily from "./PeakFloorDaily";
import AvgFloorDaily from "./AvgFloordaily";
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
  "1F": "1/F",
  MF: "M/F",
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

const Analytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState("1F");
  const [floorData, setFloorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("daily"); // Changed from "daily" to "daily"
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
        // Save the raw data for use in bar chart
        setRawApiData(response.data);
        processApiData(response.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process API data and group by floors
  // Replace or update the processApiData function in Analytics.js to track peak correctly
  const processApiData = (data) => {
    // Group by floor
    const groupedByFloor = {};

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
          peakOccupancy: 0,
          peakDate: null,
          peakZone: null,
          totalPercentage: 0,
          zoneCount: 0,
        };
      }

      // Process data for each zone
      zoneData.forEach((entry) => {
        const {
          timestamp,
          total_occupancy,
          occupancy_percentage,
          max_capacity,
        } = entry;

        // Update peak occupancy if this value is higher
        // We find the highest individual reading across all zones, not a sum
        if (total_occupancy > groupedByFloor[floor_id].peakOccupancy) {
          groupedByFloor[floor_id].peakOccupancy = total_occupancy;
          groupedByFloor[floor_id].peakDate = timestamp;
          groupedByFloor[floor_id].peakZone = zone_name;
        }

      

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

    

    setFloorData(groupedByFloor);
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

  // Prepare data for selected floor
  const selectedFloorData = floorData[selectedFloor] || {
    totalOccupancy: 0,
    peakOccupancy: 0, // Add default value for peak occupancy
    zones: [],
  };

  // Process data for the bar chart
  const barChartData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) {
      return [];
    }

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
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip Main-Entrance zone and Relocated zone
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      ) {
        return;
      }

      // Only consider the selected floor if we're filtering by floor
      if (selectedFloor && floor_id !== selectedFloor) {
        return;
      }

      // Process each timestamp entry
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
  }, [rawApiData, selectedFloor, getDateRange]);

  // Find maximum average occupancy for Y-axis scaling
  const maxAvgOccupancy = useMemo(() => {
    if (barChartData.length === 0) return 5; // Default value

    const max = Math.max(...barChartData.map((item) => item.averageOccupancy));
    // Round up to nearest 5
    return Math.ceil(max / 5) * 5;
  }, [barChartData]);

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
      <main className="pt-2 pb-12">
        <div className="max-w-9xl mx-auto">
          {/* Controls Section */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col md:flex-row md:items-end">
                {/* Report Type */}
                <div className="mb-4 md:mb-0">
                  <label className="text-sm text-gray-600 mb-1 block">
                    Report Type
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
                      Daily
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "weekly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("weekly")}
                    >
                      Weekly
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "monthly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "custom"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("custom")}
                    >
                      Custom
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
                      <label className="text-sm text-gray-600 mb-1 block">
                        {reportType === "daily"
                          ? "Select Date"
                          : reportType === "weekly"
                          ? "Select Week"
                          : "Select Month"}
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
                          Start Date
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
                          End Date
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

              {/* Apply Button */}
              <div className="mt-4 md:mt-0">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  onClick={fetchData}
                >
                  Apply
                </button>
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
                  fill-rule="nonzero"
                  stroke="none"
                  stroke-width="1"
                  stroke-linecap="butt"
                  stroke-linejoin="miter"
                  stroke-miterlimit="10"
                  stroke-dasharray=""
                  stroke-dashoffset="0"
                  font-family="none"
                  font-weight="none"
                  font-size="none"
                  text-anchor="none"
                >
                  <g transform="scale(5.12,5.12)">
                    <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM25,11c-1.65685,0 -3,1.34315 -3,3c0,1.65685 1.34315,3 3,3c1.65685,0 3,-1.34315 3,-3c0,-1.65685 -1.34315,-3 -3,-3zM21,21v2h1h1v13h-1h-1v2h1h1h4h1h1v-2h-1h-1v-15h-1h-4z"></path>
                  </g>
                </g>
              </svg>{" "}
              {reportType === "daily" && (
                <>
                  Showing data for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
              {reportType === "weekly" && (
                <>
                  Showing weekly data:{" "}
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
                  Showing monthly data:{" "}
                  {startDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </>
              )}
              {reportType === "custom" && (
                <>
                  Showing custom date range:{" "}
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

          {/* Floor Tabs */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {floors.map((floor) => (
                <button
                  key={floor}
                  className={`px-4 py-2 rounded-md ${
                    selectedFloor === floor
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                  onClick={() => setSelectedFloor(floor)}
                >
                  {floorNames[floor]}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Data Section */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
              <p className="text-lg">Loading data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Metrics Grid - Adjust grid columns based on report type */}
              <div
                className={`grid grid-cols-1 ${
                  reportType === "daily" ? "md:grid-cols-3" : "md:grid-cols-2"
                } gap-6 mb-6`}
              >
                {/* Live Occupancy Card - Only shown for "daily" report type */}
                {reportType === "daily" && (
                  <LiveFloor selectedFloor={selectedFloor} />
                )}

                {/* Peak Occupancy Card always shown */}
                {reportType === "daily" ? (
                  <PeakFloorDaily
                    selectedFloor={selectedFloor}
                    selectedDate={selectedDate}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                      Peak Occupancy
                    </h2>
                    <div className="flex flex-col items-center">
                      <div>
                        <PieChart width={780} height={220}>
                          <Pie
                            data={[
                              {
                                name: "Occupied",
                                value: selectedFloorData.peakOccupancy,
                              },
                              {
                                name: "Available",
                                value: Math.max(
                                  0,
                                  50 - selectedFloorData.peakOccupancy
                                ),
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${Math.round(percent * 100)}%`
                            }
                          >
                            <Cell key="occupied" fill="#0088FE" />
                            <Cell key="available" fill="#dadada" />
                          </Pie>
                          <Tooltip formatter={(value) => Math.round(value)} />
                        </PieChart>
                      </div>
                      <div className="w-full flex flex-col items-center justify-center mt-4">
                        <p className="text-4xl font-bold text-blue-600">
                          {Math.round(selectedFloorData.peakOccupancy)}
                        </p>
                        <p className="text-gray-600">
                          Peak People Count
                          {selectedFloorData.peakDate && (
                            <span className="ml-1">
                              (
                              {format(
                                new Date(selectedFloorData.peakDate),
                                "MMM d, yyyy"
                              )}
                              )
                            </span>
                          )}
                        </p>
                        {selectedFloorData.peakZone && (
                          <p className="text-sm text-gray-500 mt-1">
                            Zone: {selectedFloorData.peakZone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Average Occupancy Card always shown */}
                <AvgFloorDaily
                  selectedFloor={selectedFloor}
                  selectedDate={selectedDate}
                  reportType={reportType}
                />
              </div>

              {/* Bar Graph Section - Only for Weekly, Monthly, and Custom */}
              {reportType !== "daily" && barChartData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {reportType === "weekly"
                      ? "Weekly"
                      : reportType === "monthly"
                      ? "Monthly"
                      : "Custom"}{" "}
                    Occupancy Trends
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
                            value: "Average Occupancy (%)",
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
                          name="Average Occupancy"
                          fill="#2463EB"
                          radius={[4, 4, 0, 0]}
                          barSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Hourly Data Section - Only for daily */}
              {reportType === "daily" && (
                <HourlyData
                  selectedDate={selectedDate}
                  selectedFloor={selectedFloor}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
