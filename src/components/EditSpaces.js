import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import axios from "axios";

const EditSpaces = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth0();
  const [floorZoneData, setFloorZoneData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingZone, setEditingZone] = useState(null);
  const [newCapacity, setNewCapacity] = useState("");
  const [newFunctionalCapacity, setNewFunctionalCapacity] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [buildingName, setBuildingName] = useState("LNU"); // Default value until data is fetched
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");

  // Fetch device data on component mount
  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true);
        // Use the actual endpoint
        const response = await axios.get(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices"
        );
        setFloorZoneData(response.data);
        
        // Extract building name from the response
        // Find an item with new_building field
        const buildingInfo = response.data.find(item => item.new_building);
        if (buildingInfo && buildingInfo.new_building) {
          setBuildingName(buildingInfo.new_building);
        } else if (response.data.length > 0 && response.data[0].building) {
          // Fallback to building field if new_building doesn't exist
          setBuildingName(response.data[0].building);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching device data:", err);
        setError("Failed to fetch device data");
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, []);

  const handleSaveBuilding = async () => {
    try {
      const response = await axios.put(
        'https://njs-01.optimuslab.space/lnu-footfall/floor-zone/building', 
        {
          new_building: newBuildingName
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Building update response:', response);
      
      setBuildingName(newBuildingName);
      setIsEditingBuilding(false);
      setSuccessMessage('Successfully updated building name');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh device cache
      await axios.post('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/refresh-devices');
      
      // Optionally reload the data to ensure UI is in sync with server
      const response2 = await axios.get('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices');
      setFloorZoneData(response2.data);
    } catch (err) {
      console.error('Error updating building name:', err);
      setError(`Failed to update building name: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Group devices by floor and zone for display
  const getFloorZones = () => {
    // First, create a map of floor IDs to their zones
    const floorZonesMap = {};

    floorZoneData.forEach((device) => {
      const {
        floor_id,
        zone_name,
        max_capacity,
        functional_capacity,
        new_zone_name,
      } = device;

      // Skip devices with no floor_id or zone_name, or if zone_name is "relocated"
      if (!floor_id || !zone_name || zone_name.toLowerCase() === "relocated")
        return;

       // Skip Zone B in MF floor
    if (floor_id === "MF" && new_zone_name.toLowerCase() === "zone b" || zone_name.toLowerCase() === "Central-Zone") return;

      // Initialize floor if not exists
      if (!floorZonesMap[floor_id]) {
        floorZonesMap[floor_id] = {
          id: floor_id,
          name: floor_id, // Using floor_id as name
          zones: {},
        };
      }

      // Use lowercase zone_name as key for case-insensitive grouping
      const zoneKey = zone_name.toLowerCase();

      // Initialize zone if not exists
      if (!floorZonesMap[floor_id].zones[zoneKey]) {
        floorZonesMap[floor_id].zones[zoneKey] = {
          name: zone_name, // Keep original case
          display_name: new_zone_name || zone_name, // Use new_zone_name if available, otherwise use zone_name
          max_capacity: max_capacity,
          functional_capacity: functional_capacity,
        };
      }
    });

    // Convert to array format suitable for rendering
    const floors = Object.values(floorZonesMap).map((floor) => {
      return {
        ...floor,
        zones: Object.values(floor.zones),
      };
    });

    // Sort floors by their ID
    return floors.sort((a, b) => {
      // Special case for "1F" and "MF" - always put "MF" after "1F"
      if (a.id === "1F" && b.id === "MF") {
        return -1; // "1F" comes before "MF"
      } else if (a.id === "MF" && b.id === "1F") {
        return 1; // "MF" comes after "1F"
      } else if (a.id === "MF") {
        // "MF" comes after "1F" but before any other floors
        return b.id === "1F" ? 1 : -1;
      } else if (b.id === "MF") {
        // Any other floor except "1F" comes after "MF"
        return a.id === "1F" ? -1 : 1;
      }

      // For other floors, maintain the original numeric sorting
      const aNum = parseInt(a.id);
      const bNum = parseInt(b.id);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      } else if (!isNaN(aNum)) {
        return -1; // Numbers come before non-numbers
      } else if (!isNaN(bNum)) {
        return 1; // Numbers come before non-numbers
      } else {
        // Both are non-numeric, sort alphabetically
        return a.id.localeCompare(b.id);
      }
    });
  };

  const handleEdit = (
    floorId,
    zoneName,
    absoluteCapacity,
    functionalCapacity,
    displayName
  ) => {
    // Store the exact zone name as it appears in the API response
    // to preserve case sensitivity when making API calls
    setEditingZone({ floorId, zoneName });
    setNewCapacity(absoluteCapacity.toString());
    setNewFunctionalCapacity(functionalCapacity.toString());
    setNewZoneName(displayName);
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    setNewCapacity("");
    setNewFunctionalCapacity("");
    setNewZoneName("");
  };

  const handleSave = async () => {
    if (!editingZone) return;

    try {
      const { floorId, zoneName } = editingZone;

      // Validate capacity inputs
      const absoluteCapacity = parseInt(newCapacity, 10);
      const functionalCapacity = parseInt(newFunctionalCapacity, 10);

      if (isNaN(absoluteCapacity) || absoluteCapacity < 1) {
        setError("Absolute capacity must be a positive number");
        return;
      }

      if (isNaN(functionalCapacity) || functionalCapacity < 1) {
        setError("Functional capacity must be a positive number");
        return;
      }

      if (!newZoneName.trim()) {
        setError("Zone name cannot be empty");
        return;
      }

      // Track what changes were made
      const changes = [];

      // Update absolute capacity if changed
      const originalZone = floorZoneData.find(
        (device) =>
          device.floor_id === floorId &&
          device.zone_name.toLowerCase() === zoneName.toLowerCase()
      );

      if (originalZone.max_capacity !== absoluteCapacity) {
        await axios.put(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/capacity",
          {
            floor_id: floorId,
            zone_name: zoneName,
            max_capacity: absoluteCapacity,
          }
        );
        changes.push("absolute capacity");
      }

      // Update functional capacity if changed
      if (originalZone.functional_capacity !== functionalCapacity) {
        await axios.put(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/functional-capacity",
          {
            floor_id: floorId,
            zone_name: zoneName,
            functional_capacity: functionalCapacity,
          }
        );
        changes.push("functional capacity");
      }

      // Update zone name if changed
      const originalName = originalZone.new_zone_name || originalZone.zone_name;
      if (originalName !== newZoneName) {
        await axios.put(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/zone-name",
          {
            floor_id: floorId,
            zone_name: zoneName,
            new_zone_name: newZoneName,
          }
        );
        changes.push("zone name");
      }

      // Refresh device cache
      await axios.post(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/refresh-devices"
      );

      // Update local state
      setFloorZoneData((prevData) =>
        prevData.map((device) => {
          if (
            device.floor_id === floorId &&
            device.zone_name.toLowerCase() === zoneName.toLowerCase()
          ) {
            return {
              ...device,
              max_capacity: absoluteCapacity,
              functional_capacity: functionalCapacity,
              new_zone_name: newZoneName,
            };
          }
          return device;
        })
      );

      // Create success message based on what changed
      let message = "Successfully updated ";
      if (changes.length === 0) {
        message = "No changes made to zone";
      } else if (changes.length === 1) {
        message += `${changes[0]}`;
      } else if (changes.length === 2) {
        message += `${changes[0]} and ${changes[1]}`;
      } else {
        message += `${changes[0]}, ${changes[1]}, and ${changes[2]}`;
      }

      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Reset editing state
      setEditingZone(null);
      setNewCapacity("");
      setNewFunctionalCapacity("");
      setNewZoneName("");
    } catch (err) {
      console.error("Error updating zone:", err);
      setError(`Failed to update zone: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Get organized floor and zone data for rendering
  const floors = getFloorZones();

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <main className="pt-28 xl:pt-32 px-4 md:px-8 pb-10">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Edit Space Capacities
            </h1>
          </div>

          {/* Notification Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Building Name Edit Section - Add this above the floors listing */}
              <div className="mb-8 bg-white border border-[#E2E2E4] custom-shadow rounded-lg overflow-hidden">
                <h2 className="px-6 py-4 bg-gray-50 text-xl font-medium text-gray-800">
                  Building Information
                </h2>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 mr-3">
                      Building Name:
                    </span>
                    {isEditingBuilding ? (
                      <input
                        type="text"
                        value={newBuildingName}
                        onChange={(e) => setNewBuildingName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-gray-900">{buildingName}</span>
                    )}
                  </div>
                  <div>
                    {isEditingBuilding ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveBuilding}
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-600 rounded-md hover:bg-green-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingBuilding(false)}
                          className="text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-500 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditingBuilding(true);
                          setNewBuildingName(buildingName);
                        }}
                        className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50"
                      >
                        Edit Building
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Floors and Zones List */}
              {floors.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white custom-shadow rounded-lg">
                  No floors or zones found.
                </div>
              ) : (
                <div className="space-y-12">
                  {floors.map((floor) => (
                    <div
                      key={floor.id}
                      className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg overflow-hidden"
                    >
                      <h1 className="px-6 py-4 bg-gray-50 text-xl font-medium text-gray-800">
                        Floor {floor.name}
                      </h1>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                Zone Name
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                Absolute Capacity
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                Functional Capacity
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-sm font-medium text-gray-600"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {floor.zones.map((zone) => (
                              <tr key={zone.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-[16px] font-medium text-gray-900">
                                  {editingZone &&
                                  editingZone.floorId === floor.id &&
                                  editingZone.zoneName.toLowerCase() ===
                                    zone.name.toLowerCase() ? (
                                    <input
                                      type="text"
                                      value={newZoneName}
                                      onChange={(e) =>
                                        setNewZoneName(e.target.value)
                                      }
                                      className="w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <span>{zone.display_name}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[16px] text-gray-600">
                                  {editingZone &&
                                  editingZone.floorId === floor.id &&
                                  editingZone.zoneName.toLowerCase() ===
                                    zone.name.toLowerCase() ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={newCapacity}
                                      onChange={(e) =>
                                        setNewCapacity(e.target.value)
                                      }
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <span>{zone.max_capacity}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[16px] text-gray-600">
                                  {editingZone &&
                                  editingZone.floorId === floor.id &&
                                  editingZone.zoneName.toLowerCase() ===
                                    zone.name.toLowerCase() ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={newFunctionalCapacity}
                                      onChange={(e) =>
                                        setNewFunctionalCapacity(e.target.value)
                                      }
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <span>{zone.functional_capacity}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {editingZone &&
                                  editingZone.floorId === floor.id &&
                                  editingZone.zoneName.toLowerCase() ===
                                    zone.name.toLowerCase() ? (
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={handleSave}
                                        className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-600 rounded-md hover:bg-green-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-500 rounded-md hover:bg-gray-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleEdit(
                                          floor.id,
                                          zone.name,
                                          zone.max_capacity,
                                          zone.functional_capacity,
                                          zone.display_name
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditSpaces;