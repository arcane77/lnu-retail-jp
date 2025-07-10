import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

// Zone mapping for standardization
const ZONE_MAPPING = {
  "South-zone": "Zone A",
  "South-Zone": "Zone A",
  "Central-zone": "Zone B",
  "Central-Zone": "Zone B",
  "North-zone": "Zone C",
  "North-Zone": "Zone C"
};

// Reverse mapping to find the original zone names
const REVERSE_ZONE_MAPPING = {
  "Zone A": ["South-zone", "South-Zone"],
  "Zone B": ["Central-zone", "Central-Zone"],
  "Zone C": ["North-zone", "North-Zone"]
};

// Colors for floors (different colors than used in floor chart)
const FLOOR_COLORS = {
  "1F": "#4B56D2", // Deep Blue
  "2F": "#8A2BE2", // Purple
  "3F": "#20B2AA", // Light Sea Green
  "MF": "#FF8042", // Bright Orange
  // Fallback colors
  "default": ["#6A5ACD", "#48D1CC", "#DA70D6", "#9370DB", "#6495ED", "#7B68EE"]
};

const HourlyZoneOccupancy = ({ selectedDate, selectedZone, selectedFloor }) => {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [floorMapping, setFloorMapping] = useState({});
  const [maxOccupancy, setMaxOccupancy] = useState(50); // Default max for y-axis

  // Normalized floor names (for consistent display)
  const floors = useMemo(() => Object.keys(floorMapping), [floorMapping]);

  // Format the date for API request
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Extract UTC hour from timestamp
  const extractUTCHour = (timestamp) => {
    const date = parseISO(timestamp);
    return date.getUTCHours();
  };

  // Convert UTC hour to HKT hour (UTC+8)
  const convertUTCtoHKTHour = (utcHour) => {
    return (utcHour + 8) % 24;
  };

  // Format hour for display with leading zero
  const formatHourForDisplay = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Get display name for a floor
  const getFloorDisplayName = (floor) => {
    return floor; // Floor names are already simple, no need to transform
  };

  // Get color for a floor
  const getFloorColor = (floor, index) => {
    return FLOOR_COLORS[floor] || FLOOR_COLORS.default[index % FLOOR_COLORS.default.length];
  };

  // Fetch data from API
  useEffect(() => {
    const fetchHourlyData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const formattedDate = formatDate(selectedDate);
        const response = await axios.get(
          `https://njs-01.optimuslab.space/lnu-footfall/floor-zone/hourly?start_date=${formattedDate}&end_date=${formattedDate}`
        );
        
        if (response.data) {
          processApiData(response.data);
        }
      } catch (err) {
        console.error('Error fetching hourly data:', err);
        setError('Failed to fetch hourly data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) {
      fetchHourlyData();
    }
  }, [selectedDate, selectedZone, selectedFloor]);

  // Process and organize the API data
  const processApiData = (data) => {
    // Check what original zone names correspond to the selected standardized zone
    const originalZoneNames = REVERSE_ZONE_MAPPING[selectedZone] || [selectedZone];
    
    // Filter data for the selected zone and filter by floor if selectedFloor is provided
    const filteredData = data.filter(item => {
      // Filter out relocated and main-entrance zones
      if (item.zone_name.toLowerCase() === 'relocated' || item.zone_name === 'Main-Entrance') {
        return false;
      }
      
      // Check if this item's zone name maps to our selected zone
      const matchesZone = originalZoneNames.includes(item.zone_name);
      
      // If selectedFloor is provided, also filter by floor
      const matchesFloor = selectedFloor ? item.floor_id === selectedFloor : true;
      
      return matchesZone && matchesFloor;
    });

    if (filteredData.length === 0) {
      setHourlyData([]);
      setFloorMapping({});
      setMaxOccupancy(50);
      return;
    }

    // Create a mapping of floors
    const floorMap = {};
    filteredData.forEach(item => {
      floorMap[item.floor_id] = true;
    });
    setFloorMapping(floorMap);

    // Create a map of timestamps to organize data by hour
    const hourlyMap = new Map();
    let maxValue = 0; // Track max value for y-axis scaling
    
    // Process each floor's data
    filteredData.forEach(item => {
      const { floor_id, data: zoneData } = item;
      
      // Process each hourly entry
      zoneData.forEach(entry => {
        const { timestamp, total_occupancy } = entry;
        
        // Skip if timestamp is missing
        if (!timestamp) return;
        
        // Extract UTC hour from timestamp
        const utcHour = extractUTCHour(timestamp);
        // Convert to HKT hour
        const hktHour = convertUTCtoHKTHour(utcHour);
        
        const hourKey = utcHour; // Keep UTC hour as the key for data organization
        
        if (!hourlyMap.has(hourKey)) {
          hourlyMap.set(hourKey, { 
            utcHour: hourKey,
            utcFormatted: formatHourForDisplay(utcHour),
            hktHour: hktHour,
            hktFormatted: formatHourForDisplay(hktHour)
          });
        }
        
        // Use total_occupancy but ensure it's not negative
        const adjustedOccupancy = Math.max(0, total_occupancy);
        hourlyMap.get(hourKey)[floor_id] = adjustedOccupancy;
        
        // Update max value for y-axis scaling
        if (adjustedOccupancy > maxValue) {
          maxValue = adjustedOccupancy;
        }
      });
    });
    
    // Convert map to array and sort by UTC hour
    const hourlyDataArray = Array.from(hourlyMap.values())
      .sort((a, b) => a.utcHour - b.utcHour);
    
    // Set max occupancy for y-axis with 20% buffer
    setMaxOccupancy(Math.ceil(maxValue * 1.2));
    setHourlyData(hourlyDataArray);
  };

  // Custom tooltip to show values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length && payload[0] && payload[0].payload) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold text-gray-800">{data.hktFormatted} HKT ({data.utcFormatted} UTC)</p>
          {payload.map((entry, index) => {
            const floor = entry.dataKey;
            const displayName = getFloorDisplayName(floor);
            
            return (
              <p key={index} style={{ color: entry.color }}>
                <span className="font-medium">{displayName}: </span>
                {entry.value !== undefined ? Math.round(entry.value) : 'N/A'} people
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Only show selected floor if it's provided
  const displayFloors = selectedFloor ? [selectedFloor] : floors;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">時間単位の占有率​ - {selectedZone}</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-80">
          <p>Loading hourly data...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">
          {error}
        </div>
      ) : hourlyData.length === 0 ? (
        <div className="text-gray-500 p-4 text-center">
          No hourly data available for {selectedZone} {selectedFloor ? `on floor ${selectedFloor}` : ''} on the selected date.
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={hourlyData}
              margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="hktFormatted" 
                label={{ 
                  value: 'Hour of Day (HKT)', 
                  position: 'insideBottom', 
                  offset: -10 
                }}
                height={60}
              />
              <YAxis 
                label={{ 
                  value: 'Total Occupancy (People)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
                domain={[0, maxOccupancy]}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => getFloorDisplayName(value)}
              />
              
              {/* Render lines for each floor */}
              {displayFloors.map((floor, index) => (
                <Line
                  key={floor}
                  type="monotone"
                  dataKey={floor}
                  name={floor}
                  stroke={getFloorColor(floor, index)}
                  strokeWidth={2}
                  connectNulls={true}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}
              
              {/* Reference line at max capacity */}
              <ReferenceLine y={50} stroke="#777" strokeDasharray="3 3" label="Max Capacity (50)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HourlyZoneOccupancy;