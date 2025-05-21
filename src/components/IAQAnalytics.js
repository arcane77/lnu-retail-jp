import React, { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ThermometerSun, Droplets, Wind } from "lucide-react";

// Colors for charts
const COLORS = [
  "#C0444E",
  "#909191",
  "#0088FE",
  "#82C0CC",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
];

const REFRESH_INTERVAL = 30000;

// CO2 threshold levels for color coding
const CO2_LEVELS = {
  GOOD: 700,
  MODERATE: 1000,
  HIGH: 1500,
};

// Temperature threshold levels for color coding
const TEMP_LEVELS = {
  LOW: 20,
  NORMAL: 31,
};

// Humidity threshold levels for color coding
const HUMIDITY_LEVELS = {
  LOW: 30,
  NORMAL: 70,
};

// Get color for CO2 value
const getCO2Color = (value) => {
  if (value < CO2_LEVELS.GOOD) return "#4CAF50"; // Good - Green
  if (value < CO2_LEVELS.MODERATE) return "#FF9800"; // Moderate - Yellow
  if (value < CO2_LEVELS.HIGH) return "#F44336"; // red
  return "#F44336"; // Bad - Red
};

// Get color for temperature value
const getTempColor = (value) => {
  if (value < TEMP_LEVELS.LOW) return "#2196F3"; // Cold - Blue
  if (value <= TEMP_LEVELS.NORMAL) return "#FFBB28"; // Normal - Yellow
  return "#F44336"; // Warm - Orangish-red
};

// Get color for humidity value
const getHumidityColor = (value) => {
  if (value < HUMIDITY_LEVELS.LOW) return "#2196F3"; // Dry - Blue
  if (value <= HUMIDITY_LEVELS.NORMAL) return "#0088FE"; // Normal - Yellow
  return "#F44336"; // Humid - Orangish-red
};

// Get status label for CO2 value (keep this the same)
const getCO2Status = (value) => {
  if (value < CO2_LEVELS.GOOD) return "Good";
  if (value < CO2_LEVELS.MODERATE) return "Moderate";
  if (value < CO2_LEVELS.HIGH) return "Poor";
  return "Bad";
};

// Get status label for temperature value - simplified
const getTempStatus = (value) => {
  if (value < TEMP_LEVELS.LOW) return "Cold";
  if (value <= TEMP_LEVELS.NORMAL) return "Normal";
  return "Warm";
};

// Get status label for humidity value - simplified
const getHumidityStatus = (value) => {
  if (value < HUMIDITY_LEVELS.LOW) return "Dry";
  if (value <= HUMIDITY_LEVELS.NORMAL) return "Normal";
  return "Humid";
};

// Format time for display
const formatTimeDisplay = (date) => {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
};

// Format date for display (DD-MM)
const formatDateDisplay = (date) => {
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

// Convert UTC to HKT (UTC+8)
const convertToHKT = (utcDateString) => {
  // Create a UTC date object from the timestamp string
  const utcDate = new Date(utcDateString);

  // Get the UTC time components
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth();
  const utcDay = utcDate.getUTCDate();
  const utcHour = utcDate.getUTCHours();

  // Create a new date with the UTC components but add 8 hours for HKT
  const hktDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour + 8));
  return hktDate;
};

