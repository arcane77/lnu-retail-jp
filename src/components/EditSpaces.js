import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from './Sidebar';
import axios from 'axios';

const EditSpaces = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth0();
  const [floorZoneData, setFloorZoneData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingZone, setEditingZone] = useState(null);
  const [newCapacity, setNewCapacity] = useState('');

  // Fetch device data on component mount
  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true);
        // Use the actual endpoint
        const response = await axios.get('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/devices');
        setFloorZoneData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching device data:', err);
        setError('Failed to fetch device data');
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, []);

  // Group devices by floor and zone for display
  const getFloorZones = () => {
    // First, create a map of floor IDs to their zones
    const floorZonesMap = {};
    
    floorZoneData.forEach(device => {
      const { floor_id, zone_name, max_capacity } = device;
      
      // Skip devices with no floor_id or zone_name, or if zone_name is "relocated"
      if (!floor_id || !zone_name || zone_name.toLowerCase() === "relocated") return;
      
      // Initialize floor if not exists
      if (!floorZonesMap[floor_id]) {
        floorZonesMap[floor_id] = {
          id: floor_id,
          name: floor_id, // Using floor_id as name
          zones: {}
        };
      }
      
      // Use lowercase zone_name as key for case-insensitive grouping
      const zoneKey = zone_name.toLowerCase();
      
      // Initialize zone if not exists
      if (!floorZonesMap[floor_id].zones[zoneKey]) {
        floorZonesMap[floor_id].zones[zoneKey] = {
          name: zone_name, // Keep original case
          max_capacity: max_capacity
        };
      }
    });
    
    // Convert to array format suitable for rendering
    const floors = Object.values(floorZonesMap).map(floor => {
      return {
        ...floor,
        zones: Object.values(floor.zones)
      };
    });
    
    // Sort floors by their ID
    return floors.sort((a, b) => {
      // Custom sorting logic for floor IDs like "1F", "MF", "2F"
      // First, check if it starts with a number
      const aNum = parseInt(a.id);
      const bNum = parseInt(b.id);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      } else if (!isNaN(aNum)) {
        return -1; // Numbers come before non-numbers
      } else if (!isNaN(bNum)) {
        return 1;  // Numbers come before non-numbers
      } else {
        // Both are non-numeric, sort alphabetically
        return a.id.localeCompare(b.id);
      }
    });
  };

  const handleEditCapacity = (floorId, zoneName, currentCapacity) => {
    // Store the exact zone name as it appears in the API response
    // to preserve case sensitivity when making API calls
    setEditingZone({ floorId, zoneName });
    setNewCapacity(currentCapacity.toString());
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    setNewCapacity('');
  };

  const handleSaveCapacity = async () => {
    if (!editingZone) return;
    
    try {
      const { floorId, zoneName } = editingZone;
      
      // Validate input
      const capacity = parseInt(newCapacity, 10);
      if (isNaN(capacity) || capacity < 1) {
        setError('Capacity must be a positive number');
        return;
      }
      
      // Update zone capacity - using the exact zone_name as provided by the API
      await axios.put('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/capacity', {
        floor_id: floorId,
        zone_name: zoneName,
        max_capacity: capacity
      });
      
      // Refresh device cache
      await axios.post('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/refresh-devices');
      
      // Update local state
      setFloorZoneData(prevData => 
        prevData.map(device => {
          if (device.floor_id === floorId && 
              device.zone_name.toLowerCase() === zoneName.toLowerCase()) {
            return { ...device, max_capacity: capacity };
          }
          return device;
        })
      );
      
      setSuccessMessage(`Successfully updated ${zoneName} capacity to ${capacity}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reset editing state
      setEditingZone(null);
      setNewCapacity('');
    } catch (err) {
      console.error('Error updating capacity:', err);
      setError(`Failed to update capacity: ${err.message}`);
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
      <header className='bg-[#ffffff] custom-shadow h-14 lg:h-20 xl:h-[100px] fixed top-0 left-0 w-full z-10 flex items-center justify-between'>
        <div className='flex items-center h-full'>
          <button
            className={`flex flex-col justify-center items-start space-y-1 pl-8 ${isSidebarOpen ? 'hidden' : ''}`}
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
          className='h-6 sm:h-10 lg:h-12 xl:h-14 mx-auto'
        />
      </header>

      {/* Main Content */}
      <main className="pt-28 xl:pt-32 px-4 md:px-8 pb-10">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Edit Space Capacities</h1>
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
              {/* Floors and Zones List */}
              {floors.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-white custom-shadow rounded-lg">
                  No floors or zones found.
                </div>
              ) : (
                <div className="space-y-12">
                  {floors.map((floor) => (
                    <div key={floor.id} className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg overflow-hidden">
                      <h1 className="px-6 py-4 bg-gray-50 text-xl font-medium text-gray-800">
                        Floor {floor.name}
                      </h1>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-600 ">
                                Zone Name
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-600 ">
                                Current Capacity
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-sm font-medium text-gray-600 ">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {floor.zones.map((zone) => (
                              <tr key={zone.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-[16px] font-medium text-gray-900">
                                  {zone.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[16px] text-gray-600">
                                  {editingZone && 
                                   editingZone.floorId === floor.id && 
                                   editingZone.zoneName.toLowerCase() === zone.name.toLowerCase() ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={newCapacity}
                                      onChange={(e) => setNewCapacity(e.target.value)}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  ) : (
                                    <span>{zone.max_capacity}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {editingZone && 
                                   editingZone.floorId === floor.id && 
                                   editingZone.zoneName.toLowerCase() === zone.name.toLowerCase() ? (
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={handleSaveCapacity}
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
                                      onClick={() => handleEditCapacity(floor.id, zone.name, zone.max_capacity)}
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