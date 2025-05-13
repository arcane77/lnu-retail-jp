import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from "recharts";

// Component for displaying live entrance traffic data
const LiveBuilding = () => {
  const [liveOccupancyData, setLiveOccupancyData] = useState({
    totalOccupancy: 0,
    avgOccupancyPercentage: 0,
    zoneCount: 0,
    floorData: {},
    totalMaxCapacity: 200 // Default capacity for Main Entrance
  });
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
      setError("Failed to fetch live entrance data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process live data to get Main-Entrance metrics
  const processLiveData = (data) => {
    // Filter to only include Main-Entrance data
    const entranceData = data.filter(item => item.zone_name === "Main-Entrance");
    
    if (entranceData.length === 0) {
      setLiveOccupancyData({
        totalOccupancy: 0,
        avgOccupancyPercentage: 0,
        zoneCount: 0,
        floorData: {},
        totalMaxCapacity: 200 // Default capacity for Main Entrance
      });
      return;
    }
    
    // Group by floor
    const groupedByFloor = {};
    let entranceTotalOccupancy = 0;
    let entranceTotalPercentage = 0;
    let entranceZoneCount = 0;
    
    // Track floor max capacities
    const floorMaxCapacities = new Map();

    entranceData.forEach((item) => {
      const { floor_id, total_occupancy, occupancy_percentage, max_capacity } = item;

      if (!groupedByFloor[floor_id]) {
        groupedByFloor[floor_id] = {
          totalOccupancy: 0,
          totalPercentage: 0,
          zoneCount: 0,
          maxCapacity: 0 // Will be set from API data
        };
      }

      // Get floor max capacity from API data if not already set
      if (!floorMaxCapacities.has(floor_id)) {
        floorMaxCapacities.set(floor_id, max_capacity || 200);
        groupedByFloor[floor_id].maxCapacity = max_capacity || 200;
      }

      // Use exact data from API for all calculations, ensuring non-negative values
      const adjustedOccupancy = Math.max(0, total_occupancy);
      groupedByFloor[floor_id].totalOccupancy += adjustedOccupancy;
      entranceTotalOccupancy += adjustedOccupancy;

      // Use exact occupancy percentage from API, ensuring non-negative values
      const adjustedPercentage = Math.max(0, occupancy_percentage);
      groupedByFloor[floor_id].totalPercentage += adjustedPercentage;
      entranceTotalPercentage += adjustedPercentage;

      // Add to zone count (used for averaging)
      groupedByFloor[floor_id].zoneCount++;
      entranceZoneCount++;
    });

    // Calculate total entrance max capacity by summing each floor's capacity
    const totalMaxCapacity = Array.from(floorMaxCapacities.values()).reduce(
      (sum, capacity) => sum + capacity,
      0
    ) || 200; // Fallback to default if no data

    // Calculate average percentages for each floor
    Object.keys(groupedByFloor).forEach((floorId) => {
      const floor = groupedByFloor[floorId];

      // Calculate average occupancy percentage
      floor.avgOccupancyPercentage =
        floor.zoneCount > 0 ? floor.totalPercentage / floor.zoneCount : 0;
    });

    // Calculate entrance average occupancy percentage
    const entranceAvgOccupancyPercentage = 
      entranceZoneCount > 0 ? entranceTotalPercentage / entranceZoneCount : 0;

    setLiveOccupancyData({
      totalOccupancy: entranceTotalOccupancy,
      avgOccupancyPercentage: entranceAvgOccupancyPercentage,
      zoneCount: entranceZoneCount,
      floorData: groupedByFloor,
      totalMaxCapacity: totalMaxCapacity
    });
  };

  // Fetch live data on initial load
  useEffect(() => {
    fetchLiveData();
    // Set up a refresh interval for live data every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, []);

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
            <PieChart width={480} height={240}>
              <Pie
                data={[
                  {
                    name: "Occupied",
                    value: liveOccupancyData.totalOccupancy,
                  },
                  {
                    name: "Available",
                    value: Math.max(
                      0,
                      liveOccupancyData.totalMaxCapacity - liveOccupancyData.totalOccupancy
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
              {Math.round(liveOccupancyData.totalOccupancy)}
            </p>
            <p className="text-gray-600">Real-time Occupancy</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBuilding;