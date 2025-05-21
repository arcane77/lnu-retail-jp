import { useState, useEffect, useCallback, useRef } from "react";

// IAQ Data Service to fetch and manage IAQ sensor data
const useIAQData = () => {
  const [data, setData] = useState([]);
  const [deviceLocations, setDeviceLocations] = useState({});
  const [processedZoneData, setProcessedZoneData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to track the latest state without triggering effect dependencies
  const deviceLocationsRef = useRef({});
  const dataRef = useRef([]);
  
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
        deviceLocationsRef.current = locationMapping;
      } catch (error) {
        console.error("Error fetching device locations:", error);
        setError("Failed to fetch device locations");
      }
    };

    fetchDeviceLocations();
  }, []); // Only run once on mount

  // Parse location to determine floor and zone
  const parseLocation = useCallback((location) => {
    if (!location) return { floor: null, zone: null };
    
    // Extract the first character which typically indicates the floor
    let floor = null;
    let zone = null;

    // Special case handling for specific sensors mentioned
    if (location === "1C-DS778" || location === "1C-E440") {
      return { floor: "1F", zone: "Zone C" };
    } else if (location === "2C-REF") {
      return { floor: "2F", zone: "Zone C" };
    } else if (location === "MC-Co-Learning Zone") {
      return { floor: "MF", zone: "Zone C" };
    } else if (["3C-LT301", "3C-E305"].includes(location) || 
               location.startsWith("3C") || 
               location.startsWith("3F")) {
      return { floor: "3F", zone: "Floor" }; // Keep 3F as Floor as per viewer3.js
    }

    // Regular parsing for other locations
    // Check if the first character is a digit for the floor
    if (/^\d/.test(location)) {
      floor = location.charAt(0);
      
      // Extract zone info (second character typically indicates zone)
      if (location.length > 1) {
        const zoneChar = location.charAt(1).toUpperCase();
        if (zoneChar === 'A' || zoneChar === 'S') {
          zone = 'A'; // 'S' for South -> Zone A
        } else if (zoneChar === 'B' || zoneChar === 'C' && floor !== '1' && floor !== '2') {
          zone = 'B'; // 'C' for Central -> Floor (except for 1C and 2C)
        } else if (zoneChar === 'N' || zoneChar === 'C' && (floor === '1' || floor === '2')) {
          zone = 'C'; // 'N' for North -> Zone C, and 1C/2C -> Zone C
        }
      }
    } else if (location.toUpperCase().startsWith('M')) {
      floor = 'M';
      
      // For M floor, parse zone
      if (location.length > 1) {
        const zoneChar = location.charAt(1).toUpperCase();
        if (zoneChar === 'A' || zoneChar === 'S') {
          zone = 'A';
        } else if (zoneChar === 'B' || zoneChar === 'C' && !location.includes("Co-Learning")) {
          zone = 'B';
        } else if (zoneChar === 'N' || location.includes("Co-Learning")) {
          zone = 'C';
        }
      }
    }
    
    // Handle special case for 3rd floor as mentioned
    if (floor === '3') {
      zone = 'B'; // Only Floor exists on 3F according to viewer3.js
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
      
      // Special handling for specific IAQ sensors mentioned in requirements
      let floor, zone;
      
      if (sensor.id === "IAQ-L07" || sensor.id === "IAQ-L08") {
        floor = "1F";
        zone = "Zone C";
      } else if (sensor.id === "IAQ-L13") {
        floor = "2F";
        zone = "Zone C";
      } else if (sensor.id === "IAQ-L10") {
        floor = "MF";
        zone = "Zone C";
      } else if (["IAQ-L14", "IAQ-L16", "IAQ-L18", "IAQ-P05"].includes(sensor.id)) {
        // These sensors contribute to 3F Zone B (average)
        floor = "3F";
        zone = "Floor";
      } else if (sensor.id === "IAQ-L15") {
        // IAQ-L15 for Multi Purpose Room 2
        floor = "3F";
        zone = "Multi Purpose Room 2";
      } else if (sensor.id === "IAQ-L17") {
        // IAQ-L17 for Multi Purpose Room 1
        floor = "3F";
        zone = "Multi Purpose Room 1";
      } else {
        // Regular parsing for other sensors
        const parsedLocation = parseLocation(sensor.location);
        floor = parsedLocation.floor;
        zone = parsedLocation.zone;
      }
      
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
  }, [parseLocation]);

  // Fetch IAQ data
  const fetchIAQData = useCallback(async () => {
    // Use the ref to avoid dependency on deviceLocations
    const currentDeviceLocations = deviceLocationsRef.current;
    
    if (Object.keys(currentDeviceLocations).length === 0) return;
    
    try {
      const response = await fetch("https://optimusc.flowfuse.cloud/iaq");
      const result = await response.json();

      // Convert the object into an array with location information
      const dataArray = Object.entries(result).map(([id, values]) => {
        return {
          id,
          ...values,
          location: currentDeviceLocations[id] || "Unknown Location",
        };
      });

      // Extract IAQ-P and IAQ-L sensors
      const iaqSensors = dataArray.filter(
        (sensor) =>
          sensor.id.startsWith("IAQ-P") || sensor.id.startsWith("IAQ-L")
      );

      // Update the ref
      dataRef.current = iaqSensors;
      setData(iaqSensors);
      
      // Process the sensor data into zone data
      const zoneData = processSensorData(iaqSensors);
      
      // Only update state if data has changed
      setProcessedZoneData(prevData => {
        if (JSON.stringify(prevData) !== JSON.stringify(zoneData)) {
          return zoneData;
        }
        return prevData;
      });
      
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
  }, [processSensorData, loading]);

  // Fetch data initially and then periodically
  useEffect(() => {
    // Use the ref to check if we have device locations
    if (Object.keys(deviceLocationsRef.current).length > 0) {
      // Initial fetch
      fetchIAQData();
      
      // Set interval
      const interval = setInterval(fetchIAQData, 60000); // every 1min
      return () => clearInterval(interval);
    }
  }, [deviceLocations]); // Only re-run when deviceLocations changes, not on every fetchIAQData change

  return {
    rawSensorData: data,
    zoneIAQData: processedZoneData,
    loading,
    error,
    refreshData: fetchIAQData
  };
};

export default useIAQData;