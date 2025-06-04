import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Battery, Clock, Wifi } from "lucide-react";
import Sidebar from "./Sidebar";

// Mapping between MDR IDs and exit door IDs
const mdrToExitMapping = {
  "MDR-001": "EX-1A1",
  "MDR-002": "EX-1A2",
  "MDR-003": "EX-1C7",
  "MDR-004": "EX-1C9",
  "MDR-005": "EX-1C8",
  "MDR-006": "EX-1C6",
  "MDR-007": "EX-1B5",
  "MDR-008": "EX-1A4",
  "MDR-009": "EX-1A3",
  "MDR-010": "EX-MA1",
  "MDR-011": "EX-MA2",
  "MDR-012": "EX-MB3",
  "MDR-013": "EX-MB4",
  "MDR-014": "EX-MC5",
  "MDR-015": "EX-MC6",
  "MDR-016": "EX-2A1",
  "MDR-017": "EX-2A2",
  "MDR-018": "EX-2C3",
  "MDR-019": "EX-2C4",
  "MDR-020": "EX-3A1",
  "MDR-021": "EX-3A3",
  "MDR-022": "EX-3C4",
  "MDR-023": "EX-3C5",
  "MDR-024": "EX-3C5(1)",
  "MDR-025": "EX-1A5",
  "MDR-026": "EX-3A2",
};

