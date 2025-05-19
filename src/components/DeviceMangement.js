import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  CheckCircle,
  XCircle,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  ChevronRight,
  Search,
} from "lucide-react";

import Sidebar from "./Sidebar";

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [idleThreshold, setIdleThreshold] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const BASE_URL = "https://lnudevices-dot-optimus-hk.df.r.appspot.com";

  // Devices to be excluded from display
  const EXCLUDED_DEVICE_IDS = [
    "AM103-915M-01iaq_sensor",
    "AM103-915M-01",
    "WS301-915M-01",
  ];

  // Function to determine device type for sorting order and categorization
  const getDeviceType = (deviceId, devType) => {
    // OCCUPANCY SENSORS - Exact list of 30
    const occupancyDeviceIds = [
      "1F-CR1-V01", "1F-CR1-V02", "1F-CR1-V03", "1F-CR1-V04", 
      "1F-CR2-V01", "1F-CR2-V02", "1F-CR2-V03", "1F-CR2-V04",
      "1F-LRR-V01", "1F-LRR-V02", "1F-LRR-V03", "1F-LRR-V04", "1F-LRR-V05",
      "1F-NC-V01", "1F-SC-V01",
      "3F-SC-V01", "3F-SC-V02", "3F-SC-V03", "3F-SC-V04", "3F-SC-V05",
      "DS-01", "DS-02", "DS-03", "DS-04", "DS-05", "DS-06", "DS-07", 
      "MF-SC-V01", "MF-SC-V02", "MF-SC-V03"
    ];
    
    // FOOTFALL SENSORS - Exact list of the 21 unique IDs
    const footfallDeviceIds = [
      "1F-LRR-EX01", "1F-LRR-EX02", 
      "1F-L-B01", "1F-ME-B01", "1F-Lobby-V01", "MF-S-B01", 
      "1F-BF-B01", "1F-BF-B02", "1F-Lobby-V03", "MF-S-V03", 
      "MF-S-V01", "MF-S-V02", 
      "2F-S-V03", "2F-L-B01", "2F-S-V02", "2F-S-V04", "2F-S-V01", 
      "3F-S-B01", "3F-L-V01", "3F-S-B02", 
      "1F-ME-B02"
    ];
    
    // Check occupancy first
    if (occupancyDeviceIds.includes(deviceId)) {
      return "Occupancy Sensors";
    }
    
    // Then check footfall
    if (footfallDeviceIds.includes(deviceId)) {
      return "Footfall Sensors";
    }
    
    // IAQ Sensors
    if (deviceId.toLowerCase().includes("iaq")) {
      return "IAQ Sensors";
    }
    
    // Water Leakage Sensors
    if (deviceId.toLowerCase().startsWith("wl")) {
      return "Water Leakage Sensors";
    }
    
    // MDR Sensors
    if (deviceId.startsWith("MDR-")) {
      return "MDR Sensors";
    }
    
    // If none of the specific patterns match, return null
    return null;
  };

  // Function to compare devices for sorting
  const compareDevices = (a, b) => {
    // Extract numbers from device IDs
    const getNumericPart = (id) => {
      const matches = id.match(/\d+/);
      return matches ? parseInt(matches[0], 10) : 0;
    };

    return getNumericPart(a.id) - getNumericPart(b.id);
  };

  // Fetch all devices from API
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/devices`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Fetch additional sensor data
      const iaqData = await fetchIAQData();
      const wlData = await fetchWLData();
      const mdrData = await fetchMDRData();
      const footfallData = await fetchFootfallData();
      const occupancyData = await fetchOccupancyData(); // Fetch occupancy data

      // Create virtual devices for footfall sensors
      const footfallDevices = Object.keys(footfallData).map(areaId => {
        return {
          device_id: areaId,
          device_type: "Footfall Sensor",
          location: `${footfallData[areaId].building} ${footfallData[areaId].floor}`,
          area: footfallData[areaId].zone,
          last_data_read: new Date().toISOString(),
          battery: 100
        };
      });

      // Combine regular devices with footfall devices
      const allDevices = [...data, ...footfallDevices];

      // Transform API data to match our component needs
      const transformedData = allDevices
        .filter((device) => !EXCLUDED_DEVICE_IDS.includes(device.device_id)) // Filter out excluded devices
        .map((device) => {
          const deviceId = device.device_id || "";
          const deviceType = getDeviceType(deviceId, device.device_type);
          
          // Skip devices that don't match any of our specific categories
          if (!deviceType) return null;

          // Try to find matching sensor data based on device ID
          let sensorData = null;
          let lastUpdatedTime = new Date(device.last_data_read || new Date());

          if (deviceType === "IAQ Sensors" && iaqData[deviceId]) {
            sensorData = iaqData[deviceId];
            lastUpdatedTime = new Date(sensorData.timestamp);
          } else if (deviceType === "Water Leakage Sensors") {
            // Special handling for WL-05, 06, 07
            if (["WL-05", "WL-06", "WL-07"].includes(deviceId)) {
              sensorData = { lastUpdated: "N/A" };
            } else if (wlData[deviceId]) {
              sensorData = wlData[deviceId];
              lastUpdatedTime = new Date(sensorData.timestamp) || "N/A";
            }
          } else if (deviceType === "MDR Sensors" && mdrData[deviceId]) {
            sensorData = mdrData[deviceId];
            lastUpdatedTime = new Date(sensorData.timestamp);
          } else if (deviceType === "Footfall Sensors" && footfallData[deviceId]) {
            // Handle Footfall sensor data
            sensorData = footfallData[deviceId];
            lastUpdatedTime = new Date(sensorData.timestamp);
          } else if (deviceType === "Occupancy Sensors" && occupancyData[deviceId]) {
            // Handle Occupancy sensor data
            sensorData = occupancyData[deviceId];
            lastUpdatedTime = new Date(sensorData.timestamp || device.last_data_read);
          }

          return {
            id: deviceId,
            type: device.device_type || "",
            category: deviceType,
            location: device.location || "",
            area: device.area || "",
            lastUpdated:
              sensorData && sensorData.lastUpdated === "N/A"
                ? "N/A"
                : new Date(lastUpdatedTime).toLocaleString(),
            battery: sensorData
              ? sensorData.battery || device.battery || 100
              : device.battery || 100,
            lastActive:
              sensorData && sensorData.lastUpdated === "N/A"
                ? null
                : lastUpdatedTime,
            sensorData: sensorData || null, // Store additional sensor data
            isPoweredByPOE: deviceType === "Occupancy Sensors" || deviceType === "Footfall Sensors"
          };
        })
        .filter(device => device !== null) // Filter out null devices (those without a specific category)
        .sort(compareDevices); // Sort the devices

      setDevices(transformedData);

      // Set initial active tab if there are devices
      if (transformedData.length > 0) {
        const categories = [
          ...new Set(transformedData.map((device) => device.category)),
        ];
        if (!activeTab && categories.length > 0) {
          setActiveTab(categories[0]);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError("Failed to load devices. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch IAQ sensor data
  const fetchIAQData = async () => {
    try {
      const response = await fetch("https://optimusc.flowfuse.cloud/iaq");
      if (!response.ok) {
        throw new Error(`IAQ API error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error("Error fetching IAQ data:", err);
      return {};
    }
  };

  // Fetch Water Leakage sensor data
  const fetchWLData = async () => {
    try {
      const response = await fetch("https://optimusc.flowfuse.cloud/wl");
      if (!response.ok) {
        throw new Error(`WL API error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error("Error fetching Water Leakage data:", err);
      return {};
    }
  };

  // Fetch MDR sensor data
  const fetchMDRData = async () => {
    try {
      const response = await fetch("https://optimusc.flowfuse.cloud/mdr");
      if (!response.ok) {
        throw new Error(`MDR API error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error("Error fetching MDR data:", err);
      return {};
    }
  };
  
  // Fetch Footfall sensor data
  // Fetch Footfall sensor data
const fetchFootfallData = async () => {
  try {
    const response = await fetch("https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices");
    if (!response.ok) {
      throw new Error(`Footfall API error: ${response.status}`);
    }
    const data = await response.json();
    
    // Define our known unique footfall IDs
    const knownFootfallIds = [
      "1F-LRR-EX01", "1F-LRR-EX02", 
      "1F-L-B01", "1F-ME-B01", "1F-Lobby-V01", "MF-S-B01", 
      "1F-BF-B01", "1F-BF-B02", "1F-Lobby-V03", "MF-S-V03", 
      "MF-S-V01", "MF-S-V02", 
      "2F-S-V03", "2F-L-B01", "2F-S-V02", "2F-S-V04", "2F-S-V01", 
      "3F-S-B01", "3F-L-V01", "3F-S-B02", 
      "1F-ME-B02"
    ];
    
    // Transform the data to match our expected format
    const transformedData = {};
    
    // Process only the items that match our known footfall IDs
    data.forEach(item => {
      if (item.area_id && knownFootfallIds.includes(item.area_id)) {
        transformedData[item.area_id] = {
          timestamp: new Date().toISOString(),
          count: item.functional_capacity || 0,
          maxCapacity: item.max_capacity || 0,
          zone: item.zone_name || '',
          newZone: item.new_zone_name || '',
          floor: item.floor_id || '',
          building: item.building || '',
          status: item.functional_capacity < item.max_capacity ? "normal" : "overcrowded",
          battery: 100
        };
      }
    });
    
    return transformedData;
  } catch (err) {
    console.error("Error fetching Footfall data:", err);
    return {};
  }
};
  
  // Fetch Occupancy sensor data
  const fetchOccupancyData = async () => {
    try {
      // We're using the same API endpoint as the general device fetch
      const response = await fetch(`${BASE_URL}/devices`);
      if (!response.ok) {
        throw new Error(`Occupancy API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter devices with occupancy-1 or occupancy-sensors device_type
      const occupancyDevices = data.filter(device => 
        device.device_type === "occupancy-1" || device.device_type === "occupancy-sensors"
      );
      
      // Transform to an object with device_id as keys for easier lookup
      const transformedData = {};
      occupancyDevices.forEach(device => {
        transformedData[device.device_id] = {
          timestamp: device.last_data_read || new Date().toISOString(),
          status: device.status || "active",
          location: device.location || "",
          area: device.area || "",
          battery: 100, // POE powered
          isPoweredByPOE: true
        };
      });
      
      return transformedData;
    } catch (err) {
      console.error("Error fetching Occupancy data:", err);
      return {};
    }
  };

  // Update device data
  const updateDevice = async (deviceId, updatedData) => {
    try {
      const response = await fetch(`${BASE_URL}/devices/${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_type: updatedData.type,
          location: updatedData.location,
          area: updatedData.area,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Refetch devices to get updated data
      fetchDevices();

      return true;
    } catch (err) {
      console.error("Error updating device:", err);
      return false;
    }
  };

  // Update idle threshold
  const updateIdleThreshold = async (days) => {
    try {
      const response = await fetch(`${BASE_URL}/edit-threshold`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thresholdDays: days,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return true;
    } catch (err) {
      console.error("Error updating idle threshold:", err);
      return false;
    }
  };

  // Load devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Handle idle threshold change
  const handleThresholdChange = async (newThreshold) => {
    const success = await updateIdleThreshold(Number(newThreshold));

    if (success) {
      setIdleThreshold(Number(newThreshold));
    } else {
      // Revert to previous value if API call fails
      alert("Failed to update idle threshold. Please try again.");
    }
  };

  const handleEdit = (device) => {
    setEditingDevice({ ...device });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    const success = await updateDevice(editingDevice.id, editingDevice);

    if (success) {
      setIsEditModalOpen(false);
    } else {
      alert("Failed to update device. Please try again.");
    }
  };

  // Function to check if a device is idle based on lastActive date
  const isIdle = (lastActiveDate) => {
    if (!lastActiveDate) return false; // For N/A cases

    const today = new Date();
    const diffTime = Math.abs(today - lastActiveDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > idleThreshold;
  };

  // Helper function to get the appropriate battery icon
  const getBatteryIcon = (batteryLevel) => {
    if (batteryLevel > 70) {
      return <BatteryFull className="text-green-500 w-5 h-5" />;
    } else if (batteryLevel >= 40) {
      return <BatteryMedium className="text-yellow-500 w-5 h-5" />;
    } else {
      return <BatteryLow className="text-red-500 w-5 h-5" />;
    }
  };

  // Search devices by ID or type - Fixed to handle null/undefined values
  const filteredDevices = devices.filter((device) => {
    if (!searchTerm) return true;

    const lowercaseSearch = searchTerm.toLowerCase();
    const deviceId = (device.id || "").toLowerCase();
    const deviceType = (device.type || "").toLowerCase();
    const deviceLocation = (device.location || "").toLowerCase();
    const deviceArea = (device.area || "").toLowerCase();

    return (
      deviceId.includes(lowercaseSearch) ||
      deviceType.includes(lowercaseSearch) ||
      deviceLocation.includes(lowercaseSearch) ||
      deviceArea.includes(lowercaseSearch)
    );
  });

  // Get unique device categories from filtered devices
  const deviceCategories = [
    ...new Set(filteredDevices.map((device) => device.category)),
  ];

  // Device count by category for filtered devices
  const getCategoryCount = (category) => {
    return filteredDevices.filter((device) => device.category === category)
      .length;
  };

  // Toggle device details
  const toggleDeviceDetails = (deviceId) => {
    if (expandedDevice === deviceId) {
      setExpandedDevice(null);
    } else {
      setExpandedDevice(deviceId);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Set active tab to the first category with results when searching
    if (e.target.value) {
      const filtered = devices.filter((device) => {
        const lowercaseSearch = e.target.value.toLowerCase();
        const deviceId = (device.id || "").toLowerCase();
        const deviceType = (device.type || "").toLowerCase();

        return (
          deviceId.includes(lowercaseSearch) ||
          deviceType.includes(lowercaseSearch)
        );
      });

      const categories = [
        ...new Set(filtered.map((device) => device.category)),
      ];
      if (categories.length > 0) {
        setActiveTab(categories[0]);
      }
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="p-6 md:mt-16 md:mx-5 lg:mt-24 lg:mx-6 mt-12 mx-2">
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

      <div className="flex justify-between items-center md:mb-6 mb-4">
        <h1 className="md:text-2xl text-xl font-bold">Devices</h1>

        {/* Idle threshold dropdown */}
        <div className="flex items-center space-x-2">
          <label
            htmlFor="idleThreshold"
            className="text-gray-600 font-medium text-sm md:text-lg"
          >
            Idle Threshold:
          </label>
          <select
            id="idleThreshold"
            value={idleThreshold}
            onChange={(e) => handleThresholdChange(e.target.value)}
            className="sm:p-2 p-1 border rounded-md md:text-sm text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 day</option>
            <option value="2">2 days</option>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="flex items-center border rounded-md bg-white shadow-sm">
          <div className="px-3 py-3">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search by device ID or Type or Location or Area"
            value={searchTerm}
            onChange={handleSearchChange}
            className="flex-1 p-2 outline-none"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && <div className="text-center py-8">Loading devices...</div>}
      {error && <div className="text-center py-8 text-red-500">{error}</div>}

      {/* No Results Message */}
      {!loading && !error && filteredDevices.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          No devices found matching "{searchTerm}"
        </div>
      )}

      {/* Category Tabs */}
      {!loading && !error && filteredDevices.length > 0 && (
        <div className="mb-6 space-y-4">
          {deviceCategories.map((category) => (
            <div
              key={category}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() =>
                  setActiveTab(activeTab === category ? null : category)
                }
              >
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full p-3 mr-4">
                    {category === "IAQ Sensors" && (
                      <span className="text-xl">
                        <img
                          width="20"
                          height="20"
                          src="https://img.icons8.com/fluency-systems-regular/50/air-quality.png"
                          alt="air-quality"
                        />
                      </span>
                    )}
                    {category === "Water Leakage Sensors" && (
                      <span className="text-xl">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2C12 2 6 10 6 14a6 6 0 0012 0c0-4-6-12-6-12z" />
                        </svg>
                      </span>
                    )}
                    {category === "MDR Sensors" && (
                      <span className="text-xl">
                        <img
                          width="20"
                          height="20"
                          src="https://img.icons8.com/ios-filled/50/logout-rounded.png"
                          alt="logout-rounded"
                        />
                      </span>
                    )}
                    {category === "Footfall Sensors" && (
                      <span className="text-xl">
                        <img
                          width="20"
                          height="20"
                          src="https://img.icons8.com/ios/50/walking.png"
                          alt="footfall-sensor"
                        />
                      </span>
                    )}
                    {category === "Occupancy Sensors" && (
                      <span className="text-xl">
                        <img
                          width="20"
                          height="20"
                          src="https://img.icons8.com/plumpy/24/sensor.png"
                          alt="sensor"
                        />
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{category}</h2>
                    <p className="text-sm text-gray-500">
                      {getCategoryCount(category)} devices
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <ChevronRight
                    className={`w-6 h-6 transform transition-transform ${
                      activeTab === category ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Devices List only shown when tab is active */}
              {activeTab === category && (
                <div className="border-t">
                  {filteredDevices
                    .filter((device) => device.category === category)
                    .sort((a, b) => {
                      // Special sorting for Occupancy Sensors category
                      if (category === "Occupancy Sensors") {
                        // First sort by idle status (idle devices first)
                        const aIsIdle = isIdle(a.lastActive);
                        const bIsIdle = isIdle(b.lastActive);

                        if (aIsIdle && !bIsIdle) return -1;
                        if (!aIsIdle && bIsIdle) return 1;

                        // Then sort by device ID
                        return compareDevices(a, b);
                      }

                      // Default sorting for other categories
                      return compareDevices(a, b);
                    })
                    .map((device) => (
                      <div key={device.id} className="border-b last:border-b-0">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleDeviceDetails(device.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              {isIdle(device.lastActive) ? (
                                <XCircle className="text-gray-500 w-5 h-5" />
                              ) : (
                                <CheckCircle className="text-green-500 w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium sm:text-lg text-sm">
                                {device.id}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {device.location}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-8">
                            <div className="flex items-center">
                              {device.isPoweredByPOE ? (
                                <>
                                  <img width="16" height="16" src="https://img.icons8.com/forma-light/24/electrical.png" alt="electrical"/>
                                  <span className="ml-1 text-sm">POE</span>
                                </>
                              ) : (
                                <>
                                  {getBatteryIcon(device.battery)}
                                  <span className="ml-1 text-sm">
                                    {device.battery}%
                                  </span>
                                </>
                              )}
                            </div>
                            <ChevronRight
                              className={`w-5 h-5 transform transition-transform ${
                                expandedDevice === device.id ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expanded Device Details */}
                        {expandedDevice === device.id && (
                          <div className="p-4 bg-gray-50 border-t">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Device Type
                                </p>
                                <p>{device.type}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <p>
                                  {device.lastUpdated === "N/A"
                                    ? "Unknown"
                                    : isIdle(device.lastActive)
                                    ? "Idle"
                                    : "Active"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">
                                  Location
                                </p>
                                <p>{device.location}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Area</p>
                                <p>{device.area}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Power</p>
                                <div className="flex items-center">
                                  {device.isPoweredByPOE ? (
                                    <>
                                      <img width="16" height="16" src="https://img.icons8.com/forma-light/24/electrical.png" alt="electrical"/>
                                      <span className="ml-1">POE powered</span>
                                    </>
                                  ) : (
                                    <>
                                      {getBatteryIcon(device.battery)}
                                      <span className="ml-1">
                                        {device.battery}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">
                                  Last Updated
                                </p>
                                <p>{device.lastUpdated}</p>
                              </div>

                              {/* Show sensor-specific data if available */}
                              {device.sensorData &&
                                device.category === "IAQ Sensors" && (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Temperature
                                      </p>
                                      <p>{device.sensorData.temperature}°C</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Humidity
                                      </p>
                                      <p>{device.sensorData.humidity}%</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        CO2
                                      </p>
                                      <p>{device.sensorData.co2} ppm</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        PM2.5
                                      </p>
                                      <p>{device.sensorData.pm2_5} μg/m³</p>
                                    </div>
                                  </>
                                )}

                              {device.sensorData &&
                                device.category === "Water Leakage Sensors" &&
                                device.lastUpdated !== "N/A" && (
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Leakage Status
                                    </p>
                                    <p
                                      className={
                                        device.sensorData.leakage_status ===
                                        "normal"
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }
                                    >
                                      {device.sensorData.leakage_status ===
                                      "normal"
                                        ? "Normal"
                                        : "Leakage Detected"}
                                    </p>
                                  </div>
                                )}

                              {device.sensorData &&
                                device.category === "MDR Sensors" && (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Magnet Status
                                      </p>
                                      <p
                                        className={
                                          device.sensorData.magnet_status ===
                                          "close"
                                            ? "text-green-500"
                                            : "text-red-500"
                                        }
                                      >
                                        {device.sensorData.magnet_status ===
                                        "close"
                                          ? "Closed"
                                          : "Open"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Tamper Status
                                      </p>
                                      <p
                                        className={
                                          device.sensorData.tamper_status ===
                                          "installed"
                                            ? "text-green-500"
                                            : "text-red-500"
                                        }
                                      >
                                        {device.sensorData.tamper_status ===
                                        "installed"
                                          ? "Installed"
                                          : "Tampered"}
                                      </p>
                                    </div>
                                  </>
                                )}
                                
                              {device.sensorData &&
                                device.category === "Footfall Sensors" && (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Current Capacity
                                      </p>
                                      <p>{device.sensorData.count || 0} people</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Max Capacity
                                      </p>
                                      <p>{device.sensorData.maxCapacity || 0} people</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Zone
                                      </p>
                                      <p>{device.sensorData.zone || 'N/A'} ({device.sensorData.newZone || 'N/A'})</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Floor
                                      </p>
                                      <p>{device.sensorData.floor || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Status
                                      </p>
                                      <p className={
                                        device.sensorData.status === "normal"
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }>
                                        {device.sensorData.status === "normal" ? "Normal" : "Overcrowded"}
                                      </p>
                                    </div>
                                  </>
                                )}
                                
                              {device.sensorData &&
                                device.category === "Occupancy Sensors" && (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Device Status
                                      </p>
                                      <p className={
                                        device.sensorData.status === "active"
                                          ? "text-green-500"
                                          : "text-yellow-500"
                                      }>
                                        {device.sensorData.status === "active" ? "Active" : device.sensorData.status}
                                      </p>
                                    </div>
                                    {device.sensorData.location && (
                                      <div>
                                        <p className="text-sm text-gray-500">
                                          Location Details
                                        </p>
                                        <p>{device.sensorData.location}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Power Source
                                      </p>
                                      <p>POE (Power Over Ethernet)</p>
                                    </div>
                                  </>
                                )}
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(device);
                                }}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Device</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID
                </label>
                <input
                  type="text"
                  value={editingDevice.id}
                  readOnly
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type
                </label>
                <input
                  type="text"
                  value={editingDevice.type}
                  onChange={(e) =>
                    setEditingDevice({
                      ...editingDevice,
                      type: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editingDevice.location}
                  onChange={(e) =>
                    setEditingDevice({
                      ...editingDevice,
                      location: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <input
                  type="text"
                  value={editingDevice.area}
                  onChange={(e) =>
                    setEditingDevice({
                      ...editingDevice,
                      area: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;