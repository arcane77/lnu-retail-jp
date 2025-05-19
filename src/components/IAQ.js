import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronRight } from "lucide-react";
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

  // In the toggleRowExpand function, replace the data filtering and processing section:

  const toggleRowExpand = async (sensorId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [sensorId]: !prev[sensorId],
    }));

    // If expanding and no data exists yet, fetch it
    if (!expandedRows[sensorId] && !graphData[sensorId]) {
      setIsLoadingGraphData((prev) => ({ ...prev, [sensorId]: true }));
      try {
        // Determine which API to use based on sensor type
        const isP_Sensor = sensorId.startsWith("IAQ-P");

        // Use the appropriate endpoint
        const endpoint = isP_Sensor
          ? "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/iaqtrend-2"
          : "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/iaqtrend";

        const response = await fetch(endpoint);
        const allData = await response.json();

        // Filter data for just this sensor
        let sensorData = allData
          .filter((item) => item.device === sensorId)
          .map((item) => {
            // Convert UTC timestamp to Date object
            const utcDate = new Date(item.timestamp);

            // Calculate HKT hour (UTC+8)
            const hktHour = (utcDate.getUTCHours() + 8) % 24;

            const parseAndRound = (value) => {
              const parsed = parseFloat(value);
              return parsed ? Number(parsed.toFixed(2)) : parsed;
            };

            return {
              timestamp: utcDate,
              hour: hktHour,
              temperature: parseAndRound(item.temp),
              humidity: parseAndRound(item.humudity),
              co2: parseAndRound(item.co2),
              pm2_5: parseAndRound(item.pm2_5),
              pm10: parseAndRound(item.pm10),
              pressure: parseAndRound(item.pressure),
              light_level: parseAndRound(item.light_level),
              tvoc: isP_Sensor ? parseAndRound(item.tvoc) : null,
              sensorType: isP_Sensor ? "P" : "L",
            };
          });

        // Sort by timestamp in ascending order
        sensorData.sort((a, b) => a.timestamp - b.timestamp);

        // Get current time and calculate cutoff time (24 hours ago)
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setHours(cutoffTime.getHours() - 24);

        // Filter to only include data from the last 24 hours
        sensorData = sensorData.filter((item) => item.timestamp >= cutoffTime);

        // Group by HKT hour to get latest reading for each hour
        const hourlyData = {};
        sensorData.forEach((item) => {
          const hourKey = item.hour;

          // If we haven't stored this hour yet, or this is a newer timestamp for the same hour
          if (
            !hourlyData[hourKey] ||
            item.timestamp > hourlyData[hourKey].timestamp
          ) {
            hourlyData[hourKey] = item;
          }
        });

        // Convert back to array
        const uniqueHourlyData = Object.values(hourlyData);

        // Sort by hour for display
        uniqueHourlyData.sort((a, b) => a.hour - b.hour);

        setGraphData((prev) => ({ ...prev, [sensorId]: uniqueHourlyData }));
      } catch (error) {
        console.error("Error fetching graph data:", error);
      } finally {
        setIsLoadingGraphData((prev) => ({ ...prev, [sensorId]: false }));
      }
    }
  };

  const SensorGraph = ({ data, sensorId }) => {
    if (!data || data.length === 0) {
      return <div className="p-4 text-center">No data available</div>;
    }

    // Check if this is a P-type sensor (that has air quality data)
    const isP_Sensor = sensorId.startsWith("IAQ-P");

    // Get current HKT hour
    const now = new Date();
    const currentHourHKT = (now.getUTCHours() + 8) % 24;

    // Fill in missing hours with null values to ensure proper display
    const completeHourlyData = [];

    // Start from 24 hours ago
    const startHour = (currentHourHKT + 1) % 24; // One hour after current hour to go back 24 hours

    for (let i = 0; i < 24; i++) {
      const hour = (startHour + i) % 24;

      // Find if we have data for this hour
      const hourData = data.find((item) => item.hour === hour);

      if (hourData) {
        completeHourlyData.push(hourData);
      } else {
        // Add placeholder with just the hour
        completeHourlyData.push({
          hour: hour,
          temperature: null,
          humidity: null,
          co2: null,
          pm2_5: null,
          pm10: null,
          tvoc: null,
        });
      }
    }

    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature and Humidity Chart - always show for all sensors */}
        <div
          className={`bg-white shadow rounded-lg p-4 ${
            !isP_Sensor ? "md:col-span-2" : ""
          }`}
        >
          <h3 className="text-lg font-medium mb-2">
            {isP_Sensor
              ? "Temperature & Humidity"
              : "Temperature, Humidity & CO2"}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={completeHourlyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3"  vertical={false} />
              <XAxis
                dataKey="hour"
                label={{
                  value: "Hour (HKT)",
                  position: "insideBottomRight",
                  offset: -5,
                }}
                tickFormatter={(hour) => `${hour}:00`}
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
                if (name === "co2")
                  return [`${value.toFixed(1)} ppm`, "CO2"];
                return [value, name];
              }}
              labelFormatter={(hour) => `${hour}:00`}
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

        {/* PM2.5, PM10, TVOC and CO2 Chart - only show for P sensors */}
        {isP_Sensor && (
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Air Quality</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={completeHourlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3"  vertical={false} />
                <XAxis
                  dataKey="hour"
                  label={{
                    value: "Hour (HKT)",
                    position: "insideBottomRight",
                    offset: -5,
                  }}
                  tickFormatter={(hour) => `${hour}:00`}
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
                formatter={(value, name, props) => {
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
                labelFormatter={(hour) => `${hour}:00`}
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

  useEffect(() => {
    // Pre-fetch all sensor graph data on component mount
    const fetchAllSensorData = async () => {
      try {
        // Fetch data for P-type sensors
        const pResponse = await fetch(
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/iaqtrend-2"
        );
        const pData = await pResponse.json();

        // Fetch data for L-type sensors
        const lResponse = await fetch(
          "https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/iaqtrend"
        );
        const lData = await lResponse.json();

        // Combine all data
        const allData = [...pData, ...lData];

        // Get current time and calculate cutoff time (24 hours ago)
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setHours(cutoffTime.getHours() - 24);

        // Group data by sensor ID
        const groupedData = {};

        allData.forEach((item) => {
          const sensorId = item.device;
          const utcDate = new Date(item.timestamp);

          // Skip if data is older than 24 hours
          if (utcDate < cutoffTime) {
            return;
          }

          if (!groupedData[sensorId]) {
            groupedData[sensorId] = [];
          }

          const hktHour = (utcDate.getUTCHours() + 8) % 24;
          const isP_Sensor = sensorId.startsWith("IAQ-P");

          const parseAndRound = (value) => {
            const parsed = parseFloat(value);
            return parsed ? Number(parsed.toFixed(2)) : parsed;
          };

          groupedData[sensorId].push({
            timestamp: utcDate,
            hour: hktHour,
            temperature: parseAndRound(item.temp),
            humidity: parseAndRound(item.humudity),
            co2: parseAndRound(item.co2),
            pm2_5: parseAndRound(item.pm2_5),
            pm10: parseAndRound(item.pm10),
            pressure: parseAndRound(item.pressure),
            light_level: parseAndRound(item.light_level),
            tvoc: isP_Sensor ? parseAndRound(item.tvoc) : null,
            sensorType: isP_Sensor ? "P" : "L",
          });
        });

        // Process each sensor's data to get latest reading for each hour
        Object.keys(groupedData).forEach((sensorId) => {
          // Sort chronologically first
          groupedData[sensorId].sort((a, b) => a.timestamp - b.timestamp);

          // Deduplicate by hour (keep latest reading for each hour)
          const hourlyData = {};
          groupedData[sensorId].forEach((item) => {
            const hourKey = item.hour;
            if (
              !hourlyData[hourKey] ||
              item.timestamp > hourlyData[hourKey].timestamp
            ) {
              hourlyData[hourKey] = item;
            }
          });

          // Replace with deduplicated data
          groupedData[sensorId] = Object.values(hourlyData);

          // Sort by hour for consistent display
          groupedData[sensorId].sort((a, b) => a.hour - b.hour);
        });

        setGraphData(groupedData);
      } catch (error) {
        console.error("Error pre-fetching sensor data:", error);
      }
    };

    fetchAllSensorData();

    // Refresh data every 2mins
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
      }
    };

    fetchDeviceLocations();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://optimusc.flowfuse.cloud/iaq");
        const result = await response.json();

        // Convert the object into an array
        const dataArray = Object.entries(result).map(([id, values]) => {
          const timestamp = values.timestamp
            ? new Date(values.timestamp).toLocaleString()
            : "-";

          return {
            id,
            ...values,
            last_updated: timestamp,
            location: deviceLocations[id] || "Unknown Location",
            area: deviceAreaIds[id] || "Unknown Area",
          };
        });

        // Extract both IAQ-P and IAQ-L sensors
        const iaqSensors = dataArray.filter(
          (sensor) =>
            sensor.id.startsWith("IAQ-P") || sensor.id.startsWith("IAQ-L")
        );

        // Sort the sensors
        const sortedData = iaqSensors.sort((a, b) => {
          const prefixA = a.id.substring(0, 5);
          const prefixB = b.id.substring(0, 5);

          if (prefixA !== prefixB) {
            return prefixA === "IAQ-P" ? -1 : 1;
          }

          const numA = parseInt(a.id.substring(5));
          const numB = parseInt(b.id.substring(5));
          return numA - numB;
        });

        // Calculate averages for each column
        const columns = [
          "co2",
          "temperature",
          "humidity",
          "pressure",
          "pm10",
          "pm2_5",
          "tvoc",
        ];
        const avgs = {};

        columns.forEach((column) => {
          const values = sortedData
            .filter(
              (sensor) =>
                sensor[column] !== undefined &&
                sensor[column] !== null &&
                sensor[column] !== "-"
            )
            .map((sensor) => parseFloat(sensor[column]) || 0);

          if (values.length > 0) {
            avgs[column] =
              values.reduce((sum, val) => sum + val, 0) / values.length;
          } else {
            avgs[column] = 0;
          }
        });

        // IMPORTANT FIX: Only update the states if data has actually changed
        const dataChanged = JSON.stringify(sortedData) !== JSON.stringify(data);
        const avgsChanged =
          JSON.stringify(avgs) !== JSON.stringify(columnAverages);

        if (dataChanged) {
          setData(sortedData);
        }

        if (avgsChanged) {
          setColumnAverages(avgs);

          const co2Values = sortedData
            .filter((sensor) => sensor.co2 !== undefined && sensor.co2 !== null)
            .map((sensor) => parseFloat(sensor.co2) || 0);

          if (co2Values.length > 0) {
            const avgCO2Value =
              co2Values.reduce((sum, val) => sum + val, 0) / co2Values.length;
            setAvgCO2(avgCO2Value);
          }
        }

        // Do not update expanded rows state or graph data here
      } catch (error) {
        console.error("Error fetching IAQ data:", error);
      }
    };

    // Only fetch data when deviceLocations is available
    if (Object.keys(deviceLocations).length > 0) {
      fetchData();
      const interval = setInterval(fetchData, 120000);
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
        ["co2", "humidity", "temperature", "pm10", "pm2_5", "tvoc"].includes(
          sortConfig.key
        )
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

      <main className="xl:pt-[120px] lg:pt-[100px] md:pt-[80px] sm:pt-[80px] pt-[80px] px-4 sm:px-6 lg:px-8 mx-2">
        <div className="flex justify-between items-center mb-8">
          <h2 className="sm:text-xl md:text-2xl lg:text-[26px] text-[22px] font-semibold">
            Indoor Air Quality
          </h2>
          <div className="flex space-x-4">
            {hkoTemperature && (
              <div className="bg-white py-2 px-4 rounded-xl border border-[#d4d4d4]">
                <p className="font-medium text-sm sm:text-lg">
                  HKO Temperature: {hkoTemperature}°C
                </p>
              </div>
            )}
          </div>
        </div>

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
                      <span className="mr-1">Sensor</span>
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
                      <span className="mr-1">Location</span>
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
                      <span className="mr-1">Area ID</span>
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
                      <span className="mr-1">CO₂</span>
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
                      <span className="mr-1">Humidity</span>
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
                      <span className="mr-1">Temperature</span>
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
                      <span className="mr-1">Pm10</span>
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
                      <span className="mr-1">Pm2.5</span>
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
                      <span className="mr-1">TVOC</span>
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
                      <span className="mr-1">Pressure</span>
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
                      <span className="mr-1">Light Lux</span>
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
                      <span className="mr-1">Last Updated</span>
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
                        <td className="px-3 py-4 border-b border-gray-300 text-center text-sm sm:text-base">
                          {sensor.humidity || "-"}
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
                        <ChevronRight
                          className={`h-5 w-5 mt-8 mr-2 text-gray-600 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan="12"
                            className="border-b border-gray-300 bg-gray-50 p-0"
                          >
                            {isLoadingGraphData[sensor.id] ? (
                              <div className="p-8 text-center">
                                <p>Loading sensor data...</p>
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
      </main>
    </div>
  );
};

export default IAQ;
