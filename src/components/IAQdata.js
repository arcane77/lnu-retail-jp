import { useState, useEffect, useCallback } from "react";

// IAQ Data Service to fetch and manage IAQ sensor data
const useIAQData = () => {
  const [data, setData] = useState([]);
  const [deviceLocations, setDeviceLocations] = useState({});
  const [processedZoneData, setProcessedZoneData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch device locations
  useEffect(() => {
    const fetchDeviceLocations = async () => {
      try {
        const response = await fetch(
          "https://lnudevices-dot-optimus-hk.df.r.appspot.com/devices"
        );
        const devices = await response.json();

        // Mapping of device_id to location
        const locationMapping = {};
        devices.forEach((device) => {
          locationMapping[device.device_id] = device.location;
        });

        setDeviceLocations(locationMapping);
      } catch (error) {
        console.error("Error fetching device locations:", error);
        setError("Failed to fetch device locations");
      }
    };

    fetchDeviceLocations();
  }, []);

  // Parse location to determine floor and zone
  const parseLocation = useCallback((location) => {
    if (!location) return { floor: null, zone: null };
    
    // Extract the first character which typically indicates the floor
    let floor = null;
    let zone = null;

    // Check if the first character is a digit for the floor
    if (/^\d/.test(location)) {
      floor = location.charAt(0);
      
      // Extract zone info (second character typically indicates zone)
      if (location.length > 1) {
        const zoneChar = location.charAt(1).toUpperCase();
        if (zoneChar === 'A' || zoneChar === 'S') {
          zone = 'A'; // 'S' for South -> Zone A
        } else if (zoneChar === 'B' || zoneChar === 'C') {
          zone = 'B'; // 'C' for Central -> Zone B
        } else if (zoneChar === 'N') {
          zone = 'C'; // 'N' for North -> Zone C
        }
      }
    } else if (location.toUpperCase().startsWith('M')) {
      floor = 'M';
      
      // For M floor, parse zone
      if (location.length > 1) {
        const zoneChar = location.charAt(1).toUpperCase();
        if (zoneChar === 'A' || zoneChar === 'S') {
          zone = 'A';
        } else if (zoneChar === 'B' || zoneChar === 'C') {
          zone = 'B';
        } else if (zoneChar === 'N') {
          zone = 'C';
        }
      }
    }
    
    // Handle special case for 3rd floor as mentioned
    if (floor === '3') {
      zone = 'B'; // Only Zone B exists on 3F according to viewer3.js
    }
    
    return { 
      floor: floor ? `${floor}F` : null, 
      zone: zone ? `Zone ${zone}` : null 
    };
  }, []);

  // Map floor codes to display format (reverse of floorIdMap in viewer3.js)
  const displayFloorMap = {
    "1F": "1/F",
    "MF": "M/F",
    "2F": "2/F",
    "3F": "3/F"
  };

  // Process sensor data into zone data format that matches the viewer3.js structure
  const processSensorData = useCallback((sensors) => {
    if (!sensors || sensors.length === 0) return {};
    
    // Group sensors by floor and zone
    const floorZoneGroups = {};
    
    sensors.forEach(sensor => {
      if (!sensor.location) return;
      
      const { floor, zone } = parseLocation(sensor.location);
      if (!floor || !zone) return;
      
      if (!floorZoneGroups[floor]) {
        floorZoneGroups[floor] = {};
      }
      
      if (!floorZoneGroups[floor][zone]) {
        floorZoneGroups[floor][zone] = {
          sensors: [],
          co2: [],
          temp: [],
          humidity: []
        };
      }
      
      // Add valid sensor readings to the arrays
      if (sensor.co2 && sensor.co2 !== 'N/A' && !isNaN(parseFloat(sensor.co2))) {
        floorZoneGroups[floor][zone].co2.push(parseFloat(sensor.co2));
      }
      
      if (sensor.temperature && sensor.temperature !== 'N/A' && !isNaN(parseFloat(sensor.temperature))) {
        floorZoneGroups[floor][zone].temp.push(parseFloat(sensor.temperature));
      }
      
      if (sensor.humidity && sensor.humidity !== 'N/A' && !isNaN(parseFloat(sensor.humidity))) {
        floorZoneGroups[floor][zone].humidity.push(parseFloat(sensor.humidity));
      }
      
      floorZoneGroups[floor][zone].sensors.push(sensor);
    });
    
    // Calculate averages for each floor and zone
    const processedData = {};
    
    Object.entries(floorZoneGroups).forEach(([floor, zones]) => {
      const displayFloor = displayFloorMap[floor] || floor;
      
      if (!processedData[displayFloor]) {
        processedData[displayFloor] = {};
      }
      
      Object.entries(zones).forEach(([zone, data]) => {
        // Calculate averages
        const avgCo2 = data.co2.length > 0 
          ? Math.round(data.co2.reduce((sum, val) => sum + val, 0) / data.co2.length) 
          : 580; // Default if no data
        
        const avgTemp = data.temp.length > 0 
          ? Math.round(data.temp.reduce((sum, val) => sum + val, 0) / data.temp.length * 10) / 10 
          : 25; // Default if no data
        
        const avgHumidity = data.humidity.length > 0 
          ? Math.round(data.humidity.reduce((sum, val) => sum + val, 0) / data.humidity.length) 
          : 64; // Default if no data
        
        // Use existing data structure for compatibility
        processedData[displayFloor][zone] = {
          ...processedData[displayFloor][zone],
          co2: avgCo2,
          temp: avgTemp,
          humidity: avgHumidity
        };
      });
    });
    
    return processedData;
  }, [parseLocation, displayFloorMap]);

  // Fetch IAQ data
  const fetchIAQData = useCallback(async () => {
    if (Object.keys(deviceLocations).length === 0) return;
    
    try {
      const response = await fetch("https://optimusc.flowfuse.cloud/iaq");
      const result = await response.json();

      // Convert the object into an array with location information
      const dataArray = Object.entries(result).map(([id, values]) => {
        return {
          id,
          ...values,
          location: deviceLocations[id] || "Unknown Location",
        };
      });

      // Extract IAQ-P and IAQ-L sensors
      const iaqSensors = dataArray.filter(
        (sensor) =>
          sensor.id.startsWith("IAQ-P") || sensor.id.startsWith("IAQ-L")
      );

      setData(iaqSensors);
      
      // Process the sensor data into zone data
      const zoneData = processSensorData(iaqSensors);
      setProcessedZoneData(zoneData);
      
      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching IAQ data:", error);
      setError("Failed to fetch IAQ data");
      
      if (loading) {
        setLoading(false);
      }
    }
  }, [deviceLocations, loading, processSensorData]);

  // Fetch data initially and then periodically
  useEffect(() => {
    if (Object.keys(deviceLocations).length > 0) {
      fetchIAQData();
      const interval = setInterval(fetchIAQData, 90000); // Every 90 seconds
      return () => clearInterval(interval);
    }
  }, [deviceLocations, fetchIAQData]);

  return {
    rawSensorData: data,
    zoneIAQData: processedZoneData,
    loading,
    error,
    refreshData: fetchIAQData
  };
};

export default useIAQData;