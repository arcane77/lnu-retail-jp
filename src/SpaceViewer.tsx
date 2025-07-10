import * as React from "react";
import { FC, useEffect, useState } from "react";
import { assets } from "./Assets.tsx";
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from '../src/components/Sidebar.js';
import Header from "./components/Header.js";


const SpaceViewer: FC = () => {
  let space;
  const [searchTerm, setSearchTerm] = useState("");
  const { logout } = useAuth0();
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [areas] = useState([
    { name: "Service Counter", handler: showFirst },
    { name: "Study Rooms", handler: showSecond },
    { name: "Cafeteria", handler: showThird },
  ]);
  const [filteredAreas, setFilteredAreas] = useState(areas);

  useEffect(() => {
    space = new smplr.Space({
      spaceId: "spc_i7v6cbdv",
      clientToken: "pub_45cf413215bd43f79621e0b28f8a815b",
      containerId: "test",
    });
    space.startViewer({
      preview: false,
      allowModeChange: true,
      onReady: () => {},
      onError: (error: any) => console.error("Could not start viewer", error),
    });
  }, []);

  useEffect(() => {
    const filtered = areas.filter((area) =>
      area.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAreas(filtered);
  }, [searchTerm, areas]);

  function showFirst() {
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(0, 1),
      tooltip: (d: any) => `${d.name} - ${d.id}`,
      color: "#3e6ab5",
      alpha: 0.8,
      height: 2.9,
    });

    space.setCameraPlacement({
      alpha: -1.5750682689335684,
      beta: 0.65421918622319,
      radius: 77.01470199673722,
      target: { x: 71.3579622603224, y: 3, z: -48.0152734222641 },
      animated: true,
    });
  }

  function showSecond() {
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(1, 2),
      tooltip: (d: any) => `${d.name} - ${d.id}`,
      color: "#486dab",
      alpha: 0.7,
      height: 2.9,
    });
    space.setCameraPlacement({
      alpha: -1.5707963267948966,
      beta: 0.7853981633974483,
      radius: 85.85890142227294,
      target: { x: 71.3579622603224, y: 3, z: -48.0152734222641 },
      animated: true,
    });
  } 

  function showThird() {
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(2, 3),
      tooltip: (d: any) => `${d.name} - ${d.id}`,
      color: "#486dab",
      alpha: 0.7,
      height: 2.9,
    });
    space.setCameraPlacement({
      alpha: -1.5750682689335684,
      beta: 0.65421918622319,
      radius: 77.01470199673722,
      target: { x: 71.3579622603224, y: 3, z: -48.0152734222641 },
      animated: true,
    });
  }

  return (
    <div className="flex z-20 h-screen pt-14 lg:pt-20 xl:pt-[100px]">
          <Sidebar 
              isSidebarOpen={isSidebarOpen} 
              setIsSidebarOpen={setIsSidebarOpen} 
              logout={logout} 
            />

<Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}  
        showLiveCount={true}    
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Search bar */}
        <div className="p-4 bg-white shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="w-64 px-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by area"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              {searchTerm && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 z-0 h-fit">
          <div className="smplr-wrapper h-full">
            <div id="test" className="smplr-embed h-full"></div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-white border-gray-300 border-l shadow-lg">
        <div className="px-4 py-[23px] border-b">
          <h2 className="text-[20px] font-semibold text-gray-800">Areas</h2>
        </div>
        <div className="overflow-y-auto">
          {filteredAreas.map((area, index) => (
            <div
              key={index}
              className="p-4 border-t border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={area.handler}
            >
              <div className="flex items-center">
                <span className="text-gray-800 text-lg font-semibold">{area.name}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-auto text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpaceViewer;