// Initial emergency data structure
const emergencyData = {
  "1/F": [
    { id: "EX-1A1", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1A2", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1C7", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1C9", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1C8", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1C6", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1B5", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1A4", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1A3", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-1A5", status: 0, time: null, battery: null, lastUpdated: null },
  ],
  "M/F": [
    { id: "EX-MA1", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-MA2", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-MB3", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-MB4", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-MC5", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-MC6", status: 0, time: null, battery: null, lastUpdated: null },
  ],
  "2/F": [
    { id: "EX-2A1", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-2A2", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-2C3", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-2C4", status: 0, time: null, battery: null, lastUpdated: null },
  ],
  "3/F": [
    { id: "EX-3A1", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-3A3", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-3C4", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-3C5", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-3C5(1)", status: 0, time: null, battery: null, lastUpdated: null },
    { id: "EX-3A2", status: 0, time: null, battery: null, lastUpdated: null },
  ],
};

// Function to find which floor an exit door belongs to
const findFloorForExit = (exitId) => {
  for (const [floor, exits] of Object.entries(emergencyData)) {
    if (exits.some((exit) => exit.id === exitId)) {
      return floor;
    }
  }
  return null;
};

// Function to get corresponding MDR ID for an exit door
const getCorrespondingMdrId = (exitId) => {
  for (const [mdrId, mappedExitId] of Object.entries(mdrToExitMapping)) {
    if (mappedExitId === exitId) {
      return mdrId;
    }
  }
  return null;
};

// Function to get floor image filename
const getFloorImageName = (floor) => {
  const floorMap = {
    "1/F": "1F.png",
    "M/F": "MF.png",
    "2/F": "2F.png",
    "3/F": "3F.png"
  };
  return floorMap[floor] || "floor.png";
};

// Sensor Card Component
const SensorCard = ({ sensor, floor }) => {
  const mdrId = getCorrespondingMdrId(sensor.id);
  const isOpen = sensor.status === 1;
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 p-4 transition-all duration-300 hover:shadow-xl ${
      isOpen ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
          <h3 className="font-bold text-gray-800 text-sm">{sensor.id}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isOpen ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
        }`}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {/* Status Icon */}
      <div className="flex justify-center mb-3">
        {isOpen ? (
          <AlertCircle size={32} className="text-red-500" />
        ) : (
          <CheckCircle size={32} className="text-green-500" />
        )}
      </div>

      {/* Info Grid */}
      <div className="space-y-2">
        {/* MDR ID */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 flex items-center">
            <Wifi size={12} className="mr-1" />
            MDR ID
          </span>
          <span className="text-xs font-medium text-gray-800">{mdrId || 'N/A'}</span>
        </div>

        {/* Battery */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 flex items-center">
            <Battery size={12} className="mr-1" />
            Battery
          </span>
          <span className={`text-xs font-medium ${
            sensor.battery && sensor.battery < 20 ? 'text-red-600' : 'text-gray-800'
          }`}>
            {sensor.battery ? `${sensor.battery}%` : 'N/A'}
          </span>
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 flex items-center">
            <Clock size={12} className="mr-1" />
            Updated
          </span>
          <span className="text-xs font-medium text-gray-800">
            {sensor.lastUpdated ? sensor.lastUpdated.split(' ').pop() : 'N/A'}
          </span>
        </div>
      </div>

      {/* Open Time (if applicable) */}
      {isOpen && sensor.lastUpdated && (
        <div className="mt-3 pt-2 border-t border-red-200">
          <div className="flex items-center justify-center">
            <span className="text-xs text-red-600 font-medium">
              Opened at: {sensor.lastUpdated ? sensor.lastUpdated.split(' ').pop() : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const SecurityView = () => {
  const { logout } = useAuth0();
  const navigate = useNavigate();
  const [data, setData] = useState(emergencyData);
  const [currentDateTime, setCurrentDateTime] = useState({
    date: "",
    time: "",
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [pirData, setPirData] = useState({ status: "normal", lastChecked: null });
  const [lastUpdateTime, setLastUpdateTime] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sidebarRef = useRef(null);

  // Update date and time
  useEffect(() => {
    const updateDateTime = () => {
      const currentDate = new Date();
      const dateOptions = { day: "numeric", month: "short", weekday: "short" };
      const formattedDate = currentDate.toLocaleDateString(
        "en-US",
        dateOptions
      );
      const formattedTime = currentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentDateTime({ date: formattedDate, time: formattedTime });
    };

    const dateTimeInterval = setInterval(updateDateTime, 1000);
    updateDateTime();

    return () => clearInterval(dateTimeInterval);
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  // Fetch data from API and update state
  useEffect(() => {
    let isMounted = true;

    const fetchMdrData = async () => {
      if (!isMounted) return;

      setLoading(true);

      try {
        const response = await fetch("https://optimusc.flowfuse.cloud/mdr");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!isMounted) return;

        const mdrData = await response.json();
        const newActiveEmergencies = [];

        // Create a deep copy of the current data to avoid state mutation issues
        const updatedData = JSON.parse(JSON.stringify(emergencyData));

        // Update each floor's exits with the latest MDR data
        Object.entries(mdrData).forEach(([mdrId, sensorData]) => {
          const exitId = mdrToExitMapping[mdrId];

          if (exitId) {
            const floor = findFloorForExit(exitId);
            if (floor) {
              const exitIndex = updatedData[floor].findIndex(
                (exit) => exit.id === exitId
              );

              if (exitIndex !== -1) {
                // Check if door is open based on magnet status
                const isDoorOpen = sensorData.magnet_status === "open";
                const wasOpen = updatedData[floor][exitIndex].status === 1;

                if (isDoorOpen) {
                  // If the door wasn't already open, record the opening time
                  if (!wasOpen) {
                    updatedData[floor][exitIndex].time =
                      new Date().toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });
                  }
                  // Set status to open
                  updatedData[floor][exitIndex].status = 1;

                  // Add to active emergencies list
                  newActiveEmergencies.push({
                    door: exitId,
                    floor: floor,
                    mdrId: mdrId,
                    lastUpdated: sensorData.timestamp
  ? new Date(sensorData.timestamp).toLocaleString(
      "en-US",
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    )
  : "Unknown",
                    battery: sensorData.battery,
                  });
                } else {
                  // Door is closed
                  updatedData[floor][exitIndex].status = 0;
                  updatedData[floor][exitIndex].time = null;
                }

                // Update battery level
                updatedData[floor][exitIndex].battery = sensorData.battery;

                // Format and store the timestamp
                if (sensorData.timestamp) {
                  const lastUpdatedDate = new Date(sensorData.timestamp);
                  updatedData[floor][exitIndex].lastUpdated =
                    lastUpdatedDate.toLocaleTimeString("en-US", {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                }
              }
            }
          }
        });

        if (isMounted) {
          // Update data state
          setData(updatedData);

          // Update active emergencies
          setActiveEmergencies(newActiveEmergencies);

          // Update last fetch time
          setLastUpdateTime(
            new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })
          );

          setLoading(false);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching MDR data:", error);
        if (isMounted) {
          setError("Failed to fetch sensor data. Please try again later.");
          setLoading(false);
        }
      }
    };

    // Fetch immediately on component mount
    fetchMdrData();

    // Set up polling interval (every 5 seconds)
    const pollInterval = setInterval(fetchMdrData, 5000);

    // Clean up on component unmount
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch PIR sensor data
  useEffect(() => {
    let isMounted = true;
  
    const fetchPirData = async () => {
      if (!isMounted) return;
  
      try {
        const response = await fetch("https://optimusc.flowfuse.cloud/pir");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        if (!isMounted) return;
  
        const data = await response.json();
        
        // FIX: Updated to use the new API structure with nested 'object'
        if (data["PIR-001"] && data["PIR-001"].object) {
          // Use the actual timestamp from API
          const apiTimestamp = new Date(data["PIR-001"].timestamp);
          
          // Format in English style like your other timestamps
          const formattedTime = apiTimestamp.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Hong_Kong'  // Convert to HKT
          });
  
          setPirData({
            status: data["PIR-001"].object.pir,  // Fixed: now uses .object.pir
            daylight: data["PIR-001"].object.daylight,  // Fixed: now uses .object.daylight
            battery: data["PIR-001"].object.battery,  // Fixed: now uses .object.battery
            lastChecked: formattedTime,  // Fixed: now uses actual API timestamp in HKT
          });
        }
      } catch (error) {
        console.error("Error fetching PIR data:", error);
      }
    };
  
    // Fetch immediately on component mount
    fetchPirData();
  
    // Set up polling interval (every 5 seconds)
    const pollInterval = setInterval(fetchPirData, 5000);
  
    // Clean up on component unmount
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Format the emergency message based on active emergencies
  const getEmergencyMessage = () => {
    if (activeEmergencies.length === 0) {
      return "All emergency doors are closed";
    } else if (activeEmergencies.length === 1) {
      const emergency = activeEmergencies[0];
      return `Emergency door ${emergency.door} on ${emergency.floor} is opened`;
    } else {
      return `${activeEmergencies.length} emergency doors are opened`;
    }
  };

  return (
    <div>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />
      <header className="bg-white shadow-md h-14 lg:h-20 xl:h-24 fixed top-0 left-0 w-full z-10 flex items-center justify-between">
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

      <div className="min-h-screen mt-12 sm:mt-12 lg:mt-24 bg-gray-100 p-8">
        <div className="flex justify-between md:items-start items-center mb-6">
          <h1 className="lg:text-3xl md:text-2xl text-xl font-bold text-gray-800">
            Door Sensor Status
          </h1>
          <div className="text-right">
            <div className="md:text-lg font-medium text-gray-700">
              {currentDateTime.date}
            </div>
            <div className="md:text-2xl font-bold text-gray-800">
              {currentDateTime.time}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <p>Some door status may display default values.</p>
          </div>
        )}

        {loading &&
        Object.keys(data).every((floor) =>
          data[floor].every((door) => door.lastUpdated === null)
        ) ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-600">Loading door status data...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Status Overview */}
            <div className={`rounded-xl shadow-lg border border-gray-200 bg-white px-8 pt-6 pb-8 w-full mb-8 flex flex-col items-center h-fit ${
                activeEmergencies.length > 0
                  ? "custom-shadow-red"
                  : "custom-shadow-green"
              }`}
            >
              {activeEmergencies.length > 0 ? (
                <AlertCircle size={48} className="text-red-500 mb-4" />
              ) : (
                <CheckCircle size={48} className="text-green-500 mb-4" />
              )}
              <p
                className={`text-xl font-bold text-center mb-6 ${
                  activeEmergencies.length > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {getEmergencyMessage()}
              </p>

              <p className="text-sm text-gray-500 mb-4">
                Last updated: {lastUpdateTime}
              </p>

              {/* Emergency doors table and overview */}
              <div className="w-full flex flex-col lg:flex-row lg:gap-8">
                <div className="w-full lg:w-2/3">
                  {activeEmergencies.length > 0 ? (
                    <div className="w-full mb-4 max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="px-3 py-2">Door ID</th>
                            <th className="px-3 py-2">Floor</th>
                            <th className="px-3 py-2">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeEmergencies.map((emergency) => (
                            <tr
                              key={emergency.door}
                              className="border-b border-gray-300"
                            >
                              <td className="px-3 py-2 text-center">
                                {emergency.door}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {emergency.floor}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {emergency.lastUpdated}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-green-600 mb-4">
                      <p>All emergency doors are securely closed.</p>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-1/3 lg:-mt-8">
                  <h3 className="font-semibold text-gray-700 mb-2">Overview</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                    {Object.entries(data).map(([floor, doors]) => {
                      const openDoorsCount = doors.filter(
                        (door) => door.status === 1
                      ).length;
                      const totalDoors = doors.length;

                      return (
                        <div
                          key={floor}
                          className={`p-3 rounded-lg ${
                            openDoorsCount > 0 ? "bg-red-100" : "bg-green-100"
                          } flex justify-between items-center`}
                        >
                          <span className="font-medium">{floor}</span>
                          <span
                            className={`${
                              openDoorsCount > 0
                                ? "text-red-600"
                                : "text-green-600"
                            } font-bold`}
                          >
                            {openDoorsCount}/{totalDoors}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PIR Sensor Status Box */}
            <div className={`w-full p-4 mb-4 rounded border-l-4 ${
              pirData.status === "normal" 
                ? "bg-green-100 border-green-500" 
                : "bg-red-100 border-red-500"
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {pirData.status === "normal" 
                    ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                    : <AlertCircle className="h-5 w-5 text-red-700" />
                  }
                </div>
                <div className="ml-3">
                  <p className={`text-lg font-medium ${
                    pirData.status === "normal" 
                      ? "text-green-700" 
                      : "text-red-700"
                  }`}>
                    PIR Sensor Status
                  </p>
                  <p className={`text-[16px] font-medium ${
                    pirData.status === "normal" 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {pirData.status === "normal" 
                      ? "No motion detected" 
                      : `Motion detected! (${pirData.status})`
                    }
                  </p>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    Battery: {pirData.battery || "Unknown"}% | Last updated: {pirData.lastChecked || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Floor Sections with Images and Sensor Grids */}
            <div className="space-y-12">
              {Object.entries(data).map(([floor, sensors]) => (
                <div key={floor} className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Floor {floor}
                  </h2>
                  
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Floor Image */}
                    <div className="lg:w-2/3 w-full flex justify-center">
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
                        <img
                          src={`/${getFloorImageName(floor)}`}
                          alt={`Floor ${floor} Layout`}
                          className="max-w-full max-h-64 2xl:max-h-96 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none' }} className="text-center">
                          <div className="text-4xl text-gray-400 mb-2">🏢</div>
                          <p className="text-gray-500 font-medium">Floor {floor}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Image: {getFloorImageName(floor)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sensors Grid */}
                    <div className="lg:w-2/3 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {sensors.map((sensor) => (
                          <SensorCard
                            key={sensor.id}
                            sensor={sensor}
                            floor={floor}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityView;