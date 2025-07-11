import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import axios from "axios";
import Header from "./Header";

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
  const [newFirstThreshold, setNewFirstThreshold] = useState("");
  const [newSecondThreshold, setNewSecondThreshold] = useState("");

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
        const buildingInfo = response.data.find((item) => item.new_building);
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
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/building",
        {
          new_building: newBuildingName,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Building update response:", response);

      setBuildingName(newBuildingName);
      setIsEditingBuilding(false);
      setSuccessMessage("Successfully updated building name");
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh device cache
      await axios.post(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/refresh-devices"
      );

      // Optionally reload the data to ensure UI is in sync with server
      const response2 = await axios.get(
        "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices"
      );
      setFloorZoneData(response2.data);
    } catch (err) {
      console.error("Error updating building name:", err);
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
      if (
        (floor_id === "MF" && new_zone_name.toLowerCase() === "zone b") ||
        zone_name.toLowerCase() === "Central-Zone"
      )
        return;

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
          first_threshold: device.first_threshold || 25,
          second_threshold: device.second_threshold || 70,
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
    displayName,
    firstThreshold,
    secondThreshold
  ) => {
    setEditingZone({ floorId, zoneName });
    setNewCapacity(absoluteCapacity.toString());
    setNewFunctionalCapacity(functionalCapacity.toString());
    setNewZoneName(displayName);
    setNewFirstThreshold(firstThreshold.toString());
    setNewSecondThreshold(secondThreshold.toString());
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    setNewCapacity("");
    setNewFunctionalCapacity("");
    setNewZoneName("");
    setNewFirstThreshold("");
    setNewSecondThreshold("");
  };

  const handleSave = async () => {
    if (!editingZone) return;

    try {
      const { floorId, zoneName } = editingZone;

      // Validate capacity inputs
      const absoluteCapacity = parseInt(newCapacity, 10);
      const functionalCapacity = parseInt(newFunctionalCapacity, 10);
      const firstThreshold = parseInt(newFirstThreshold, 10);
      const secondThreshold = parseInt(newSecondThreshold, 10);

      if (isNaN(absoluteCapacity) || absoluteCapacity < 1) {
        setError("絶対収容人数は正の数である必要があります。");
        return;
      }

      if (isNaN(functionalCapacity) || functionalCapacity < 1) {
        setError("機能的収容人数は正の数である必要があります。");
        return;
      }

      if (!newZoneName.trim()) {
        setError("ゾーン名を空欄にすることはできません。");
        return;
      }

      // Validate thresholds
      if (isNaN(firstThreshold)) {
        setError("中程度のしきい値は数値である必要があります。");
        return;
      }

      if (isNaN(secondThreshold)) {
        setError("高レベルのしきい値は数値である必要があります。");
        return;
      }

      if (firstThreshold >= secondThreshold) {
        setError(
          "中程度のしきい値（アンバー）は高レベルのしきい値（レッド）より小さくなければなりません。"
        );
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

      // Update first threshold if changed
      if (originalZone.first_threshold !== firstThreshold) {
        await axios.put(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/first-threshold",
          {
            floor_id: floorId,
            zone_name: zoneName,
            first_threshold: firstThreshold,
          }
        );
        changes.push("moderate threshold");
      }

      // Update second threshold if changed
      if (originalZone.second_threshold !== secondThreshold) {
        await axios.put(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/second-threshold",
          {
            floor_id: floorId,
            zone_name: zoneName,
            second_threshold: secondThreshold,
          }
        );
        changes.push("high threshold");
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
              first_threshold: firstThreshold,
              second_threshold: secondThreshold,
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
        message +=
          changes.slice(0, -1).join(", ") +
          ", and " +
          changes[changes.length - 1];
      }

      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Reset editing state
      setEditingZone(null);
      setNewCapacity("");
      setNewFunctionalCapacity("");
      setNewZoneName("");
      setNewFirstThreshold("");
      setNewSecondThreshold("");
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
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}  
        showLiveCount={true}    
      />

      {/* Main Content */}
      <main className="pt-28 xl:pt-32 px-4 md:px-8 pb-10">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
            スペース容量の編集​
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
                建物情報​
                </h2>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 mr-3">
                    建物名:
                    </span>
                    {isEditingBuilding ? (
                      <input
                        type="text"
                        value={newBuildingName}
                        onChange={(e) => setNewBuildingName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-gray-900">Optimus</span>
                    )}
                  </div>
                  <div>
                    {isEditingBuilding ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveBuilding}
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-600 rounded-md hover:bg-green-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setIsEditingBuilding(false)}
                          className="text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-500 rounded-md hover:bg-gray-50"
                        >
                          キャンセル
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
                        建物の編集​
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Floors and Zones List */}
              {floors.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white custom-shadow rounded-lg">
                 フロアまたはゾーンが見つかりません。
                </div>
              ) : (
                <div className="space-y-12">
                  {floors.map((floor) => (
                    <div
                      key={floor.id}
                      className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg overflow-hidden"
                    >
                      <h1 className="px-6 py-4 bg-gray-50 text-xl font-medium text-gray-800">
                      床 {floor.name}
                      </h1>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                ゾーン名​
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                管理者ビューの容量​
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                パブリックビュー容量​
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                適度なスリーホールド​ % 
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-sm font-medium text-gray-600"
                              >
                                高いスレホールド​ %
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-sm font-medium text-gray-600"
                              >
                                アクション​
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
                               {/* Moderate Threshold (Amber) */}
<td className="px-6 py-4 whitespace-nowrap text-[16px] text-gray-600">
  {editingZone &&
  editingZone.floorId === floor.id &&
  editingZone.zoneName.toLowerCase() ===
    zone.name.toLowerCase() ? (
    <input
      type="number"
      value={newFirstThreshold}
      onChange={(e) =>
        setNewFirstThreshold(e.target.value)
      }
      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    />
  ) : (
    <span>{">= "}{zone.first_threshold || 25}{"%"}</span>
  )}
</td>
{/* High Threshold (Red) */}
<td className="px-6 py-4 whitespace-nowrap text-[16px] text-gray-600">
  {editingZone &&
  editingZone.floorId === floor.id &&
  editingZone.zoneName.toLowerCase() ===
    zone.name.toLowerCase() ? (
    <input
      type="number"
      value={newSecondThreshold}
      onChange={(e) =>
        setNewSecondThreshold(e.target.value)
      }
      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    />
  ) : (
    <span>{">= "}{zone.second_threshold || 70}{"%"}</span>
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
                                       保存
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-500 rounded-md hover:bg-gray-50"
                                      >
                                        キャンセル 
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
                                          zone.display_name,
                                          zone.first_threshold || 25,
                                          zone.second_threshold || 70
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50"
                                    >
                                      編集 
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Add this after the table */}
                        <div className="px-6 py-3 text-sm text-gray-600 italic">
                          注: 低スレホールドは、占有率が中程度のスレホールド値を下回ると自動的に設定されます​
                        </div>
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
