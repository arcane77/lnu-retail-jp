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

// Color for the Main Entrance line
const MAIN_ENTRANCE_COLOR = '#4B56D2'; // Deep Blue

const HourlyBuildingOccupancy = ({ selectedDate }) => {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOccupancy, setMaxOccupancy] = useState(50); // Default max for y-axis

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
  }, [selectedDate]);

  // Process and organize the API data
  const processApiData = (data) => {
    // Filter data for Main-Entrance zone only
    const entranceData = data.filter(item => item.zone_name === 'Main-Entrance');

    if (entranceData.length === 0) {
      setHourlyData([]);
      setMaxOccupancy(50);
      return;
    }

    // Create a map of timestamps to organize data by hour
    const hourlyMap = new Map();
    let maxValue = 0; // Track max value for y-axis scaling
    
    // Process each entry
    entranceData.forEach(item => {
      const { data: zoneData } = item;
      
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
        hourlyMap.get(hourKey)['mainEntrance'] = adjustedOccupancy;
        
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
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              <span className="font-medium">Main Entrance: </span>
              {entry.value !== undefined ? Math.round(entry.value) : 'N/A'} people
            </p>
          ))}
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
          No main entrance data available for the selected date.
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
                  value: 'Traffic Count (People)', 
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
              />
              
              <Line
                type="monotone"
                dataKey="mainEntrance"
                name="Main Entrance"
                stroke={MAIN_ENTRANCE_COLOR}
                strokeWidth={2}
                connectNulls={true}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HourlyBuildingOccupancy;