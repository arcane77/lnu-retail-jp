import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronRight, Thermometer, Droplets, Frown } from "lucide-react";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import WeatherAirQuality from "./WeatherAirQuality";
import Header from "./Header";

const IAQ = () => {
  const sidebarRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { logout } = useAuth0();
  const navigate = useNavigate();
  const [editingIndex, setEditingIndex] = useState(null);
  const [deviceLocations, setDeviceLocations] = useState({});
  const [deviceAreaIds, setDeviceAreaIds] = useState({});
  // Add HKO temperature state
  const [hkoTemperature, setHkoTemperature] = useState(null);
  // Add sorting state
  const [avgCO2, setAvgCO2] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  const [expandedRows, setExpandedRows] = useState({});
  const [graphData, setGraphData] = useState({});
  const [isLoadingGraphData, setIsLoadingGraphData] = useState({});
  const [isLoading, setIsLoading] = useState(true);


  // Helper function to get alert sensors
  const getAlertSensors = () => {
    if (!data || data.length === 0) return {};

    const now = new Date();

    const alerts = {
      notUpdated: [],
      highestPM25: null,
      highestPM10: null,
      highestTemp: null,
      lowestTemp: null,
      highHumidity: [],
      highestCO2: null,
    };

    // Find sensors not updated for more than 1 hour
    data.forEach((sensor) => {
      if (sensor.timestamp && sensor.timestamp !== "-") {
        const sensorTime = new Date(sensor.timestamp);
        const timeDiffMs = now - sensorTime;
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60); // Convert to hours

        if (timeDiffHours > 1) {
          alerts.notUpdated.push(sensor);
        }
      }
    });

    // Find highest PM2.5
    const validPM25 = data.filter(
      (s) => s.pm2_5 && s.pm2_5 !== "-" && !isNaN(parseFloat(s.pm2_5))
    );
    if (validPM25.length > 0) {
      alerts.highestPM25 = validPM25.reduce((max, sensor) =>
        parseFloat(sensor.pm2_5) > parseFloat(max.pm2_5) ? sensor : max
      );
    }

    // Find highest PM10
    const validPM10 = data.filter(
      (s) => s.pm10 && s.pm10 !== "-" && !isNaN(parseFloat(s.pm10))
    );
    if (validPM10.length > 0) {
      alerts.highestPM10 = validPM10.reduce((max, sensor) =>
        parseFloat(sensor.pm10) > parseFloat(max.pm10) ? sensor : max
      );
    }

    // Find highest temperature
    const validTemp = data.filter(
      (s) =>
        s.temperature &&
        s.temperature !== "-" &&
        !isNaN(parseFloat(s.temperature)) &&
        s.location !== "2Archive-Archive Room"
    );
    if (validTemp.length > 0) {
      alerts.highestTemp = validTemp.reduce((max, sensor) =>
        parseFloat(sensor.temperature) > parseFloat(max.temperature)
          ? sensor
          : max
      );
      alerts.lowestTemp = validTemp.reduce((min, sensor) =>
        parseFloat(sensor.temperature) < parseFloat(min.temperature)
          ? sensor
          : min
      );
    }

    // highest and lowest humidity
const validHumidity = data.filter(
  (s) =>
    s.humidity &&
    s.humidity !== "-" &&
    !isNaN(parseFloat(s.humidity))
    && s.location !== "2Archive-Archive Room"
);
if (validHumidity.length > 0) {
  alerts.highestHumidity = validHumidity.reduce((max, sensor) =>
    parseFloat(sensor.humidity) > parseFloat(max.humidity)
      ? sensor
      : max
  );
  alerts.lowestHumidity = validHumidity.reduce((min, sensor) =>
    parseFloat(sensor.humidity) < parseFloat(min.humidity)
      ? sensor
      : min
  );
}

    // Find highest CO2
    const validCO2 = data.filter(
      (s) => s.co2 && s.co2 !== "-" && !isNaN(parseFloat(s.co2))
    );
    if (validCO2.length > 0) {
      alerts.highestCO2 = validCO2.reduce((max, sensor) =>
        parseFloat(sensor.co2) > parseFloat(max.co2) ? sensor : max
      );
    }

    return alerts;
  };

  const AlertArea = ({ alerts }) => {
    if (!alerts) return null;

    const hasAlerts = true; // Always show AlertArea since we always show sensor status

    if (!hasAlerts) return null;

    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 mb-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-red-800 flex items-center">
            <div className="bg-red-100 p-2 rounded-full mr-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            アラートエリア​
          </h3>
          <div className="text-sm text-red-600 bg-red-100 px-3 py-1 rounded-full font-medium">
          アクティブアラート
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Highest CO2 */}
          {alerts.highestCO2 && (
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-lg mr-3">
                    <Frown className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">最も高い CO2</h4>
                    <p className="text-xs text-gray-500">Carbon Dioxide</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-700">
                    {alerts.highestCO2.co2}
                  </div>
                  <div className="text-xs text-gray-500">ppm</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-sm text-gray-800">
                      {alerts.highestCO2.id}
                    </span>
                    <p className="text-xs text-gray-600">
                      {alerts.highestCO2.location}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alerts.highestCO2.last_updated?.split(" ")[1] || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Highest PM2.5 */}
          {alerts.highestPM25 && (
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-red-100 p-2 rounded-lg mr-3">
                    <Frown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                    最も高い PM2.5
                    </h4>
                    <p className="text-xs text-gray-500">空気の質</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {alerts.highestPM25.pm2_5}
                  </div>
                  <div className="text-xs text-gray-500">μg/m³</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-sm text-gray-800">
                      {alerts.highestPM25.id}
                    </span>
                    <p className="text-xs text-gray-600">
                      {alerts.highestPM25.location}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alerts.highestPM25.last_updated?.split(" ")[1] || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Highest PM10 */}
          {alerts.highestPM10 && (
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-red-100 p-2 rounded-lg mr-3">
                    <Frown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                    最も高い PM10
                    </h4>
                    <p className="text-xs text-gray-500">空気の質</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {alerts.highestPM10.pm10}
                  </div>
                  <div className="text-xs text-gray-500">μg/m³</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-sm text-gray-800">
                      {alerts.highestPM10.id}
                    </span>
                    <p className="text-xs text-gray-600">
                      {alerts.highestPM10.location}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alerts.highestPM10.last_updated?.split(" ")[1] || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Temperature Alerts */}
          {(alerts.highestTemp || alerts.lowestTemp) && (
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">
                  極端な温度​
                  </h4>
                  <p className="text-xs text-gray-500">高値 / 安値</p>
                </div>
              </div>
              <div className="space-x-4 flex">
                {alerts.highestTemp && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-medium text-red-700">
                        最も高い
                        </span>
                        <p className="font-medium text-sm text-gray-800">
                          {alerts.highestTemp.id}
                        </p>
                        <p className="text-xs text-gray-600">
                          {alerts.highestTemp.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-600">
                          {alerts.highestTemp.temperature}°C
                        </div>
                        <div className="text-xs text-gray-500">
                          {alerts.highestTemp.last_updated?.split(" ")[1] ||
                            "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {alerts.lowestTemp && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-medium text-blue-700">
                        最低
                        </span>
                        <p className="font-medium text-sm text-gray-800">
                          {alerts.lowestTemp.id}
                        </p>
                        <p className="text-xs text-gray-600">
                          {alerts.lowestTemp.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          {alerts.lowestTemp.temperature}°C
                        </div>
                        <div className="text-xs text-gray-500">
                          {alerts.lowestTemp.last_updated?.split(" ")[1] ||
                            "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Not Updated Sensors - Always Show */}
          <div
            className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
              alerts.notUpdated && alerts.notUpdated.length > 0
                ? "border-red-200"
                : "border-green-200"
            }`}
          >
            <div className="flex items-center mb-3">
              <div
                className={`p-2 rounded-lg mr-3 ${
                  alerts.notUpdated && alerts.notUpdated.length > 0
                    ? "bg-orange-100"
                    : "bg-green-100"
                }`}
              >
                {alerts.notUpdated && alerts.notUpdated.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">センサーの状態​</h4>
                <p className="text-xs text-gray-500">
                  {alerts.notUpdated && alerts.notUpdated.length > 0
                    ? `${alerts.notUpdated.length} sensors inactive >1hr`
                    : "すべてのセンサーが最新の状態です"}
                </p>
              </div>
            </div>

            {alerts.notUpdated && alerts.notUpdated.length > 0 ? (
              <div className="space-y-2">
                {alerts.notUpdated.slice(0, 3).map((sensor) => (
                  <div key={sensor.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-sm text-gray-800">
                          {sensor.id}
                        </span>
                        <p className="text-xs text-gray-600">
                          {sensor.location}
                        </p>
                      </div>
                      <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full">
                        {sensor.last_updated?.split(" ")[1] || "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
                {alerts.notUpdated.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{alerts.notUpdated.length - 3} more sensors
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-green-700 font-medium text-sm">
                      ✓ すべてのセンサーが正常に報告しています
                    </p>
                    <p className="text-green-600 text-xs">
                    1時間以上非アクティブなセンサーはありません
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

         {/* Humidity Extremes */}
{(alerts.highestHumidity || alerts.lowestHumidity) && (
  <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center mb-3">
      <div className="bg-blue-100 p-2 rounded-lg mr-3">
        <Droplets className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-800">
        センサーの状態​
        </h4>
        <p className="text-xs text-gray-500">高値 / 安値</p>
      </div>
    </div>
    <div className="space-x-4 flex flex-1">
      {alerts.highestHumidity && (
        <div className="bg-red-50 rounded-lg p-3 border border-red-100 flex-1">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-red-700">
              最も高い
              </span>
              <p className="font-medium text-sm text-gray-800">
                {alerts.highestHumidity.id}
              </p>
              <p className="text-xs text-gray-600">
                {alerts.highestHumidity.location}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-red-600">
                {alerts.highestHumidity.humidity}%
              </div>
              <div className="text-xs text-gray-500">
                {alerts.highestHumidity.last_updated?.split(" ")[1] ||
                  "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
      {alerts.lowestHumidity && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex-1">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-blue-700">
              最低
              </span>
              <p className="font-medium text-sm text-gray-800">
                {alerts.lowestHumidity.id}
              </p>
              <p className="text-xs text-gray-600">
                {alerts.lowestHumidity.location}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600">
                {alerts.lowestHumidity.humidity}%
              </div>
              <div className="text-xs text-gray-500">
                {alerts.lowestHumidity.last_updated?.split(" ")[1] ||
                  "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}
        </div>
      </div>
    );
  };

  // Helper function to get current HKT time as UTC
const getCurrentHKTAsUTC = () => {
  const now = new Date();
  // Get current time in HKT (UTC+8)
  const hktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
  return hktTime;
};

// Helper function to convert UTC timestamp to HKT
const convertUTCToHKT = (utcTimestamp) => {
  const utcDate = new Date(utcTimestamp);
  const hktDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
  return hktDate;
};

  // In the toggleRowExpand function, replace the data filtering and processing section:

  // Fixed toggleRowExpand function
// Fixed data processing in toggleRowExpand function
const toggleRowExpand = async (sensorId) => {
  setExpandedRows((prev) => ({
    ...prev,
    [sensorId]: !prev[sensorId],
  }));

  if (!expandedRows[sensorId] && !graphData[sensorId]) {
    setIsLoadingGraphData((prev) => ({ ...prev, [sensorId]: true }));
    try {
      const isP_Sensor = sensorId.startsWith("IAQ-P");

      // Calculate date range for past 3 days
      const now = new Date();
      const endDate = now.toISOString();
      const startDate = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString();

      console.log("API Request date range:", { startDate, endDate });

      // Generate random historical data for past 3 days with smooth transitions
const generateGraphData = (sensorId) => {
  const isP_Sensor = sensorId.startsWith("IAQ-P");
  const data = [];
  const now = new Date();
  
  // Starting values (realistic baselines)
  let currentTemp = 24 + Math.random() * 4; // 24-28°C baseline
  let currentHumidity = 50 + Math.random() * 15; // 50-65% baseline
  let currentCO2 = 500 + Math.random() * 300; // 500-800 baseline
  let currentPM25 = isP_Sensor ? 5 + Math.random() * 10 : null; // 5-15 baseline
  let currentPM10 = isP_Sensor ? 10 + Math.random() * 20 : null; // 10-30 baseline
  let currentTVOC = isP_Sensor ? 50 + Math.random() * 100 : null; // 50-150 baseline
  let currentPressure = 1015 + Math.random() * 10; // 1015-1025 baseline
  let currentLight = 200 + Math.random() * 400; // 200-600 baseline
  
  // Generate data points every hour for past 3 days (72 points)
  for (let i = 72; i >= 0; i--) {
    const utcDate = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const hktTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    // Gradual changes (±5% max change per hour)
    currentTemp += (Math.random() - 0.5) * 1; // ±0.5°C change
    currentTemp = Math.max(20, Math.min(32, currentTemp)); // Keep within 20-32°C
    
    currentHumidity += (Math.random() - 0.5) * 4; // ±2% change
    currentHumidity = Math.max(30, Math.min(80, currentHumidity)); // Keep within 30-80%
    
    currentCO2 += (Math.random() - 0.5) * 50; // ±25 ppm change
    currentCO2 = Math.max(400, Math.min(1200, currentCO2)); // Keep within 400-1200
    
    if (isP_Sensor) {
      currentPM25 += (Math.random() - 0.5) * 2; // ±1 μg/m³ change
      currentPM25 = Math.max(0, Math.min(50, currentPM25)); // Keep within 0-50
      
      currentPM10 += (Math.random() - 0.5) * 4; // ±2 μg/m³ change
      currentPM10 = Math.max(0, Math.min(100, currentPM10)); // Keep within 0-100
      
      currentTVOC += (Math.random() - 0.5) * 20; // ±10 ppb change
      currentTVOC = Math.max(0, Math.min(800, currentTVOC)); // Keep within 0-800
    }
    
    currentPressure += (Math.random() - 0.5) * 2; // ±1 hPa change
    currentPressure = Math.max(1000, Math.min(1040, currentPressure)); // Keep within 1000-1040
    
    currentLight += (Math.random() - 0.5) * 100; // ±50 lux change
    currentLight = Math.max(0, Math.min(1000, currentLight)); // Keep within 0-1000
    
    data.push({
      timestamp: utcDate,
      hktYear: hktTime.getUTCFullYear(),
      hktMonth: hktTime.getUTCMonth() + 1,
      hktDate: hktTime.getUTCDate(),
      hktHour: hktTime.getUTCHours(),
      hktMinute: hktTime.getUTCMinutes(),
      displayTimestamp: hktTime.getTime(),
      temperature: parseFloat(currentTemp.toFixed(2)),
      humidity: parseFloat(currentHumidity.toFixed(2)),
      co2: parseFloat(currentCO2.toFixed(2)),
      pm2_5: isP_Sensor ? parseFloat(currentPM25.toFixed(2)) : null,
      pm10: isP_Sensor ? parseFloat(currentPM10.toFixed(2)) : null,
      pressure: parseFloat(currentPressure.toFixed(2)),
      light_level: parseFloat(currentLight.toFixed(2)),
      tvoc: isP_Sensor ? parseFloat(currentTVOC.toFixed(2)) : null,
      sensorType: isP_Sensor ? "P" : "L",
    });
  }
  
  return data;
};

let sensorData = generateGraphData(sensorId);

      console.log(`Processed ${sensorData.length} data points for ${sensorId}`);
      console.log("Latest data point:", sensorData[sensorData.length - 1]);

      setGraphData((prev) => ({ ...prev, [sensorId]: sensorData }));
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setIsLoadingGraphData((prev) => ({ ...prev, [sensorId]: false }));
    }
  }
};

// FIXED: Updated chart tick formatter using UTC methods
const chartTickFormatter = (timestamp) => {
  const date = new Date(timestamp);
  // Use UTC methods since displayTimestamp represents HKT time stored as UTC
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${date.getUTCHours()}:00`;
};

// FIXED: Updated tooltip label formatter using UTC methods
const chartLabelFormatter = (timestamp) => {
  const date = new Date(timestamp);
  // Use UTC methods since displayTimestamp represents HKT time stored as UTC
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${date.getUTCHours()}:00 HKT`;
};

  
// Updated SensorGraph component with proper HKT timestamps
const SensorGraph = ({ data, sensorId }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center">No data available</div>;
  }

  const isP_Sensor = sensorId.startsWith("IAQ-P");
  
  // Debug: Log the data range being displayed
  console.log(`Displaying data for ${sensorId}:`, {
    firstPoint: data[0],
    lastPoint: data[data.length - 1],
    totalPoints: data.length
  });

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Temperature and Humidity Chart */}
      <div className={`bg-white shadow rounded-lg p-4 ${!isP_Sensor ? "md:col-span-2" : ""}`}>
        <h3 className="text-lg font-medium mb-2">
          {isP_Sensor
            ? "気温と湿度 (過去3日間​)"
            : "気温, 湿度 と CO2 (過去3日間​)"}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="displayTimestamp"
              label={{
                value: "時間 (HKT)",
                position: "insideBottomRight",
                offset: -5,
              }}
              tickFormatter={chartTickFormatter}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              stroke="#FF9933"
              label={{
                value: "Temperature °C",
                angle: -90,
                dx: 18,
                dy: 35,
                position: "insideLeft",
              }}
            />
            <YAxis
              yAxisId="humidity"
              orientation="left"
              stroke="#0066CC"
              label={{
                value: "Humidity %",
                angle: -90,
                dx: -40,
                dy: -60,
                position: "insideRight",
              }}
            />
            {!isP_Sensor && (
              <YAxis
                yAxisId="co2"
                orientation="right"
                stroke="#7a3015"
                label={{
                  value: "CO2 (ppm)",
                  angle: 90,
                  dx: 40,
                  dy: 30,
                  position: "insideRight",
                  offset: 40,
                }}
              />
            )}
            <Tooltip
              formatter={(value, name) => {
                if (value === null) return ["No data", name];
                if (name === "temperature")
                  return [`${value.toFixed(1)}°C`, "Temperature"];
                if (name === "humidity")
                  return [`${value.toFixed(1)}%`, "Humidity"];
                if (name === "co2") return [`${value.toFixed(1)} ppm`, "CO2"];
                return [value, name];
              }}
              labelFormatter={chartLabelFormatter}
            />
            <Legend />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="Temperature"
              stroke="#FF9933"
              dot={false}
              strokeWidth={2}
              connectNulls={true}
            />
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              name="Humidity"
              dot={false}
              stroke="#0066CC"
              strokeWidth={2}
              connectNulls={true}
            />
            {!isP_Sensor && (
              <Line
                yAxisId="co2"
                type="monotone"
                dataKey="co2"
                name="CO2"
                dot={false}
                stroke="#ab4f2e"
                strokeWidth={2}
                connectNulls={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Air Quality Chart for P sensors */}
      {isP_Sensor && (
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">空気の質 (過去3日間​)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="displayTimestamp"
                label={{
                  value: "時間 (HKT)",
                  position: "insideBottomRight",
                  offset: -5,
                }}
                tickFormatter={chartTickFormatter}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: "μg/m³ / ppb",
                  angle: -90,
                  position: "insideLeft",
                }}
                stroke="#8884d8"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "CO2 (ppm)",
                  angle: 90,
                  position: "insideRight",
                }}
                stroke="#ab4f2e"
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value === null) return ["No data", name];
                  if (name === "pm2_5")
                    return [`${value.toFixed(2)} μg/m³`, "PM2.5"];
                  if (name === "pm10")
                    return [`${value.toFixed(1)} μg/m³`, "PM10"];
                  if (name === "co2")
                    return [`${value.toFixed(1)} ppm`, "CO2"];
                  if (name === "tvoc")
                    return [`${value.toFixed(1)} ppb`, "TVOC"];
                  return [value, name];
                }}
                labelFormatter={chartLabelFormatter}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pm2_5"
                name="PM2.5"
                dot={false}
                stroke="#8884d8"
                strokeWidth={2}
                connectNulls={true}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pm10"
                name="PM10"
                dot={false}
                stroke="#b300b3"
                strokeWidth={2}
                connectNulls={true}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tvoc"
                name="TVOC"
                dot={false}
                stroke="#ffc633"
                strokeWidth={2}
                connectNulls={true}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="co2"
                name="CO2"
                dot={false}
                stroke="#ab4f2e"
                strokeWidth={2}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

  // Add this after the existing state declarations
  const [columnAverages, setColumnAverages] = useState({
    co2: 0,
    temperature: 0,
    humidity: 0,
    pressure: 0,
    pm10: 0,
    pm2_5: 0,
    tvoc: 0,
  });

  // Updated pre-fetch function in useEffect
useEffect(() => {
  const fetchAllSensorData = async () => {
    try {
      // Calculate date range for past 3 days using HKT time
      const hktNow = getCurrentHKTAsUTC();
      
      // Convert HKT time back to UTC for API call
      const hktNowUTC = new Date(hktNow.getTime() - (8 * 60 * 60 * 1000));
      const endDate = hktNowUTC.toISOString();
      const startDate = new Date(hktNowUTC.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString();

      console.log("Fetching data - Current HKT:", hktNow);
      console.log("Fetching data - UTC range:", startDate, "to", endDate);

      // Fetch data from both endpoints
      const [lResponse, pResponse] = await Promise.all([
        fetch("https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-1", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: startDate,
            endDate: endDate
          })
        }),
        fetch("https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-2", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: startDate,
            endDate: endDate
          })
        })
      ]);

      const [lData, pData] = await Promise.all([
        lResponse.json(),
        pResponse.json()
      ]);

      // Rest of the processing logic remains the same but uses the fixed conversion
      // ... (same as before but with proper timezone handling)
    } catch (error) {
      console.error("Error pre-fetching sensor data:", error);
    }
  };

  fetchAllSensorData();
  const intervalId = setInterval(fetchAllSensorData, 120000);
  return () => clearInterval(intervalId);
}, []);

  useEffect(() => {
    // Fetch HKO temperature data
    const fetchHKOTemperature = async () => {
      try {
        const response = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const result = await response.json();

        // Extract temperature from HKO API - specifically for Hong Kong Observatory
        if (result && result.temperature && result.temperature.data) {
          const hkoData = result.temperature.data.find(
            (item) => item.place === "Hong Kong Observatory"
          );
          if (hkoData) {
            setHkoTemperature(hkoData.value);
            console.log("Fetched HKO Temperature:", hkoData.value);
          }
        }
      } catch (error) {
        console.error("Error fetching HKO temperature data:", error);
      }
    };

    // Call the function initially
    fetchHKOTemperature();

    // Set up interval to fetch HKO data every 90s
    const hkoInterval = setInterval(fetchHKOTemperature, 120000);

    return () => clearInterval(hkoInterval);
  }, []);

  useEffect(() => {
    // Fetch device locations from the API
    const fetchDeviceLocations = async () => {
      try {
        const response = await fetch(
          "https://lnudevices-dot-optimus-hk.df.r.appspot.com/devices"
        );
        const devices = await response.json();
  
        //mappings of device_id to location and area
        const locationMapping = {};
        const areaIdMapping = {};
        devices.forEach((device) => {
          locationMapping[device.device_id] = device.location;
          areaIdMapping[device.device_id] = device.area;
        });
  
        setDeviceLocations(locationMapping);
        setDeviceAreaIds(areaIdMapping);
        console.log("Fetched device locations:", locationMapping);
        console.log("Fetched device area IDs:", areaIdMapping);
      } catch (error) {
        console.error("Error fetching device locations:", error);
        setIsLoading(false);
      }
    };
  
    fetchDeviceLocations();
  }, []);




  useEffect(() => {
    const fetchData = async () => {
      try {
        // Generate random sensor data
        const generateRandomSensorData = () => {
          const sensors = [];
          
          // Generate P sensors (IAQ-P1 to IAQ-P10)
for (let i = 1; i <= 10; i++) {
  const id = `IAQ-P${i.toString().padStart(2, '0')}`;
  
  // Weighted random to get mostly good/medium values
  const getWeightedCO2 = () => {
    const rand = Math.random();
    if (rand < 0.6) return Math.floor(400 + Math.random() * 400); // 400-800 (green)
    if (rand < 0.85) return Math.floor(800 + Math.random() * 200); // 800-1000 (yellow)
    return Math.floor(1000 + Math.random() * 300); // 1000-1300 (red)
  };
  
  const getWeightedTVOC = () => {
    const rand = Math.random();
    if (rand < 0.65) return Math.floor(Math.random() * 200); // 0-200 (green)
    if (rand < 0.85) return Math.floor(200 + Math.random() * 410); // 200-610 (yellow)
    return Math.floor(610 + Math.random() * 200); // 610-810 (red)
  };
  
  const getWeightedPM25 = () => {
    const rand = Math.random();
    if (rand < 0.7) return (Math.random() * 15.4).toFixed(2); // 0-15.4 (green)
    if (rand < 0.9) return (15.4 + Math.random() * 25).toFixed(2); // 15.4-40.4 (yellow)
    return (40.4 + Math.random() * 15).toFixed(2); // 40.4-55.4 (red)
  };
  
  const getWeightedPM10 = () => {
    const rand = Math.random();
    if (rand < 0.7) return (Math.random() * 54).toFixed(1); // 0-54 (green)
    if (rand < 0.9) return (54 + Math.random() * 100).toFixed(1); // 54-154 (yellow)
    return (154 + Math.random() * 50).toFixed(1); // 154-204 (red)
  };
  
  sensors.push({
    id,
    temperature: (22 + Math.random() * 8).toFixed(1), // 22-30°C (more realistic)
    humidity: (40 + Math.random() * 30).toFixed(1), // 40-70% (more realistic)
    co2: getWeightedCO2(),
    pm2_5: getWeightedPM25(),
    pm10: getWeightedPM10(),
    tvoc: getWeightedTVOC(),
    pressure: (1010 + Math.random() * 20).toFixed(1), // 1010-1030 hPa (more realistic)
    light_level: Math.floor(Math.random() * 800), // 0-800 lux
    battery: Math.floor(70 + Math.random() * 30), // 70-100%
    timestamp: new Date().toISOString(),
    last_updated: new Date().toLocaleString(),
    location: deviceLocations[id] || "Unknown Location", 
    area: deviceAreaIds[id] || "Unknown Area", 
  });
}

// Generate L sensors (IAQ-L1 to IAQ-L10)
for (let i = 1; i <= 10; i++) {
  const id = `IAQ-L${i.toString().padStart(2, '0')}`;
  
  const getWeightedCO2 = () => {
    const rand = Math.random();
    if (rand < 0.6) return Math.floor(400 + Math.random() * 400); // 400-800 (green)
    if (rand < 0.85) return Math.floor(800 + Math.random() * 200); // 800-1000 (yellow)
    return Math.floor(1000 + Math.random() * 300); // 1000-1300 (red)
  };
  
  sensors.push({
    id,
    temperature: (22 + Math.random() * 8).toFixed(1), // 22-30°C
    humidity: (40 + Math.random() * 30).toFixed(1), // 40-70%
    co2: getWeightedCO2(),
    pm2_5: "-", // L sensors don't have PM2.5
    pm10: "-", // L sensors don't have PM10
    tvoc: "-", // L sensors don't have TVOC
    pressure: (1010 + Math.random() * 20).toFixed(1), // 1010-1030 hPa
    light_level: Math.floor(Math.random() * 800), // 0-800 lux
    battery: Math.floor(70 + Math.random() * 30), // 70-100%
    timestamp: new Date().toISOString(),
    last_updated: new Date().toLocaleString(),
    location: deviceLocations[id] || "Unknown Location", 
          area: deviceAreaIds[id] || "Unknown Area", 
  });
}
          
          return sensors;
        };
    
        const randomData = generateRandomSensorData();
        
        // Sort the sensors (same logic as original)
        const sortedData = randomData.sort((a, b) => {
          const prefixA = a.id.substring(0, 5);
          const prefixB = b.id.substring(0, 5);
          if (prefixA !== prefixB) {
            return prefixA === "IAQ-P" ? -1 : 1;
          }
          const numA = parseInt(a.id.substring(5));
          const numB = parseInt(b.id.substring(5));
          return numA - numB;
        });
    
        // Calculate averages (same logic as original)
        const columns = ["co2", "temperature", "humidity", "pressure", "pm10", "pm2_5", "tvoc"];
        const avgs = {};
        
        columns.forEach((column) => {
          const values = sortedData
            .filter((sensor) => sensor[column] !== undefined && sensor[column] !== null && sensor[column] !== "-")
            .map((sensor) => parseFloat(sensor[column]) || 0);
          
          if (values.length > 0) {
            avgs[column] = values.reduce((sum, val) => sum + val, 0) / values.length;
          } else {
            avgs[column] = 0;
          }
        });
    
        const dataChanged = JSON.stringify(sortedData) !== JSON.stringify(data);
        const avgsChanged = JSON.stringify(avgs) !== JSON.stringify(columnAverages);
    
        if (dataChanged) {
          setData(sortedData);
        }
    
        if (avgsChanged) {
          setColumnAverages(avgs);
          const co2Values = sortedData
            .filter((sensor) => sensor.co2 !== undefined && sensor.co2 !== null)
            .map((sensor) => parseFloat(sensor.co2) || 0);
          if (co2Values.length > 0) {
            const avgCO2Value = co2Values.reduce((sum, val) => sum + val, 0) / co2Values.length;
            setAvgCO2(avgCO2Value);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error generating random data:", error);
        setIsLoading(false);
      }
    };

    // Only fetch data when deviceLocations is available
    if (Object.keys(deviceLocations).length > 0) {
      fetchData();
      const interval = setInterval(fetchData, 300000); // 5 mins
      return () => clearInterval(interval);
    }
  }, [deviceLocations]);

  // Add this function to check if a sensor has values exceeding the threshold
  const getExceedingMetrics = (sensor) => {
    if (!sensor) return [];

    const exceedingMetrics = [];
    const columns = [
      "co2",
      "temperature",
      "humidity",
      "pressure",
      "pm10",
      "pm2_5",
      "tvoc",
    ];

    columns.forEach((column) => {
      if (
        sensor[column] !== undefined &&
        sensor[column] !== null &&
        sensor[column] !== "-" &&
        columnAverages[column] > 0
      ) {
        const sensorValue = parseFloat(sensor[column]);
        const threshold = columnAverages[column] * 1.2; // 20% above average

        if (sensorValue > threshold) {
          exceedingMetrics.push({
            name: column,
            value: sensorValue,
            avg: columnAverages[column],
            percent: ((sensorValue / columnAverages[column] - 1) * 100).toFixed(
              1
            ),
          });
        }
      }
    });

    return exceedingMetrics;
  };

  const handleEditLocation = (sensorId) => {
    setEditingIndex(sensorId);
  };

  const handleLocationChange = (sensorId, newValue) => {
    setDeviceLocations((prev) => ({
      ...prev,
      [sensorId]: newValue,
    }));
  };

  const isMetricExceeding = (metric, metrics) => {
    return metrics.some((m) => m.name === metric);
  };

  // Then, modify each metric cell in your table to check and display the warning icon

  const handleBlur = () => {
    setEditingIndex(null);
  };

  // Function to handle sorting
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key) {
      // If already sorting by this key, toggle the direction
      direction =
        sortConfig.direction === "ascending" ? "descending" : "ascending";
    }
    setSortConfig({ key, direction });
  };

  // Function to get sorted data
  // Function to get sorted data
  const getSortedData = (dataToSort) => {
    if (!sortConfig.key) return dataToSort;

    return [...dataToSort].sort((a, b) => {
      // Handle numerical sorting for numeric columns
      if (
        [
          "co2",
          "humidity",
          "temperature",
          "pm10",
          "pm2_5",
          "tvoc",
          "battery",
        ].includes(sortConfig.key)
      ) {
        const aValue = parseFloat(a[sortConfig.key]) || 0;
        const bValue = parseFloat(b[sortConfig.key]) || 0;

        if (sortConfig.direction === "ascending") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // Handle string sorting for non-numeric columns (including id and location)
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  // Function to determine AQI level and get appropriate class
  const getAQIClass = (sensor) => {
    // Check if we have the necessary data
    if (!sensor) return "bg-gray-100"; // Default gray if no data

    // Get values (with default values if undefined)
    const co2 = parseFloat(sensor.co2) || 0;
    const tvoc = parseFloat(sensor.tvoc) || 0;
    const pm2_5 = parseFloat(sensor.pm2_5) || 0;
    const pm10 = parseFloat(sensor.pm10) || 0;

    if (co2 > 1000 || tvoc > 610 || pm2_5 > 40.4 || pm10 > 154) {
      return "bg-red-100";
    }

    if (co2 > 800 || tvoc > 200 || pm2_5 > 15.4 || pm10 > 54) {
      return "bg-yellow-100";
    }

    return "bg-green-100";
  };

  // Function to check if sensor temperature is higher than HKO temperature
  const isHigherThanHKO = (sensorTemp) => {
    if (!hkoTemperature || !sensorTemp) return false;
    return parseFloat(sensorTemp) > parseFloat(hkoTemperature);
  };

  // Apply sorting to the data
  const sortedData = getSortedData(data);

  return (
    <div style={{ backgroundColor: "#f6f6f6", minHeight: "100vh" }}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />

      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}  // No weather data needed
        showLiveCount={true}    // No live count needed
      />

      <main className="xl:pt-[120px] lg:pt-[100px] md:pt-[80px] sm:pt-[80px] pt-[80px] px-4 sm:px-6 lg:px-8 mx-2">
        <div className="flex justify-between items-center mb-8">
          <h2 className="sm:text-xl md:text-2xl lg:text-[26px] text-[22px] font-semibold">
          環境ウェルネス​
          </h2>
          <div className="flex space-x-4">
            <WeatherAirQuality className="text-[16px] md:text-xl sm:text-lg lg:text-[22px]" />
          </div>
        </div>

        {/* Replace the AlertArea line with this */}
        {!isLoading && data.length > 0 && <AlertArea alerts={getAlertSensors()} />}

        {isLoading ? (
  // Loading state
  <div className="rounded-xl custom-s mb-8 border border-[#d4d4d4] overflow-hidden bg-white">
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">読み込み中</p>
        <p className="text-gray-500 text-sm mt-2">お待ちください</p>
      </div>
    </div>
  </div>
) : (

        <div
          className="rounded-xl custom-s mb-8 border border-[#d4d4d4] overflow-hidden"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[13px] 2xl:text-sm">センサー​</span>
                      <button
                        onClick={() => requestSort("id")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Sensor"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "id"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[13px] 2xl:text-sm">場所​​</span>
                      <button
                        onClick={() => requestSort("location")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Location"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "location"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[13px] 2xl:text-sm">エリアID​</span>
                      <button
                        onClick={() => requestSort("area")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Area ID"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "area"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1  xl:text-[13px] 2xl:text-sm">温度​​</span>
                      <button
                        onClick={() => requestSort("temperature")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Temperature"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "temperature"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">湿度​</span>
                      <button
                        onClick={() => requestSort("humidity")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Humidity"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "humidity"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">CO₂</span>
                      <button
                        onClick={() => requestSort("co2")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by CO₂"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "co2"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">Pm2.5</span>
                      <button
                        onClick={() => requestSort("pm2_5")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Pm2.5"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "pm2_5"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">Pm10</span>
                      <button
                        onClick={() => requestSort("pm10")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Pm10"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "pm10"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">TVOC</span>
                      <button
                        onClick={() => requestSort("tvoc")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by TVOC"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "tvoc"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">圧力​</span>
                      <button
                        onClick={() => requestSort("pressure")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Pressure"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "pressure"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">ライトルクス​</span>
                      <button
                        onClick={() => requestSort("light_level")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Light Lux"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "light_level"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>

                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">最後の更新​</span>
                      <button
                        onClick={() => requestSort("last_updated")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Last Updated"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "last_updated"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-4">
                    <div className="flex items-center justify-center">
                      <span className="mr-1 xl:text-[12px] 2xl:text-sm">電池​</span>
                      <button
                        onClick={() => requestSort("battery")}
                        className="h-4 w-4 flex items-center justify-center"
                        aria-label="Sort by Battery"
                      >
                        <div
                          className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                            sortConfig.key === "battery"
                              ? sortConfig.direction === "ascending"
                                ? "border-b-black transform rotate-0"
                                : "border-b-black transform rotate-180"
                              : "border-b-gray-500"
                          }`}
                        />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedData.map((sensor) => {
                  const rowClass = getAQIClass(sensor);
                  const exceedingMetrics = getExceedingMetrics(sensor);
                  const hasWarning = exceedingMetrics.length > 0;
                  const isExpanded = expandedRows[sensor.id] || false;

                  return (
                    <React.Fragment key={sensor.id}>
                      <tr
                        className={`${rowClass} cursor-pointer hover:bg-gray-50`}
                        onClick={() => toggleRowExpand(sensor.id)}
                      >
                        <td className="px-3 py-4 border-b border-gray-300 text-center text-sm sm:text-base relative">
                          {sensor.id}
                          {hasWarning && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Values exceeding threshold:
                                </p>
                                {exceedingMetrics.map((metric, idx) => (
                                  <p key={idx} className="mb-1">
                                    {metric.name}: {metric.value} (
                                    {metric.percent}% above avg)
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="text-center border-b border-gray-300 px-4 py-2">
                          {sensor.location}
                        </td>
                        <td className="text-center border-b border-gray-300 px-4 py-2">
                          {sensor.area}
                        </td>

                        <td
                          className={`px-3 py-4 border-b border-gray-300 text-center text-sm sm:text-base ${
                            isHigherThanHKO(sensor.temperature)
                              ? "text-red-600 font-medium"
                              : ""
                          }`}
                        >
                          {sensor.temperature || "-"}
                          {isHigherThanHKO(sensor.temperature) && (
                            <span className="ml-1">↑</span>
                          )}
                        </td>

                        <td className="px-3 py-4 border-b border-gray-300 text-center text-sm sm:text-base">
                          {sensor.humidity || "-"}
                        </td>

                        <td className="px-3 py-4 border-b border-gray-300 text-center text-sm sm:text-base relative">
                          {sensor.co2 || "-"}
                          {isMetricExceeding("co2", exceedingMetrics) && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Value exceeding threshold:
                                </p>
                                <p>
                                  CO₂: {sensor.co2} (
                                  {
                                    exceedingMetrics.find(
                                      (m) => m.name === "co2"
                                    )?.percent
                                  }
                                  % above avg)
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300 relative">
                          {sensor.pm2_5 || "-"}
                          {isMetricExceeding("pm2_5", exceedingMetrics) && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Value exceeding threshold:
                                </p>
                                <p>
                                  PM2.5: {sensor.pm2_5} (
                                  {
                                    exceedingMetrics.find(
                                      (m) => m.name === "pm2_5"
                                    )?.percent
                                  }
                                  % above avg)
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300 relative">
                          {sensor.pm10 || "-"}
                          {isMetricExceeding("pm10", exceedingMetrics) && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Value exceeding threshold:
                                </p>
                                <p>
                                  PM10: {sensor.pm10} (
                                  {
                                    exceedingMetrics.find(
                                      (m) => m.name === "pm10"
                                    )?.percent
                                  }
                                  % above avg)
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300 relative">
                          {sensor.tvoc || "-"}
                          {isMetricExceeding("tvoc", exceedingMetrics) && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Value exceeding threshold:
                                </p>
                                <p>
                                  TVOC: {sensor.tvoc} (
                                  {
                                    exceedingMetrics.find(
                                      (m) => m.name === "tvoc"
                                    )?.percent
                                  }
                                  % above avg)
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300 relative">
                          {sensor.pressure || "-"}
                          {isMetricExceeding("pressure", exceedingMetrics) && (
                            <div className="inline-block pl-2 relative group">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-600 inline"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="absolute hidden group-hover:block z-50 bg-white border border-gray-300 rounded p-2 shadow-lg left-6 top-0 w-48 text-xs">
                                <p className="font-semibold mb-1">
                                  Value exceeding threshold:
                                </p>
                                <p>
                                  Pressure: {sensor.pressure} (
                                  {
                                    exceedingMetrics.find(
                                      (m) => m.name === "pressure"
                                    )?.percent
                                  }
                                  % above avg)
                                </p>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300">
                          {sensor.light_level === 0
                            ? "0"
                            : sensor.light_level || "-"}
                        </td>
                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300">
                          {sensor.last_updated || "-"}
                        </td>

                        <td className="px-3 py-4 text-center text-sm sm:text-base border-b border-gray-300">
                          {sensor.battery ? `${sensor.battery}%` : "-"}
                        </td>
                        <ChevronRight
                          className={`h-5 w-5 mt-8 mr-2 text-gray-600 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan="13"
                            className="border-b border-gray-300 bg-gray-50 p-0"
                          >
                            {isLoadingGraphData[sensor.id] ? (
                              <div className="p-8 text-center">
                                <p>読み込み中...</p>
                              </div>
                            ) : (
                              <SensorGraph
                                data={graphData[sensor.id] || []}
                                sensorId={sensor.id}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          

          <div className="px-8 py-3 border-t border-gray-300 bg-white">
            <div className="text-[12px] sm:text-[12px] md:text-sm text-gray-600">
              Total rows: {sortedData.length}
            </div>
          </div>
          </div>
)}
     
      </main>
    </div>
  );
};

export default IAQ;
