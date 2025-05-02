import * as React from "react";
import { FC, useEffect, useState } from "react";

// Define the room object interface
interface Room {
  id: string;
  name: string;
  levelIndex: number;
  coordinates: {
    x: number;
    z: number;
    levelIndex: number;
  }[][];
  layerType: string;
  mapped: boolean;
  available?: string;
  color?: string;
}

// Define proper type for COLOR_DICT
type RoomStatus =  'busy' | 'available'| 'unavailable';

const COLOR_DICT: Record<RoomStatus, string> = {
  busy: "#ff3f34",
  available: "#3aa655",
  unavailable: "#3e3636"        // Gray for unavailable
};

// Room mapping between Humly room identifiers and Smplrspace room names
const ROOM_MAPPING: Record<string, string> = {
    "FGrBp3tp66Luiammy": "Rm101",
    "TtW53s6G3M6Y2pNWv": "Rm102",
    "GuoH46Lck8NXAE78H": "Rm103",
    "n4oGhxpfPkQMApSf3": "Rm104",
    "SPYoCtcdLuhLSJrPm": "Rm105",
    "g2PfczLQsijxnBLMx": "Rm10A",
    "PWCWrwZiJXoSBcH6D": "Rm10B",
    "xuvpzbH8Mepq7K6xT": "Rm10C",
  };

// Humly API configuration
const HUMLY_API_URL = "https://52645.humly.cloud/api/v1";
const USERNAME = "defaultDevIntegrationUser";
const PASSWORD = "0U0TkG-Vqoz0yvG4oVQa8zp9u-xkBvPv88QBd8BpLDR";

// Update frequency in seconds
const UPDATE_FREQUENCY = 60;

