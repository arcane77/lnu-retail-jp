import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle } from "lucide-react";
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
  "MDR-024": "EX-3C5",
  "MDR-025": "EX-3A2",
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
  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "ascending",
  });
  const [lastUpdateTime, setLastUpdateTime] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sidebarRef = useRef(null);

  // Create flat array of all doors for sorting
  const getAllDoors = () => {
    const allDoors = [];
    Object.entries(data).forEach(([floor, doors]) => {
      doors.forEach((door) => {
        allDoors.push({
          ...door,
          floor,
          statusText: door.status === 1 ? "Opened" : "Closed",
          mdrId: getCorrespondingMdrId(door.id),
        });
      });
    });
    return allDoors;
  };

  // Sort function for table data
  const sortedDoors = React.useMemo(() => {
    const allDoors = getAllDoors();
    return [...allDoors].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Handle sorting request
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

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
                      ? new Date(sensorData.timestamp).toLocaleTimeString(
                          "en-US",
                          {
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
            Security View
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

            {/* Replace the original status box div with this updated version */}
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

  {/* flex column on small screens, row on lg+ */}
  <div className="w-full flex flex-col lg:flex-row lg:gap-8">
    {/* Emergency doors table */}
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

    {/* Floor Overview - will be side-by-side with table on lg screens */}
    <div className="w-full lg:w-1/3  lg:-mt-8">
      <h3 className="font-semibold text-gray-700 mb-2">
       Overview
      </h3>
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

            

            <div className="rounded-xl shadow-md border border-gray-200 overflow-hidden bg-white w-full">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Sensor ID</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("id")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "id" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("id")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "id" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Status</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("statusText")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "statusText" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("statusText")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "statusText" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Floor</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("floor")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "floor" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("floor")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "floor" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Battery</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("battery")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "battery" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("battery")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "battery" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Last Updated</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("lastUpdated")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "lastUpdated" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("lastUpdated")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "lastUpdated" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDoors.map((door) => (
                      <tr key={door.id} className="border-b border-gray-200">
                        <td className="text-center sm:text-base text-sm px-4 py-4">
                          {door.id}
                        </td>
                        <td
                          className={`text-center sm:text-base text-sm px-4 py-4 ${
                            door.status === 1
                              ? "text-red-600 font-bold"
                              : "text-green-600"
                          }`}
                        >
                          {door.statusText}
                        </td>
                        <td className="text-center sm:text-base text-sm px-4 py-4">
                          {door.floor}
                        </td>
                        <td className="text-center sm:text-base text-sm px-4 py-4">
                          {door.battery !== null ? `${door.battery}%` : "-"}
                        </td>
                        <td className="text-center sm:text-base text-sm px-4 py-4">
                          {door.lastUpdated || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            
            
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityView;
