import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { FaTemperatureHigh, FaTint, FaSmog, FaWind } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import useIAQData from "./IAQdata";

const Viewer3 = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState("1/F"); // Track active floor
  const [zoneData, setZoneData] = useState({});
  const [liveCount, setLiveCount] = useState(0);
  const [crData, setCRData] = useState({
    "1F-CR1": { occupancy: 0, timestamp: 0 },
    "1F-CR2": { occupancy: 0, timestamp: 0 },
  });

  const [lrtData, setLRTData] = useState({ occupancy: 0, timestamp: 0 });

  const [mprData, setMPRData] = useState({
    "3F-MPR-V01": { occupancy: 0, timestamp: 0 },
    "3F-MPR-V02": { occupancy: 0, timestamp: 0 },
  });
  // state for Computer Room 2 DOS data
  const [cpr2Data, setCPR2Data] = useState({ occupancy: 0, timestamp: 0 });
  const [loading, setLoading] = useState(true);

  // Use our new IAQ data service
  const { zoneIAQData, loading: iaqLoading } = useIAQData();

  const day = currentDate.getDate().toString().padStart(2, "0");
  const month = currentDate.toLocaleString("en-US", { month: "short" });
  const shortWeekday = currentDate.toLocaleString("en-US", { weekday: "short" });
  const time = currentDate.toLocaleString("en-US", { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
  
  const formattedDate = `${day} ${month}, ${shortWeekday}`; 
  const formattedTime = time;

  // Map for floor IDs to match the API format
  const floorIdMap = {
    "1/F": "1F",
    "M/F": "MF",
    "2/F": "2F",
    "3/F": "3F",
  };

  // Map for zone names
  const zoneNameMap = {
    South: "ゾーン A",
    Central: "ゾーン B",
    North: "ゾーン C",
  };

  // const zoneNameMap = {
  //   South: "Zone A",
  //   Central: "Zone B",
  //   North: "Zone C",
  // };

  // Floor and zone availability mapping
  const floorZoneMapping = {
    "1/F": ["ゾーン A", "ゾーン B", "ゾーン C"],
    "M/F": ["ゾーン A", "ゾーン C"],
    "2/F": ["ゾーン A", "ゾーン B", "ゾーン C"],
   "3/F": ["床", "多目的ルーム 2", "多目的ルーム 1"],
  };

  // const floorZoneMapping = {
  //   "1/F": ["Zone A", "Zone B", "Zone C"],
  //   "M/F": ["Zone A", "Zone C"],
  //   "2/F": ["Zone A", "Zone B", "Zone C"],
  //   "3/F": ["Floor", "Multi Purpose Room 2", "Multi Purpose Room 1"],
  // };

  useEffect(() => {
    const updateTime = () => {
      setCurrentDate(new Date());
    };
  
    // Update immediately
    updateTime();
  
    // Update every second
    const intervalId = setInterval(updateTime, 1000);
  
    return () => clearInterval(intervalId);
  }, []);

  const fetchLiveCount = async () => {
    try {
      const response = await fetch(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/live"
      );
      const data = await response.json();
      
      // Filter Main-Entrance data like in LiveBuilding.js
      const entranceData = data.filter(item => item.zone_name === "Main-Entrance");
      let totalOccupancy = 0;
      
      entranceData.forEach((item) => {
        totalOccupancy += Math.max(0, item.total_occupancy);
      });
      
      setLiveCount(totalOccupancy);
    } catch (error) {
      console.error("Error fetching live count:", error);
    }
  };

  useEffect(() => {
    fetchLiveCount();
    const intervalId = setInterval(fetchLiveCount, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, []);

  // Replace the problematic lines with this properly structured useEffect:

useEffect(() => {
  // Fetch Computer Room occupancy data
  const fetchOccupancyData = async () => {
    try {
      const response = await fetch(
        "https://optimusc.flowfuse.cloud/lingnan-library-occupancy"
      );
      const data = await response.json();

      // Process the response data
      const processedCRData = {};
      const processedMPRData = {};

      // Check if data is an array
      if (Array.isArray(data)) {
        data.forEach((item) => {
          // Handle Computer Room data
          if (item.area === "1F-CR1" || item.area === "1F-CR2") {
            processedCRData[item.area] = {
              occupancy: item.occupancy,
              timestamp: item.timestamp,
            };
          }
          // Handle Multi Purpose Room data
          if (item.area === "3F-MPR-V01" || item.area === "3F-MPR-V02") {
            processedMPRData[item.area] = {
              occupancy: item.occupancy,
              timestamp: item.timestamp,
            };
          }
        });

        // Instead of always updating, check for changes first
        setCRData((prevData) => {
          const newData = { ...prevData, ...processedCRData };
          if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
            console.log("CR Data changed, updating...");
            return newData;
          }
          console.log("No CR change detected, skipping update");
          return prevData;
        });

        // Update Multi Purpose Room data
        setMPRData((prevData) => {
          const newData = { ...prevData, ...processedMPRData };
          if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
            console.log("MPR Data changed, updating...");
            return newData;
          }
          console.log("No MPR change detected, skipping update");
          return prevData;
        });
      }
    } catch (error) {
      console.error("Error fetching occupancy data:", error);
    }
  };

  // Fetch immediately on mount
  fetchOccupancyData();

  // interval for periodic fetching
  const intervalId = setInterval(fetchOccupancyData, 10000);

  // CRITICAL: Clean up the interval when component unmounts or dependencies change
  return () => {
    console.log("Cleaning up occupancy data interval");
    clearInterval(intervalId);
  };
}, []); // Empty dependency array means this effect runs once on mount



  useEffect(() => {
    // Default fallback values if API fails
    const fallbackData = {
      pm10: 20.7,
      pm25: 15.9,
      timestamp: new Date(),
    };

    const fetchAirQuality = async () => {
      try {
        console.log("Fetching air quality data...");
        const response = await fetch(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/aqhi"
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Get the response as text
        const responseText = await response.text();
        console.log(
          "Response received, first 100 chars:",
          responseText.substring(0, 100)
        );

        // It's XML data
        if (
          responseText.trim().startsWith("<?xml") ||
          responseText.trim().startsWith("<")
        ) {
          try {
            // Use the browser's built-in XML parser
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseText, "text/xml");

            // Find all PollutantConcentration elements
            const pollutantConcentrations = xmlDoc.getElementsByTagName(
              "PollutantConcentration"
            );
            console.log(
              `Found ${pollutantConcentrations.length} PollutantConcentration elements`
            );

            // Filter for only Tuen Mun data entries
            const tuenMunEntries = [];
            for (let i = 0; i < pollutantConcentrations.length; i++) {
              const stationElement =
                pollutantConcentrations[i].getElementsByTagName(
                  "StationName"
                )[0];

              if (stationElement && stationElement.textContent === "Tuen Mun") {
                const dateTimeElement =
                  pollutantConcentrations[i].getElementsByTagName(
                    "DateTime"
                  )[0];
                const pm10Element =
                  pollutantConcentrations[i].getElementsByTagName("PM10")[0];
                const pm25Element =
                  pollutantConcentrations[i].getElementsByTagName("PM2.5")[0];

                if (dateTimeElement && pm10Element && pm25Element) {
                  tuenMunEntries.push({
                    element: pollutantConcentrations[i],
                    dateTime: new Date(dateTimeElement.textContent),
                    pm10: parseFloat(pm10Element.textContent),
                    pm25: parseFloat(pm25Element.textContent),
                  });
                }
              }
            }

            if (tuenMunEntries.length > 0) {
              console.log(`Found ${tuenMunEntries.length} Tuen Mun entries`);

              // Sort by date, most recent first
              tuenMunEntries.sort((a, b) => b.dateTime - a.dateTime);

              // Log all entries to help debug
              tuenMunEntries.forEach((entry, index) => {
                console.log(
                  `Entry ${index}: ${entry.dateTime.toISOString()}, PM10=${
                    entry.pm10
                  }, PM2.5=${entry.pm25}`
                );
              });

              // Get the most recent entry
              const latestEntry = tuenMunEntries[0];
              console.log(
                `Using most recent entry: ${latestEntry.dateTime.toISOString()}`
              );

              setAirQuality({
                pm10: latestEntry.pm10,
                pm25: latestEntry.pm25,
                timestamp: latestEntry.dateTime,
              });
              return; // Success! Exit the function
            } else {
              console.log("No valid Tuen Mun entries found");
            }
          } catch (xmlError) {
            console.error("Error parsing XML:", xmlError);
          }
        }

        // If we reach here, we couldn't parse the data correctly
        console.warn(
          "Could not parse response correctly. Using fallback data."
        );
        setAirQuality(fallbackData);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        // Use fallback data if there's an error
        console.log("Using fallback air quality data");
        setAirQuality(fallbackData);
      }
    };

    // Fetch immediately
    fetchAirQuality();

    // Fetch every 30s
    const intervalId = setInterval(fetchAirQuality, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch Computer Room 2 data from DOS endpoint
  useEffect(() => {
    const fetchCPR2Data = async () => {
      try {
        const response = await fetch(
          "https://optimusc.flowfuse.cloud/lingnan-library-dos"
        );
        const data = await response.json();

        // Count occupied devices that start with CPR2-
        let occupiedCount = 0;
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (
              item.area &&
              item.area.startsWith("CPR2-") &&
              (item.occupancy === "occupied" || item.occupancy === "countdown")
            ) {
              occupiedCount++;
            }
          });
        }

        setCPR2Data({
          occupancy: occupiedCount,
          timestamp: Date.now(),
        });

        // Count occupied LRT devices
      let lrtOccupiedCount = 0;
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (item.area && item.area.match(/^LRT\d+-/) && 
              (item.occupancy === "occupied" || item.occupancy === "countdown")) {
            lrtOccupiedCount++;
          }
        });
      }

      setLRTData({
        occupancy: lrtOccupiedCount,
        timestamp: Date.now(),
      });

      } catch (error) {
        console.error("Error fetching CPR2 data:", error);
      }
    };

    // Fetch immediately
    fetchCPR2Data();

    // Fetch every 40 seconds
    const intervalId = setInterval(fetchCPR2Data, 40000);

    return () => clearInterval(intervalId);
  }, []);



  useEffect(() => {
    const fetchTemperature = async () => {
      try {
        console.log("Fetching temperature data...");
        const response = await fetch("https://njs-01.optimuslab.space/lnu-footfall/floor-zone/weather");
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Get the response as text
        const responseText = await response.text();
        console.log("Temperature data received");
        
        // The data is coming as HTML content with tables
        // Based on debug output, we need to look for a pattern like:
        // <tr><td><font size="-1">Tuen Mun</font></td><td width="100" align="right"><font size="-1">32 degrees ;</font></td></tr>
        
        // Method 1: Handle HTML content with regex
        // Pattern that matches Tuen Mun in a table cell, then finds the next cell with degrees
        const htmlPattern = /Tuen Mun<\/font><\/td><td[^>]*><font[^>]*>(\d{1,2}) degrees/;
        let match = responseText.match(htmlPattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature in HTML: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return; // Success
        }
        
        // Method 2: Look for a simpler pattern that might work even if HTML structure changes
        // Just find "Tuen Mun" followed by digits and "degrees" within a reasonable character range
        const simplePattern = /Tuen Mun(?:(?!Tuen Mun).){1,100}?(\d{1,2}) degrees/s;
        match = responseText.match(simplePattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature using simple pattern: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return; // Success
        }
        
        // Method 3: Extract from the text-only portion - look at the raw data you shared
        // The data also appears in plaintext format like "Tuen Mun32 degrees ;"
        const textPattern = /Tuen Mun(\d{1,2}) degrees/;
        match = responseText.match(textPattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature in plain text: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return; // Success
        }
        
        // Method 4: Last resort - semi-colon separated list parsing
        const lines = responseText.split(';');
        for (const line of lines) {
          if (line.includes('Tuen Mun') && line.includes('degrees')) {
            const numberMatch = line.match(/(\d{1,2})\s*degrees/);
            if (numberMatch && numberMatch[1]) {
              const temperature = parseInt(numberMatch[1], 10);
              console.log(`Found Tuen Mun temperature in line: ${temperature}°C`);
              
              setWeather(prevWeather => ({
                temp: temperature,
                humidity: prevWeather ? prevWeather.humidity : 70
              }));
              return; // Success
            }
          }
        }
        
        console.log("Could not find valid Tuen Mun temperature with any pattern");
        
        // Keep existing temperature or set a fallback
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
        
      } catch (error) {
        console.error("Error fetching temperature data:", error);
        // Use fallback data if there's an error
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
      }
    };
    
    // Fetch immediately
    fetchTemperature();
    
    // Fetch every 30 seconds
    const intervalId = setInterval(fetchTemperature, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Keep the original humidity fetch - it will be merged with the temperature data
  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const response = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const data = await response.json();

        // Get Hong Kong Observatory humidity (only available location)
        const humidity = data.humidity.data[0]?.value;

        if (humidity !== undefined) {
          setWeather((prevWeather) => ({
            temp: prevWeather ? prevWeather.temp : 32, // Keep existing temp
            humidity: humidity,
          }));
        }
      } catch (error) {
        console.error("Error fetching humidity data:", error);
      }
    };

    fetchHumidity();

    
    const intervalId = setInterval(fetchHumidity, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch zone data
  useEffect(() => {
    const fetchZoneData = async () => {
      try {
        const response = await fetch(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/live"
        );
        const data = await response.json();

        // Process and organize the data by floor and zone
        const processedData = {};

        data.forEach((zone) => {
          // Normalize zone name for case insensitivity
          const zoneName = zone.zone_name.toLowerCase();
          const floorId = zone.floor_id;

          // Determine which zone (A, B, C) based on zone name
          let mappedZone = null;
          if (zoneName.includes("south")) {
            mappedZone = "ゾーン A";
          } else if (zoneName.includes("central")) {
            mappedZone = floorId === "3F" ? "床" : "ゾーン B";
          } else if (zoneName.includes("north")) {
            mappedZone = "ゾーン C";
          }

          // Skip if not a main zone
          if (!mappedZone) return;

          // Keep original occupancy values even if negative
          // We'll use occupancy_percentage for status calculation
          const displayedOccupancy = zone.total_occupancy;
          const iconForStatus =
            zone.total_occupancy < 0 ? 0 : zone.total_occupancy;
          const percentageForStatus =
            zone.occupancy_percentage < 0 ? 0 : zone.occupancy_percentage;

          // Get threshold values (with fallbacks if not set)
          const firstThreshold = zone.first_threshold || 40;
          const secondThreshold = zone.second_threshold || 70;

          // Calculate status based on occupancy percentage
          // Use only non-negative percentage values for status determination
          let status = "available";
          if (percentageForStatus >= secondThreshold) {
            status = "crowded";
          } else if (percentageForStatus >= firstThreshold) {
            status = "less-available";
          }

          // Map floor IDs to display format
          let displayFloor = Object.keys(floorIdMap).find(
            (key) => floorIdMap[key] === floorId
          );

          if (!displayFloor) return;

          if (!processedData[displayFloor]) {
            processedData[displayFloor] = {};
          }

          processedData[displayFloor][mappedZone] = {
            occupancy: `${Math.round(percentageForStatus)}%`,
            status: status,
            totalOccupancy: zone.total_occupancy, // Preserving original value, even if negative
            maxCapacity: zone.max_capacity,
            // Default IAQ values (will be updated with real data)
            co2: 580,
            temp: 25,
            humidity: 64,
          };
        });

        // Initialize Multi Purpose Room zones with default IAQ values
        if (processedData["3/F"]) {
          if (!processedData["3/F"]["多目的ルーム 1"]) {
            processedData["3/F"]["多目的ルーム 1"] = {
              co2: 580,
              temp: 25,
              humidity: 64,
            };
          }
          if (!processedData["3/F"]["多目的ルーム 2"]) {
            processedData["3/F"]["多目的ルーム 2"] = {
              co2: 580,
              temp: 25,
              humidity: 64,
            };
          }
        }

        // Combine with IAQ data if available
        if (Object.keys(zoneIAQData).length > 0) {
          Object.keys(processedData).forEach((floor) => {
            Object.keys(processedData[floor]).forEach((zone) => {
              // If we have IAQ data for this floor and zone, use it
              if (zoneIAQData[floor] && zoneIAQData[floor][zone]) {
                processedData[floor][zone] = {
                  ...processedData[floor][zone],
                  co2:
                    zoneIAQData[floor][zone].co2 ||
                    processedData[floor][zone].co2,
                  temp:
                    zoneIAQData[floor][zone].temp ||
                    processedData[floor][zone].temp,
                  humidity:
                    zoneIAQData[floor][zone].humidity ||
                    processedData[floor][zone].humidity,
                };
              }
            });
          });
        }

        setZoneData((prevData) => {
          // Only update the state if the data has actually changed
          if (JSON.stringify(prevData) !== JSON.stringify(processedData)) {
            return processedData;
          }
          return prevData;
        });

        // Only set loading to false on the first load
        if (loading) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching zone data:", error);
        // Don't change loading state on error after initial load
        if (loading) {
          setLoading(false);
        }
      }
    };

    //  first render
    fetchZoneData();

    // every 40 seconds
    const intervalId = setInterval(fetchZoneData, 40000);

    return () => clearInterval(intervalId);
  }, [zoneIAQData]);

  // Floor map URLs
  const floorMaps = {
    "1/F": "https://pwwpdev.github.io/Lingnan/first_floor_dos_overlay.html",
    "M/F": "https://pwwpdev.github.io/Lingnan/m_floor_dos_overlay.html",
    "2/F": "https://pwwpdev.github.io/Lingnan/second_floor_dos_overlay.html",
    "3/F": "https://pwwpdev.github.io/Lingnan/third_floor_dos_overlay.html",
  };

  // SVG icons for different occupancy statuses with redesigned human shapes
  const availableIcon = (
    <svg
      width="58"
      height="38"
      viewBox="0 0 70 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {/* First person - colored */}
        <circle cx="15" cy="10" r="7" fill="#4ade80" /> {/* Head */}
        <path d="M7,20 Q15,13 23,20 L23,32 Q15,36 7,32 Z" fill="#4ade80" />{" "}
        {/* Body - curved shape */}
        {/* Second person - outlined (positioned slightly higher) */}
        <circle
          cx="35"
          cy="8"
          r="7"
          stroke="#4ade80"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Head */}
        <path
          d="M27,18 Q35,11 43,18 L43,30 Q35,34 27,30 Z"
          stroke="#4ade80"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Body - curved shape */}
        {/* Third person - outline */}
        <circle
          cx="55"
          cy="10"
          r="7"
          stroke="#4ade80"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Head */}
        <path
          d="M47,20 Q55,13 63,20 L63,32 Q55,36 47,32 Z"
          stroke="#4ade80"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Body - curved shape */}
      </g>
    </svg>
  );

  const lessAvailableIcon = (
    <svg
      width="58"
      height="38"
      viewBox="0 0 70 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {/* First person - colored */}
        <circle cx="15" cy="10" r="7" fill="#fbbf24" /> {/* Head */}
        <path d="M7,20 Q15,13 23,20 L23,32 Q15,36 7,32 Z" fill="#fbbf24" />{" "}
        {/* Body - curved shape */}
        {/* Second person - colored (positioned slightly higher) */}
        <circle cx="35" cy="8" r="7" fill="#fbbf24" /> {/* Head */}
        <path
          d="M27,18 Q35,11 43,18 L43,30 Q35,34 27,30 Z"
          fill="#fbbf24"
        />{" "}
        {/* Body - curved shape */}
        {/* Third person - outline */}
        <circle
          cx="55"
          cy="10"
          r="7"
          stroke="#fbbf24"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Head */}
        <path
          d="M47,20 Q55,13 63,20 L63,32 Q55,36 47,32 Z"
          stroke="#fbbf24"
          strokeWidth="1.5"
          fill="none"
        />{" "}
        {/* Body - curved shape */}
      </g>
    </svg>
  );

  const crowdedIcon = (
    <svg
      width="58"
      height="38"
      viewBox="0 0 70 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {/* First person - colored */}
        <circle cx="15" cy="10" r="7" fill="#ef4444" /> {/* Head */}
        <path d="M7,20 Q15,13 23,20 L23,32 Q15,36 7,32 Z" fill="#ef4444" />{" "}
        {/* Body - curved shape */}
        {/* Second person - colored (positioned slightly higher) */}
        <circle cx="35" cy="8" r="7" fill="#ef4444" /> {/* Head */}
        <path
          d="M27,18 Q35,11 43,18 L43,30 Q35,34 27,30 Z"
          fill="#ef4444"
        />{" "}
        {/* Body - curved shape */}
        {/* Third person - colored */}
        <circle cx="55" cy="10" r="7" fill="#ef4444" /> {/* Head */}
        <path
          d="M47,20 Q55,13 63,20 L63,32 Q55,36 47,32 Z"
          fill="#ef4444"
        />{" "}
        {/* Body - curved shape */}
      </g>
    </svg>
  );

  // Component for zone occupancy indicator
const ZoneIndicator = ({ zoneName, zoneData }) => {
  // Determine which computer room info to show based on the zone
  let roomInfo = null;

  if (activeFloor === "1/F" && zoneName === "ゾーン B") {
    return (
      <div className="flex flex-col">
        <h3 className="lg:text-2xl xl:text-3xl font-bold mb-2.5">{zoneName}</h3>
        <div className="flex items-center">
          <span className="text-3xl xl:text-5xl 2xl:text-6xl md:text-3xl lg:text-4xl font-bold">
            {zoneData?.totalOccupancy || 0}
          </span>
          <div className="ml-2">
            {zoneData?.status === "available" && availableIcon}
            {zoneData?.status === "less-available" && lessAvailableIcon}
            {zoneData?.status === "crowded" && crowdedIcon}
            {!zoneData?.status && availableIcon}
          </div>
        </div>

        {/* Room counts first */}
        <div className="text-[16px] mt-2">
          <div className="font-medium mb-0.5">
            <strong>コンピュータルーム1 1:</strong> {crData["1F-CR1"]?.occupancy || 0} Users
          </div>
          <div className="font-medium  mb-0.5">
            <strong>コンピュータルーム1 2:</strong> {cpr2Data?.occupancy || 0} Users
          </div>
          <div className="font-medium  mb-0.5">
            <strong>レイトリーディングルーム​
            :</strong> {lrtData?.occupancy || 0} Users
          </div>
          <div className="font-medium  mb-0.5">
            <strong>平均稼働率:</strong> {zoneData?.occupancy || "0%"}
          </div>
          <div className="font-medium  mb-0.5">
            <strong>温度:</strong> {zoneData?.temp || 25}°C
          </div>
          <div className="font-medium  mb-0.5">
            <strong>湿度:</strong> {zoneData?.humidity || 64}%
          </div>
          <div className="font-medium  mb-0.5">
            <strong>CO2 Level:</strong>{" "}
            <span className={`${
              (zoneData?.co2 || 580) > 1500 
                ? 'text-red-500 font-semibold' 
                : (zoneData?.co2 || 580) > 800 
                  ? 'text-amber-500 font-semibold' 
                  : 'text-[#14c408] font-semibold'
            }`}>
              {zoneData?.co2 || 580} ppm
            </span>
          </div>
        </div>
      </div>
    );
  }

  // For all other zones (not Zone B on 1/F)
  return (
    <div className="flex flex-col">
      <h3 className="lg:text-2xl xl:text-3xl font-bold mb-2">{zoneName}</h3>
      <div className="flex items-center">
        <span className="text-3xl xl:text-5xl 2xl:text-6xl md:text-3xl lg:text-4xl font-bold">
          {zoneName === "多目的ルーム 2"
            ? mprData["3F-MPR-V02"]?.occupancy || 0
            : zoneName === "多目的ルーム 1"
            ? mprData["3F-MPR-V01"]?.occupancy || 0
            : zoneData?.totalOccupancy || 0}
        </span>
        <div className="ml-2">
          {zoneData?.status === "available" && availableIcon}
          {zoneData?.status === "less-available" && lessAvailableIcon}
          {zoneData?.status === "crowded" && crowdedIcon}
          {!zoneData?.status && availableIcon}
        </div>
      </div>
      <div className="text-[16px] mt-2">
        {!zoneName.includes("多目的ルーム") && (
          <div className="font-semibold">
            平均稼働率: {zoneData?.occupancy || "0%"}
          </div>
        )}
        
        <div>
          <span className="pr-2 font-semibold">温度:</span>
          {zoneData?.temp || 25} °C
        </div>
        <div>
          <span className="pr-2 font-semibold">湿度:</span>
          {zoneData?.humidity || 64}%
        </div>
        <div className="font-semibold">
          CO<sub>2</sub> Level:{" "}
          <span className={`${
            (zoneData?.co2 || 580) > 1500 
              ? 'text-red-500' 
              : (zoneData?.co2 || 580) > 800 
                ? 'text-amber-500' 
                : 'text-[#14c408]'
          } font-semibold`}>
            {zoneData?.co2 || 580}
          </span>
          <sub>ppm</sub>
        </div>
      </div>
    </div>
  );
};

  // Get the available zones for the current floor
  const getZonesForCurrentFloor = () => {
    return floorZoneMapping[activeFloor] || [];
  };

  const getPM25Level = (value) => {
    if (value <= 12) return { level: "Good", color: "text-green-500" };
    if (value <= 35.4) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 55.4)
      return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 150.4) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 250.4)
      return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  const getPM10Level = (value) => {
    if (value <= 54) return { level: "Good", color: "text-green-500" };
    if (value <= 154) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 254)
      return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 354) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 424)
      return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  return (
    <div>
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />

     {/* Header */}
<header className="bg-[#ffffff] custom-shadow h-14 lg:h-20 xl:h-[100px] fixed top-0 left-0 w-full z-10 flex items-center justify-between px-4">
  {/* Left side - Hamburger and Logo */}
  <div className="flex items-center h-full">
    <button
      className={`flex flex-col justify-center items-start space-y-1 pl-4 ${
        isSidebarOpen ? "hidden" : ""
      }`}
      onClick={() => setIsSidebarOpen(true)}
    >
      <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
      <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
      <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
    </button>
    <img
      src="/sp.svg"
      alt="LNU Logo"
      className="h-6 sm:h-6 lg:h-8 xl:h-8 2xl:h-10 ml-6"
    />
  </div>

  {/* Right side - Live Count, Date/Time, Weather */}
  <div className="flex items-center lg:space-x-4 xl:space-x-8 text-sm lg:text-base xl:text-lg">
    {/* Live Count */}
    <div className="text-center">
      <div className="font-bold text-orange-500 text-lg lg:text-[22px]">
        {liveCount}
      </div>
      <div className="text-sm font-medium text-gray-600">ライブピープルカウント</div>
    </div>

    {/* Date and Time */}
    <div className="text-right -space-y-1">
      <div className="font-medium text-[15px] text-gray-700">{formattedDate}</div>
      <div className="text-[16px] text-right font-semibold text-gray-600">{formattedTime}</div>
    </div>

    {/* Weather */}
    <div className="flex items-center xl:space-x-6 text-gray-700">
      {weather && (
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <FaTemperatureHigh className="text-red-400 mr-1" />
            <span>{weather.temp}°C</span>
          </div>
          <div className="flex items-center">
            <FaTint className="text-blue-300 mr-1" />
            <span>{weather.humidity}%</span>
          </div>
        </div>
      )}
      {airQuality && (
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <FaWind className="text-gray-600 mr-1" />
            <span className="text-gray-600 font-medium">PM2.5:</span>
            <span className={`${getPM25Level(airQuality.pm25).color} font-semibold`}>
              {airQuality.pm25.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center">
            <FaWind className="text-gray-400 mr-1" />
            <span className="text-gray-500 font-medium">PM10:</span>
            <span className={`${getPM10Level(airQuality.pm10).color} font-medium`}>
              {airQuality.pm10.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
</header>

      {/* Content */}
      <div className="px-6 lg:px-14 lg:pt-36 xl:px-14 2xl:px-14 pb-6">
        

        {/* viewer section */}
        <div className="rounded-xl border border-[#E2E2E4] shadow-[0_1px_2px_0_#dedede] bg-white">
          {/* title*/}
          <div className="px-8 pt-4 mb-4">
            <p className="lg:text-3xl md:text-2xl sm:text-xl text-[22px] font-bold pb-2">
            フロアプランダッシュボード {/*Floor Plan Dashboard*/}
            </p> 
            

            {/* Floor navigation tabs */}
            <div className="flex space-x-4 border-b border-gray-200">
              {Object.keys(floorMaps).map((floor) => (
                <button
                  key={floor}
                  onClick={() => setActiveFloor(floor)}
                  className={`px-4 py-2 font-semibold ${
                    activeFloor === floor
                      ? "text-black border-b-2 border-black"
                      : "text-gray-400 hover:text-gray-500"
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          {/* viewer frame - show based on active floor */}
          <div className="px-4 w-full">
            <div className="relative w-full" style={{ paddingTop: "52.25%" }}>
              <iframe
                src={floorMaps[activeFloor]}
                title={`${activeFloor} Viewer`}
                className="absolute top-0 left-0 w-full h-full"
                style={{ border: "none" }}
              />
            </div>
          </div>

          {/* Zone information */}
          <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {getZonesForCurrentFloor().map((zoneName) => (
              <ZoneIndicator
                key={zoneName}
                zoneName={zoneName}
                zoneData={
                  zoneData[activeFloor] ? zoneData[activeFloor][zoneName] : null
                }
              />
            ))}
          </div>

          {/* Legend */}
          <div className="sm:px-8 sm:py-6 mb-6 sm:mb-0 flex flex-col sm:flex-row items-left sm:justify-end justify-start sm:space-x-2 space-y-1 text-[16px]">
            <div className="flex items-center">
              <div
                className="mr-2 sm:mt-1"
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "right center",
                }}
              >
                {availableIcon}
              </div>
              <span>利用できる​</span>
            </div>
            <div className="flex items-center">
              <div
                className="mr-2 sm:mt-1"
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "right center",
                }}
              >
                {lessAvailableIcon}
              </div>
              <span>利用可能性が低い​</span>
            </div>
            <div className="flex items-center">
              <div
                className="mr-2 sm:mt-1"
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "right center",
                }}
              >
                {crowdedIcon}
              </div>
              <span>密集した​</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer3;
