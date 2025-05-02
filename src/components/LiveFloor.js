import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from "recharts";

// Component for displaying live floor occupancy data
const LiveFloor = ({ selectedFloor }) => {
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

  // Process live data
  const processLiveData = (data) => {
    // Group by floor
    const groupedByFloor = {};

    data.forEach((item) => {
      const { floor_id, zone_name, total_occupancy, occupancy_percentage, max_capacity } = item;

      // Skip Main-Entrance zone and Relocated zone as requested
      if (
        zone_name === "Main-Entrance" ||
        zone_name.toLowerCase() === "relocated"
      )
        return;

      if (!groupedByFloor[floor_id]) {
        groupedByFloor[floor_id] = {
          totalOccupancy: 0,
          totalPercentage: 0,
          zoneCount: 0,
          zones: []
        };
      }

      // Use exact data from API for all calculations, including negative values
      groupedByFloor[floor_id].totalOccupancy += total_occupancy;

      // Use exact occupancy percentage from API
      groupedByFloor[floor_id].totalPercentage += occupancy_percentage;

      // Add to zone count (used for averaging)
      groupedByFloor[floor_id].zoneCount++;

      // Store zone data
      groupedByFloor[floor_id].zones.push({
        zone_name,
        total_occupancy,
        occupancy_percentage,
        max_capacity
      });
    });

    // Calculate average percentages
    Object.keys(groupedByFloor).forEach((floorId) => {
      const floor = groupedByFloor[floorId];

      // Calculate average occupancy percentage
      floor.avgOccupancyPercentage =
        floor.zoneCount > 0 ? floor.totalPercentage / floor.zoneCount : 0;
    });

    setLiveOccupancyData(groupedByFloor);
  };

  // Fetch live data on initial load and when floor selection changes
  useEffect(() => {
    fetchLiveData();
    // Set up a refresh interval for live data every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Fetch live data when selected floor changes
  useEffect(() => {
    fetchLiveData();
  }, [selectedFloor]);

  // Prepare live data for selected floor
  const selectedFloorLiveData = liveOccupancyData[selectedFloor] || {
    totalOccupancy: 0,
    avgOccupancyPercentage: 0,
    zones: [],
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Live Occupancy
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
            <PieChart width={480} height={220}>
              <Pie
                data={[
                  {
                    name: "Occupied",
                    value: selectedFloorLiveData.totalOccupancy,
                  },
                  {
                    name: "Available",
                    value: Math.max(
                      0,
                      (selectedFloorLiveData.zones[0]?.max_capacity ||
                        9000) - selectedFloorLiveData.totalOccupancy
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
                <Cell key="occupied" fill="#FF8042" />
                <Cell key="available" fill="#dadada" />
              </Pie>
              <Tooltip formatter={(value) => Math.round(value)} />
            </PieChart>
          </div>
          <div className="w-full flex flex-col items-center justify-center mt-4">
            <p className="text-4xl font-bold text-orange-500">
              {Math.round(selectedFloorLiveData.totalOccupancy)}
            </p>
            <p className="text-gray-600">Real-time Occupancy</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFloor;