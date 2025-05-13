import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { FaTemperatureHigh, FaTint, FaDesktop } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import useIAQData from "./IAQdata"; // Import the IAQ data service
 
const Viewer3 = () => {
  const currentDate = new Date();
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [weather, setWeather] = useState(null);
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState("1/F"); // Track active floor
  const [zoneData, setZoneData] = useState({});
  const [crData, setCRData] = useState({
    "1F-CR1": { occupancy: 0, timestamp: 0 },
    "1F-CR2": { occupancy: 0, timestamp: 0 }
  });
  const [loading, setLoading] = useState(true);
  
  // Use our new IAQ data service
  const { zoneIAQData, loading: iaqLoading } = useIAQData();
 
  const day = currentDate.getDate().toString().padStart(2, "0");
  const month = currentDate.toLocaleString("en-US", { month: "short" });
  const year = currentDate.getFullYear();
  const weekday = currentDate.toLocaleString("en-US", { weekday: "long" });
 
  const formattedDate = `${day} ${month} ${year}, ${weekday}`; // format date
 
  // Map for floor IDs to match the API format
  const floorIdMap = {
    "1/F": "1F",
    "M/F": "MF",
    "2/F": "2F",
    "3/F": "3F"
  };
 
  // Map for zone names
  const zoneNameMap = {
    "South": "Zone A",
    "Central": "Zone B",
    "North": "Zone C"
  };
 
  // Floor and zone availability mapping
  const floorZoneMapping = {
    "1/F": ["Zone A", "Zone B", "Zone C"],
    "M/F": ["Zone A", "Zone C"],
    "2/F": ["Zone A", "Zone B", "Zone C"],
    "3/F": ["Zone B"],
  };
 
  // Fetch Computer Room occupancy data
  useEffect(() => {
    const fetchCRData = async () => {
      try {
        const response = await fetch(
          "https://optimusc.flowfuse.cloud/lingnan-library-occupancy"
        );
        const data = await response.json();
        
        // Process the response data
        const processedData = {};
        
        // Check if data is an array
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.area === "1F-CR1" || item.area === "1F-CR2") {
              processedData[item.area] = {
                occupancy: item.occupancy,
                timestamp: item.timestamp
              };
            }
          });
          
          setCRData(prevData => {
            // Only update if different
            if (JSON.stringify(prevData) !== JSON.stringify(processedData)) {
              return {...prevData, ...processedData};
            }
            return prevData;
          });
        }
      } catch (error) {
        console.error("Error fetching CR data:", error);
      }
    };
    
    // Fetch immediately
    fetchCRData();
    
    // Then fetch every 10 seconds
    const intervalId = setInterval(fetchCRData, 10 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
 
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const data = await response.json();
 
        // Get Tuen Mun temperature
        const tuenMunTemp = data.temperature.data.find(
          (item) => item.place === "Tuen Mun"
        )?.value;
 
        // Get Hong Kong Observatory humidity (only available location)
        const humidity = data.humidity.data[0]?.value;
 
        if (tuenMunTemp !== undefined && humidity !== undefined) {
          setWeather({
            temp: tuenMunTemp,
            humidity: humidity,
          });
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };
 
    fetchWeather();
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
        
        data.forEach(zone => {
          // Normalize zone name for case insensitivity
          const zoneName = zone.zone_name.toLowerCase();
          const floorId = zone.floor_id;
          
          // Determine which zone (A, B, C) based on zone name
          let mappedZone = null;
          if (zoneName.includes("south")) {
            mappedZone = "Zone A";
          } else if (zoneName.includes("central")) {
            mappedZone = "Zone B";
          } else if (zoneName.includes("north")) {
            mappedZone = "Zone C";
          }
          
          // Skip if not a main zone
          if (!mappedZone) return;
          
          // Keep original occupancy values even if negative
          // We'll use occupancy_percentage for status calculation
          const displayedOccupancy = zone.total_occupancy;
          const iconForStatus = zone.total_occupancy < 0 ? 0 : zone.total_occupancy;
          const percentageForStatus = zone.occupancy_percentage < 0 ? 0 : zone.occupancy_percentage;
          
          // Calculate status based on occupancy percentage
          // Use only non-negative percentage values for status determination
          let status = "available";
          if (iconForStatus > 70) {
            status = "crowded";
          } else if (iconForStatus > 40) {
            status = "less-available";
          }
          
          // Map floor IDs to display format
          let displayFloor = Object.keys(floorIdMap).find(
            key => floorIdMap[key] === floorId
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
        
        // Combine with IAQ data if available
        if (Object.keys(zoneIAQData).length > 0) {
          Object.keys(processedData).forEach(floor => {
            Object.keys(processedData[floor]).forEach(zone => {
              // If we have IAQ data for this floor and zone, use it
              if (zoneIAQData[floor] && zoneIAQData[floor][zone]) {
                processedData[floor][zone] = {
                  ...processedData[floor][zone],
                  co2: zoneIAQData[floor][zone].co2 || processedData[floor][zone].co2,
                  temp: zoneIAQData[floor][zone].temp || processedData[floor][zone].temp,
                  humidity: zoneIAQData[floor][zone].humidity || processedData[floor][zone].humidity
                };
              }
            });
          });
        }
        
        setZoneData(prevData => {
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
 
    // Fetch immediately on first render
    fetchZoneData();
    
    // Then fetch every 10 seconds
    const intervalId = setInterval(fetchZoneData, 10 * 1000);
    
    return () => clearInterval(intervalId);
  }, [zoneIAQData]); // Added zoneIAQData as a dependency
 
  // Floor map URLs
  const floorMaps = {
    "1/F": "https://pwwpdev.github.io/Lingnan/first_floor_dos_overlay.html",
    "M/F": "https://pwwpdev.github.io/Lingnan/m_floor_dos.html",
    "2/F": "https://pwwpdev.github.io/Lingnan/second_floor_dos.html",
    "3/F": "https://pwwpdev.github.io/Lingnan/third_floor_dos.html",
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
    let computerRoomInfo = null;
    
    if (activeFloor === "1/F") {
      if (zoneName === "Zone A") {
        computerRoomInfo = (
          <div className="mt-4 bg-gray-100 pr-6 py-2 pl-2 w-fit rounded-lg">
            <div className="flex items-center text-[17px] font-semibold mb-1">
              Computer Room 1: <div className=" ml-3 font-bold">
              {crData["1F-CR1"]?.occupancy || 0}
            </div>
            </div>
            
          </div>
        );
      } else if (zoneName === "Zone C") {
        computerRoomInfo = (
          <div className="mt-4 bg-gray-100 pr-6 py-2 pl-2 w-fit rounded-lg">
            <div className="flex items-center text-[17px] font-semibold mb-1">
            Computer Room 2: <div className=" ml-3 font-bold">
              {crData["1F-CR2"]?.occupancy || 0}
            </div>
            </div>
            
          </div>
        );
      }
    }
    
    return (
      <div className="flex flex-col">
        <h3 className="lg:text-2xl xl:text-3xl font-bold mb-2">{zoneName}</h3>
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
        <div className="text-[16px] mt-2">
          <div className="font-medium">Average Occupancy: {zoneData?.occupancy || "0%"}</div>
          <div>
            CO<sub>2</sub> {zoneData?.co2 || 580}
            <sub>ppm</sub>
          </div>
          <div> <span className="pr-2">Temperature</span>{zoneData?.temp || 25} °C</div>
          <div><span className=" pr-2">Humidity</span>{zoneData?.humidity || 64}%</div>
        </div>
        
        {/* Computer Room Info */}
        {computerRoomInfo}
      </div>
    );
  };
 
  // Get the available zones for the current floor
  const getZonesForCurrentFloor = () => {
    return floorZoneMapping[activeFloor] || [];
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
      <header className="bg-[#ffffff] custom-shadow h-14 lg:h-20 xl:h-[100px] fixed top-0 left-0 w-full z-10 flex items-center justify-between">
        <div className="flex items-center h-full">
          <button
            className={`flex flex-col justify-center items-start space-y-1 pl-8 ${
              isSidebarOpen ? "hidden" : ""
            }`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
            <span className="block sm:w-8 sm:h-1 w-4 h-0.5 bg-gray-700"></span>
          </button>
        </div>
        <img
          src="/library-logo-final_2024.png"
          alt="LNU Logo"
          className="h-6 sm:h-10 lg:h-12 xl:h-14 mx-auto"
        />
      </header>
 
      {/* Content */}
      <div className="px-6 lg:px-14 xl:px-14 2xl:px-14 pb-6">
        {/* date and weather */}
        <div className="mt-[74px] lg:mt-32 xl:mt-[130px] flex justify-between items-center text-[18px] sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold mb-8">
          <div className="text-gray-700">{formattedDate}</div>
          {weather && (
            <div className="text-gray-700 md:text-xl sm:text-lg lg:text-[22px] text-[16px] flex items-center space-x-4">
              <div className="flex items-center">
                <FaTemperatureHigh className="mr-2 text-red-400" />{" "}
                {weather.temp}°C
              </div>
              <div className="flex items-center">
                <FaTint className="mr-2 text-blue-300" /> {weather.humidity}%
              </div>
            </div>
          )}
        </div>
 
        {/* viewer section */}
        <div className="rounded-xl border border-[#E2E2E4] shadow-[0_1px_2px_0_#dedede] bg-white">
          {/* title*/}
          <div className="px-8 pt-6 mb-4">
            <p className="lg:text-3xl md:text-2xl sm:text-xl text-[22px] font-bold pb-2">
              Live Dashboard
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
                zoneData={zoneData[activeFloor] ? zoneData[activeFloor][zoneName] : null}
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
              <span>Available</span>
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
              <span>Less Available</span>
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
              <span>Crowded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default Viewer3;