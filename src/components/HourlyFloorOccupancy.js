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

// New set of colors for zones (different from previous ones)
const ZONE_COLORS = {
  'south-zone': '#9F9EDA', // lavender for Zone A
  'central-zone': '#B5768A', // puce for Zone B
  'north-zone': '#B87D4B', // copper for Zone C
  // Add fallback colors for any other zones
  'default': ['#6A5ACD', '#48D1CC', '#DA70D6', '#9370DB', '#6495ED', '#7B68EE']
};

// Zone naming mapping
const ZONE_DISPLAY_NAMES = {
  'south-zone': 'Zone A',
  'central-zone': 'Zone B',
  'north-zone': 'Zone C'
};

const HourlyFloorOccupancy = ({ selectedDate, selectedFloor }) => {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoneMapping, setZoneMapping] = useState({});
  const [maxOccupancy, setMaxOccupancy] = useState(50); // Default max for y-axis

  // Normalized zone names (for consistent display)
  const zones = useMemo(() => Object.keys(zoneMapping), [zoneMapping]);

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

  // Normalize zone name for consistent mapping (handles South-zone vs South-Zone)
  const normalizeZoneName = (zoneName) => {
    return zoneName.toLowerCase().replace(/-zone/i, '-zone');
  };

  // Get display name for a zone (Zone A, B, C)
  const getZoneDisplayName = (normalizedZoneName) => {
    return ZONE_DISPLAY_NAMES[normalizedZoneName] || zoneMapping[normalizedZoneName] || normalizedZoneName;
  };

  // Get color for a zone
  const getZoneColor = (normalizedZoneName, index) => {
    return ZONE_COLORS[normalizedZoneName] || ZONE_COLORS.default[index % ZONE_COLORS.default.length];
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
  }, [selectedDate, selectedFloor]);

  // Process and organize the API data
  const processApiData = (data) => {
    // Filter data for selected floor and exclude 'relocated' and 'main entrance' zones
    const floorData = data.filter(item => 
      item.floor_id === selectedFloor && 
      !normalizeZoneName(item.zone_name).includes('relocated') && 
      !normalizeZoneName(item.zone_name).includes('main-entrance')
    );

    if (floorData.length === 0) {
      setHourlyData([]);
      setZoneMapping({});
      setMaxOccupancy(50);
      return;
    }

    // Create a mapping of normalized zone names to display names
    const zoneMap = {};
    floorData.forEach(item => {
      const normalizedName = normalizeZoneName(item.zone_name);
      zoneMap[normalizedName] = item.zone_name; // Keep original name for reference
    });
    setZoneMapping(zoneMap);

    // Create a map of timestamps to organize data by hour
    const hourlyMap = new Map();
    let maxValue = 0; // Track max value for y-axis scaling
    
    // Process each zone's data
    floorData.forEach(item => {
      const { zone_name, data: zoneData } = item;
      const normalizedZoneName = normalizeZoneName(zone_name);
      
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
        hourlyMap.get(hourKey)[normalizedZoneName] = adjustedOccupancy;
        
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
            const normalizedZone = entry.dataKey;
            const displayName = getZoneDisplayName(normalizedZone);
            
            return (
              <p key={index} style={{ color: entry.color }}>
                <span className="font-medium">{displayName}: </span>
                {entry.value !== undefined ? Math.round(entry.value) : 'N/A'} 
                {/* people               */}
                </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Hourly Occupancy</h2>
      
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
          No hourly data available for this floor on the selected date.
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
                  value: 'Hour of Day', 
                  position: 'insideBottom', 
                  offset: -10 
                }}
                height={60}
              />
              <YAxis 
                label={{ 
                  value: 'Occupancy', 
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
                formatter={(value) => getZoneDisplayName(value)}
              />
              
             {/* Render in specific order: A, B, C */}
<Line
  type="monotone"
  dataKey="south-zone"
  name="south-zone"
  stroke={getZoneColor('south-zone', 0)}
  strokeWidth={2}
  connectNulls={true}
  dot={false}
  activeDot={{ r: 6 }}
/>
<Line
  type="monotone"
  dataKey="central-zone"
  name="central-zone"
  stroke={getZoneColor('central-zone', 1)}
  strokeWidth={2}
  connectNulls={true}
  dot={false}
  activeDot={{ r: 6 }}
/>
<Line
  type="monotone"
  dataKey="north-zone"
  name="north-zone"
  stroke={getZoneColor('north-zone', 2)}
  strokeWidth={2}
  connectNulls={true}
  dot={false}
  activeDot={{ r: 6 }}
/>
              
              {/* Reference line at max capacity */}
              <ReferenceLine y={50} stroke="#777" strokeDasharray="3 3" label="Max Capacity (50)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HourlyFloorOccupancy;