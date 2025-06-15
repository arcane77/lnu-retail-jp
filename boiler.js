import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './src/components/Sidebar';

const DeskLogic = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState('editor1');  // Default editor set to 'editor1'
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth0();

   useEffect(() => {
     const handleClickOutside = (event) => {
       if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
         setIsSidebarOpen(false);
       }
     };
     document.addEventListener("mousedown", handleClickOutside);
     return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setIsSidebarOpen(false); // close sidebar after navigating
  };

  

  return (
    <div>
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

     


    </div>
  );
};

export default DeskLogic;