const SmplrspaceViewer: FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [space, setSpace] = useState<any>(null);
  const [authData, setAuthData] = useState<{authToken: string, userId: string} | null>(null);

  // Original room data
  const originalRoomData = [
    {
      "id": "8e9f2c58-5494-48d6-9662-98d28344fb87",
      "name": "meeting room",
      "type": "polygon",
      "assets": [
        {
          "id": "9a023a02-ec92-4690-846d-fd14fb73bec2",
          "name": "Rm105",
          "levelIndex": 0,
          "coordinates": [
            { "x": 4.047169684782094, "z": -1.3251030958496917, "levelIndex": 0 },
            { "x": 4.039993738604527, "z": -2.657488242219085, "levelIndex": 0 },
            { "x": 4.393847102929924, "z": -3.040109807093985, "levelIndex": 0 },
            { "x": 6.543322777392541, "z": -3.03155878530571, "levelIndex": 0 },
            { "x": 6.491993109894075, "z": -1.867673694642856, "levelIndex": 0 },
            { "x": 6.749558215302907, "z": -1.8254726308550624, "levelIndex": 0 },
            { "x": 6.774032417941953, "z": -1.3151024244375897, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "04c6f732-ad84-42bb-823e-dafc1132d5a3",
          "name": "Rm104",
          "levelIndex": 0,
          "coordinates": [
            { "x": 3.0124738571506517, "z": -5.416834734232489, "levelIndex": 0 },
            { "x": 5.026607087713482, "z": -5.4177520281200815, "levelIndex": 0 },
            { "x": 5.046456231632243, "z": -3.0370518665489135, "levelIndex": 0 },
            { "x": 4.3663909104091, "z": -3.124612986247639, "levelIndex": 0 },
            { "x": 3.9912116535020203, "z": -2.819673763300051, "levelIndex": 0 },
            { "x": 2.9691858405610754, "z": -2.8150745191111333, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "b6afbfb4-8ba2-447b-8a38-a6390b3e5ac7",
          "name": "Rm103",
          "levelIndex": 0,
          "coordinates": [
            { "x": 5.139853336625866, "z": -3.923604678233639, "levelIndex": 0 },
            { "x": 6.877524972619199, "z": -3.9178430157899595, "levelIndex": 0 },
            { "x": 7.046401826036357, "z": -4.306939113843602, "levelIndex": 0 },
            { "x": 7.01542291997663, "z": -5.961135038341394, "levelIndex": 0 },
            { "x": 5.129536200262878, "z": -5.978870945580384, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "bd442374-62cd-45f7-98da-21c9d0dca011",
          "name": "Rm102",
          "levelIndex": 0,
          "coordinates": [
            { "x": 5.17879372113136, "z": -8.24397019575018, "levelIndex": 0 },
            { "x": 6.554223049025204, "z": -8.250005472604895, "levelIndex": 0 },
            { "x": 6.97003064453059, "z": -8.226539773136427, "levelIndex": 0 },
            { "x": 7.038568900413175, "z": -7.881038717678788, "levelIndex": 0 },
            { "x": 7.038568985416555, "z": -6.139345277008897, "levelIndex": 0 },
            { "x": 5.102807194716646, "z": -6.089977334614853, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "5e08ce18-cca9-4434-ac9e-94ef3af91a63",
          "name": "Rm101",
          "levelIndex": 0,
          "coordinates": [
            { "x": 2.97362892121615, "z": -6.7546196841681425, "levelIndex": 0 },
            { "x": 3.3856135138383214, "z": -6.73220567059937, "levelIndex": 0 },
            { "x": 3.4534313225135485, "z": -6.566054515701877, "levelIndex": 0 },
            { "x": 5.025094162746937, "z": -6.568499465657402, "levelIndex": 0 },
            { "x": 5.032936115190811, "z": -8.28471519264977, "levelIndex": 0 },
            { "x": 3.4314750725092598, "z": -8.266630368585083, "levelIndex": 0 },
            { "x": 2.9507198217410964, "z": -8.034911676150061, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "9cc779ba-4df2-4e41-815a-a4ee3f640f7e",
          "name": "Rm10A",
          "levelIndex": 0,
          "coordinates": [
            { "x": 4.359754572986217, "z": -16.879126649294136, "levelIndex": 0 },
            { "x": 4.3577219099973625, "z": -17.315731889563242, "levelIndex": 0 },
            { "x": 4.017364013018865, "z": -17.506703786036123, "levelIndex": 0 },
            { "x": 4.015820423253231, "z": -18.807752145338263, "levelIndex": 0 },
            { "x": 6.2791173827363025, "z": -18.84647079763888, "levelIndex": 0 },
            { "x": 6.289000445928126, "z": -18.280302292626512, "levelIndex": 0 },
            { "x": 6.259617972282924, "z": -16.9078569509922, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "79a9be4d-b816-435c-818d-5fa59081e2d6",
          "name": "Rm10B",
          "levelIndex": 0,
          "coordinates": [
            { "x": 20.78593496330229, "z": -16.94154696847898, "levelIndex": 0 },
            { "x": 22.618687202299633, "z": -16.915959927006305, "levelIndex": 0 },
            { "x": 22.602612124893483, "z": -18.863780840784067, "levelIndex": 0 },
            { "x": 20.785490430236173, "z": -18.879191036303347, "levelIndex": 0 },
            { "x": 20.778363173823077, "z": -18.284488173893493, "levelIndex": 0 },
            { "x": 20.80176778887322, "z": -16.929641720712333, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        {
          "id": "0eb504b4-0ec3-44dd-995d-875532be18b2",
          "name": "Rm10C",
          "levelIndex": 0,
          "coordinates": [
            { "x": 28.527406887974838, "z": -3.058732730759381, "levelIndex": 0 },
            { "x": 29.316127813491555, "z": -3.022227105709898, "levelIndex": 0 },
            { "x": 29.841684101941784, "z": -2.7939553877075185, "levelIndex": 0 },
            { "x": 30.955558806461905, "z": -2.793841200564716, "levelIndex": 0 },
            { "x": 30.987526308169233, "z": -5.342876675561101, "levelIndex": 0 },
            { "x": 30.56193017136268, "z": -5.381255045015568, "levelIndex": 0 },
            { "x": 30.554341685269534, "z": -5.499771038897941, "levelIndex": 0 },
            { "x": 28.53352219901122, "z": -5.446005419795588, "levelIndex": 0 }
          ],
          "layerType": "polygon",
          "mapped": true
        },
        // {
        //   "id": "c7ad4c1b-7d3a-4e57-a8f2-88356a8c4c15",
        //   "name": "QuietRm",
        //   "levelIndex": 0,
        //   "coordinates": [
        //     { "x": 6.8527673423429025, "z": -1.3505317225827322, "levelIndex": 0 },
        //     { "x": 6.814280435266166, "z": -1.9066287119792538, "levelIndex": 0 },
        //     { "x": 7.119473112657002, "z": -1.930986202640442, "levelIndex": 0 },
        //     { "x": 7.149147733803584, "z": -3.033271350067448, "levelIndex": 0 },
        //     { "x": 8.184270299632663, "z": -3.0556759337362487, "levelIndex": 0 },
        //     { "x": 8.164805749021482, "z": -1.3442115626243614, "levelIndex": 0 }
        //   ],
        //   "layerType": "polygon",
        //   "mapped": true
        // },
        // {
        //   "id": "55a275d0-c828-4593-a2c3-2b2eb18e78b9",
        //   "name": "CarePhoneRm",
        //   "levelIndex": 0,
        //   "coordinates": [
        //     { "x": 25.717247829794278, "z": -1.3130511571329615, "levelIndex": 0 },
        //     { "x": 25.75840084686965, "z": -3.2751669730048576, "levelIndex": 0 },
        //     { "x": 26.702957066197854, "z": -3.2832861782223843, "levelIndex": 0 },
        //     { "x": 26.765167043339908, "z": -1.826571082604326, "levelIndex": 0 },
        //     { "x": 27.05030263728136, "z": -1.7300184618795198, "levelIndex": 0 },
        //     { "x": 26.99593965711943, "z": -1.284699107634691, "levelIndex": 0 }
        //   ],
        //   "layerType": "polygon",
        //   "mapped": true
        // }
      ]
    }
  ];

  // Function to login to Humly API
  const loginToHumly = async () => {
    try {
      console.log("Attempting to login to Humly API at:", HUMLY_API_URL);
      
      const response = await fetch(`${HUMLY_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: USERNAME,
          password: PASSWORD
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      const { authToken, userId } = data.data;
      console.log("Login successful!");
      return { authToken, userId };
    } catch (error: unknown) {
      console.error("Login failed:", error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  };

  // Initialize rooms with proper format
  const initializeRooms = () => {
    if (!originalRoomData || !originalRoomData[0] || !originalRoomData[0].assets) {
      console.error("Invalid room data format");
      return [];
    }
    
    return originalRoomData[0].assets.map(room => {
      const formattedCoords = [room.coordinates.map(coord => ({
        x: coord.x,
        z: coord.z,
        levelIndex: coord.levelIndex || 0
      }))];
      
      return {
        id: room.id,
        name: room.name,
        levelIndex: room.levelIndex || 0,
        coordinates: formattedCoords,
        layerType: "polygon",
        mapped: true,
        available: "unavailable",
        color: COLOR_DICT["unavailable"]
      };
    });
  };

  const updateDataLayers = (roomsData: Room[], providedSpace?: any) => {
    console.log("Attempting to update data layers", { 
      providedSpace, 
      stateSpace: space 
    });
    
    // Prioritize providedSpace, then fall back to state space
    const spaceToUse = providedSpace || space;
  
    // More robust space and method checking
    if (!spaceToUse) {
      console.error("No space available for layer update");
      return;
    }

    if (typeof spaceToUse.addDataLayer !== 'function') {
      console.error("Space lacks addDataLayer method", {
        spaceToUse,
        addDataLayerMethod: typeof spaceToUse.addDataLayer
      });
      return;
    }
    
    try {
      // Safely remove previous layer
      try {
        spaceToUse.removeDataLayer("rooms");
      } catch (removeError) {
        console.warn("Could not remove previous data layer:", removeError);
      }
    
      if (!roomsData || roomsData.length === 0) {
        console.warn("No rooms data to add to layer");
        return;
      }
  
      console.log("Rooms data for layer:", roomsData);
      
      // More robust layer addition
      spaceToUse.addDataLayer({
        id: "rooms",
        type: "polygon",
        data: roomsData,
        tooltip: (d: any) => `${d.name} - ${d.available ? 'Available' : 'Unavailable'}`,
        color: (d: any) => {
          // Ensure color is set based on availability
          const color = d.available 
            ? COLOR_DICT['available'] 
            : COLOR_DICT['unavailable'];
          console.log(`Color for ${d.name}: ${color}`);
          return color;
        },
        alpha: 0.7,
        height: 2.9,
        onError: (error: any) => {
          console.error("Error adding data layer:", error);
        }
      });
  
      console.log("Data layer added successfully");
    } catch (error) {
      console.error("Comprehensive error in updateDataLayers:", error);
    }
  };

  
  useEffect(() => {
    let isMounted = true;
    let updateInterval: NodeJS.Timeout;
  
    const initSpace = async () => {
      try {
        await waitForSmplr();
        
        if (!isMounted) return;
  
        const spaceInstance = new (window as any).smplr.Space({
          spaceId: "spc_okiwxk6z",
          clientToken: "pub_f0dbf583288b4fe483ca4e57447c5931",
          containerId: "smplrspace-container",
        });
        
        // Set space in state
        setSpace(spaceInstance);
        
        spaceInstance.startViewer({
          preview: false,
          allowModeChange: true,
          onReady: async () => {
            console.log("Viewer is now fully ready");
            
            if (!isMounted) return;
  
            // Initialize rooms 
            const initialRooms = initializeRooms();
            setRooms(initialRooms);
            
            // Ensure a more robust method to update layers
            const safeUpdateLayers = () => {
              console.log("Safe update layers called with space:", spaceInstance);
              updateDataLayers(initialRooms, spaceInstance);
            };
  
            // Use multiple approaches to ensure layer update
            setTimeout(safeUpdateLayers, 500);
            setTimeout(safeUpdateLayers, 1500);
            setTimeout(safeUpdateLayers, 3000);
            
            // Fetch room status
            const fetchInitialData = async () => {
              const auth = await loginToHumly();
              if (auth && isMounted) {
                setAuthData(auth);
                const updatedRooms = await fetchRoomStatusWithAuth(auth);
                if (updatedRooms) {
                  // Additional layer update with fetched rooms
                  updateDataLayers(updatedRooms, spaceInstance);
                }
              }
            };
            
            fetchInitialData();
  
            // Set up interval for refreshing data
            updateInterval = setInterval(() => {
              if (isMounted) {
                fetchHumlyData();
              }
            }, UPDATE_FREQUENCY * 1000);
          },
          onError: (error: unknown) => {
            console.error("Could not start viewer:", error);
          },
        });
      } catch (error: unknown) {
        console.error("Space initialization error:", error);
      }
    };
    
    initSpace();
    
    // Cleanup function remains the same
    return () => {
      isMounted = false;
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      if (space) {
        try {
          space.stopViewer();
        } catch (error) {
          console.warn("Error stopping viewer:", error);
        }
      }
    };
  }, []); // Empty dependency array to run only once

  // Get room status from Humly API
  const getRoomStatus = async (authToken: string, userId: string) => {
    try {
      const response = await fetch(`${HUMLY_API_URL}/rooms`, {
        headers: {
          "X-Auth-Token": authToken,
          "X-User-Id": userId
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      return await response.json();
    } catch (error: unknown) {
      console.error("Error fetching rooms:", error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  };

  // Fetch and process room status
  const fetchRoomStatusWithAuth = async (auth: { authToken: string, userId: string }) => {
    const roomsData = await getRoomStatus(auth.authToken, auth.userId);
    
    if (!roomsData || !roomsData.data) {
      console.error("No data returned from Humly API");
      return null;
    }
    
    console.log("Full Humly Rooms data:", roomsData.data);
    
    const humlyRooms = roomsData.data;
    const updatedRooms = rooms.map(room => {
      // Find the corresponding Humly room using the mapping
      const humlyRoom = humlyRooms.find(
        (hr: any) => ROOM_MAPPING[hr._id] === room.name
      );
      
      console.log(`Detailed room processing:`, {
        roomName: room.name,
        humlyRoomFound: !!humlyRoom,
        humlyRoomDetails: humlyRoom
      });
      
      // Special handling for QuietRm and CarePhoneRm
      if (room.name === 'QuietRm' || room.name === 'CarePhoneRm') {
        return {
          ...room,
          available: 'unavailable',
          color: COLOR_DICT['unavailable']
        };
      }
      
      if (humlyRoom) {
        // More detailed status determination
        let status: RoomStatus = 'unavailable';
        
        // Comprehensive logging of room status
        console.log(`Room ${room.name} details:`, {
          available: humlyRoom.available,
          busy: humlyRoom.busy,
          assigned: humlyRoom.assigned
        });
        
        // More complex status logic
        if (humlyRoom.available === true && humlyRoom.assigned === false) {
          status = 'available';
        } else if (humlyRoom.busy === true || humlyRoom.assigned === true) {
          status = 'busy';
        }
        
        console.log(`Determined status for ${room.name}: ${status}`);
        
        return {
          ...room,
          available: status,
          color: COLOR_DICT[status]
        };
      }
      
      // Default to unavailable if no specific Humly data found
      return {
        ...room,
        available: 'unavailable',
        color: COLOR_DICT['unavailable']
      };
    });
    
    // Update state and visualization
    setRooms(updatedRooms);
    updateDataLayers(updatedRooms);
    
    return updatedRooms;
  };

  // Fetch Humly data
  const fetchHumlyData = async () => {
    try {
      if (!authData) {
        const newAuthData = await loginToHumly();
        if (!newAuthData) {
          throw new Error("Failed to login to Humly API");
        }
        setAuthData(newAuthData);
        return await fetchRoomStatusWithAuth(newAuthData);
      }
      
      return await fetchRoomStatusWithAuth(authData);
    } catch (error: unknown) {
      console.error("Error in fetchHumlyData:", error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  };

  // Wait for Smplr to be available
  const waitForSmplr = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      const checkSmplr = () => {
        if (typeof window !== 'undefined' && (window as any).smplr) {
          resolve();
        } else {
          setTimeout(checkSmplr, 500);
        }
      };
      checkSmplr();
    });
  };

  // Modify initialization effect to be more robust
  useEffect(() => {
    let isMounted = true;
    let updateInterval: NodeJS.Timeout;
  
    const initSpace = async () => {
      try {
        await waitForSmplr(); // Ensure this function exists
        
        if (!isMounted) return;
  
        const spaceInstance = new (window as any).smplr.Space({
          spaceId: "spc_okiwxk6z",
          clientToken: "pub_f0dbf583288b4fe483ca4e57447c5931",
          containerId: "smplrspace-container",
        });
        
        // Crucially, set space in state BEFORE any layer updates
        setSpace(spaceInstance);
        
        spaceInstance.startViewer({
          preview: false,
          allowModeChange: true,
          onReady: async () => {
            console.log("Viewer is now fully ready");
            
            if (!isMounted) return;
  
            // Initialize rooms 
            const initialRooms = initializeRooms(); // Ensure this function exists
            setRooms(initialRooms);
            
            // Ensure a more robust method to update layers
            const safeUpdateLayers = () => {
              console.log("Safe update layers called with space:", spaceInstance);
              // Pass BOTH the rooms and the space instance
              updateDataLayers(initialRooms, spaceInstance);
            };
  
            // Use multiple approaches to ensure layer update
            setTimeout(safeUpdateLayers, 500);
            setTimeout(safeUpdateLayers, 1500);
            setTimeout(safeUpdateLayers, 3000);
            
            // Fetch room status
            const fetchInitialData = async () => {
              const auth = await loginToHumly(); // Ensure this function exists
              if (auth && isMounted) {
                setAuthData(auth);
                const updatedRooms = await fetchRoomStatusWithAuth(auth);
                if (updatedRooms) {
                  // Additional layer update with fetched rooms
                  updateDataLayers(updatedRooms, spaceInstance);
                }
              }
            };
            
            fetchInitialData();
  
            // Set up interval for refreshing data
            updateInterval = setInterval(() => {
              if (isMounted) {
                fetchHumlyData(); // Ensure this function exists
              }
            }, UPDATE_FREQUENCY * 1000);
          },
          onError: (error: unknown) => {
            console.error("Could not start viewer:", error);
          },
        });
      } catch (error: unknown) {
        console.error("Space initialization error:", error);
      }
    };
    
    initSpace();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      if (space) {
        try {
          space.stopViewer();
        } catch (error) {
          console.warn("Error stopping viewer:", error);
        }
      }
    };
  }, []); // Empty dependency array to run only once
  return (
    <div className="flex h-screen w-full">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 mb-32 relative">
          <div id="smplrspace-container" className="absolute inset-0"></div>
        </div>
      </div>
    </div>
  );
};

export default SmplrspaceViewer;