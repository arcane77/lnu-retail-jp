import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const AvgZoneDaily = ({ selectedZone, selectedFloor, selectedDate, reportType }) => {
  const [avgData, setAvgData] = useState({
    avgOccupancyPercentage: 0,
    maxCapacity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Zone mapping for standardization
  const zoneMapping = {
    "South-zone": "Zone A",
    "South-Zone": "Zone A",
    "Central-zone": "Zone B",
    "Central-Zone": "Zone B",
    "North-zone": "Zone C",
    "North-Zone": "Zone C"
  };

  // Helper function to get the API zone name from the standardized name
  const getApiZoneName = (standardizedName) => {
    const apiNames = Object.keys(zoneMapping).filter(
      key => zoneMapping[key] === standardizedName
    );
    return apiNames.length > 0 ? apiNames : [standardizedName];
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to get date range based on report type
  const getDateRange = () => {
    if (reportType === "daily") {
      return {
        startDate: formatDate(selectedDate),
        endDate: formatDate(selectedDate),
      };
    } else if (reportType === "weekly") {
      // Calculate week range (Sunday-Saturday)
      const week_start = new Date(selectedDate);
      week_start.setDate(week_start.getDate() - week_start.getDay()); // Get Sunday
      const week_end = new Date(week_start);
      week_end.setDate(week_end.getDate() + 6); // Get Saturday
      
      return {
        startDate: formatDate(week_start),
        endDate: formatDate(week_end),
      };
    } else if (reportType === "monthly") {
      // Calculate month range
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const month_start = new Date(year, month, 1);
      const month_end = new Date(year, month + 1, 0);
      
      return {
        startDate: formatDate(month_start),
        endDate: formatDate(month_end),
      };
    } else {
      // Use custom date range (will be passed by parent component)
      return {
        startDate: formatDate(selectedDate),
        endDate: formatDate(selectedDate),
      };
    }
  };

  // Function to fetch data based on report type
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      if (reportType === "daily") {
        // For daily reports, fetch from hourly endpoint
        const response = await axios.get(
          `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/hourly?start_date=${startDate}&end_date=${endDate}`
        );

        if (response.data) {
          processHourlyData(response.data);
        }
      } else {
        // For weekly/monthly/custom reports, fetch from historical endpoint
        const response = await axios.get(
          `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/historical?start_date=${startDate}&end_date=${endDate}`
        );

        if (response.data) {
          processHistoricalData(response.data);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch occupancy data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process hourly data for daily reports
  const processHourlyData = (data) => {
    // Get possible API zone names
    const apiZoneNames = getApiZoneName(selectedZone);
    
    // Filter for the selected floor and zone
    const zoneItems = data.filter(
      (item) => 
        item.floor_id === selectedFloor && 
        apiZoneNames.includes(item.zone_name)
    );

    if (zoneItems.length === 0) {
      setAvgData({
        avgOccupancyPercentage: 0,
        maxCapacity: 0,
      });
      return;
    }

    let totalPercentage = 0;
    let dataPointCount = 0;
    let maxCapacity = 0;

    // Process each zone data point
    zoneItems.forEach((item) => {
      const { data: zoneData } = item;

      // Set max capacity if available
      if (zoneData.length > 0 && zoneData[0].max_capacity) {
        maxCapacity = zoneData[0].max_capacity;
      }

      zoneData.forEach((entry) => {
        const { occupancy_percentage } = entry;

        // Add to total percentage for averaging later
        totalPercentage += occupancy_percentage;
        dataPointCount++;
      });
    });

    // Calculate average occupancy percentage
    const avgOccupancyPercentage =
      dataPointCount > 0 ? totalPercentage / dataPointCount : 0;

    // Set data
    setAvgData({
      avgOccupancyPercentage: avgOccupancyPercentage,
      maxCapacity: maxCapacity || 50, // Default to 50 if no max capacity
    });
  };

  // Process historical data for weekly/monthly/custom reports
  const processHistoricalData = (data) => {
    // Get possible API zone names
    const apiZoneNames = getApiZoneName(selectedZone);
    
    // Filter for the selected floor and zone
    const zoneItems = data.filter(
      (item) => 
        item.floor_id === selectedFloor && 
        apiZoneNames.includes(item.zone_name)
    );

    if (zoneItems.length === 0) {
      setAvgData({
        avgOccupancyPercentage: 0,
        maxCapacity: 0,
      });
      return;
    }

    let totalPercentage = 0;
    let dataPointCount = 0;
    let maxCapacity = 0;

    // Process each zone data point
    zoneItems.forEach((item) => {
      const { data: zoneData } = item;

      // Set max capacity if available
      if (zoneData.length > 0 && zoneData[0].max_capacity) {
        maxCapacity = zoneData[0].max_capacity;
      }

      zoneData.forEach((entry) => {
        const { occupancy_percentage } = entry;

        // Add to total percentage for averaging later
        totalPercentage += occupancy_percentage;
        dataPointCount++;
      });
    });

    // Calculate average occupancy percentage
    const avgOccupancyPercentage =
      dataPointCount > 0 ? totalPercentage / dataPointCount : 0;

    // Set data
    setAvgData({
      avgOccupancyPercentage: avgOccupancyPercentage,
      maxCapacity: maxCapacity || 50, // Default to 50 if no max capacity
    });
  };

  // Fetch data when component mounts and when dependencies change
  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedFloor, selectedZone, reportType]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Average Occupancy
      </h2>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <p>Loading data...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-48">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div>
            <PieChart width={480} height={220}>
              <Pie
                data={[
                  {
                    name: "Occupied",
                    value: avgData.avgOccupancyPercentage,
                  },
                  {
                    name: "Available",
                    value: 100 - avgData.avgOccupancyPercentage,
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
                <Cell key="occupied" fill="#82C0CC" />
                <Cell key="available" fill="#dadada" />
              </Pie>
              <Tooltip formatter={(value) => value.toFixed(2)} />
            </PieChart>
          </div>
          <div className="w-full flex flex-col items-center justify-center mt-4">
            <p className="text-4xl font-bold text-[#82C0CC]">
              {avgData.avgOccupancyPercentage.toFixed(2)}%
            </p>
            <p className="text-gray-600">Average Occupancy</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvgZoneDaily;