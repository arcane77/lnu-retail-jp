import React, { useState, useEffect } from "react";
import { Droplet, Thermometer } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth0 } from "@auth0/auth0-react";

const Leakage = () => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [leakData, setLeakData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leakLoading, setLeakLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leakError, setLeakError] = useState(null);
  const { logout, user } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [acknowledgedSensors, setAcknowledgedSensors] = useState([]);
  const [deviceLocations, setDeviceLocations] = useState({});
  const [currentUser, setCurrentUser] = useState({ username: "Unknown User", email: "unknown@email.com" });


  const [lastUpdateTime, setLastUpdateTime] = useState(
    new Date().toLocaleTimeString()
  );

  // Fetch device locations from the API
  useEffect(() => {
    const fetchDeviceLocations = async () => {
      try {
        const response = await fetch(
          "https://lnudevices-dot-optimus-hk.df.r.appspot.com/devices"
        );
        if (!response.ok) {
          throw new Error(
            `Locations API request failed with status ${response.status}`
          );
        }

        const devices = await response.json();

        // Create a mapping of device_id to location
        const locationMapping = {};
        devices.forEach((device) => {
          // Only include WL- sensors
          if (device.device_id && device.device_id.startsWith("WL-")) {
            locationMapping[device.device_id] = device.location;
          }
        });

        setDeviceLocations(locationMapping);
        console.log("Fetched device locations:", locationMapping);
      } catch (err) {
        console.error("Error fetching device locations:", err);
        // Continue with other operations even if locations fail to load
      }
    };

    fetchDeviceLocations();
  }, []);

  useEffect(() => {
    // Try to get user data from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      console.log("Found stored user:", storedUser);
      setCurrentUser({
        username: storedUser.username || "Unknown User",
        email: storedUser.email || "unknown@email.com"
      });
    } else {
      console.log("No user found in localStorage");
    }
  }, []);

  // Function to fetch data from the main API
  const fetchSensorData = async () => {
    try {
      if (sensorData.length === 0) {
        setLoading(true);
      }
      const response = await fetch("https://optimusc.flowfuse.cloud/wl");

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Process the API data
      const processedData = Object.keys(data)
        .filter((key) => key.startsWith("WL-"))
        .map((sensorId) => {
          const sensorInfo = data[sensorId];

          // Default values
          let status = "Idle";
          let humidity = "N/A";
          let temperature = "N/A";
          let battery = "N/A";

          // Check if the sensor has data
          if (sensorInfo) {
            // For sensors that have leakage_status
            if (sensorInfo.leakage_status) {
              status =
                sensorInfo.leakage_status === "normal" ? "Idle" : "Leakage";
            }

            // Get humidity if available
            if (sensorInfo.humidity !== undefined) {
              humidity = `${sensorInfo.humidity}%`;
            }

            // Get temperature if available
            if (sensorInfo.temperature !== undefined) {
              temperature = `${sensorInfo.temperature}°C`;
            }

            // Get battery if available
            if (sensorInfo.battery !== undefined) {
              battery = `${sensorInfo.battery}%`;
            }
          }

          // Check if this sensor was previously acknowledged
          if (acknowledgedSensors.includes(sensorId) && status === "Leakage") {
            status = "Leakage Acknowledged";
          }

          let lastUpdated = "N/A";
            if (sensorInfo?.timestamp) {
                // Convert Unix timestamp (in milliseconds) to readable date/time
                const date = new Date(sensorInfo.timestamp);
                lastUpdated = date.toLocaleString();
            }

          return {
            id: sensorId,
            status: status,
            // Use location from the API or fallback to "Unknown"
            location: deviceLocations[sensorId] || "Unknown",
            humidity: humidity,
            temperature: temperature,
            battery: battery,
            lastUpdated: lastUpdated
        };
        });

      setSensorData(processedData);
      setLoading(false);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching sensor data:", err);
      setError(err.message);
      setLoading(false);

      // Fall back to some default data for sensors that failed to fetch
      const fallbackSensors = Object.keys(deviceLocations)
        .filter((id) => !sensorData.some((sensor) => sensor.id === id))
        .map((id) => ({
          id: id,
          status: "Unknown",
          location: deviceLocations[id] || "Unknown",
          humidity: "N/A",
          temperature: "N/A",
          lastUpdated: "N/A",
        }));

      if (fallbackSensors.length > 0) {
        setSensorData((prevData) => [...prevData, ...fallbackSensors]);
      }
    }
  };

  // Add these state variables alongside your other state declarations
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // Add this function to handle sorting requests
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Add this function to sort the data
  const getSortedData = (dataToSort) => {
    if (!sortConfig.key) return dataToSort;

    return [...dataToSort].sort((a, b) => {
      // For numeric values that might be displayed with units
      if (["humidity", "temperature", "battery"].includes(sortConfig.key)) {
        // Extract numeric values by removing non-numeric characters
        const aValue =
          parseFloat(a[sortConfig.key].replace(/[^\d.-]/g, "")) || 0;
        const bValue =
          parseFloat(b[sortConfig.key].replace(/[^\d.-]/g, "")) || 0;

        if (sortConfig.direction === "ascending") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // For string values (id, status, location)
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  // Sort the data before using it
  const sortedSensorData = getSortedData(sensorData);

  // Function to fetch leak data from the new API
  // Replace the fetchLeakData function with this:
const fetchLeakData = async () => {
  try {
    if (leakData.length === 0) {
      setLeakLoading(true);
    }

    const response = await fetch(
      "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/leaks"
    );

    if (!response.ok) {
      throw new Error(
        `Leak API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    
    // Handle the array format from the API
    const mappedLeaks = Array.isArray(data) ? data.map((leakArray) => {
      // Based on your example, the array structure appears to be:
      // [id, sensor_id, null, null, null, status, 0, timestamp]
      return {
        id: leakArray[0], // This is the UUID for acknowledgment
        sensorId: leakArray[1] || "Unknown", // This is the sensor ID (WL-XX)
        location: deviceLocations[leakArray[1]] || "Unknown",
        status: leakArray[5] || "Unknown",
        timestamp: leakArray[7] || new Date().toLocaleString(),
      };
    }) : [];

    setLeakData(mappedLeaks);
    setLeakLoading(false);
    setLastUpdateTime(new Date().toLocaleTimeString());
  } catch (err) {
    console.error("Error fetching leak data:", err);
    setLeakError(err.message);
    setLeakLoading(false);
  }
};

// Make sure the handleAcknowledge function is using the correct ID
const handleAcknowledge = async (deviceId) => {
  try {
    // Use the currentUser state for the acknowledgment
    const userInfo = {
      userName: currentUser.username,
      userEmail: currentUser.email
    };
    
    console.log("Sending user info with acknowledgment:", userInfo);
    console.log(`Sending acknowledgment for device ID: ${deviceId}`);
    
    // Send acknowledgment to the API using the UUID from the leaks API
    const response = await fetch(
      `https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/acknowledge/${deviceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Add the user information in the request body
        body: JSON.stringify(userInfo),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to acknowledge leak with status ${response.status}`
      );
    }

    console.log(`Successfully acknowledged leak with device ID: ${deviceId}`);

    // The rest of your function remains the same
    // Find the sensor ID associated with this UUID
    const leakItem = leakData.find(leak => leak.id === deviceId);
    const sensorId = leakItem ? leakItem.sensorId : null;
    
    if (sensorId) {
      // Add the sensor ID to acknowledged sensors
      setAcknowledgedSensors((prev) => {
        if (!prev.includes(sensorId)) {
          return [...prev, sensorId];
        }
        return prev;
      });

      // Update sensor statuses
      setSensorData((prev) =>
        prev.map((sensor) => {
          if (sensor.id === sensorId && sensor.status === "Leakage") {
            return { ...sensor, status: "Leakage Acknowledged" };
          }
          return sensor;
        })
      );
    }

    // Remove the acknowledged leak from the leakData
    setLeakData((prev) => prev.filter((leak) => leak.id !== deviceId));
  } catch (err) {
    console.error("Error acknowledging leak:", err);
    alert(`Failed to acknowledge leak: ${err.message}`);
  }
};

  // Only fetch sensor and leak data after locations are loaded or on component mount
  useEffect(() => {
    fetchSensorData();
    fetchLeakData();

    // Set up polling intervals
    const sensorInterval = setInterval(fetchSensorData, 10000);
    const leakInterval = setInterval(fetchLeakData, 60000);

    return () => {
      clearInterval(sensorInterval);
      clearInterval(leakInterval);
    };
  }, [deviceLocations]); // Add deviceLocations as a dependency

  const handleEditLocation = (index) => {
    setEditingIndex(index);
  };

  const handleLocationChange = (index, newValue) => {
    const updatedData = [...sensorData];
    updatedData[index].location = newValue;
    setSensorData(updatedData);
  };

  const handleBlur = () => {
    setEditingIndex(null);
  };



  return (
    <div>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />
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
      <div className="flex items-center mt-4 mb-2">

</div>

      <div className="min-h-screen mt-12 sm:mt-12 lg:mt-24 bg-gray-100 p-8">
        <h1 className="md:text-2xl text-xl font-semibold text-gray-800 mb-6">
          Leakages
        </h1>
        

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Error fetching sensor data: {error}</p>
            <p>Some sensors may display default values.</p>
          </div>
        )}

        {loading && sensorData.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-600">Loading sensor data...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Right box - Will appear first on smaller screens */}
            <div className={`rounded-xl ${leakData.length > 0 ? 'custom-shadow-red' : 'custom-shadow-green'} custom-s border border-gray-200 bg-white px-8 pt-10 w-full lg:w-1/3 order-1 lg:order-2 mb-2 lg:mb-0 flex flex-col items-center`}>              <img
                src="/drop.png"
                alt="Leakage Icon"
                className="w-20 h-20 mb-2"
              />
              <p
                className={`mt-4 md:mb-4 lg:mb-1 text-center text-xl font-bold ${
                  leakData.length > 0 ? "text-red-600" : "text-[#88D89F]"
                }`}
              >
                {leakData.length > 0
                  ? "LEAKAGE DETECTED!"
                  : "No Leakage Detected"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Last updated: {lastUpdateTime}
              </p>

              {leakLoading ? (
                <div className="mt-6 text-center">
                  <p>Loading leak data...</p>
                </div>
              ) : leakError ? (
                <div className="mt-6 text-center text-red-500">
                  <p>Error loading leak data: {leakError}</p>
                </div>
              ) : leakData.length > 0 ? (
                <div className="mt-6 w-full max-w-[380px] mb-9 h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-2 py-2">Sensor</th>
                        <th className="px-2 py-2">Location</th>
                        <th className="px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leakData.map((leak) => (
                        <tr key={leak.id} className="border-b border-gray-300">
                          <td className="px-2 py-1 text-center">
                            {leak.sensorId}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {leak.location}
                          </td>
                         
                          <td className="px-2 py-1 text-center">
                            <button
                              onClick={() => handleAcknowledge(leak.id)}
                              className="bg-[#88D89F] hover:bg-green-400 text-white font-bold py-1 px-2 rounded text-xs"
                            >
                              ACK
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-6 text-center text-green-600">
                  {/* <p>No leaks detected.</p> */}
                </div>
              )}
            </div>

            {/* Left table - Will appear second on smaller screens */}
            <div className="rounded-xl custom-shadow custom-s border border-gray-200 overflow-hidden bg-white w-full lg:w-2/3 order-2 lg:order-1">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Sensor</span>
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
                              onClick={() => requestSort("status")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "status" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("status")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "status" &&
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
                          <span className="mr-1">Location</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("location")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "location" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("location")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "location" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th>
                      {/* <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Humidity</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("humidity")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "humidity" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("humidity")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "humidity" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th> */}
                      {/* <th className="text-center px-4 py-4">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">Temperature</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => requestSort("temperature")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-t-0 border-b-4 border-l-transparent border-r-transparent border-b-gray-500 ${
                                sortConfig.key === "temperature" &&
                                sortConfig.direction === "ascending"
                                  ? "border-b-black"
                                  : ""
                              }`}
                              aria-label="Sort ascending"
                            />
                            <button
                              onClick={() => requestSort("temperature")}
                              className={`h-2 w-0 border-l-4 border-r-4 border-b-0 border-t-4 border-l-transparent border-r-transparent border-t-gray-500 ${
                                sortConfig.key === "temperature" &&
                                sortConfig.direction === "descending"
                                  ? "border-t-black"
                                  : ""
                              }`}
                              aria-label="Sort descending"
                            />
                          </div>
                        </div>
                      </th> */}
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
                    {sortedSensorData.map((sensor, index) => (
                      <tr key={sensor.id} className="border-b border-gray-200">
                        <td className="text-center sm:text-[16px]  text-sm px-4 py-4">
                          {sensor.id}
                        </td>
                        <td
                          className={`text-center sm:text-lg text-sm px-4 py-4 ${
                            sensor.status === "Leakage"
                              ? "text-red-600 font-bold"
                              : sensor.status === "Leakage Acknowledged"
                              ? "text-green-600"
                              : sensor.status === "Unknown"
                              ? "text-gray-400 italic"
                              : "text-gray-700"
                          }`}
                        >
                          {sensor.status}
                        </td>
                        <td className="text-center sm:text-[16px]  text-sm px-4 py-4">
                          <div className="flex items-center justify-center">
                            {editingIndex === index ? (
                              <input
                                type="text"
                                value={sensor.location}
                                onChange={(e) =>
                                  handleLocationChange(index, e.target.value)
                                }
                                onBlur={handleBlur}
                                autoFocus
                                className="border rounded px-2 py-1 text-center"
                              />
                            ) : (
                              <>
                                <span className="mr-2">{sensor.location}</span>
                              </>
                            )}
                          </div>
                        </td>
                        {/* <td className="text-center sm:text-[16px]  text-sm px-4 py-4">
                          <div className="flex items-center justify-center">
                            <Droplet className="w-4 h-4 mr-1 text-blue-500" />
                            <span
                              className={
                                sensor.status === "Leakage"
                                  ? "text-red-600 font-bold"
                                  : ""
                              }
                            >
                              {sensor.humidity}
                            </span>
                          </div>
                        </td> */}
                        {/* <td className="text-center sm:text-[16px]  text-sm px-4 py-4">
                          <div className="flex items-center justify-center">
                            <Thermometer className="w-4 h-4 mr-1 text-red-500" />
                            <span>{sensor.temperature}</span>
                          </div>
                        </td> */}
                        <td className="text-center sm:text-[16px] text-sm px-4 py-4">
                            <div className="flex items-center justify-center">
                                <span>{sensor.lastUpdated}</span>
                            </div>
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

export default Leakage;
