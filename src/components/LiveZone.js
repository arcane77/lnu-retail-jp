import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from "recharts";

// Define zone mapping for standardization (copied from ZoneAnalytics)
const zoneMapping = {
  "South-zone": "Zone A",
  "South-Zone": "Zone A",
  "Central-zone": "Zone B",
  "Central-Zone": "Zone B",
  "North-zone": "Zone C",
  "North-Zone": "Zone C",
  "Main-Entrance": "Main Entrance",
};

// Reverse mapping to convert standardized zone names back to API zone names
const reverseZoneMapping = {
  "Zone A": ["South-zone", "South-Zone"],
  "Zone B": ["Central-zone", "Central-Zone"],
  "Zone C": ["North-zone", "North-Zone"],
  "Main Entrance": ["Main-Entrance"]
};

// Component for displaying live zone occupancy data
const LiveZone = ({ selectedZone, selectedFloor }) => {
  const [liveOccupancyData, setLiveOccupancyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to fetch live occupancy data
  const fetchLiveData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/live"
      );

      if (response.data) {
        processLiveData(response.data);
      }
    } catch (err) {
      console.error("Error fetching live data:", err);
      setError("Failed to fetch live occupancy data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process live data with floor filtering
  const processLiveData = (data) => {
    // Group by standardized zone names
    const groupedByZone = {};

    data.forEach((item) => {
      const { zone_name, floor_id, total_occupancy, occupancy_percentage, max_capacity } = item;

      // Skip Relocated zone
      if (zone_name.toLowerCase() === "relocated") return;

      // Apply floor filter if a specific floor is selected
      if (selectedFloor !== "All Floors" && floor_id !== selectedFloor) {
        return; // Skip data that doesn't match the selected floor
      }

      // Get the standardized zone name
      const standardizedZoneName = zoneMapping[zone_name] || zone_name;

      if (!groupedByZone[standardizedZoneName]) {
        groupedByZone[standardizedZoneName] = {
          totalOccupancy: 0,
          totalPercentage: 0,
          zoneCount: 0,
          max_capacity: max_capacity || 9000,
          floors: [] // Track which floors contribute to this zone
        };
      }

      // Important: Store the raw values exactly as they come from the API
      // Do not modify negative values - keep them as is
      groupedByZone[standardizedZoneName].totalOccupancy += total_occupancy;
      groupedByZone[standardizedZoneName].totalPercentage += occupancy_percentage;
      groupedByZone[standardizedZoneName].zoneCount += 1;
      
      // Track floor data for this zone
      if (!groupedByZone[standardizedZoneName].floors.includes(floor_id)) {
        groupedByZone[standardizedZoneName].floors.push(floor_id);
      }
    });

    // Calculate average percentages
    Object.keys(groupedByZone).forEach((zoneName) => {
      const zone = groupedByZone[zoneName];

      // Calculate average occupancy percentage
      zone.avgOccupancyPercentage =
        zone.zoneCount > 0 ? zone.totalPercentage / zone.zoneCount : 0;
    });

    setLiveOccupancyData(groupedByZone);
  };

  // Fetch live data on initial load and when selection changes
  useEffect(() => {
    fetchLiveData();
    // Set up a refresh interval for live data every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [selectedZone, selectedFloor]); // Added selectedFloor dependency

  // Prepare live data for selected zone
  const selectedZoneData = liveOccupancyData[selectedZone] || {
    totalOccupancy: 0,
    avgOccupancyPercentage: 0,
    max_capacity: 9000,
    floors: [],
  };

  // Function to create data for pie chart while handling negative values
  const createPieChartData = () => {
    const occupancy = selectedZoneData.totalOccupancy;
    
    if (occupancy < 0) {
      // When occupancy is negative, show it as a negative value
      // but adjust the pie chart to show 0% occupied
      return [
        {
          name: "Occupied",
          value: 0,
        },
        {
          name: "Available",
          value: selectedZoneData.max_capacity,
        },
      ];
    } else {
      // Normal case with positive occupancy
      return [
        {
          name: "Occupied",
          value: occupancy,
        },
        {
          name: "Available",
          value: Math.max(0, selectedZoneData.max_capacity - occupancy),
        },
      ];
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Live Occupancy
        {selectedFloor !== "All Floors" && ` - Floor ${selectedFloor}`}
      </h2>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <p>Loading live data...</p>
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
                data={createPieChartData()}
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
                <Cell key="occupied" fill="#FF8042" />
                <Cell key="available" fill="#dadada" />
              </Pie>
              <Tooltip formatter={(value) => Math.round(value)} />
            </PieChart>
          </div>
          <div className="w-full flex flex-col items-center justify-center mt-4">
            {/* Display the actual value, including negative values */}
            <p className={`text-4xl font-bold ${selectedZoneData.totalOccupancy < 0 ? 'text-red-500' : 'text-orange-500'}`}>
              {selectedZoneData.totalOccupancy}
            </p>
            <p className="text-gray-600">Real-time Occupancy</p>
            
            {/* Show warning if value is negative */}
            {selectedZoneData.totalOccupancy < 0 && (
              <div className="mt-2 bg-red-50 text-red-700 p-2 rounded-md text-sm">
                <span className="font-semibold">Note:</span> Negative value indicates sensor calibration issue
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveZone;