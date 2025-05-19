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

    // First pass: Initialize data structures for each floor
    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip Main-Entrance zone and Relocated zone as done in other components
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      ) {
        return;
      }

      if (!peakByFloor[floor_id]) {
        peakByFloor[floor_id] = {
          peakOccupancy: 0,
          timestamp: null,
          maxCapacity: 0,
          peakHour: null,
          peakZone: null, // Track which zone had the peak
          hourlyPeaksByTimestamp: {} // Track hourly peaks by timestamp
        };
      }

      // Initialize tracking for each timestamp
      zoneData.forEach((entry) => {
        const { timestamp, max_capacity } = entry;
        
        if (!peakByFloor[floor_id].hourlyPeaksByTimestamp[timestamp]) {
          peakByFloor[floor_id].hourlyPeaksByTimestamp[timestamp] = {
            totalOccupancy: 0,
            processedZones: new Set() // Track which zones we've already processed for this timestamp
          };
        }
        
        // Track max capacity (any entry's max_capacity should work)
        if (!peakByFloor[floor_id].maxCapacity && max_capacity) {
          peakByFloor[floor_id].maxCapacity = max_capacity;
        }
      });
    });
    
    // Second pass: Calculate aggregated occupancy per timestamp without duplicates
    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;
      
      // Skip Main-Entrance zone and Relocated zone
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      ) {
        return;
      }
      
      // Skip if floor wasn't initialized
      if (!peakByFloor[floor_id]) {
        return;
      }
        
      // Process each timestamp
      zoneData.forEach((entry) => {
        const { timestamp, total_occupancy } = entry;
        const hourlyPeaks = peakByFloor[floor_id].hourlyPeaksByTimestamp;
        
        // Skip if we've already counted this zone for this timestamp
        const zoneKey = `${zone_name}`;
        if (hourlyPeaks[timestamp].processedZones.has(zoneKey)) {
          return;
        }
        
        // Mark this zone as processed for this timestamp
        hourlyPeaks[timestamp].processedZones.add(zoneKey);
        
        // Add occupancy to the total for this timestamp
        hourlyPeaks[timestamp].totalOccupancy += total_occupancy;
      });
    });
    
    // Now determine the peak hour based on the aggregated data
    Object.keys(peakByFloor).forEach(floor_id => {
      const floor = peakByFloor[floor_id];
      const hourlyPeaks = floor.hourlyPeaksByTimestamp;
      
      // Find the timestamp with the highest occupancy
      let maxOccupancy = 0;
      let peakTimestamp = null;
      
      Object.entries(hourlyPeaks).forEach(([timestamp, data]) => {
        if (data.totalOccupancy > maxOccupancy) {
          maxOccupancy = data.totalOccupancy;
          peakTimestamp = timestamp;
        }
      });
      
      // Update the floor's peak data if we found a valid peak
      if (peakTimestamp) {
        floor.peakOccupancy = maxOccupancy;
        floor.timestamp = peakTimestamp;
        
        // Convert UTC timestamp to HKT (UTC+8)
        const utcDate = new Date(peakTimestamp);
        const hktHour = (utcDate.getUTCHours() + 8) % 24; // Add 8 hours for HKT
        floor.peakHour = hktHour;
        
        // Find which zone had the highest occupancy at the peak time
        // Since we can't easily determine this from our aggregated data,
        // we'll leave peakZone as null for now
        floor.peakZone = null;
      }
    });

    setHourlyPeakData(peakByFloor);
  };

  // Process live data to prevent duplicate zone counting
  const processLiveData = (data) => {
    // Group by floor
    const groupedByFloor = {};
    
    // Map to track processed zones per floor
    const processedZones = new Map();

    data.forEach((item) => {
      const { floor_id, zone_name, total_occupancy, max_capacity } = item;

      // Skip Main-Entrance zone and Relocated zone as requested
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      ) {
        return;
      }
      
      // Create unique key for this floor-zone combination
      const zoneKey = `${floor_id}-${zone_name}`;
      
      // Skip if we've already processed this zone for this floor
      if (processedZones.has(zoneKey)) {
        return;
      }
      
      // Mark this zone as processed
      processedZones.set(zoneKey, true);

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