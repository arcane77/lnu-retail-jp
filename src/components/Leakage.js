import React, { useState, useEffect } from "react";
import { Droplet, Thermometer, Volume2, VolumeX } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

import Sidebar from "./Sidebar";

const Leakage = () => {
  const [editingIndex, setEditingIndex] = useState(null);
  const { logout } = useAuth0();
  const [sensorData, setSensorData] = useState([]);
  const [leakData, setLeakData] = useState([]);
  const [ackData, setAckData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leakLoading, setLeakLoading] = useState(true);
  const [ackLoading, setAckLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leakError, setLeakError] = useState(null);
  const [ackError, setAckError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [acknowledgedSensors, setAcknowledgedSensors] = useState([]);
  const [deviceLocations, setDeviceLocations] = useState({});
  const [currentUser, setCurrentUser] = useState({
    username: "Unknown User",
    email: "unknown@email.com",
  });

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
        const locationMapping = {};
        devices.forEach((device) => {
          if (device.device_id && device.device_id.startsWith("WL-")) {
            locationMapping[device.device_id] = device.location;
          }
        });

        setDeviceLocations(locationMapping);
      } catch (err) {
        console.error("Error fetching device locations:", err);
      }
    };

    fetchDeviceLocations();
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setCurrentUser({
        username: storedUser.username || "Unknown User",
        email: storedUser.email || "unknown@email.com",
      });
    }
  }, []);

  // Function to fetch acknowledgment data
  const fetchAckData = async () => {
    try {
      if (ackData.length === 0) {
        setAckLoading(true);
      }
      const response = await fetch(
        "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/ack-leaks"
      );

      if (!response.ok) {
        throw new Error(
          `Ack API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      setAckData(data);
      setAckLoading(false);
    } catch (err) {
      console.error("Error fetching acknowledgment data:", err);
      setAckError(err.message);
      setAckLoading(false);
    }
  };

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

      const processedData = Object.keys(data)
        .filter((key) => key.startsWith("WL-"))
        .map((sensorId) => {
          const sensorInfo = data[sensorId];

          let status = "Idle";
          let humidity = "N/A";
          let temperature = "N/A";
          let battery = "N/A";

          if (sensorInfo) {
            if (sensorInfo.leakage_status) {
              status =
                sensorInfo.leakage_status === "normal" ? "Idle" : "Leakage";
            }

            if (sensorInfo.humidity !== undefined) {
              humidity = `${sensorInfo.humidity}%`;
            }

            if (sensorInfo.temperature !== undefined) {
              temperature = `${sensorInfo.temperature}°C`;
            }

            if (sensorInfo.battery !== undefined) {
              battery = `${sensorInfo.battery}%`;
            }
          }

          if (acknowledgedSensors.includes(sensorId) && status === "Leakage") {
            status = "Leakage Acknowledged";
          }

          let lastUpdated = "N/A";
          if (sensorInfo?.timestamp) {
            const date = new Date(sensorInfo.timestamp);
            lastUpdated = date.toLocaleString();
          }

          // Get all ack data for this sensor and find the latest one by leak_time
          const sensorAckEntries = ackData.filter(
            (ack) => ack.sensor === sensorId
          );
          const latestAckData =
            sensorAckEntries.length > 0
              ? sensorAckEntries.sort(
                  (a, b) => new Date(b.leak_time) - new Date(a.leak_time)
                )[0]
              : null;

          let lastAlert = "N/A";
          let lastAcknowledged = "N/A";
          let acknowledgedBy = "N/A";

          if (latestAckData) {
            if (latestAckData.leak_time) {
              const alertDate = new Date(latestAckData.leak_time);
              lastAlert = alertDate.toLocaleString();
            }
            if (latestAckData.ack_time) {
              const ackDate = new Date(latestAckData.ack_time);
              lastAcknowledged = ackDate.toLocaleString();
            }
            if (latestAckData.userName) {
              acknowledgedBy = latestAckData.userName;
            }
          }

          return {
            id: sensorId,
            status: status,
            location: deviceLocations[sensorId] || "Unknown",
            humidity: humidity,
            temperature: temperature,
            battery: battery,
            lastUpdated: lastUpdated,
            lastAlert: lastAlert,
            lastAcknowledged: lastAcknowledged,
            acknowledgedBy: acknowledgedBy,
          };
        });

      setSensorData(processedData);
      setLoading(false);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching sensor data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Function to fetch leak data from the API
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

      const mappedLeaks = Array.isArray(data)
        ? data.map((leakArray) => {
            return {
              id: leakArray[0],
              sensorId: leakArray[1] || "Unknown",
              location: deviceLocations[leakArray[1]] || "Unknown",
              status: leakArray[5] || "Unknown",
              timestamp: leakArray[7] || new Date().toLocaleString(),
            };
          })
        : [];

      setLeakData(mappedLeaks);
      setLeakLoading(false);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching leak data:", err);
      setLeakError(err.message);
      setLeakLoading(false);
    }
  };

  const handleAcknowledge = async (deviceId) => {
    try {
      const userInfo = {
        userName: currentUser.username,
        userEmail: currentUser.email,
      };

      const response = await fetch(
        `https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/acknowledge/${deviceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to acknowledge leak with status ${response.status}`
        );
      }

      const leakItem = leakData.find((leak) => leak.id === deviceId);
      const sensorId = leakItem ? leakItem.sensorId : null;

      if (sensorId) {
        setAcknowledgedSensors((prev) => {
          if (!prev.includes(sensorId)) {
            return [...prev, sensorId];
          }
          return prev;
        });

        setSensorData((prev) =>
          prev.map((sensor) => {
            if (sensor.id === sensorId && sensor.status === "Leakage") {
              return { ...sensor, status: "Leakage Acknowledged" };
            }
            return sensor;
          })
        );
      }

      setLeakData((prev) => prev.filter((leak) => leak.id !== deviceId));

      // Refresh acknowledgment data
      fetchAckData();
    } catch (err) {
      console.error("Error acknowledging leak:", err);
      alert(`Failed to acknowledge leak: ${err.message}`);
    }
  };



  useEffect(() => {
    fetchLeakData();
    fetchAckData();
  
    const leakInterval = setInterval(fetchLeakData, 300000);
    const ackInterval = setInterval(fetchAckData, 300000);
  
    return () => {
      clearInterval(leakInterval);
      clearInterval(ackInterval);
    };
  }, [deviceLocations]);
  
  // Separate useEffect for sensor data that depends on ackData
  useEffect(() => {
    fetchSensorData();
    const sensorInterval = setInterval(fetchSensorData, 30000);
    
    return () => {
      clearInterval(sensorInterval);
    };
  }, [deviceLocations, ackData]);

  const getPast7DaysAlerts = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return sensorData.filter(sensor => {
      if (sensor.lastAlert === "N/A") return false;
      
      const alertDate = new Date(sensor.lastAlert);
      return alertDate >= sevenDaysAgo && alertDate <= new Date();
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Leakage":
        return "text-red-600 bg-red-50 border-red-200";
      case "Leakage Acknowledged":
        return "text-green-600 bg-green-50 border-green-200";
      case "Idle":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-400 bg-gray-50 border-gray-200";
    }
  };

  const getCardBorderColor = (status) => {
    switch (status) {
      case "Leakage":
        return "border border-gray-200 custom-shadow-red1";
      case "Leakage Acknowledged":
        return "border border-gray-200 custom-shadow-green1";
      case "Idle":
        return "border border-gray-200 custom-shadow-green1";
      default:
        return "border-gray-200 shadow-gray-100";
    }
  };

  return (
    <div>
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
            {/* Alert Box - Right side */}
            <div
              className={`rounded-xl ${
                leakData.length > 0
                  ? "custom-shadow-red"
                  : "custom-shadow-green"
              } custom-s border border-gray-200 bg-white px-8 pt-10 w-full lg:w-1/3 order-1 lg:order-2 mb-2 lg:mb-0 flex flex-col h-fit items-center`}
            >
              <img
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
) : (
  <>
    {/* Current Leakages */}
    {leakData.length > 0 && (
      <div className="mt-6 w-full max-w-[380px] mb-6 h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
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
    )}

    {/* Past 7 Days Alerts Section - Always Shown */}
    <div className="mt-5 w-full">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">
        Past 7 Days' Alerts
      </h3>
      {getPast7DaysAlerts().length > 0 ? (
        <div className="w-full max-w-[380px] mb-9 h-40 overflow-y-auto border border-gray-300 rounded-md p-2 mx-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2">Sensor</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Last Alert</th>
              </tr>
            </thead>
            <tbody>
              {getPast7DaysAlerts()
                .sort((a, b) => new Date(b.lastAlert) - new Date(a.lastAlert))
                .map((sensor) => (
                <tr key={sensor.id} className="border-b border-gray-200">
                  <td className="px-2 py-1 text-center text-xs">
                    {sensor.id}
                  </td>
                  <td className="px-2 py-1 text-center text-xs">
                    {sensor.location}
                  </td>
                  <td className="px-2 py-1 text-center text-xs">
                    {new Date(sensor.lastAlert).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-green-500 text-sm mb-9">
          No leaks detected in past 7 days
        </div>
      )}
    </div>
  </>
)}
            </div>

            {/* Sensor Grid - Left side */}
            <div className="w-full lg:w-2/3 order-2 lg:order-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sensorData
                  .sort((a, b) => {
                    // Extract numbers from sensor IDs (WL-01, WL-02, etc.)
                    const numA = parseInt(a.id.split("-")[1]) || 0;
                    const numB = parseInt(b.id.split("-")[1]) || 0;
                    return numA - numB;
                  })
                  .map((sensor) => (
                    <div
                      key={sensor.id}
                      className={`rounded-xl border-2 p-5 bg-white shadow-lg  transition-all duration-200 ${getCardBorderColor(
                        sensor.status
                      )}`}
                    >
                      {/* Header with Sensor ID and Status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-full ${
                              sensor.status === "Leakage"
                                ? "bg-red-100"
                                : sensor.status === "Leakage Acknowledged"
                                ? "bg-green-100"
                                : "bg-blue-100"
                            }`}
                          >
                            <Droplet
                              className={`w-5 h-5 ${
                                sensor.status === "Leakage"
                                  ? "text-red-600"
                                  : sensor.status === "Leakage Acknowledged"
                                  ? "text-green-600"
                                  : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">
                              {sensor.id}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {sensor.location}
                            </p>
                          </div>
                        </div>
                        
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border ${getStatusColor(
                          sensor.status
                        )}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            sensor.status === "Leakage"
                              ? "bg-red-500"
                              : sensor.status === "Leakage Acknowledged"
                              ? "bg-green-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                        {sensor.status}
                      </div>

                      {/* Sensor Information Grid */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 font-medium mb-1">
                              LAST UPDATED
                            </p>
                            <p className="text-xs text-gray-800 font-medium">
                              {sensor.lastUpdated}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 font-medium mb-1">
                              LAST ALERT
                            </p>
                            <p className="text-xs text-gray-800 font-medium">
                              {sensor.lastAlert}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            LAST ACKNOWLEDGED
                          </p>
                          <p className="text-xs text-gray-800 font-medium">
                            {sensor.lastAcknowledged}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            by {sensor.acknowledgedBy}
                          </p>
                        </div>
                      </div>

                     
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leakage;
