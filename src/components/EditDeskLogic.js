import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Timer, UserMinus, UserX, BarChart3, AlertCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

const DeskLogic = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState('editor1');
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth0();

  // Timing settings state (in minutes for frontend)
  const [timingSettings, setTimingSettings] = useState({
    timeToOccupied: 1,    // 60000ms
    timeToVacant: 1,      // 60000ms
    timeToAway: 9,        // 540000ms
    timeToUnoccupied: 10  // 600000ms
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert minutes to milliseconds for API
  const convertToMs = (minutes) => minutes * 60 * 1000;

  // Convert milliseconds to minutes for frontend
  const convertToMinutes = (milliseconds) => Math.round(milliseconds / (60 * 1000));

  // Fetch current settings from API
  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://optimusc.flowfuse.cloud/api/occupancy-config');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      
      // Convert from milliseconds to minutes for frontend
      setTimingSettings({
        timeToOccupied: convertToMinutes(data.timeToOccupied),
        timeToVacant: convertToMinutes(data.timeToVacant),
        timeToAway: convertToMinutes(data.timeToAway),
        timeToUnoccupied: convertToMinutes(data.timeToUnoccupied)
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
    setIsSidebarOpen(false);
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
    setError(null);
    try {
      // Convert all values to milliseconds for API
      const apiData = {
        timeToOccupied: convertToMs(timingSettings.timeToOccupied),
        timeToVacant: convertToMs(timingSettings.timeToVacant),
        timeToAway: convertToMs(timingSettings.timeToAway),
        timeToUnoccupied: convertToMs(timingSettings.timeToUnoccupied)
      };

      const response = await fetch('https://optimusc.flowfuse.cloud/api/occupancy-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setHasChanges(false);
      // You can add success notification here
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTimingSettings({
      timeToOccupied: 1,
      timeToVacant: 1,
      timeToAway: 9,
      timeToUnoccupied: 10
    });
    setHasChanges(true); // Mark as changed so user can save the reset values
  };

  const settingsConfig = [
    {
      id: 'timeToOccupied',
      title: '占有までの時間 ',
      description: 'デスクを「使用中」と判定するまでの検知時間',
      value: timingSettings.timeToOccupied,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-red-50 border-red-200'
    },
    {
      id: '空席までの時間',
      title: 'Time to Vacant',
      description: '	デスクを「空席」と判定するまでの時間',
      value: timingSettings.timeToVacant,
      unit: 'minutes',
      icon: Timer, 
      color: 'bg-green-50 border-green-200'
    },
    {
      id: 'timeToAway',
      title: '離席までの時間',
      description: '「使用中」から「離席中」に切り替えるまでの時間',
      value: timingSettings.timeToAway,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      id: 'timeToUnoccupied',
      title: '未使用までの時間',
      description: '「離席中」から「未使用」に切り替えるまでの時間',
      value: timingSettings.timeToUnoccupied,
      unit: 'minutes',
      icon: Timer,
      color: 'bg-green-100 border-green-300'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">設定を読み込み中...</span>
        </div>
      </div>
    );
  }

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
      <main className="pt-20 xl:pt-[120px] px-8 pb-8">
        <div className="mx-auto justify-center">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">デスクロジックを編集</h1>
            <p className="text-gray-600">デスクの使用状況を検知するためのタイミング設定を構成</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <button 
                onClick={fetchSettings}
                className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
              >
                再試行
              </button>
            </div>
          )}

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
              現在の設定内容
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{timingSettings.timeToOccupied}m</div>
                <div className="text-sm text-gray-600">占有までの時間 </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{timingSettings.timeToVacant}m</div>
                <div className="text-sm text-gray-600">空席までの時間</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{timingSettings.timeToAway}m</div>
                <div className="text-sm text-gray-600">離席までの時間 </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{timingSettings.timeToUnoccupied}m</div>
                <div className="text-sm text-gray-600">未使用までの時間</div>
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
                  保存中...
                </span>
              ) : (
                '変更を保存'
              )}
            </button>
            
            <button
              onClick={handleReset}
              disabled={isSaving}
              className={`px-8 py-3 rounded-lg font-medium border-2 transition-all duration-200 ${
                !isSaving
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              初期設定にリセット
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeskLogic;