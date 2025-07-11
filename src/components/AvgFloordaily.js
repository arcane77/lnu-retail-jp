import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const AvgFloorDaily = ({ selectedFloor, selectedDate, reportType }) => {
  const [avgData, setAvgData] = useState({
    avgOccupancyPercentage: 0,
    maxCapacity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    // Filter data based on floor selection
    const floorItems = selectedFloor === "1F"
      ? data.filter((item) => item.zone_name.toLowerCase() !== "relocated")
      : data.filter((item) => 
          item.floor_id === selectedFloor && 
          item.zone_name !== "Main-Entrance" && 
          item.zone_name.toLowerCase() !== "relocated"
        );

    if (floorItems.length === 0) {
      setAvgData({
        avgOccupancyPercentage: 0,
        maxCapacity: 0,
      });
      return;
    }

    if (selectedFloor === "1F") {
      // Special handling for 1F calculation
      const floorTotals = {
        "Main-Entrance": { totalPercentage: 0, dataPoints: 0 },
        "MF": { totalPercentage: 0, dataPoints: 0 },
        "2F": { totalPercentage: 0, dataPoints: 0 },
        "3F": { totalPercentage: 0, dataPoints: 0 }
      };
      
      let maxCapacity = 0;

      // Group data by floor
      floorItems.forEach((item) => {
        const { data: zoneData, zone_name } = item;
        
        // Determine which floor this zone belongs to
        let floorKey = null;
        if (zone_name === "Main-Entrance") {
          floorKey = "Main-Entrance";
        } else if (item.floor_id === "MF") {
          floorKey = "MF";
        } else if (item.floor_id === "2F") {
          floorKey = "2F";
        } else if (item.floor_id === "3F") {
          floorKey = "3F";
        }
        
        if (floorKey && floorTotals[floorKey]) {
          // Set max capacity if available
          if (zoneData.length > 0 && zoneData[0].max_capacity) {
            maxCapacity += zoneData[0].max_capacity;
          }

          zoneData.forEach((entry) => {
            const { occupancy_percentage } = entry;
            floorTotals[floorKey].totalPercentage += occupancy_percentage;
            floorTotals[floorKey].dataPoints++;
          });
        }
      });

      // Calculate average for each floor
      const floorAverages = {};
      Object.keys(floorTotals).forEach(floor => {
        const data = floorTotals[floor];
        floorAverages[floor] = data.dataPoints > 0 ? data.totalPercentage / data.dataPoints : 0;
      });

      // Calculate 1F = Main-Entrance - (MF + 2F + 3F)
      const calculated1F = Math.max(0, 
        floorAverages["Main-Entrance"] - 
        floorAverages["MF"] - 
        floorAverages["2F"] - 
        floorAverages["3F"]
      );

      setAvgData({
        avgOccupancyPercentage: calculated1F,
        maxCapacity: maxCapacity || 50,
      });
    } else {
      // Original logic for other floors (MF, 2F, 3F)
      let totalPercentage = 0;
      let dataPointCount = 0;
      let maxCapacity = 0;

      floorItems.forEach((item) => {
        const { data: zoneData } = item;

        if (zoneData.length > 0 && zoneData[0].max_capacity) {
          maxCapacity += zoneData[0].max_capacity;
        }

        zoneData.forEach((entry) => {
          const { occupancy_percentage } = entry;
          totalPercentage += occupancy_percentage;
          dataPointCount++;
        });
      });

      const avgOccupancyPercentage =
        dataPointCount > 0 ? totalPercentage / dataPointCount : 0;

      setAvgData({
        avgOccupancyPercentage: avgOccupancyPercentage,
        maxCapacity: maxCapacity || 50,
      });
    }
  };

  // Process historical data for weekly/monthly/custom reports
  const processHistoricalData = (data) => {
    // Filter data based on floor selection
    const floorItems = selectedFloor === "1F"
      ? data.filter((item) => item.zone_name.toLowerCase() !== "relocated")
      : data.filter((item) => 
          item.floor_id === selectedFloor && 
          item.zone_name !== "Main-Entrance" && 
          item.zone_name.toLowerCase() !== "relocated"
        );

    if (floorItems.length === 0) {
      setAvgData({
        avgOccupancyPercentage: 0,
        maxCapacity: 0,
      });
      return;
    }

    if (selectedFloor === "1F") {
      // Special handling for 1F calculation
      const floorTotals = {
        "Main-Entrance": { totalPercentage: 0, dataPoints: 0 },
        "MF": { totalPercentage: 0, dataPoints: 0 },
        "2F": { totalPercentage: 0, dataPoints: 0 },
        "3F": { totalPercentage: 0, dataPoints: 0 }
      };
      
      let maxCapacity = 0;

      // Group data by floor
      floorItems.forEach((item) => {
        const { data: zoneData, zone_name } = item;
        
        // Determine which floor this zone belongs to
        let floorKey = null;
        if (zone_name === "Main-Entrance") {
          floorKey = "Main-Entrance";
        } else if (item.floor_id === "MF") {
          floorKey = "MF";
        } else if (item.floor_id === "2F") {
          floorKey = "2F";
        } else if (item.floor_id === "3F") {
          floorKey = "3F";
        }
        
        if (floorKey && floorTotals[floorKey]) {
          // Set max capacity if available
          if (zoneData.length > 0 && zoneData[0].max_capacity) {
            maxCapacity += zoneData[0].max_capacity;
          }

          zoneData.forEach((entry) => {
            const { occupancy_percentage } = entry;
            floorTotals[floorKey].totalPercentage += occupancy_percentage;
            floorTotals[floorKey].dataPoints++;
          });
        }
      });

      // Calculate average for each floor
      const floorAverages = {};
      Object.keys(floorTotals).forEach(floor => {
        const data = floorTotals[floor];
        floorAverages[floor] = data.dataPoints > 0 ? data.totalPercentage / data.dataPoints : 0;
      });

      // Calculate 1F = Main-Entrance - (MF + 2F + 3F)
      const calculated1F = Math.max(0, 
        floorAverages["Main-Entrance"] - 
        floorAverages["MF"] - 
        floorAverages["2F"] - 
        floorAverages["3F"]
      );

      setAvgData({
        avgOccupancyPercentage: calculated1F,
        maxCapacity: maxCapacity || 50,
      });
    } else {
      // Original logic for other floors (MF, 2F, 3F)
      let totalPercentage = 0;
      let dataPointCount = 0;
      let maxCapacity = 0;

      floorItems.forEach((item) => {
        const { data: zoneData } = item;

        if (zoneData.length > 0 && zoneData[0].max_capacity) {
          maxCapacity += zoneData[0].max_capacity;
        }

        zoneData.forEach((entry) => {
          const { occupancy_percentage } = entry;
          totalPercentage += occupancy_percentage;
          dataPointCount++;
        });
      });

      const avgOccupancyPercentage =
        dataPointCount > 0 ? totalPercentage / dataPointCount : 0;

      setAvgData({
        avgOccupancyPercentage: avgOccupancyPercentage,
        maxCapacity: maxCapacity || 50,
      });
    }
  };

  // Fetch data when component mounts and when selectedDate, selectedFloor, or reportType changes
  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedFloor, reportType]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
      平均稼働率​
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
            <p className="text-gray-600">平均稼働率​</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvgFloorDaily;