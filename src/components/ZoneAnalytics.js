import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import HourlyZoneOccupancy from "./HourlyZoneOccupancy";
import LiveZone from "./LiveZone"; // Import the new LiveZone component
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

// Define zone mapping for standardization
const zoneMapping = {
  "South-zone": "Zone A",
  "South-Zone": "Zone A",
  "Central-zone": "Zone B",
  "Central-Zone": "Zone B",
  "North-zone": "Zone C",
  "North-Zone": "Zone C",
  "Main-Entrance": "Main Entrance",
};

// All available zones - Main Entrance is kept as a separate zone
const zones = ["Zone A", "Zone B", "Zone C", "Main Entrance"]; 

// Available floors for filtering
const floors = ["All Floors", "1F", "2F", "3F", "MF"];

// Define which zones are available on which floors
const floorZoneMapping = {
  "1F": ["Zone A", "Zone B", "Zone C"],
  "2F": ["Zone A", "Zone B", "Zone C"],
  "3F": ["Zone B"],
  "MF": ["Zone A", "Zone C"],
  "All Floors": ["Zone A", "Zone B", "Zone C", "Main Entrance"],
};

// Flag to determine if we're showing the Main Entrance zone
const isMainEntranceView = (zone) => zone === "Main Entrance";

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

const ZoneAnalytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState("Zone A");
  const [selectedFloor, setSelectedFloor] = useState("All Floors"); // New state for floor selection
  
  // Get available zones for the selected floor
  const availableZones = useMemo(() => {
    return floorZoneMapping[selectedFloor] || zones;
  }, [selectedFloor]);
  const [zoneData, setZoneData] = useState({});
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [error, setError] = useState(null);
  
  // Store raw API data
  const [rawApiData, setRawApiData] = useState([]);
  
  // Store live data for Main Entrance zone
  const [mainEntranceLiveData, setMainEntranceLiveData] = useState(null);

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

  // Helper function to get max capacity for a zone
  const getMaxCapacity = (zoneData) => {
    if (!zoneData || !zoneData.floors || zoneData.floors.length === 0) {
      return 9000; // Default fallback
    }

    // Find the first non-null max_capacity from any data point in any floor
    for (const floor of zoneData.floors) {
      if (floor.data && floor.data.length > 0) {
        for (const dataPoint of floor.data) {
          if (dataPoint.max_capacity) {
            return dataPoint.max_capacity;
          }
        }
      }
    }

    return 9000; // Default if no max_capacity found
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

  // Fetch historical data from API
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
      console.error("Error fetching historical data:", err);
      setError("Failed to fetch historical data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch live data for Main Entrance
  const fetchLiveData = async () => {
    if (selectedZone === "Main Entrance") {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/live`
        );

        if (response.data && Array.isArray(response.data)) {
          // Find the Main-Entrance entry in the array
          const mainEntranceData = response.data.find(item => 
            item.zone_name === "Main-Entrance"
          );
          
          // Don't modify negative values - keep them as is
          setMainEntranceLiveData(mainEntranceData || null);
        }
      } catch (err) {
        console.error("Error fetching live data:", err);
        setError("Failed to fetch live data for Main Entrance. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Process API data and group by zones
  const processApiData = (data) => {
    // Group by standardized zone names
    const groupedByZone = {};

    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Completely ignore Relocated zone
      if (zone_name.toLowerCase() === "relocated") return;

      // Apply floor filter
      if (selectedFloor !== "All Floors" && floor_id !== selectedFloor) {
        return; // Skip data that doesn't match the selected floor
      }

      // Get the standardized zone name
      const standardizedZoneName = zoneMapping[zone_name] || zone_name;

      if (!groupedByZone[standardizedZoneName]) {
        groupedByZone[standardizedZoneName] = {
          floors: [],
          totalOccupancy: 0,
          peakOccupancy: 0, // Initialize peak occupancy to 0
          totalPercentage: 0,
          dataCount: 0,
        };
      }

      // Process data for each entry
      zoneData.forEach((entry) => {
        const {
          timestamp,
          total_occupancy,
          occupancy_percentage,
          max_capacity,
        } = entry;

        // Use exact data from API for all calculations, including negative values
        groupedByZone[standardizedZoneName].totalOccupancy += total_occupancy;
        
        // Update peak occupancy if this value is higher
        if (total_occupancy > groupedByZone[standardizedZoneName].peakOccupancy) {
          groupedByZone[standardizedZoneName].peakOccupancy = total_occupancy;
        }

        // Use exact occupancy percentage from API
        groupedByZone[standardizedZoneName].totalPercentage +=
          occupancy_percentage;

        // Add to data count (used for averaging)
        groupedByZone[standardizedZoneName].dataCount++;

        // Store floor data for this zone
        if (
          !groupedByZone[standardizedZoneName].floors.some(
            (f) => f.floor_id === floor_id
          )
        ) {
          groupedByZone[standardizedZoneName].floors.push({
            floor_id,
            data: [],
          });
        }

        // Find the floor and add data
        const floorIndex = groupedByZone[standardizedZoneName].floors.findIndex(
          (f) => f.floor_id === floor_id
        );

        if (floorIndex !== -1) {
          groupedByZone[standardizedZoneName].floors[floorIndex].data.push({
            timestamp,
            total_occupancy,
            occupancy_percentage,
            max_capacity,
          });
        }
      });
    });

    // Calculate average percentages
    Object.keys(groupedByZone).forEach((zoneName) => {
      const zone = groupedByZone[zoneName];

      // Calculate average occupancy percentage
      zone.avgOccupancyPercentage =
        zone.dataCount > 0 ? zone.totalPercentage / zone.dataCount : 0;
    });

    setZoneData(groupedByZone);
  };

  // Update selected zone when floor changes to ensure we have a valid zone for that floor
  useEffect(() => {
    // Skip for Main Entrance which is always available
    if (isMainEntranceView(selectedZone)) {
      return;
    }
    
    // Check if current selected zone is available in the new floor selection
    if (!availableZones.includes(selectedZone)) {
      // If not available, select the first available zone
      setSelectedZone(availableZones[0]);
    }
  }, [selectedFloor, availableZones, selectedZone]);

  // Update data when relevant states change
  useEffect(() => {
    if (!isMainEntranceView(selectedZone)) {
      fetchData();
    }
  }, [reportType, selectedZone, selectedFloor]); // Added selectedFloor dependency

  // Fetch data when date selection changes
  useEffect(() => {
    if (reportType === "daily" && !isMainEntranceView(selectedZone)) {
      fetchData();
    }
  }, [selectedDate, selectedZone, selectedFloor]); // Added selectedFloor dependency

  // Fetch data when date range changes for weekly/monthly
  useEffect(() => {
    if (reportType !== "daily" && !isMainEntranceView(selectedZone)) {
      fetchData();
    }
  }, [startDate, endDate, selectedZone, selectedFloor]); // Added selectedFloor dependency
  
  // Fetch live data when Main Entrance is selected
  useEffect(() => {
    if (isMainEntranceView(selectedZone)) {
      fetchLiveData();
      
      // Set up polling for live data every 30 seconds when viewing Main Entrance
      const intervalId = setInterval(fetchLiveData, 30000);
      
      // Clean up interval on unmount or when zone changes
      return () => clearInterval(intervalId);
    }
  }, [selectedZone]);

  // Prepare data for selected zone
  const selectedZoneData = zoneData[selectedZone] || {
    totalOccupancy: 0,
    peakOccupancy: 0, // Add default value for peak occupancy
    avgOccupancyPercentage: 0,
    floors: [],
  };

  // Process data for the bar chart - Modified to properly handle the selected zone and floor
  const barChartData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) {
      return [];
    }

    // Create a map to store aggregate data by date
    const dateMap = new Map();

    rawApiData.forEach((item) => {
      const { zone_name, floor_id, data: zoneData } = item;

      // Skip Relocated zone
      if (zone_name.toLowerCase() === "relocated") {
        return;
      }

      // Apply floor filter
      if (selectedFloor !== "All Floors" && floor_id !== selectedFloor) {
        return; // Skip data that doesn't match the selected floor
      }

      // Get the standardized zone name
      const standardizedZoneName = zoneMapping[zone_name] || zone_name;
      
      // Only consider the selected zone
      if (standardizedZoneName !== selectedZone) {
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
  }, [rawApiData, selectedZone, selectedFloor]); // Added selectedFloor dependency

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

          {/* Zone and Floor Tabs */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Zone Selection */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-600 mb-2">Select Zone</h3>
              <div className="flex flex-wrap gap-2">
                {zones.map((zone) => {
                  const isAvailable = availableZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      className={`px-4 py-2 rounded-md ${
                        selectedZone === zone
                          ? "bg-blue-600 text-white"
                          : isAvailable 
                            ? "bg-gray-200 text-gray-800" 
                            : "bg-gray-100 text-gray-400"
                      }`}
                      onClick={() => isAvailable && setSelectedZone(zone)}
                      disabled={!isAvailable}
                      title={!isAvailable ? `${zone} is not available on floor ${selectedFloor}` : ""}
                    >
                      {zone}
                      {!isAvailable && (
                        <span className="ml-1 text-xs">
                          (N/A)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Floor Selection - New Feature */}
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Select Floor</h3>
              <div className="flex flex-wrap gap-2">
                {floors.map((floor) => (
                  <button
                    key={floor}
                    className={`px-4 py-2 rounded-md ${
                      selectedFloor === floor
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setSelectedFloor(floor)}
                    disabled={isMainEntranceView(selectedZone)} // Disable floor selection for Main Entrance
                  >
                    {floor}
                  </button>
                ))}
              </div>
              {isMainEntranceView(selectedZone) && (
                <p className="text-sm text-gray-500 mt-2">
                  Floor selection is not applicable for Main Entrance view
                </p>
              )}
            </div>
          </div>

          {/* Zone Data Section */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
              <p className="text-lg">Loading data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : isMainEntranceView(selectedZone) ? (
            // Main Entrance View - Only show Live Occupancy
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Main Entrance - Live Occupancy
              </h2>
              
              {mainEntranceLiveData ? (
                <div className="flex items-center justify-center">
                  <div className="w-full md:w-2/3 mx-auto">
                    <PieChart width={580} height={280}>
                      <Pie
                        data={[
                          {
                            name: "Occupied",
                            value: mainEntranceLiveData.total_occupancy,
                          },
                          {
                            name: "Available",
                            value: mainEntranceLiveData.max_capacity - mainEntranceLiveData.total_occupancy,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
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
                  
                  <div className="text-center mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                        <p className="text-5xl font-bold text-blue-600">
                          {/* Show the actual API value even if negative */}
                          {mainEntranceLiveData.total_occupancy}
                        </p>
                        <p className="text-gray-700 text-lg mt-2">Current Occupancy</p>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg shadow-sm">
                        <p className="text-5xl font-bold text-green-600">
                          {`${mainEntranceLiveData.occupancy_percentage.toFixed(2)}%`}
                        </p>
                        <p className="text-gray-700 text-lg mt-2">Occupancy Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-10">
                  <p className="text-lg text-gray-600">No live data available for Main Entrance</p>
                  <button 
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    onClick={fetchLiveData}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Normal Zone View (Zone A, B, C)
            <>
              {/* Floor info banner when floor is selected */}
              {selectedFloor !== "All Floors" && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <p className="text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    Showing data for {selectedZone} on floor {selectedFloor} only
                    {selectedFloor !== "All Floors" && (
                      <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">
                        Available zones on {selectedFloor}: {floorZoneMapping[selectedFloor].join(", ")}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Metrics Grid - Now with 3 columns including LiveZone */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Live Occupancy Card */}
                <LiveZone selectedZone={selectedZone} selectedFloor={selectedFloor} />

                {/* Peak Occupancy Card (Changed from Total Occupancy) */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Peak Occupancy
                  </h2>
                  <div className="flex flex-col items-center">
                    <div>
                      <PieChart width={480} height={240}>
                        <Pie
                          data={[
                            {
                              name: "Occupied",
                              value: Math.max(
                                0,
                                selectedZoneData.peakOccupancy
                              ),
                            },
                            {
                              name: "Available",
                              value: Math.max(
                                0,
                                getMaxCapacity(selectedZoneData) -
                                  Math.max(0, selectedZoneData.peakOccupancy)
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
                    <div className="w-full mt-4 flex flex-col items-center justify-center">
                      <p className="text-4xl font-bold text-blue-600">
                        {Math.round(
                          Math.max(0, selectedZoneData.peakOccupancy)
                        )}
                      </p>
                      <p className="text-gray-600">Peak People</p>
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
                      <PieChart width={480} height={240}>
                        <Pie
                          data={[
                            {
                              name: "Occupied",
                              value: selectedZoneData.avgOccupancyPercentage,
                            },
                            {
                              name: "Available",
                              value:
                                100 - selectedZoneData.avgOccupancyPercentage,
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
                        <Tooltip formatter={(value) => value.toFixed(2)} />
                      </PieChart>
                    </div>
                    <div className="w-full mt-4 flex flex-col items-center justify-center">
                      <p className="text-4xl font-bold text-green-600">
                        {selectedZoneData.avgOccupancyPercentage.toFixed(2)}%
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
                    {reportType === "weekly" ? "Weekly" : "Monthly"} {selectedZone} Occupancy Trends
                    {selectedFloor !== "All Floors" && ` - Floor ${selectedFloor}`}
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
                          angle={-45}
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
              {reportType === "daily" && (
                <HourlyZoneOccupancy 
                  selectedDate={selectedDate} 
                  selectedZone={selectedZone}
                  selectedFloor={selectedFloor} // Pass the selected floor to the hourly component
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ZoneAnalytics;