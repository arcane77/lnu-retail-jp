import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const Editor = () => {
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

  // Function to change the iframe source based on selected editor
  const getEditorIframe = () => {
    switch (selectedEditor) {
      case 'editor2':
        return "https://pwwpdev.github.io/Lingnan/editor2.html"; //1/F
        case 'editor3':
          return "https://pwwpdev.github.io/Lingnan/editor3.html"; //2/F
        case 'editor4':
          return "https://pwwpdev.github.io/Lingnan/editor4.html"; //3/F
      default:
        return "https://pwwpdev.github.io/Lingnan/editor.html";  // Default to editor1 (M/F)
    }
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

      {/* Editor Selection */}
      

      {/* Iframe for Editor Content */}
      <div className="px-6 lg:px-14 xl:px-14 2xl:px-14 pb-6">
        <div className="mt-[74px] lg:mt-32 xl:mt-[130px]">
          
        <div className="pb-6">
            <div className="flex items-center space-x-4">
              <label htmlFor="editor-select" className="text-xl">Select Editor:</label>
              <select
                id="editor-select"
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="editor1">Main Floor</option>
                <option value="editor2">First Floor</option>
                <option value="editor3">Second Floor</option>
                <option value="editor4">Third Floor</option>
              </select>
            </div>
          </div>
          
          <div className="rounded-xl border border-[#E2E2E4] shadow-[0_1px_2px_0_#dedede] bg-white h-fit">
            <div className="px-8 pt-6 mb-4">
              <p className="text-3xl font-bold pb-2">Space Editor</p>
            </div>
            <div className="px-4 w-full pb-6">
              <iframe
                src={getEditorIframe()}
                className="w-full"
                style={{ height: '600px', border: 'none' }}
                title="Editor"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
