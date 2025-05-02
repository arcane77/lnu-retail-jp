import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";

const HourlyData = ({ selectedDate, selectedFloor }) => {
  const [loading, setLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState({});
  const [error, setError] = useState(null);

  // Hours to display (HKT)
  const hours = ["10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM"];
  
  // UTC to HKT mapping (UTC+8)
  const utcToHktMap = {
    "02": "10AM",
    "03": "11AM",
    "04": "12PM",
    "05": "1PM", 
    "06": "2PM",
    "07": "3PM",
    "08": "4PM",
    "09": "5PM"
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get background color based on occupancy level
  const getBackgroundColor = (occupancy, isOddIndex) => {
    // Default to alternating background for "-" values
    if (occupancy === "-") {
      return isOddIndex ? "bg-blue-100" : "bg-blue-50";
    }
    
    // Different shades based on occupancy
    if (occupancy < 30) {
      return "bg-blue-200 text-gray-800"; // Light blue
    } else if (occupancy >= 30 && occupancy <= 60) {
      return "bg-blue-400 text-white"; // Medium blue
    } else {
      return "bg-blue-600 text-white"; // Dark blue
    }
  };

  // Fetch hourly data from API
  const fetchHourlyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const formattedDate = formatDate(selectedDate);
      const response = await axios.get(
        `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/hourly?start_date=${formattedDate}&end_date=${formattedDate}`
      );

      if (response.data) {
        processHourlyData(response.data);
      }
    } catch (err) {
      console.error("Error fetching hourly data:", err);
      setError("Failed to fetch hourly data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process hourly data from API
  const processHourlyData = (data) => {
    // Initialize hourly occupancy data structure
    const hourlyTotals = {};
    for (let hour in utcToHktMap) {
      const hktHour = utcToHktMap[hour];
      hourlyTotals[hktHour] = "-"; // Default value if no data
    }

    // Filter data for the selected floor
    const floorData = data.filter(item => item.floor_id === selectedFloor);
    
    // Process each zone for this floor
    floorData.forEach(zone => {
      const { zone_name, data: zoneData } = zone;
      
      // Skip Main-Entrance zone and Relocated zone as requested
      if (zone_name === "Main-Entrance" || zone_name.toLowerCase() === "relocated") {
        return;
      }

      // Process each timestamp for this zone
      zoneData.forEach(entry => {
        const { timestamp, total_occupancy } = entry;
        
        // Extract hour from timestamp (format: "2025-04-30T02:00:00.000Z")
        const utcHour = timestamp.split("T")[1].substring(0, 2);
        const hktHour = utcToHktMap[utcHour];
        
        if (hktHour) {
          // Initialize if first value for this hour
          if (hourlyTotals[hktHour] === "-") {
            hourlyTotals[hktHour] = 0;
          }
          
          // Add the occupancy value (including negatives)
          hourlyTotals[hktHour] += total_occupancy;
        }
      });
    });

    // Round values to integers
    Object.keys(hourlyTotals).forEach(hour => {
      if (hourlyTotals[hour] !== "-") {
        hourlyTotals[hour] = Math.round(hourlyTotals[hour]);
      }
    });

    setHourlyData(hourlyTotals);
  };

  // Fetch data when selected date or floor changes
  useEffect(() => {
    fetchHourlyData();
  }, [selectedDate, selectedFloor]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Hourly Occupancy
      </h2>
      
      {loading ? (
        <div className="flex justify-center">
          <p className="text-lg">Loading hourly data...</p>
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div>
          <div className="flex items-center mb-2">
            <div className="text-gray-600 w-24">
              {format(selectedDate, "dd MMM yyyy")}
            </div>
            
            {hours.map((hour, index) => (
              <div key={hour} className="flex-1 text-center">
                <div 
                  className={`mx-1 py-4 px-2 rounded-sm ${
                    hourlyData[hour] !== "-" 
                      ? getBackgroundColor(hourlyData[hour], index % 2 === 1)
                      : (index % 2 === 1 ? "bg-blue-100" : "bg-blue-50")
                  }`}
                >
                  <div className="text-lg font-semibold">
                    {hourlyData[hour]}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-2">
            <div className="flex border-t border-gray-200">
              <div className="w-24"></div>
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center">
                  <div className="text-gray-600 mt-2">{hour}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourlyData;