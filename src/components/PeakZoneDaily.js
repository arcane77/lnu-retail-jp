import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

// Define zone mapping for standardization (same as in ZoneAnalytics)
const zoneMapping = {
  "South-zone": "Zone A",
  "South-Zone": "Zone A",
  "Central-zone": "Zone B",
  "Central-Zone": "Zone B",
  "North-zone": "Zone C",
  "North-Zone": "Zone C",
};

// Reverse mapping to get API zone names
const reverseZoneMapping = {
  "Zone A": ["South-zone", "South-Zone"],
  "Zone B": ["Central-zone", "Central-Zone"],
  "Zone C": ["North-zone", "North-Zone"],
};

// Component for displaying peak zone occupancy with live comparison
const PeakZoneDaily = ({ selectedZone, selectedDate, selectedFloor }) => {
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

  // Get API zone names for the selected UI zone
  const getApiZoneNames = (uiZoneName) => {
    return reverseZoneMapping[uiZoneName] || [uiZoneName];
  };

  // Process hourly data to find peak occupancy for the selected zone
  const processHourlyData = (data) => {
    // Get the API zone names that correspond to the UI zone name
    const apiZoneNames = getApiZoneNames(selectedZone);
    
    // Initialize peak data for the selected zone
    const peakData = {
      peakOccupancy: 0,
      timestamp: null,
      maxCapacity: 0,
      peakHour: null,
      peaksByTimestamp: {} // Track data by timestamp to handle duplicates
    };
    
    // First pass: Initialize timestamp tracking
    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip if it's not the zone we're interested in
      if (!apiZoneNames.includes(zone_name)) {
        return;
      }
      
      // Apply floor filter
      if (floor_id !== selectedFloor) {
        return;
      }

      // Initialize data structures for each timestamp
      zoneData.forEach((entry) => {
        const { timestamp, max_capacity } = entry;
        
        if (!peakData.peaksByTimestamp[timestamp]) {
          peakData.peaksByTimestamp[timestamp] = {
            processed: false, // Track if we've processed this timestamp already
            occupancy: 0
          };
        }
        
        // Track max capacity (any entry's max_capacity should work)
        if (!peakData.maxCapacity && max_capacity) {
          peakData.maxCapacity = max_capacity;
        }
      });
    });
    
    // Second pass: Process occupancy data and avoid duplicates
    data.forEach((item) => {
      const { floor_id, zone_name, data: zoneData } = item;

      // Skip if it's not the zone we're interested in
      if (!apiZoneNames.includes(zone_name)) {
        return;
      }
      
      // Apply floor filter
      if (floor_id !== selectedFloor) {
        return;
      }

      // Process data for each timestamp, but only once per timestamp
      zoneData.forEach((entry) => {
        const { timestamp, total_occupancy } = entry;
        
        // Skip if we've already processed this timestamp for this zone
        if (peakData.peaksByTimestamp[timestamp].processed) {
          return;
        }
        
        // Mark this timestamp as processed
        peakData.peaksByTimestamp[timestamp].processed = true;
        peakData.peaksByTimestamp[timestamp].occupancy = total_occupancy;
        
        // Update peak occupancy if this value is higher
        if (total_occupancy > peakData.peakOccupancy) {
          peakData.peakOccupancy = total_occupancy;
          peakData.timestamp = timestamp;
          
          // Convert UTC timestamp to HKT (UTC+8)
          const utcDate = new Date(timestamp);
          const hktHour = (utcDate.getUTCHours() + 8) % 24; // Add 8 hours for HKT
          peakData.peakHour = hktHour;
        }
      });
    });

    setHourlyPeakData(peakData);
  };

  // Process live data for the selected zone
  const processLiveData = (data) => {
    // Get the API zone names that correspond to the UI zone name
    const apiZoneNames = getApiZoneNames(selectedZone);
    
    // Initialize live data for the selected zone
    const liveData = {
      totalOccupancy: 0,
      maxCapacity: 0
    };
    
    // Track if we've already processed this zone for this floor
    let processed = false;

    data.forEach((item) => {
      const { floor_id, zone_name, total_occupancy, max_capacity } = item;

      // Skip if it's not the zone we're interested in or not the selected floor
      if (!apiZoneNames.includes(zone_name) || floor_id !== selectedFloor) {
        return;
      }
      
      // Skip if we've already processed this zone-floor combination
      if (processed) {
        return;
      }
      
      // Mark as processed
      processed = true;
      
      // Save the occupancy data
      liveData.totalOccupancy = total_occupancy;
      
      // Track max capacity
      if (!liveData.maxCapacity && max_capacity) {
        liveData.maxCapacity = max_capacity;
      }
    });

    setLiveOccupancyData(liveData);
  };

  // Fetch data when component mounts and when selected date, zone, or floor changes
  useEffect(() => {
    fetchHourlyData();
    fetchLiveData();
    
    // Set up a refresh interval for live data every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [selectedDate, selectedZone, selectedFloor]);

  // Get effective peak occupancy (comparing hourly peak vs live)
  const getEffectivePeakData = () => {
    // Get hourly peak for the selected zone
    const hourlyPeak = hourlyPeakData.peakOccupancy || 0;
    const peakHour = hourlyPeakData.peakHour;
    
    // Use max capacity from either hourly or live data
    let maxCapacity = hourlyPeakData.maxCapacity || 
                      liveOccupancyData.maxCapacity || 50;
    
    // Get live occupancy for the selected zone
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

  // Get data for the selected zone
  const peakData = getEffectivePeakData();

  // Format hour for display
  const formatHour = (hour) => {
    if (hour === null || hour === undefined) return "";
    return hour === 0 ? "12 AM" : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? "12 PM" : 
           `${hour - 12} PM`;
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
              {peakData.isLivePeak ? "Peak occupancy" : `Peak Occupancy (${formatHour(peakData.peakHour)})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeakZoneDaily;