import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";

const HourlyBuildingOccupancy = ({ selectedDate }) => {
  const formatSelectedDate = (date) => {
    return format(date, "MMMM d, yyyy");
  };
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [floorData, setFloorData] = useState({});

  const floors = ["MF", "1F", "2F", "3F"]; // All available floors
  const floorColors = {
    MF: "#0088FE", // Blue
    "1F": "#00C49F", // Green
    "2F": "#FFBB28", // Yellow
    "3F": "#FF8042", // Orange
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch hourly data for the selected date and all floors
  useEffect(() => {
    const fetchHourlyData = async () => {
      setLoading(true);
      setError(null);

      try {
        const formattedDate = formatDate(selectedDate);
        
        // Fetch hourly data for all floors
        const fetchPromises = floors.map(floor => 
          axios.get(
            `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/hourly?date=${formattedDate}&floor_id=${floor}`
          )
        );

        const responses = await Promise.all(fetchPromises);
        
        // Process the responses for each floor
        const floorDataMap = {};
        floors.forEach((floor, index) => {
          const floorResponse = responses[index];
          floorDataMap[floor] = floorResponse.data || [];
        });
        
        setFloorData(floorDataMap);
        
        // Process data for chart
        processHourlyData(floorDataMap);
      } catch (err) {
        console.error("Error fetching hourly data:", err);
        setError("Failed to fetch hourly data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) {
      fetchHourlyData();
    }
  }, [selectedDate]);

      // Custom tooltip for the hourly chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold text-gray-800">{`Time: ${label}`}</p>
          <div className="mt-2">
            {payload.map((entry, index) => (
              <p 
                key={index} 
                style={{ color: entry.color }}
                className="font-medium"
              >
                {entry.name === "Building" 
                  ? `Building Average: ${entry.value.toFixed(2)}%` 
                  : `${entry.name}: ${entry.value.toFixed(2)}%`}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Process hourly data for display
  const processHourlyData = (floorDataMap) => {
    // Create a map to aggregate data by hour across all floors
    const hourMap = new Map();

    // Process each floor
    Object.entries(floorDataMap).forEach(([floorId, floorData]) => {
      // For each entry in this floor's data
      floorData.forEach((entry) => {
        const { timestamp, total_occupancy, occupancy_percentage } = entry;
        
        // Extract hour from timestamp
        const hour = timestamp.split(' ')[1].slice(0, 5); // Format: "HH:MM"
        
        if (!hourMap.has(hour)) {
          hourMap.set(hour, {
            hour,
            totalBuildingOccupancy: 0,
            avgBuildingPercentage: 0,
            measurementCount: 0,
          });
          
          // Initialize floor-specific data
          floors.forEach(floor => {
            hourMap.get(hour)[floor] = 0;
            hourMap.get(hour)[`${floor}_percent`] = 0;
          });
        }
        
        // Add data for this floor to the hour entry
        const hourEntry = hourMap.get(hour);
        hourEntry.totalBuildingOccupancy += total_occupancy;
        hourEntry.avgBuildingPercentage += occupancy_percentage;
        hourEntry.measurementCount += 1;
        
        // Add floor-specific data
        hourEntry[floorId] = (hourEntry[floorId] || 0) + total_occupancy;
        hourEntry[`${floorId}_percent`] = (hourEntry[`${floorId}_percent`] || 0) + occupancy_percentage;
      });
    });
    
    // Calculate averages and convert map to array
    const processedData = Array.from(hourMap.values())
      .map(entry => {
        // Calculate building average
        entry.avgBuildingPercentage = entry.measurementCount > 0 
          ? entry.avgBuildingPercentage / entry.measurementCount 
          : 0;
        
        // Calculate floor-specific averages
        floors.forEach(floor => {
          // If this floor has data for this hour
          if (entry[`${floor}_percent`] > 0) {
            entry[`${floor}_percent`] = entry[`${floor}_percent`] / entry.measurementCount;
          }
        });
        
        return entry;
      })
      .sort((a, b) => a.hour.localeCompare(b.hour));
    
    setHourlyData(processedData);
  };
  
  // Chart y-axis maximum value
  const maxOccupancyPercent = useMemo(() => {
    if (hourlyData.length === 0) return 100;
    
    const maxValues = hourlyData.map(entry => {
      return Math.max(
        entry.avgBuildingPercentage, 
        entry.MF_percent || 0,
        entry["1F_percent"] || 0,
        entry["2F_percent"] || 0,
        entry["3F_percent"] || 0
      );
    });
    
    const max = Math.max(...maxValues, 5); // Ensure at least 5%
    return Math.ceil(max / 10) * 10; // Round up to nearest 10
  }, [hourlyData]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Hourly Building Occupancy - {formatSelectedDate(selectedDate)}
      </h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-60">
          <p className="text-lg">Loading hourly data...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8">
          <p className="text-red-500">{error}</p>
        </div>
      ) : hourlyData.length === 0 ? (
        <div className="flex justify-center items-center h-60">
          <p className="text-lg">No hourly data available for this date.</p>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={hourlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -10 }} />
              <YAxis 
                domain={[0, maxOccupancyPercent]} 
                label={{ value: 'Occupancy Percentage (%)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Building Average Line */}
              <Line
                type="monotone"
                dataKey="avgBuildingPercentage"
                name="Building"
                stroke="#8884d8"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
              
              {/* Floor-specific lines */}
              {floors.map(floor => (
                <Line
                  key={floor}
                  type="monotone"
                  dataKey={`${floor}_percent`}
                  name={floor}
                  stroke={floorColors[floor]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default HourlyBuildingOccupancy;