// Format date and time for tooltip
const formatDateTimeForTooltip = (utcDateString) => {
  // Parse the UTC timestamp string
  const utcDate = new Date(utcDateString);

  // Get UTC hour directly
  const utcHour = utcDate.getUTCHours();

  // Calculate HKT hour (UTC+8)
  const hktHour = (utcHour + 8) % 24;

  const hktTime = `${String(hktHour).padStart(2, "0")}:00`;

  return `${hktTime}`;
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-gray-800">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value.toFixed(2)}
            {entry.name === "Temperature"
              ? "°C"
              : entry.name === "Humidity"
              ? "%"
              : entry.name === "CO2"
              ? " ppm"
              : entry.name === "PM2.5" || entry.name === "pm2_5"
              ? " µg/m³"
              : entry.name === "PM10" || entry.name === "pm10"
              ? " µg/m³"
              : entry.name === "TVOC" || entry.name === "tvoc"
              ? ""
              : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Sensor metric card component with pie chart
const SensorMetricCard = ({ title, value, unit, type, icon, color }) => {
  // Calculate percentage for the pie chart based on ranges
  let percentage = 0;
  let statusLabel = "";

  if (type === "co2") {
    percentage = Math.min(100, (value / 2000) * 100); // Assuming 2000 ppm is max
    statusLabel = getCO2Status(value);
  } else if (type === "temp") {
    percentage = Math.min(100, Math.max(0, ((value - 15) / 25) * 100)); // Assuming range 15°C - 40°C
    statusLabel = getTempStatus(value);
  } else if (type === "humidity") {
    percentage = Math.min(100, Math.max(0, value)); // 0-100% already
    statusLabel = getHumidityStatus(value);
  }

  const pieData = [
    { name: title, value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {icon}
      </div>
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={180}
              endAngle={0}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell key="cell-0" fill={color} />
              <Cell key="cell-1" fill="#f3f4f6" />
            </Pie>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan
                x="50%"
                dy="-5"
                className="text-2xl font-bold"
                fill={color}
              >
                {typeof value === "number" ? value.toFixed(1) : "N/A"}
              </tspan>
              <tspan x="50%" dy="25" className="text-sm" fill="#6b7280">
                {unit}
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: color }}
          ></div>
          <span className="text-sm">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
};

const IAQAnalytics = () => {
  const { logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Selected floor and zone
  const [selectedFloor, setSelectedFloor] = useState("1F");
  const [selectedZone, setSelectedZone] = useState("Zone C");

  // Report type and date selection
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(
    format(new Date(), "yyyy-MM")
  );

  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hourlyDataPoints, setHourlyDataPoints] = useState({});
  const [dailyDataPoints, setDailyDataPoints] = useState({});
  const [extraSensorData, setExtraSensorData] = useState({});
  const [averageMetrics, setAverageMetrics] = useState({
    co2: 0,
    temp: 0,
    humidity: 0,
    pm2_5: 0,
    pm10: 0,
    tvoc: 0,
  });

  // Display format and internal format mapping
  const displayFloorMap = {
    "1F": "1/F",
    MF: "M/F",
    "2F": "2/F",
    "3F": "3/F",
  };

  // Available floors for filtering
  const floors = ["1F", "2F", "3F", "MF"];

  // Determine available zones based on selected floor
  const floorZoneMapping = {
    "1F": ["Zone A", "Zone B", "Zone C"],
    "2F": ["Zone A", "Zone B", "Zone C"],
    "3F": ["Zone A", "Zone B", "Zone C"],
    MF: ["Zone A", "Zone C"],
  };

  // Get available zones for the selected floor
  const availableZones = useMemo(() => {
    return floorZoneMapping[selectedFloor] || [];
  }, [selectedFloor]);

  // Format dates for API call
  const formatDateForAPI = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Get date range based on report type
  const getDateRange = () => {
    if (reportType === "daily") {
      return {
        fromDate: formatDateForAPI(selectedDate),
        toDate: formatDateForAPI(selectedDate),
      };
    } else if (reportType === "weekly") {
      const weekStart = startOfWeek(selectedDate);
      const weekEnd = endOfWeek(selectedDate);
      return {
        fromDate: formatDateForAPI(weekStart),
        toDate: formatDateForAPI(weekEnd),
      };
    } else if (reportType === "monthly") {
      const [year, month] = currentMonth.split("-");
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      return {
        fromDate: formatDateForAPI(monthStart),
        toDate: formatDateForAPI(monthEnd),
        month: currentMonth,
      };
    } else {
      // Custom date range
      return {
        fromDate: formatDateForAPI(customStartDate),
        toDate: formatDateForAPI(customEndDate),
      };
    }
  };

  // Apply the selected date range
  const applyDateRange = () => {
    if (reportType === "custom") {
      setStartDate(customStartDate);
      setEndDate(customEndDate);
    }
    fetchIAQData();
  };

  // Helper function to map device ID to floor and zone based on exact specifications
  const mapDeviceToFloorZone = (deviceId) => {
    // 1F mappings
    if (
      ["IAQ-P01", "IAQ-L01", "IAQ-L02", "IAQ-L03", "IAQ-L04"].includes(deviceId)
    ) {
      return { floor: "1F", zone: "Zone A" };
    } else if (["IAQ-L05", "IAQ-P02", "IAQ-L06"].includes(deviceId)) {
      return { floor: "1F", zone: "Zone B" };
    } else if (["IAQ-L07", "IAQ-L08"].includes(deviceId)) {
      return { floor: "1F", zone: "Zone C" };
    }
    // 2F mappings
    else if (["IAQ-P03", "IAQ-L11", "IAQ-L12"].includes(deviceId)) {
      return { floor: "2F", zone: "Zone A" };
    } else if (["IAQ-P04"].includes(deviceId)) {
      return { floor: "2F", zone: "Zone B" };
    } else if (["IAQ-L13"].includes(deviceId)) {
      return { floor: "2F", zone: "Zone C" };
    }
    // 3F mappings
    else if (["IAQ-L14", "IAQ-L15"].includes(deviceId)) {
      return { floor: "3F", zone: "Zone A" };
    } else if (["IAQ-L16"].includes(deviceId)) {
      return { floor: "3F", zone: "Zone B" };
    } else if (["IAQ-P05", "IAQ-L17", "IAQ-L18"].includes(deviceId)) {
      return { floor: "3F", zone: "Zone C" };
    }
    // MF mappings
    else if (["IAQ-L09"].includes(deviceId)) {
      return { floor: "MF", zone: "Zone A" };
    } else if (["IAQ-L10"].includes(deviceId)) {
      return { floor: "MF", zone: "Zone C" };
    }

    // Default fallback if no mapping found
    return { floor: null, zone: null };
  };

  // List of all sensor IDs
  const ALL_SENSORS = [
    "IAQ-P01",
    "IAQ-L01",
    "IAQ-L02",
    "IAQ-L03",
    "IAQ-L04",
    "IAQ-L05",
    "IAQ-P02",
    "IAQ-L06",
    "IAQ-L07",
    "IAQ-L08",
    "IAQ-P03",
    "IAQ-L11",
    "IAQ-L12",
    "IAQ-P04",
    "IAQ-L13",
    "IAQ-L14",
    "IAQ-L15",
    "IAQ-L16",
    "IAQ-P05",
    "IAQ-L17",
    "IAQ-L18",
    "IAQ-L09",
    "IAQ-L10",
  ];

  // Get sensors for a specific floor and zone
  const getSensorsForFloorZone = (floor, zone) => {
    return ALL_SENSORS.filter((sensorId) => {
      const mapping = mapDeviceToFloorZone(sensorId);
      return mapping.floor === floor && mapping.zone === zone;
    });
  };

  // Initialize date ranges based on report type changes
  useEffect(() => {
    if (reportType === "daily") {
      // For daily, just use the selected date
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    } else if (reportType === "weekly") {
      // Set default week range (Sunday-Saturday)
      const week_start = startOfWeek(selectedDate);
      const week_end = endOfWeek(selectedDate);
      setStartDate(week_start);
      setEndDate(week_end);
    } else if (reportType === "monthly") {
      // Set default month range (first-last day)
      const [year, month] = currentMonth.split("-");
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const month_start = startOfMonth(monthDate);
      const month_end = endOfMonth(monthDate);
      setStartDate(month_start);
      setEndDate(month_end);
    } else if (reportType === "custom") {
      // For custom, initialize the custom date pickers
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
  }, [reportType, selectedDate, currentMonth]);

  // Update selected zone when floor changes to ensure we have a valid zone for that floor
  useEffect(() => {
    // Check if current selected zone is available in the new floor selection
    if (!availableZones.includes(selectedZone)) {
      // If not available, select the first available zone
      setSelectedZone(availableZones[0]);
    }
  }, [selectedFloor, availableZones, selectedZone]);

  // Fetch IAQ data based on report type
  const fetchIAQData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get date range
      const dateRange = getDateRange();

      // Format dates for API request
      let startDateFormatted = `${dateRange.fromDate}T00:00:00.000000Z`;
      let endDateFormatted = `${dateRange.toDate}T23:59:59.999999Z`;
      let url;

      // Use hourly API for daily reports, historical API for other reports
      if (reportType === "daily") {
        url =
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-1";
      } else {
        url =
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/iaq-1";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDateFormatted,
          endDate: endDateFormatted,
        }),
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        processIAQData(data);
        // Also fetch extra sensor data for all P sensors in this floor/zone
        fetchExtraSensorData();
      }
    } catch (err) {
      console.error("Error fetching IAQ data:", err);
      setError("Failed to fetch IAQ data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Process the IAQ data and calculate averages
  const processIAQData = (data) => {
    // Filter data for the selected floor and zone
    const relevantData = data.filter((item) => {
      const mapping = mapDeviceToFloorZone(item.device);
      return mapping.floor === selectedFloor && mapping.zone === selectedZone;
    });

    if (relevantData.length === 0) {
      setAverageMetrics({
        co2: 0,
        temp: 0,
        humidity: 0,
        pm2_5: 0,
        pm10: 0,
        tvoc: 0,
      });
      setHourlyDataPoints({});
      setDailyDataPoints({});
      return;
    }

    // Calculate average metrics
    let totalCO2 = 0;
    let totalTemp = 0;
    let totalHumidity = 0;
    let count = 0;

    // Group by device for hourly and daily charts
    const hourlyPoints = {};
    const dailyPoints = {};

    relevantData.forEach((item) => {
      const device = item.device;
      const timestamp = item.timestamp;
      const date = timestamp.split("T")[0];
      const hourTs = timestamp.split(":")[0];

      // Add to totals for averages
      totalCO2 += item.co2;
      totalTemp += item.temp;
      totalHumidity += item.humudity; // Note: API misspells "humidity"
      count++;

      // Initialize device arrays if they don't exist
      if (!dailyPoints[device]) {
        dailyPoints[device] = [];
      }

      if (!hourlyPoints[device]) {
        hourlyPoints[device] = [];
      }

      // For daily reports, use hourly data points
      if (reportType === "daily") {
        hourlyPoints[device].push({
          hour: hourTs,
          co2: item.co2,
          temp: item.temp,
          humidity: item.humudity,
          timestamp: timestamp,
          displayTime: formatDateTimeForTooltip(timestamp),
          utcHour: new Date(timestamp).getUTCHours(),
          rawTimestamp: new Date(timestamp),
        });
      }

      // For all report types, store daily data
      dailyPoints[device].push({
        day: date,
        co2: item.co2,
        temp: item.temp,
        humidity: item.humudity,
        date: formatDateDisplay(new Date(date)),
      });
    });

    // Process daily data points
    Object.keys(dailyPoints).forEach((device) => {
      // Sort data by date
      dailyPoints[device].sort((a, b) => new Date(a.day) - new Date(b.day));
    });

    // Process hourly data points for daily reports
    if (reportType === "daily") {
      Object.keys(hourlyPoints).forEach((device) => {
        // Sort data by timestamp using the raw UTC timestamp
        hourlyPoints[device].sort((a, b) => a.rawTimestamp - b.rawTimestamp);
      });
    }

    // Set state with the processed data
    setHourlyDataPoints(hourlyPoints);
    setDailyDataPoints(dailyPoints);
    setAverageMetrics({
      co2: count > 0 ? totalCO2 / count : 0,
      temp: count > 0 ? totalTemp / count : 0,
      humidity: count > 0 ? totalHumidity / count : 0,
      // These will be updated if P-sensor data is available
      pm2_5: 0,
      pm10: 0,
      tvoc: 0,
    });
  };

  // Fetch extra sensor data for P sensors
  const fetchExtraSensorData = async () => {
    try {
      // Get date range
      const dateRange = getDateRange();

      let startDateFormatted = `${dateRange.fromDate}T00:00:00.000000Z`;
      let endDateFormatted = `${dateRange.toDate}T23:59:59.999999Z`;
      let url;

      // Use hourly API for daily reports, historical API for other reports
      if (reportType === "daily") {
        url =
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-2";
      } else {
        url =
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/iaq-2";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDateFormatted,
          endDate: endDateFormatted,
        }),
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter data for the selected floor and zone
        const relevantData = data.filter((item) => {
          const mapping = mapDeviceToFloorZone(item.device);
          return (
            mapping.floor === selectedFloor &&
            mapping.zone === selectedZone &&
            item.device.includes("IAQ-P")
          );
        });

        if (relevantData.length > 0) {
          // Calculate averages for P sensor metrics
          let totalPM25 = 0;
          let totalPM10 = 0;
          let totalTVOC = 0;
          let count = 0;

          // Process data points for charts
          const formattedData = {};

          relevantData.forEach((item) => {
            const device = item.device;

            // Add to averages
            totalPM25 += item.pm2_5;
            totalPM10 += item.pm10;
            totalTVOC += item.tvoc;
            count++;

            // Initialize device array if it doesn't exist
            if (!formattedData[device]) {
              formattedData[device] = [];
            }

            // Add data point
            if (reportType === "daily") {
              formattedData[device].push({
                hour: item.timestamp,
                displayTime: formatDateTimeForTooltip(item.timestamp),
                pm2_5: item.pm2_5,
                pm10: item.pm10,
                tvoc: item.tvoc,
                co2: item.co2,
                temp: item.temp,
                humidity: item.humudity,
                utcHour: new Date(item.timestamp).getUTCHours(),
                rawTimestamp: new Date(item.timestamp),
              });
            } else {
              formattedData[device].push({
                day: item.timestamp.split("T")[0],
                date: formatDateDisplay(new Date(item.timestamp)),
                pm2_5: item.pm2_5,
                pm10: item.pm10,
                tvoc: item.tvoc,
                co2: item.co2,
                temp: item.temp,
                humidity: item.humudity,
              });
            }
          });

          // Sort data points
          Object.keys(formattedData).forEach((device) => {
            if (reportType === "daily") {
              formattedData[device].sort(
                (a, b) => a.rawTimestamp - b.rawTimestamp
              );
            } else {
              formattedData[device].sort(
                (a, b) => new Date(a.day) - new Date(b.day)
              );
            }
          });

          // Update extra sensor data state
          setExtraSensorData(formattedData);

          // Update average metrics with P sensor data
          setAverageMetrics((prev) => ({
            ...prev,
            pm2_5: count > 0 ? totalPM25 / count : 0,
            pm10: count > 0 ? totalPM10 / count : 0,
            tvoc: count > 0 ? totalTVOC / count : 0,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching extra sensor data:", error);
    }
  };

  // Add this new function for background refresh
const refreshIAQDataSilently = async () => {
    try {
      // Get date range
      const dateRange = getDateRange();
      
      // Format dates for API request
      let startDateFormatted = `${dateRange.fromDate}T00:00:00.000000Z`;
      let endDateFormatted = `${dateRange.toDate}T23:59:59.999999Z`;
      let url;
  
      // Use hourly API for daily reports, historical API for other reports
      if (reportType === "daily") {
        url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-1';
      } else {
        url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/iaq-1';
      }
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDateFormatted,
          endDate: endDateFormatted
        })
      });
  
      const data = await response.json();
  
      if (Array.isArray(data)) {
        processIAQData(data);
        // Also fetch extra sensor data for all P sensors in this floor/zone
        refreshExtraSensorDataSilently();
      }
    } catch (err) {
      console.error("Error refreshing IAQ data:", err);
      // Don't set error state during silent refresh
    }
  };
  
  // Add matching function for extra sensor data
  const refreshExtraSensorDataSilently = async () => {
    try {
      // Get date range
      const dateRange = getDateRange();
      
      let startDateFormatted = `${dateRange.fromDate}T00:00:00.000000Z`;
      let endDateFormatted = `${dateRange.toDate}T23:59:59.999999Z`;
      let url;
  
      // Use hourly API for daily reports, historical API for other reports
      if (reportType === "daily") {
        url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/hourly/iaq-2';
      } else {
        url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/iaq-2';
      }
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDateFormatted,
          endDate: endDateFormatted
        })
      });
  
      const data = await response.json();
  
      if (Array.isArray(data)) {
        // Process the data as before, but only for the silent update
        // This will update the state without loading indicators
        // ... (rest of the processing code as in the fetchExtraSensorData function)
        // Reuse the same data processing logic as in fetchExtraSensorData
        
        const relevantData = data.filter(item => {
          const mapping = mapDeviceToFloorZone(item.device);
          return mapping.floor === selectedFloor && 
                 mapping.zone === selectedZone && 
                 item.device.includes('IAQ-P');
        });
        
        if (relevantData.length > 0) {
          // Calculate averages for P sensor metrics
          let totalPM25 = 0;
          let totalPM10 = 0;
          let totalTVOC = 0;
          let count = 0;
          
          // Process data points for charts
          const formattedData = {};
          
          relevantData.forEach(item => {
            const device = item.device;
            
            // Add to averages
            totalPM25 += item.pm2_5;
            totalPM10 += item.pm10;
            totalTVOC += item.tvoc;
            count++;
            
            // Initialize device array if it doesn't exist
            if (!formattedData[device]) {
              formattedData[device] = [];
            }
            
            // Add data point
            if (reportType === "daily") {
              formattedData[device].push({
                hour: item.timestamp,
                displayTime: formatDateTimeForTooltip(item.timestamp),
                pm2_5: item.pm2_5,
                pm10: item.pm10,
                tvoc: item.tvoc,
                co2: item.co2,
                temp: item.temp,
                humidity: item.humudity,
                utcHour: new Date(item.timestamp).getUTCHours(),
                rawTimestamp: new Date(item.timestamp)
              });
            } else {
              formattedData[device].push({
                day: item.timestamp.split('T')[0],
                date: formatDateDisplay(new Date(item.timestamp)),
                pm2_5: item.pm2_5,
                pm10: item.pm10,
                tvoc: item.tvoc,
                co2: item.co2,
                temp: item.temp,
                humidity: item.humudity
              });
            }
          });
          
          // Sort data points
          Object.keys(formattedData).forEach(device => {
            if (reportType === "daily") {
              formattedData[device].sort((a, b) => a.rawTimestamp - b.rawTimestamp);
            } else {
              formattedData[device].sort((a, b) => new Date(a.day) - new Date(b.day));
            }
          });
          
          // Update extra sensor data state
          setExtraSensorData(formattedData);
          
          // Update average metrics with P sensor data
          setAverageMetrics(prev => ({
            ...prev,
            pm2_5: count > 0 ? totalPM25 / count : 0,
            pm10: count > 0 ? totalPM10 / count : 0,
            tvoc: count > 0 ? totalTVOC / count : 0
          }));
        }
      }
    } catch (error) {
      console.error("Error refreshing extra sensor data:", error);
      // Don't set error state during silent refresh
    }
  };

  // Initial data fetch when component mounts
  useEffect(() => {
    fetchIAQData(); // Original function with loading indicators
  }, [reportType, selectedDate, selectedFloor, selectedZone]);

  useEffect(() => {
    // Set up interval for silent auto-refresh
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing data...'); 
      refreshIAQDataSilently(); // Use the silent refresh function
    }, REFRESH_INTERVAL);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [reportType, selectedDate, selectedFloor, selectedZone]);

  // Get date display string based on report type
  const getDateDisplayString = () => {
    const dateRange = getDateRange();

    if (reportType === "daily") {
      // Format date as DD-MM-YYYY
      const date = new Date(dateRange.fromDate);
      return `${String(date.getDate()).padStart(2, "0")}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${date.getFullYear()}`;
    } else if (reportType === "weekly") {
      // Format weekly range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${formatDateDisplay(fromDate)} to ${formatDateDisplay(
        toDate
      )} (Weekly)`;
    } else if (reportType === "monthly") {
      // Show only month name
      const [year, month] = dateRange.month.split("-");
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${monthNames[parseInt(month) - 1]} ${year} (Monthly)`;
    } else {
      // Format custom range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${formatDateDisplay(fromDate)} to ${formatDateDisplay(
        toDate
      )} (Custom)`;
    }
  };

  // Prepare data for line charts
  // Prepare data for line charts
  const prepareChartData = () => {
    // Combine data from all devices in the selected floor/zone
    const dailyData = [];

    // Process hourly data and group by hour
    const hourlyMap = {};

    Object.values(hourlyDataPoints).forEach((deviceData) => {
      deviceData.forEach((dataPoint) => {
        // Use UTC hours adjusted to HKT for display
        const displayHour =
          ((dataPoint.utcHour + 8) % 24).toString().padStart(2, "0") + ":00";

        if (!hourlyMap[displayHour]) {
          hourlyMap[displayHour] = {
            displayHour: displayHour,
            co2: dataPoint.co2,
            temp: dataPoint.temp,
            humidity: dataPoint.humidity,
            count: 1,
          };
        } else {
          hourlyMap[displayHour].co2 += dataPoint.co2;
          hourlyMap[displayHour].temp += dataPoint.temp;
          hourlyMap[displayHour].humidity += dataPoint.humidity;
          hourlyMap[displayHour].count += 1;
        }
      });
    });

    // Calculate averages and convert to array
    const hourlyData = Object.values(hourlyMap).map((hour) => ({
      displayHour: hour.displayHour,
      co2: hour.co2 / hour.count,
      temp: hour.temp / hour.count,
      humidity: hour.humidity / hour.count,
    }));

    // Sort hourly data by hour
    hourlyData.sort((a, b) => {
      const hourA = parseInt(a.displayHour.split(":")[0]);
      const hourB = parseInt(b.displayHour.split(":")[0]);
      return hourA - hourB;
    });

    // Process daily data
    Object.values(dailyDataPoints).forEach((deviceData) => {
      deviceData.forEach((dataPoint) => {
        dailyData.push(dataPoint);
      });
    });

    // Group daily data by date and calculate averages
    const dailyAverages = {};
    dailyData.forEach((dataPoint) => {
      if (!dailyAverages[dataPoint.day]) {
        dailyAverages[dataPoint.day] = {
          day: dataPoint.day,
          date: dataPoint.date,
          co2: dataPoint.co2,
          temp: dataPoint.temp,
          humidity: dataPoint.humidity,
          count: 1,
        };
      } else {
        dailyAverages[dataPoint.day].co2 += dataPoint.co2;
        dailyAverages[dataPoint.day].temp += dataPoint.temp;
        dailyAverages[dataPoint.day].humidity += dataPoint.humidity;
        dailyAverages[dataPoint.day].count += 1;
      }
    });

    // Calculate averages
    const processedDailyData = Object.values(dailyAverages).map((day) => ({
      day: day.day,
      date: day.date,
      co2: day.co2 / day.count,
      temp: day.temp / day.count,
      humidity: day.humidity / day.count,
    }));

    // Sort daily data by date
    processedDailyData.sort((a, b) => new Date(a.day) - new Date(b.day));

    return {
      hourlyData,
      dailyData: processedDailyData,
    };
  };

  // Get chart data
  const { hourlyData, dailyData } = prepareChartData();

  // Prepare data for P-sensor charts
  // Prepare data for P-sensor charts
const preparePSensorChartData = () => {
    if (reportType === "daily") {
      // Daily view - Process hourly data
      const hourlyMap = {};
      
      Object.values(extraSensorData).forEach(deviceData => {
        deviceData.forEach(dataPoint => {
          const displayHour = ((dataPoint.utcHour + 8) % 24).toString().padStart(2, '0') + ':00';
          
          if (!hourlyMap[displayHour]) {
            hourlyMap[displayHour] = {
              displayHour: displayHour,
              pm2_5: dataPoint.pm2_5,
              pm10: dataPoint.pm10,
              tvoc: dataPoint.tvoc,
              count: 1
            };
          } else {
            hourlyMap[displayHour].pm2_5 += dataPoint.pm2_5;
            hourlyMap[displayHour].pm10 += dataPoint.pm10;
            hourlyMap[displayHour].tvoc += dataPoint.tvoc;
            hourlyMap[displayHour].count += 1;
          }
        });
      });
      
      // Calculate averages and convert to array
      const extraData = Object.values(hourlyMap).map(hour => ({
        displayHour: hour.displayHour,
        pm2_5: hour.pm2_5 / hour.count,
        pm10: hour.pm10 / hour.count,
        tvoc: hour.tvoc / hour.count
      }));
      
      // Sort by hour
      extraData.sort((a, b) => {
        const hourA = parseInt(a.displayHour.split(':')[0]);
        const hourB = parseInt(b.displayHour.split(':')[0]);
        return hourA - hourB;
      });
      
      return extraData;
    } else {
      // Weekly/Monthly/Custom view - Process daily data
      const dailyMap = {};
      
      Object.values(extraSensorData).forEach(deviceData => {
        deviceData.forEach(dataPoint => {
          if (!dailyMap[dataPoint.day]) {
            dailyMap[dataPoint.day] = {
              day: dataPoint.day,
              date: dataPoint.date,
              pm2_5: dataPoint.pm2_5,
              pm10: dataPoint.pm10,
              tvoc: dataPoint.tvoc,
              count: 1
            };
          } else {
            dailyMap[dataPoint.day].pm2_5 += dataPoint.pm2_5;
            dailyMap[dataPoint.day].pm10 += dataPoint.pm10;
            dailyMap[dataPoint.day].tvoc += dataPoint.tvoc;
            dailyMap[dataPoint.day].count += 1;
          }
        });
      });
      
      // Calculate averages and convert to array
      const extraData = Object.values(dailyMap).map(dayData => ({
        date: dayData.date,
        day: dayData.day,
        pm2_5: dayData.pm2_5 / dayData.count,
        pm10: dayData.pm10 / dayData.count,
        tvoc: dayData.tvoc / dayData.count
      }));
      
      // Sort by date
      extraData.sort((a, b) => new Date(a.day) - new Date(b.day));
      
      return extraData;
    }
  };

  // Get P-sensor chart data
  const pSensorData = preparePSensorChartData();

  // Check if there's any P-sensor data available
  const hasPSensorData = Object.keys(extraSensorData).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
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
      <main className="pt-2 pb-12">
        <div className="max-w-9xl mx-auto">
          {/* Controls Section */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col md:flex-row md:items-end">
                {/* Report Type */}
                <div className="mb-4 md:mb-0">
                  <label className="text-sm text-gray-600 mb-1 block">
                    Report Type
                  </label>
                  <div className="flex space-x-2">
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "daily"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("daily")}
                    >
                      Daily
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "weekly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("weekly")}
                    >
                      Weekly
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "monthly"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        reportType === "custom"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                      onClick={() => setReportType("custom")}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="md:ml-16">
                  {/* For Daily and Weekly - use a single date picker */}
                  {(reportType === "daily" || reportType === "weekly") && (
                    <div className="mb-4 md:mb-0">
                      <label className="text-sm text-gray-600 mb-1 block">
                        {reportType === "daily" ? "Select Date" : "Select Week"}
                      </label>
                      <div className="flex items-center relative">
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          dateFormat="yyyy-MM-dd"
                          className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                        />
                        {/* Calendar Icon */}
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Monthly - use month picker */}
                  {reportType === "monthly" && (
                    <div className="mb-4 md:mb-0">
                      <label className="text-sm text-gray-600 mb-1 block">
                        Select Month
                      </label>
                      <div className="flex items-center relative">
                        <input
                          type="month"
                          value={currentMonth}
                          onChange={(e) => setCurrentMonth(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                        />
                        {/* Calendar Icon */}
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Custom - use two date pickers */}
                  {reportType === "custom" && (
                    <div className="flex flex-col md:flex-row">
                      <div className="mb-4 md:mb-0 relative">
                        <label className="text-sm text-gray-600 mb-1 block">
                          Start Date
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={customStartDate}
                            onChange={(date) => setCustomStartDate(date)}
                            selectsStart
                            startDate={customStartDate}
                            endDate={customEndDate}
                            dateFormat="yyyy-MM-dd"
                            className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                          />
                          {/* Calendar Icon */}
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 md:mb-0 md:ml-6 relative">
                        <label className="text-sm text-gray-600 mb-1 block">
                          End Date
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={customEndDate}
                            onChange={(date) => setCustomEndDate(date)}
                            selectsEnd
                            startDate={customStartDate}
                            endDate={customEndDate}
                            minDate={customStartDate}
                            dateFormat="yyyy-MM-dd"
                            className="border border-gray-300 rounded-md px-3 py-2 pl-9"
                          />
                          {/* Calendar Icon */}
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Apply Button */}
              <div className="mt-4 md:mt-0">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  onClick={applyDateRange}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Date Range Banner */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <p className="text-blue-800 flex items-center">
              <svg
                className="pr-2"
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                width="25"
                height="25"
                viewBox="0,0,256,256"
              >
                <g
                  fill="#0e4a98"
                  fillRule="nonzero"
                  stroke="none"
                  strokeWidth="1"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeMiterlimit="10"
                  strokeDasharray=""
                  strokeDashoffset="0"
                  fontFamily="none"
                  fontWeight="none"
                  fontSize="none"
                  textAnchor="none"
                >
                  <g transform="scale(5.12,5.12)">
                    <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM25,11c-1.65685,0 -3,1.34315 -3,3c0,1.65685 1.34315,3 3,3c1.65685,0 3,-1.34315 3,-3c0,-1.65685 -1.34315,-3 -3,-3zM21,21v2h1h1v13h-1h-1v2h1h1h4h1h1v-2h-1h-1v-15h-1h-4z"></path>
                  </g>
                </g>
              </svg>{" "}
              Showing IAQ data for: {displayFloorMap[selectedFloor]},{" "}
              {selectedZone} - {getDateDisplayString()}
            </p>
            <p className="text-blue-700 text-sm mt-2 ml-6">
              Sensors included:{" "}
              {getSensorsForFloorZone(selectedFloor, selectedZone).join(", ")}
            </p>
          </div>

          {/* Zone and Floor Tabs */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Floor Selection - Listed first like in Viewer3.js */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-600 mb-2">Select Floor</h3>
              <div className="flex flex-wrap gap-2">
                {floors.map((floor) => (
                  <button
                    key={floor}
                    className={`px-4 py-2 rounded-md ${
                      selectedFloor === floor
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setSelectedFloor(floor)}
                  >
                    {displayFloorMap[floor]}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone Selection */}
            <div>
              <h3 className="text-sm text-gray-600 mb-2">Select Zone</h3>
              <div className="flex flex-wrap gap-2">
                {availableZones.map((zone) => (
                  <button
                    key={zone}
                    className={`px-4 py-2 rounded-md ${
                      selectedZone === zone
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setSelectedZone(zone)}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* IAQ Dashboard Content */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
              <p className="text-lg">Loading IAQ data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Metrics Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <SensorMetricCard
                  title="CO2 Level"
                  value={averageMetrics.co2}
                  unit="ppm"
                  type="co2"
                  color={getCO2Color(averageMetrics.co2)}
                  icon={<Wind className="h-6 w-6 text-gray-500" />}
                />
                <SensorMetricCard
                  title="Temperature"
                  value={averageMetrics.temp}
                  unit="°C"
                  type="temp"
                  color={getTempColor(averageMetrics.temp)}
                  icon={<ThermometerSun className="h-6 w-6 text-gray-500" />}
                />
                <SensorMetricCard
                  title="Humidity"
                  value={averageMetrics.humidity}
                  unit="%"
                  type="humidity"
                  color={getHumidityColor(averageMetrics.humidity)}
                  icon={<Droplets className="h-6 w-6 text-gray-500" />}
                />
              </div>

              {/* Main Sensor Charts */}
              {reportType === "daily" ? (
                // Hourly charts for daily view
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Hourly IAQ Trends
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CO2 Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        CO2 Levels (ppm)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} > 
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="displayHour"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}  />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="co2"
                            name="CO2"
                            stroke="#654236"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Temperature Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        Temperature (°C)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="displayHour"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}  />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="temp"
                            name="Temperature"
                            stroke="#E25D31"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Humidity Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        Humidity (%)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="displayHour"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}  />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="humidity"
                            name="Humidity"
                            stroke="#197BBD"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                // Daily trends for weekly/monthly/custom view
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Daily IAQ Trends
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* CO2 Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        CO2 Levels (ppm)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="date"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')} />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="co2"
                            name="CO2"
                            stroke="#654236"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Temperature Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        Temperature (°C)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="date"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')} />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="temp"
                            name="Temperature"
                            stroke="#E25D31"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Humidity Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        Humidity (%)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="date"  interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')} />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="humidity"
                            name="Humidity"
                            stroke="#197BBD"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* P-Sensor Additional Metrics (if available) */}
              {hasPSensorData && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Additional Air Quality Metrics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* PM2.5 Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        PM2.5 (µg/m³)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={pSensorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey={
                              reportType === "daily" ? "displayHour" : "date"
                            } interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}
                          />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="pm2_5"
                            name="PM2.5"
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* PM10 Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">
                        PM10 (µg/m³)
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={pSensorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey={
                              reportType === "daily" ? "displayHour" : "date"
                            } interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}
                          />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="pm10"
                            name="PM10"
                            stroke="#FFBB28"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* TVOC Chart */}
                    <div>
                      <h3 className="text-base font-medium mb-2">TVOC</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={pSensorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey={
                              reportType === "daily" ? "displayHour" : "date"
                            } interval={0}  tick={{ fontSize: 13 }} tickFormatter={(value) => value.split(':')[0].replace(/^0+/, '')}
                          />
                          <YAxis domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="tvoc"
                            name="TVOC"
                            stroke="#DD7373"
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default IAQAnalytics;
