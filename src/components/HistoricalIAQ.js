import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HistoricalIAQ = forwardRef(({ dateRange, reportType }, ref) => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);
  const [hourlyDataPoints, setHourlyDataPoints] = useState({});
  const [dailyDataPoints, setDailyDataPoints] = useState({});
  const [extraSensorData, setExtraSensorData] = useState({});

  useImperativeHandle(ref, () => ({
    tableData,
    extraSensorData,
    hourlyDataPoints,
    dailyDataPoints
  }));

  const rowsPerPage = 10;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const filteredData =
    deviceFilter === "all"
      ? tableData
      : tableData.filter((item) => item.device.includes(deviceFilter));

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  // Colors for charts
  const COLORS = ['#C0444E', '#909191', '#FFBB28', '#FF8042', '#8884d8'];

  // Parse UTC timestamp without timezone conversion
  const parseUTCTimestamp = (utcDateString) => {
    return new Date(utcDateString);
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

  // Format time for display
  const formatTimeDisplay = (date) => {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  };

  // Format date for display (DD-MM)
  const formatDateDisplay = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Format date and time for tooltip
  const formatDateTimeForTooltip = (utcDateString) => {
    // Parse the UTC timestamp string
    const utcDate = new Date(utcDateString);
    
    // Get UTC hour directly
    const utcHour = utcDate.getUTCHours();
    
    // Calculate HKT hour (UTC+8)
    const hktHour = (utcHour + 8) % 24;
    
    const utcTime = `${String(utcHour).padStart(2, '0')}:00`;
    const hktTime = `${String(hktHour).padStart(2, '0')}:00`;
    
    return `${hktTime} `;
    // return `${hktTime} HKT (${utcTime} UTC)`;
  };

  // Custom tooltip for LineChart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(2)}
              {entry.name === 'Temperature' ? '°C' : 
               entry.name === 'Humidity' ? '%' : 
               entry.name === 'CO2' ? ' ppm' : 
               entry.name === 'PM2.5' || entry.name === 'pm2_5' ? ' µg/m³' : 
               entry.name === 'PM10' || entry.name === 'pm10' ? ' µg/m³' : 
               entry.name === 'TVOC' || entry.name === 'tvoc' ? '' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Fetch IAQ data based on report type
  const fetchIAQData = async () => {
    setIsLoading(true);
    try {
      // Format dates for API request
      let startDateFormatted, endDateFormatted;
      let url;

      startDateFormatted = `${dateRange.fromDate}T00:00:00.000000Z`;
      endDateFormatted = `${dateRange.toDate}T23:59:59.999999Z`;

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
        // Group data by device
        const groupedData = {};
        const dailyPoints = {};
        const hourlyPoints = {};

        data.forEach((item) => {
          const device = item.device;
          const timestamp = item.timestamp;
          const date = timestamp.split('T')[0];
          const hourTs = timestamp.split(':')[0];
          
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
              // Calculate the correct HKT time for display
              displayTime: formatDateTimeForTooltip(timestamp),
              // For sorting, store the UTC hour
              utcHour: new Date(timestamp).getUTCHours(),
              // For sorting, use the actual UTC timestamp
              rawTimestamp: parseUTCTimestamp(timestamp)
            });
          }
          
          // For all report types, store daily data
          dailyPoints[device].push({
            day: date,
            co2: item.co2,
            temp: item.temp,
            humidity: item.humudity,
            date: formatDateDisplay(new Date(date))
          });
          
          // For weekly/monthly/custom reports, use only the device as key (ignore date)
          // For daily, use device as the key too, but we'll have hourly data points
          const key = device;
          
          if (!groupedData[key]) {
            // Create a new entry
            groupedData[key] = {
              device: device,
              timestamp: item.timestamp,
              date: date,
              co2: item.co2,
              temp: item.temp,
              humidity: item.humudity,
              originalData: [item]
            };
          } else {
            // For aggregate reports, update the averages
            const currentTotal = {
              co2: groupedData[key].co2 * groupedData[key].originalData.length,
              temp: groupedData[key].temp * groupedData[key].originalData.length,
              humidity: groupedData[key].humidity * groupedData[key].originalData.length
            };
            
            const newTotal = {
              co2: currentTotal.co2 + item.co2,
              temp: currentTotal.temp + item.temp,
              humidity: currentTotal.humidity + item.humudity
            };
            
            const newCount = groupedData[key].originalData.length + 1;

            groupedData[key].co2 = newTotal.co2 / newCount;
            groupedData[key].temp = newTotal.temp / newCount;
            groupedData[key].humidity = newTotal.humidity / newCount;
            groupedData[key].originalData.push(item);
          }
        });

        // Process daily data points
        Object.keys(dailyPoints).forEach(device => {
          // Sort data by date
          dailyPoints[device].sort((a, b) => new Date(a.day) - new Date(b.day));
        });
        
        // Process hourly data points for daily reports
        if (reportType === "daily") {
          Object.keys(hourlyPoints).forEach(device => {
            // Sort data by timestamp using the raw UTC timestamp
            hourlyPoints[device].sort((a, b) => a.rawTimestamp - b.rawTimestamp);
          });
        }

        setDailyDataPoints(dailyPoints);
        setHourlyDataPoints(hourlyPoints);
        setTableData(Object.values(groupedData));
      }
    } catch (error) {
      console.error("Error fetching IAQ data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch extra sensor data for P sensors
  const fetchExtraSensorData = async (device) => {
    if (!device.includes('IAQ-P')) return;

    try {
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
        // Filter data for the specific device
        const deviceData = data.filter(item => item.device === device);
        
        // Format data for chart display based on report type
        let formattedData;
        
        if (reportType === "daily") {
          // For daily reports, format with hourly data points
          formattedData = deviceData.map(item => ({
            hour: item.timestamp,
            displayTime: formatDateTimeForTooltip(item.timestamp),
            pm2_5: item.pm2_5,
            pm10: item.pm10,
            tvoc: item.tvoc,
            co2: item.co2,
            temp: item.temp,
            humidity: item.humudity,
            // Store the UTC hour for reference
            utcHour: new Date(item.timestamp).getUTCHours(),
            // For sorting, use the actual UTC timestamp
            rawTimestamp: parseUTCTimestamp(item.timestamp)
          })).sort((a, b) => a.rawTimestamp - b.rawTimestamp);
        } else {
          // For other reports, format with daily data points
          formattedData = deviceData.map(item => ({
            day: item.timestamp.split('T')[0],
            date: formatDateDisplay(new Date(item.timestamp)),
            pm2_5: item.pm2_5,
            pm10: item.pm10,
            tvoc: item.tvoc,
            co2: item.co2,
            temp: item.temp,
            humidity: item.humudity
          })).sort((a, b) => new Date(a.day) - new Date(b.day));
        }

        setExtraSensorData(prev => ({
          ...prev,
          [device]: formattedData
        }));
      }
    } catch (error) {
      console.error("Error fetching extra sensor data:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchIAQData();
    // Reset expanded row when changing date range or report type
    setExpandedRow(null);
    setExtraSensorData({});
  }, [dateRange, reportType]);

  // Get date display string based on report type
  const getDateDisplayString = (item) => {
    if (reportType === "daily") {
      // Format date as DD-MM-YYYY
      const date = new Date(dateRange.fromDate);
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    } else if (reportType === "weekly") {
      // Format weekly range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${formatDateDisplay(fromDate)} to ${formatDateDisplay(toDate)} (Weekly)`;
    } else if (reportType === "monthly") {
      // Show only month name
      const [year, month] = dateRange.month.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[parseInt(month) - 1]} (Monthly)`;
    } else {
      // Format custom range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${formatDateDisplay(fromDate)} to ${formatDateDisplay(toDate)} (Custom)`;
    }
  };

  // Toggle row expansion and fetch extra data if needed
  const toggleRowExpansion = (device) => {
    if (expandedRow === device) {
      setExpandedRow(null);
    } else {
      setExpandedRow(device);
      if (device.includes('IAQ-P') && !extraSensorData[device]) {
        fetchExtraSensorData(device);
      }
    }
  };

  // Render charts for expanded row
  const renderExpandedContent = (item) => {
    // Get the date display for this item
    const dateDisplay = getDateDisplayString(item);
    
    // Get data points for the device based on report type
    let deviceData = reportType === "daily" 
      ? hourlyDataPoints[item.device] || []
      : dailyDataPoints[item.device] || [];
    
    // Determine if it's a P sensor to show additional data
    const isPSensor = item.device.includes('IAQ-P');
    const extraData = isPSensor ? (extraSensorData[item.device] || []) : [];
    
    // X-axis key based on report type
    const xAxisKey = reportType === "daily" ? "displayTime" : "date";
    
    return (
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Data for {item.device} | {dateDisplay}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Temperature (°C)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={xAxisKey} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  name="Temperature" 
                  stroke="#E25D31" strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Humidity (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={xAxisKey} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="humidity" 
                  name="Humidity" 
                  stroke="#197BBD" strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">CO2 (ppm)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xAxisKey} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="co2" 
                name="CO2" 
                stroke="#654236" strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {isPSensor && extraData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">PM2.5 (µg/m³)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={extraData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={reportType === "daily" ? "displayTime" : "date"} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pm2_5" 
                    name="PM2.5" 
                    stroke="#8884d8" strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">PM10 (µg/m³)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={extraData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={reportType === "daily" ? "displayTime" : "date"} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pm10" 
                    name="PM10" 
                    stroke="#FFBB28" strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">TVOC</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={extraData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={reportType === "daily" ? "displayTime" : "date"} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tvoc" 
                    name="TVOC" 
                    stroke="#DD7373" strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-10 rounded-xl border custom-shadow  border-gray-300 overflow-hidden bg-white w-11/12 mx-auto">
        {isLoading ? (
          <div className="text-center py-10">Loading IAQ data...</div>
        ) : tableData.length > 0 ? (
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center px-4 py-4">Device</th>
                <th className="text-center px-4 py-4">CO2 (ppm)</th>
                <th className="text-center px-4 py-4">Temperature (°C)</th>
                <th className="text-center px-4 py-4">Humidity (%)</th>
                <th className="text-center px-4 py-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((item, index) => (
                <React.Fragment key={`${item.device}-${item.timestamp}`}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50 ${
                      index === currentRows.length - 1 && expandedRow !== item.device
                        ? ""
                        : "border-b border-gray-300"
                    }`}
                    onClick={() => toggleRowExpansion(item.device)}
                  >
                    <td className="text-center px-4 py-4">{item.device}</td>
                    <td className="text-center px-4 py-4">
                      {item.co2.toFixed(2)}
                    </td>
                    <td className="text-center px-4 py-4">
                      {item.temp.toFixed(2)}
                    </td>
                    <td className="text-center px-4 py-4">
                      {item.humidity.toFixed(2)}
                    </td>
                    <td className="text-center px-4 py-4">
                      {expandedRow === item.device ? (
                        <ChevronUp className="w-5 h-5 mx-auto" />
                      ) : (
                        <ChevronDown className="w-5 h-5 mx-auto" />
                      )}
                    </td>
                  </tr>
                  {expandedRow === item.device && (
                    <tr>
                      <td colSpan="5" className="p-0">
                        {renderExpandedContent(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10">
            No IAQ data available for the selected date range
          </div>
        )}

        {tableData.length > 0 && (
          <div className="flex items-center justify-between px-8 py-3 border-t border-gray-300 bg-white">
            <div className="text-xs sm:text-sm text-gray-600">
              Showing {indexOfFirstRow + 1}-
              {Math.min(indexOfLastRow, filteredData.length)} of{" "}
              {filteredData.length} rows
            </div>
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx + 1}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                    currentPage === idx + 1
                      ? "bg-[#C0444E] text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default HistoricalIAQ;