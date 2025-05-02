import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import HourlyData from "./HourlyFloorOccupancy";
import LiveFloor from "./LiveFloor";
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
  ResponsiveContainer 
} from "recharts";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from "date-fns";

const floors = [ "1F","MF", "2F", "3F"]; // All available floors
const floorNames = {
  "1F": "1/F",
  "MF": "M/F",
  "2F": "2/F",
  "3F": "3/F",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Custom tooltip component for bar chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-blue-600">
          <span className="font-medium">Average Occupancy:</span> {payload[0].value.toFixed(2)}%
        </p>
        <p className="text-green-600">
          <span className="font-medium">Peak Occupancy:</span> {Math.round(payload[0].payload.peakOccupancy)}
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
    } else {
      // For weekly and monthly, use the explicitly selected start and end dates
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }
  };

  // Initialize date ranges based on report type changes
  useEffect(() => {
    if (reportType === "daily") {
      // For daily, just use the selected date
      // No need to change anything
    } else if (reportType === "weekly") {
      // Set default week range
      const currentDate = new Date(selectedDate);
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      setStartDate(startOfWeek);
      setEndDate(endOfWeek);
    } else if (reportType === "monthly") {
      // Set default month range
      const currentDate = new Date(selectedDate);
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      setStartDate(startOfMonth);
      setEndDate(endOfMonth);
    }
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
          totalOccupancy: 0,
          peakOccupancy: 0, // Initialize peak occupancy to 0
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

        // Use exact data from API for all calculations, including negative values
        groupedByFloor[floor_id].totalOccupancy += total_occupancy;
        
        // Update peak occupancy if this value is higher
        if (total_occupancy > groupedByFloor[floor_id].peakOccupancy) {
          groupedByFloor[floor_id].peakOccupancy = total_occupancy;
        }

        // Use exact occupancy percentage from API
        groupedByFloor[floor_id].totalPercentage += occupancy_percentage;

        // Add to zone count (used for averaging)
        groupedByFloor[floor_id].zoneCount++;

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

    // Calculate average percentages
    Object.keys(groupedByFloor).forEach((floorId) => {
      const floor = groupedByFloor[floorId];

      // Calculate average occupancy percentage
      floor.avgOccupancyPercentage =
        floor.zoneCount > 0 ? floor.totalPercentage / floor.zoneCount : 0;
    });

    setFloorData(groupedByFloor);
  };

  // Update data when relevant states change
  useEffect(() => {
    fetchData();
  }, [reportType]);

  // Fetch data when date selection changes
  useEffect(() => {
    if (reportType === "daily") {
      fetchData();
    }
  }, [selectedDate]);

  // Fetch data when date range changes for weekly/monthly
  useEffect(() => {
    if (reportType !== "daily") {
      fetchData();
    }
  }, [startDate, endDate]);

  // Prepare data for selected floor
  const selectedFloorData = floorData[selectedFloor] || {
    totalOccupancy: 0,
    peakOccupancy: 0, // Add default value for peak occupancy
    avgOccupancyPercentage: 0,
    zones: [],
  };

        // Process data for the bar chart
  const barChartData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) {
      return [];
    }

    // Create a map to store aggregate data by date
    const dateMap = new Map();

    rawApiData.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip Main-Entrance zone and Relocated zone
      if (zone_name === "Main-Entrance" || zone_name.toLowerCase() === "relocated") {
        return;
      }

      // Only consider the selected floor if we're filtering by floor
      if (selectedFloor && floor_id !== selectedFloor) {
        return;
      }

      // Process each timestamp entry
      zoneData.forEach((entry) => {
        const { timestamp, total_occupancy, occupancy_percentage } = entry;
        
        if (!dateMap.has(timestamp)) {
          dateMap.set(timestamp, {
            date: timestamp,
            totalOccupancy: 0,
            peakOccupancy: 0,
            totalPercentage: 0,
            zoneCount: 0
          });
        }
        
        // Add data to the map
        const dateEntry = dateMap.get(timestamp);
        dateEntry.totalOccupancy += total_occupancy;
        
        // Track peak occupancy (maximum value) for this date
        if (total_occupancy > dateEntry.peakOccupancy) {
          dateEntry.peakOccupancy = total_occupancy;
        }
        
        dateEntry.totalPercentage += occupancy_percentage;
        dateEntry.zoneCount += 1;
      });
    });
    
    // Calculate average percentages and convert to array
    const result = Array.from(dateMap.values()).map(entry => ({
      date: entry.date,
      averageOccupancy: entry.zoneCount > 0 ? entry.totalPercentage / entry.zoneCount : 0,
      peakOccupancy: entry.peakOccupancy
    }));
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [rawApiData, selectedFloor]);

  // Find maximum average occupancy for Y-axis scaling
  const maxAvgOccupancy = useMemo(() => {
    if (barChartData.length === 0) return 5; // Default value
    
    const max = Math.max(...barChartData.map(item => item.averageOccupancy));
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
                  </div>
                </div>

                {/* Date Selection - with specific spacing */}
                <div className="md:ml-16">
                  {reportType === "daily" ? (
                    <div className="mb-4 md:mb-0">
                      <label className="text-sm text-gray-600 mb-1 block">
                        Select Date
                      </label>
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="yyyy-MM-dd"
                        className="border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row">
                      <div className="mb-4 md:mb-0">
                        <label className="text-sm text-gray-600 mb-1 block">
                          Start Date
                        </label>
                        <DatePicker
                          selected={startDate}
                          onChange={(date) => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          dateFormat="yyyy-MM-dd"
                          className="border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div className="mb-4 md:mb-0 md:ml-6">
                        <label className="text-sm text-gray-600 mb-1 block">
                          End Date
                        </label>
                        <DatePicker
                          selected={endDate}
                          onChange={(date) => setEndDate(date)}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          minDate={startDate}
                          dateFormat="yyyy-MM-dd"
                          className="border border-gray-300 rounded-md px-3 py-2"
                        />
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
              {/* Metrics Grid - Updated to include LiveFloor component */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Live Occupancy Card */}
                <LiveFloor selectedFloor={selectedFloor} />

                {/* Peak Occupancy Card (Changed from Total Occupancy) */}
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
                                (selectedFloorData.zones[0]?.max_capacity) - selectedFloorData.peakOccupancy
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
                      <p className="text-gray-600">Peak People Count</p>
                    </div>
                  </div>
                </div>

                {/* Average Occupancy Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Average Occupancy
                  </h2>
                  <div className="flex flex-col items-center">
                    <div>
                      <PieChart width={480} height={220}>
                        <Pie
                          data={[
                            {
                              name: "Occupied",
                              value: selectedFloorData.avgOccupancyPercentage,
                            },
                            {
                              name: "Available",
                              value:
                                100 - selectedFloorData.avgOccupancyPercentage,
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
                            `${name}: ${(percent * 100).toFixed(2)}%`
                          }
                        >
                          <Cell key="occupied" fill="#00C49F" />
                          <Cell key="available" fill="#dadada" />
                        </Pie>
                        <Tooltip formatter={(value) => Math.round(value)} />
                      </PieChart>
                    </div>
                    <div className="w-full flex flex-col items-center justify-center mt-4">
                      <p className="text-4xl font-bold text-green-600">
                        {selectedFloorData.avgOccupancyPercentage.toFixed(2)}%
                      </p>
                      <p className="text-gray-600">Average Occupancy</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Graph Section - Only for Weekly and Monthly */}
              {reportType !== "daily" && barChartData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {reportType === "weekly" ? "Weekly" : "Monthly"} Occupancy Trends
                  </h2>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3"  vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatXAxis}
                          angle={0}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis 
                          label={{ 
                            value: 'Average Occupancy (%)', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle' }
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

              {/* Hourly Data Section - Only for Daily Reports */}
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