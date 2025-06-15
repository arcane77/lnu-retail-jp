import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Timer, UserMinus, UserX, BarChart3 } from 'lucide-react';
import Sidebar from './Sidebar';

const DeskLogic = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState('editor1');
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth0();

  // Timing settings state
  const [timingSettings, setTimingSettings] = useState({
    sensorContinuousTime: 1,
    occupyToAway: 10,
    awayToVacant: 10
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleInputChange = (field, value) => {
    const numValue = parseInt(value);
    if (numValue >= 1 && numValue <= 999) {
      setTimingSettings(prev => ({
        ...prev,
        [field]: numValue
      }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      // You can add success notification here
    } catch (error) {
      // Handle error
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTimingSettings({
      sensorContinuousTime: 1,
      occupyToAway: 10,
      awayToVacant: 10
    });
    setHasChanges(false);
  };

  const settingsConfig = [
    {
      id: 'sensorContinuousTime',
      title: 'Sensor Occupy/Vacant Continuous Time',
      description: 'Duration for continuous sensor detection before status change',
      value: timingSettings.sensorContinuousTime,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'occupyToAway',
      title: 'Occupy to Away',
      description: 'Time before occupied desk status changes to away',
      value: timingSettings.occupyToAway,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-orange-50 border-orange-200'
    },
    {
      id: 'awayToVacant',
      title: 'Away to Vacant',
      description: 'Time before away status changes to vacant',
      value: timingSettings.awayToVacant,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-green-50 border-green-200'
    }
  ];

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
      <main className="pt-20 xl:pt-[120px] px-8 pb-8">
        <div className="mx-auto justify-center">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Edit Desk Logic</h1>
            <p className="text-gray-600">Configure timing settings for desk occupancy detection</p>
          </div>

          {/* Settings Cards */}
          <div className="grid gap-6 mb-8">
            {settingsConfig.map((setting) => (
              <div key={setting.id} className={`${setting.color} border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-md`}>
                <div className="flex flex-col sm:flex sm:flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <setting.icon className="w-6 h-6 text-gray-700" />
                      <h3 className="text-xl font-semibold text-gray-900">{setting.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-4">{setting.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                      <button
                        onClick={() => handleInputChange(setting.id, setting.value - 1)}
                        disabled={setting.value <= 1}
                        className="px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={setting.value}
                        onChange={(e) => handleInputChange(setting.id, e.target.value)}
                        className="w-20 px-3 py-2 text-center border-l border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleInputChange(setting.id, setting.value + 1)}
                        disabled={setting.value >= 999}
                        className="px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-500 min-w-[60px]">{setting.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              Current Configuration Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{timingSettings.sensorContinuousTime}m</div>
                <div className="text-sm text-gray-600">Sensor Detection</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{timingSettings.occupyToAway}m</div>
                <div className="text-sm text-gray-600">Occupy → Away</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{timingSettings.awayToVacant}m</div>
                <div className="text-sm text-gray-600">Away → Vacant</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                hasChanges && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
            
            <button
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className={`px-8 py-3 rounded-lg font-medium border-2 transition-all duration-200 ${
                hasChanges && !isSaving
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Reset to Default
            </button>
          </div>

         
        </div>
      </main>
    </div>
  );
};

export default DeskLogic;