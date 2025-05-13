import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

// Define zone mapping for standardization
const zoneMapping = {
  "South-zone": "Zone A",
  "South-Zone": "Zone A",
  "Central-zone": "Zone B",
  "Central-Zone": "Zone B",
  "North-zone": "Zone C",
  "North-Zone": "Zone C"
};

// Component for displaying peak floor occupancy with live comparison
const PeakFloorDaily = ({ selectedFloor, selectedDate }) => {
  const [hourlyPeakData, setHourlyPeakData] = useState({});
  const [liveOccupancyData, setLiveOccupancyData] = useState({});
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

  // Function to fetch live occupancy data
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

  // Process hourly data to find peak occupancy by floor
  const processHourlyData = (data) => {
    // Group by floor and find max occupancy
    const peakByFloor = {};

    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip Main-Entrance zone and Relocated zone as done in other components
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      )
        return;

      if (!peakByFloor[floor_id]) {
        peakByFloor[floor_id] = {
          peakOccupancy: 0,
          timestamp: null,
          maxCapacity: 0,
          peakHour: null,
          peakZone: null // Track which zone had the peak
        };
      }

      // Process data for each zone and timestamp
      zoneData.forEach((entry) => {
        const { timestamp, total_occupancy, max_capacity } = entry;

        // Update peak occupancy if this value is higher
        if (total_occupancy > peakByFloor[floor_id].peakOccupancy) {
          peakByFloor[floor_id].peakOccupancy = total_occupancy;
          peakByFloor[floor_id].timestamp = timestamp;
          peakByFloor[floor_id].peakZone = zone_name; // Store zone name
          
          // Convert UTC timestamp to HKT (UTC+8)
          const utcDate = new Date(timestamp);
          const hktHour = (utcDate.getUTCHours() + 8) % 24; // Add 8 hours for HKT
          peakByFloor[floor_id].peakHour = hktHour;
        }
        
        // Track max capacity (any entry's max_capacity should work)
        if (!peakByFloor[floor_id].maxCapacity && max_capacity) {
          peakByFloor[floor_id].maxCapacity = max_capacity;
        }
      });
    });

    setHourlyPeakData(peakByFloor);
  };

  // Process live data
  const processLiveData = (data) => {
    // Group by floor
    const groupedByFloor = {};

    data.forEach((item) => {
      const { floor_id, zone_name, total_occupancy, max_capacity } = item;

      // Skip Main-Entrance zone and Relocated zone as requested
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      )
        return;

      if (!groupedByFloor[floor_id]) {
        groupedByFloor[floor_id] = {
          totalOccupancy: 0,
          maxCapacity: 0
        };
      }

      // Add to total occupancy
      groupedByFloor[floor_id].totalOccupancy += total_occupancy;
      
      // Track max capacity
      if (!groupedByFloor[floor_id].maxCapacity && max_capacity) {
        groupedByFloor[floor_id].maxCapacity = max_capacity;
      }
    });

    setLiveOccupancyData(groupedByFloor);
  };

  // Fetch data when component mounts and when selected date or floor changes
  useEffect(() => {
    fetchHourlyData();
    fetchLiveData();
    
    // Set up a refresh interval for live data every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [selectedDate, selectedFloor]);

  // Get effective peak occupancy (comparing hourly peak vs live)
  const getEffectivePeakData = () => {
    // Get hourly peak for the selected floor
    const hourlyPeak = hourlyPeakData[selectedFloor]?.peakOccupancy || 0;
    const peakHour = hourlyPeakData[selectedFloor]?.peakHour;
    
    // Use max capacity from either hourly or live data
    let maxCapacity = hourlyPeakData[selectedFloor]?.maxCapacity || 
                     liveOccupancyData[selectedFloor]?.maxCapacity || 50;
    
    // Get live occupancy for the selected floor
    const liveOccupancy = liveOccupancyData[selectedFloor]?.totalOccupancy || 0;
    
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

  // Get data for the selected floor
  const peakData = getEffectivePeakData();

  // Format hour for display
  const formatHour = (hour) => {
    if (hour === null || hour === undefined) return "";
    return hour === 0 ? "12 AM" : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? "12 PM" : 
           `${hour - 12} PM`;
  };

  // Get the standardized zone name
  const getStandardZoneName = (apiZoneName) => {
    return zoneMapping[apiZoneName] || apiZoneName;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Peak Occupancy
        {/* {peakData.isLivePeak && (
          <span className="ml-2 text-sm font-normal text-red-500">
            (Live Peak)
          </span>
        )} */}
      </h2>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <p>Loading peak data...</p>
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
              {peakData.isLivePeak ? "Peak Occupancy" : `Peak Occupancy (${formatHour(peakData.peakHour)})`}
            </p>
            {!peakData.isLivePeak && hourlyPeakData[selectedFloor]?.peakZone && (
              <p className="text-sm text-gray-500 mt-1">
                Zone: {getStandardZoneName(hourlyPeakData[selectedFloor].peakZone)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeakFloorDaily;