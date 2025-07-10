import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { format } from "date-fns";

const PeakBuildingDaily = ({ selectedDate, reportType }) => {
  const [hourlyPeakData, setHourlyPeakData] = useState({
    peakOccupancy: 0,
    peakHour: null,
    timestamp: null,
    maxCapacity: 0,
  });
  const [liveOccupancyData, setLiveOccupancyData] = useState({
    totalOccupancy: 0,
    maxCapacity: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to fetch hourly data for the selected day
  const fetchHourlyData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Format the date for API call
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const response = await axios.get(
        `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/hourly?start_date=${formattedDate}&end_date=${formattedDate}`
      );

      if (response.data) {
        processHourlyData(response.data);
      }
    } catch (err) {
      console.error("Error fetching hourly data:", err);
      setError("Failed to fetch hourly occupancy data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch historical data for non-daily reports
  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get date range based on report type
      let startDate, endDate;
      
      if (reportType === "weekly") {
        // Calculate week range
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Saturday
        
        startDate = weekStart.toISOString().split('T')[0];
        endDate = weekEnd.toISOString().split('T')[0];
      } else if (reportType === "monthly") {
        // Calculate month range
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        startDate = monthStart.toISOString().split('T')[0];
        endDate = monthEnd.toISOString().split('T')[0];
      } else {
        // Default to selected date for other types
        startDate = selectedDate.toISOString().split('T')[0];
        endDate = selectedDate.toISOString().split('T')[0];
      }
      
      const response = await axios.get(
        `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/historical?start_date=${startDate}&end_date=${endDate}`
      );

      if (response.data) {
        processHistoricalData(response.data);
      }
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError("Failed to fetch historical occupancy data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch live occupancy data (only for daily report)
  const fetchLiveData = async () => {
    try {
      const response = await axios.get(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/live"
      );

      if (response.data) {
        processLiveData(response.data);
      }
    } catch (err) {
      console.error("Error fetching live data:", err);
      // We still continue if live data fails, just won't update live peak
    }
  };

  // Process hourly data to find peak occupancy for Main-Entrance only
  const processHourlyData = (data) => {
    // Find Main-Entrance data
    const mainEntranceItems = data.filter(item => item.zone_name === "Main-Entrance");
    
    if (mainEntranceItems.length === 0) {
      setHourlyPeakData({
        peakOccupancy: 0,
        peakHour: null,
        timestamp: null,
        maxCapacity: 0
      });
      return;
    }

    let peakOccupancy = 0;
    let peakTimestamp = null;
    let maxCapacity = 0;
    
    // Process Main-Entrance zone data to find peak
    mainEntranceItems.forEach(item => {
      const { data: zoneData } = item;
      
      // Set max capacity if available
      if (zoneData.length > 0 && zoneData[0].max_capacity) {
        maxCapacity = zoneData[0].max_capacity;
      }
      
      zoneData.forEach(entry => {
        const { timestamp, total_occupancy } = entry;
        
        // Update peak occupancy if this value is higher
        if (total_occupancy > peakOccupancy) {
          peakOccupancy = total_occupancy;
          peakTimestamp = timestamp;
        }
      });
    });

    // Get peak hour in HKT
    let peakHour = null;
    if (peakTimestamp) {
      const utcDate = new Date(peakTimestamp);
      peakHour = (utcDate.getUTCHours() + 8) % 24; // Add 8 hours for HKT
    }

    // Store peak data
    setHourlyPeakData({
      peakOccupancy: peakOccupancy,
      timestamp: peakTimestamp,
      peakHour: peakHour,
      maxCapacity: maxCapacity
    });
  };

  // Process historical data to find peak occupancy for Main-Entrance only (for non-daily reports)
  const processHistoricalData = (data) => {
    // Find Main-Entrance data
    const mainEntranceItems = data.filter(item => item.zone_name === "Main-Entrance");
    
    if (mainEntranceItems.length === 0) {
      setHourlyPeakData({
        peakOccupancy: 0,
        peakDate: null,
        maxCapacity: 0
      });
      return;
    }

    let peakOccupancy = 0;
    let peakDate = null;
    let maxCapacity = 0;
    
    // Process Main-Entrance zone data to find peak
    mainEntranceItems.forEach(item => {
      const { data: zoneData } = item;
      
      // Set max capacity if available
      if (zoneData.length > 0 && zoneData[0].max_capacity) {
        maxCapacity = zoneData[0].max_capacity;
      }
      
      zoneData.forEach(entry => {
        const { timestamp, total_occupancy } = entry;
        
        // Update peak occupancy if this value is higher
        if (total_occupancy > peakOccupancy) {
          peakOccupancy = total_occupancy;
          peakDate = timestamp;
        }
      });
    });

    // Store peak data (using same state object but with different properties)
    setHourlyPeakData({
      peakOccupancy: peakOccupancy,
      peakDate: peakDate,
      maxCapacity: maxCapacity
    });
  };

  // Process live data for Main-Entrance only
  const processLiveData = (data) => {
    // Find Main-Entrance data
    const mainEntranceItems = data.filter(item => item.zone_name === "Main-Entrance");
    
    if (mainEntranceItems.length === 0) {
      setLiveOccupancyData({
        totalOccupancy: 0,
        maxCapacity: 0
      });
      return;
    }

    let totalOccupancy = 0;
    let maxCapacity = 0;
    
    // Process Main-Entrance live data
    mainEntranceItems.forEach(item => {
      const { total_occupancy, max_capacity } = item;
      
      // Add to total occupancy
      totalOccupancy += total_occupancy;
      
      // Set max capacity if available
      if (max_capacity) {
        maxCapacity = max_capacity;
      }
    });

    setLiveOccupancyData({
      totalOccupancy: totalOccupancy,
      maxCapacity: maxCapacity
    });
  };

  // Fetch appropriate data when component mounts or when date/report type changes
  useEffect(() => {
    if (reportType === "daily") {
      // For daily reports, fetch hourly data and live data
      fetchHourlyData();
      fetchLiveData();
      
      // Set up a refresh interval for live data every 60 seconds
      const interval = setInterval(fetchLiveData, 60000);
      
      // Clear interval on component unmount or when dependencies change
      return () => clearInterval(interval);
    } else {
      // For non-daily reports, just fetch historical data
      fetchHistoricalData();
    }
  }, [selectedDate, reportType]);

  // Get effective peak occupancy (comparing hourly peak vs live)
  // Only used for daily report type
  const getEffectivePeakData = () => {
    // Get hourly peak
    const hourlyPeak = hourlyPeakData.peakOccupancy || 0;
    const peakHour = hourlyPeakData.peakHour;
    
    // Use max capacity from either hourly or live data
    let maxCapacity = hourlyPeakData.maxCapacity || 
                      liveOccupancyData.maxCapacity || 100;
    
    // Get live occupancy
    const liveOccupancy = liveOccupancyData.totalOccupancy || 0;
    
    // When live occupancy is greater than the hourly peak, use live as the peak
    const effectivePeak = Math.max(hourlyPeak, liveOccupancy);
    const isLivePeak = liveOccupancy > hourlyPeak;
    
    return {
      peakOccupancy: effectivePeak,
      maxCapacity: maxCapacity,
      isLivePeak: isLivePeak,
      peakHour: peakHour
    };
  };

  // Format hour for display
  const formatHour = (hour) => {
    if (hour === null || hour === undefined) return "";
    return hour === 0 ? "12 AM" : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? "12 PM" : 
           `${hour - 12} PM`;
  };

  // Render different components based on report type
  if (reportType === "daily") {
    // Daily report with live comparison
    const peakData = getEffectivePeakData();

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
        ピーク時の稼働率​
          {/* {peakData.isLivePeak && (
            <span className="ml-2 text-sm font-normal text-red-500">
              (Live Peak)
            </span>
          )} */}
        </h2>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p>データを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div>
              <PieChart width={480} height={240}>
                <Pie
                  data={[
                    {
                      name: "Occupied",
                      value: peakData.peakOccupancy,
                    },
                    {
                      name: "Available",
                      value: Math.max(
                        0,
                        peakData.maxCapacity - peakData.peakOccupancy
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
                {Math.round(peakData.peakOccupancy)}
              </p>
              <p className="text-gray-600">
                {peakData.isLivePeak ? "最大人数 (ライブ)" : `最大人数 (${formatHour(peakData.peakHour)})`}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // Weekly/Monthly/Custom report with historical data only
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
        ピーク時の稼働率​
        </h2>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p>データを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div>
              <PieChart width={480} height={240}>
                <Pie
                  data={[
                    {
                      name: "Occupied",
                      value: hourlyPeakData.peakOccupancy,
                    },
                    {
                      name: "Available",
                      value: Math.max(
                        0,
                        hourlyPeakData.maxCapacity - hourlyPeakData.peakOccupancy
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
                {Math.round(hourlyPeakData.peakOccupancy)}
              </p>
              <p className="text-gray-600">
              ピーク時の人数 
                {hourlyPeakData.peakDate && (
                  <span className="ml-1">
                    ({format(new Date(hourlyPeakData.peakDate), "MMM d, yyyy")})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
};

export default PeakBuildingDaily;