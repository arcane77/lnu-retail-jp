import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from './Sidebar';
import { Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import HistoricalIAQ from './HistoricalIAQ';
import MDRHistorical from './MDRHistorical';
import WaterLeakHistorical from './WaterLeakHistorical';

const Historical = () => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Add these refs at the beginning of your component
const iaqComponentRef = useRef();
const mdrComponentRef = useRef();
const waterLeakComponentRef = useRef();
  const [dateRange, setDateRange] = useState({
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  });
  const [reportType, setReportType] = useState("daily");
  const [reportFor, setReportFor] = useState("occupancy");
  const [averageOccupancy, setAverageOccupancy] = useState("0.00%");
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);
  const [dailyDataPoints, setDailyDataPoints] = useState({});
  
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const sidebarRef = useRef(null);

  // Helper function to get week range (Sunday to Saturday) for a given date
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    // Calculate the date of Sunday (start of week)
    const diff = d.getDate() - day;
    const sunday = new Date(d.setDate(diff));
    
    // Calculate the date of Saturday (end of week)
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    return {
      fromDate: sunday.toISOString().split("T")[0],
      toDate: saturday.toISOString().split("T")[0]
    };
  };

  // Helper function to get month range (first and last day of month)
  const getMonthRange = (yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // Last day of the month
    
    return {
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: lastDay.toISOString().split("T")[0]
    };
  };

  const rowsPerPage = 20;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const filteredData =
    deviceFilter === "all"
      ? tableData
      : tableData.filter((item) => item.deviceName.includes(deviceFilter));

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  // Colors for charts
  const COLORS = ['#C0444E', '#909191', '#FFBB28', '#FF8042', '#8884d8'];

  // Fetch occupancy data function
  const fetchOccupancyData = async () => {
    setIsLoading(true);
    try {
      // Format dates for API request
      let startDateFormatted, endDateFormatted;

      startDateFormatted = `${dateRange.fromDate}T00:00:00.000Z`;
      endDateFormatted = `${dateRange.toDate}T23:59:59.999Z`;

      const url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/occupancy';

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
        // Group data by device for daily reports or aggregate for other report types
        const groupedData = {};
        const dailyPoints = {};

        data.forEach((item) => {
          const deviceName = item.deviceName;
          
          // For weekly/monthly/custom reports, use only the device as key (ignore date)
          // For daily, use device+date as the key
          const key =
            reportType === "daily" 
              ? `${deviceName}_${item.date.split('T')[0]}` 
              : deviceName;
          
          // Store daily data points for each device (for all report types)
          if (!dailyPoints[deviceName]) {
            dailyPoints[deviceName] = [];
          }
          
          // Add this data point to the device's daily data array, ensuring positive occupancy values
          dailyPoints[deviceName].push({
            day: item.date.split('T')[0],
            occupancy: Math.abs(item.avgOccupancy || 0) * 100 // Convert to percentage
          });

          if (!groupedData[key]) {
            // Create a new entry
            groupedData[key] = {
              ...item,
              deviceName: deviceName,
              avgOccupancy: Math.abs(item.avgOccupancy || 0) * 100, // Convert to percentage
              maxOccupancy: parseInt(item.maxOccupancy) || 1, // Ensure it's a number
              original_devices: [item],
              // For weekly/monthly/custom, store the date range
              date: reportType === "daily" ? item.date : dateRange.fromDate,
            };
          } else {
            // For aggregate reports, update the average occupancy by adding this data point
            const currentTotal =
              groupedData[key].avgOccupancy *
              groupedData[key].original_devices.length;
            const newTotal = currentTotal + (Math.abs(item.avgOccupancy || 0) * 100);
            const newCount = groupedData[key].original_devices.length + 1;

            groupedData[key].avgOccupancy = newTotal / newCount;
            groupedData[key].original_devices.push(item);
          }
        });

        // Process daily data points: group by day and calculate average for each day
        Object.keys(dailyPoints).forEach(deviceName => {
          // Group data points by day for this device
          const byDay = {};
          dailyPoints[deviceName].forEach(point => {
            if (!byDay[point.day]) {
              byDay[point.day] = {
                points: [],
                total: 0
              };
            }
            byDay[point.day].points.push(point.occupancy);
            byDay[point.day].total += point.occupancy;
          });
          
          // Convert to array format suitable for charting with date formatted as DD-MM
          const processedDailyData = Object.keys(byDay).map(day => {
            const date = new Date(day);
            return {
              day: day,
              date: `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              occupancy: byDay[day].total / byDay[day].points.length
            };
          }).sort((a, b) => new Date(a.day) - new Date(b.day)); // Sort by date
          
          dailyPoints[deviceName] = processedDailyData;
        });

        // Store the processed daily data points
        setDailyDataPoints(dailyPoints);

        // Calculate occupancy percentages
        const combinedData = Object.values(groupedData).map((item) => {
          const occupancyPercentage = (item.avgOccupancy).toFixed(2);

          return {
            ...item,
            occupancy_percentage: occupancyPercentage,
          };
        });

        // Calculate average occupancy percentage
        if (combinedData.length > 0) {
          const totalOccupancyPercentage = combinedData.reduce((sum, item) => {
            return sum + parseFloat(item.occupancy_percentage);
          }, 0);

          const avgOccupancy = (
            totalOccupancyPercentage / combinedData.length
          ).toFixed(2);
          setAverageOccupancy(`${avgOccupancy}%`);
        } else {
          setAverageOccupancy("0.00%");
        }

        setTableData(combinedData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (reportFor === "occupancy") {
      fetchOccupancyData();
    }
  }, []);

  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    if (reportType === "weekly" && name === "fromDate") {
      // For weekly reports, calculate the week range (Sunday to Saturday)
      const weekRange = getWeekRange(value);
      setDateRange(prev => ({
        ...prev,
        ...weekRange
      }));
    } else {
      setDateRange((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle month selection for monthly reports
  const handleMonthChange = (e) => {
    const month = e.target.value;
    const monthRange = getMonthRange(month);
    
    setDateRange({
      ...dateRange,
      ...monthRange,
      month: month,
    });
  };

  // Handle report type change
  const handleReportTypeChange = (e) => {
    const newReportType = e.target.value;
    setReportType(newReportType);

    // Update date range based on report type
    if (newReportType === "daily") {
      // For daily reports, set toDate equal to fromDate
      setDateRange((prev) => ({
        ...prev,
        toDate: prev.fromDate,
      }));
    } else if (newReportType === "weekly") {
      // For weekly reports, calculate the week range
      const weekRange = getWeekRange(dateRange.fromDate);
      setDateRange(prev => ({
        ...prev,
        ...weekRange
      }));
    } else if (newReportType === "monthly") {
      // For monthly reports, set to current month
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthRange = getMonthRange(currentMonth);
      
      setDateRange({
        ...dateRange,
        ...monthRange,
        month: currentMonth,
      });
    }
    // For custom, keep the current date range settings
  };

  // Handle report for change
  const handleReportForChange = (e) => {
    const newReportFor = e.target.value;
    setReportFor(newReportFor);
    setExpandedRow(null); // Close any expanded rows when changing report type
    
    // Reset tableData when changing report type to avoid showing stale data
    setTableData([]);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (reportFor === "occupancy") {
      fetchOccupancyData();
    }
    setExpandedRow(null); // Close any expanded rows when generating a new report
  };

  // Format date from API format to yyyy-mm-dd
  const formatDate = (dateString) => {
    return dateString.split("T")[0];
  };

  // Toggle row expansion
  const toggleRowExpansion = (deviceName) => {
    if (expandedRow === deviceName) {
      setExpandedRow(null);
    } else {
      setExpandedRow(deviceName);
    }
  };

  // Get date display string based on report type without year
  const getDateDisplayString = (item) => {
    if (reportType === "daily") {
      // Format date as DD-MM
      const date = new Date(item.date);
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (reportType === "weekly") {
      // Format weekly range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')} (Weekly)`;
    } else if (reportType === "monthly") {
      // Show only month name
      const [year, month] = dateRange.month.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[parseInt(month) - 1]} (Monthly)`;
    } else {
      // Format custom range as DD-MM to DD-MM
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      return `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')} (Custom)`;
    }
  };

  // Prepare pie chart data for a specific device
  const preparePieChartData = (item) => {
    const occupiedValue = parseFloat(item.avgOccupancy);
    const availableValue = Math.max(0, item.maxOccupancy * 100 - occupiedValue);
    
    return [
      { name: "Occupied", value: occupiedValue },
      { name: "Available", value: availableValue }
    ];
  };

  // Render charts for expanded row
  const renderExpandedContent = (item) => {
    // Get the date display for this item
    const dateDisplay = getDateDisplayString(item);
    
    // Show daily data for all report types
    const deviceDailyData = dailyDataPoints[item.deviceName] || [];
    
    return (
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Data for {item.deviceName} | {dateDisplay}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Occupancy Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={preparePieChartData(item)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(2)}%`}
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {preparePieChartData(item).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Daily Occupancy Trend</h3>
            {deviceDailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviceDailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: 'Occupancy (%)', angle: -90, dy:30 ,position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Average Occupancy']} />
                  <Legend />
                  <Bar dataKey="occupancy" name="Daily Average Occupancy" radius={[6, 6, 0, 0]} barSize={35} fill="#C0444E" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No daily data available for the selected date range</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Determine export button text and filename based on report type
  const getExportButtonConfig = () => {
    if (reportFor === "occupancy") {
      return {
        text: "Export Occupancy CSV",
        filename: `occupancy_report_${new Date(dateRange.fromDate).toISOString().split('T')[0]}_${reportType !== "daily" ? new Date(dateRange.toDate).toISOString().split('T')[0] : new Date(dateRange.fromDate).toISOString().split('T')[0]}.csv`
      };
    } else if (reportFor === "iaq") {
      return {
        text: "Export IAQ Data",
        filename: `iaq_report_${new Date(dateRange.fromDate).toISOString().split('T')[0]}_${reportType !== "daily" ? new Date(dateRange.toDate).toISOString().split('T')[0] : new Date(dateRange.fromDate).toISOString().split('T')[0]}.csv`
      };
    } else if (reportFor === "mdr") {
      return {
        text: "Export MDR Data",
        filename: `mdr_report_${new Date(dateRange.fromDate).toISOString().split('T')[0]}_${reportType !== "daily" ? new Date(dateRange.toDate).toISOString().split('T')[0] : new Date(dateRange.fromDate).toISOString().split('T')[0]}.csv`
      };
    } else if (reportFor === "waterLeak") {
      return {
        text: "Export Leak Data",
        filename: `water_leak_report_${new Date(dateRange.fromDate).toISOString().split('T')[0]}_${reportType !== "daily" ? new Date(dateRange.toDate).toISOString().split('T')[0] : new Date(dateRange.fromDate).toISOString().split('T')[0]}.csv`
      };
    } else {
      return {
        text: `Export ${reportFor.toUpperCase()} Data`,
        filename: `${reportFor}_report_${new Date(dateRange.fromDate).toISOString().split('T')[0]}_${reportType !== "daily" ? new Date(dateRange.toDate).toISOString().split('T')[0] : new Date(dateRange.fromDate).toISOString().split('T')[0]}.csv`
      };
    }
  };

  

// Helper function to get formatted date string for export
const getExportDateString = () => {
  if (reportType === "daily") {
    const date = new Date(dateRange.fromDate);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  } else if (reportType === "weekly") {
    const fromDate = new Date(dateRange.fromDate);
    const toDate = new Date(dateRange.toDate);
    return `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()} (Weekly)`;
  } else if (reportType === "monthly") {
    const [year, month] = dateRange.month.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year} (Monthly)`;
  } else {
    const fromDate = new Date(dateRange.fromDate);
    const toDate = new Date(dateRange.toDate);
    return `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()} (Custom)`;
  }
};

// Function to handle the CSV export
// Function to handle the CSV export
const handleExportCSV = () => {
  // Define these variables at the beginning of the function
  let csvContent = "";
  let filename = "";
  const dateStr = getExportDateString().replace(/\s/g, "_").replace(/[\/\(\)]/g, "");
  
  if (reportFor === "occupancy") {
    // Existing occupancy export logic
    csvContent = "data:text/csv;charset=utf-8," +
      "Device Name,Date,Average Occupancy (%),Max Capacity,Occupancy %\n" +
      tableData
        .map(
          (row) => {
            // Format date string for CSV export - include year for CSV but not for display
            let dateString;
            if (reportType === "daily") {
              const date = new Date(row.date);
              dateString = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            } else if (reportType === "weekly") {
              const fromDate = new Date(dateRange.fromDate);
              const toDate = new Date(dateRange.toDate);
              dateString = `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()} (Weekly)`;
            } else if (reportType === "monthly") {
              const [year, month] = dateRange.month.split('-');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              dateString = `${monthNames[parseInt(month) - 1]} ${year} (Monthly)`;
            } else {
              const fromDate = new Date(dateRange.fromDate);
              const toDate = new Date(dateRange.toDate);
              dateString = `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()} (Custom)`;
            }
            
            return `${row.deviceName},${dateString},${row.avgOccupancy.toFixed(2)},${row.maxOccupancy},${
              row.occupancy_percentage
            }%`;
          }
        )
        .join("\n");
    
    filename = `Occupancy_Report_${dateStr}.csv`;
  } 
  else if (reportFor === "iaq" && iaqComponentRef.current) {
    // Access IAQ data directly from the component ref
    const { tableData, extraSensorData, hourlyDataPoints } = iaqComponentRef.current;
    const dateString = getExportDateString();
    
    // Create header and data rows
    csvContent = "data:text/csv;charset=utf-8," +
      "Device,CO2 (ppm),Temperature (°C),Humidity (%),Date\n";
      
    if (tableData && tableData.length > 0) {
      csvContent += tableData
        .map(item => {
          return `${item.device},${item.co2.toFixed(2)},${item.temp.toFixed(2)},${item.humidity.toFixed(2)},${dateString}`;
        })
        .join("\n");
      
      // Add hourly data if available for daily reports
      if (reportType === "daily" && hourlyDataPoints && Object.keys(hourlyDataPoints).length > 0) {
        // Add a blank line as separator
        csvContent += "\n\n";
        
        // Add hourly data section
        csvContent += "Hourly Data\n";
        csvContent += "Device,Date,Time (HKT),CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        // Add the hourly data for each device
        Object.keys(hourlyDataPoints).forEach(device => {
          hourlyDataPoints[device].forEach(dataPoint => {
            // Fix for NaN-NaN-NaN issue: Use proper date handling with fallbacks
            let dateStr = dateString; // Use the report date as fallback
            
            // Try to get date from the hour property if it exists
            if (dataPoint.hour) {
              try {
                const timestamp = new Date(dataPoint.hour);
                // Check if timestamp is valid before using it
                if (!isNaN(timestamp.getTime())) {
                  dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
                }
              } catch (e) {
                console.error('Error parsing hourly timestamp:', e);
                // Keep using the fallback date
              }
            }
            
            // Check if displayTime exists, use default formatting if not
            const timeStr = dataPoint.displayTime || 
                          (dataPoint.utcHour !== undefined ? 
                            `${String((dataPoint.utcHour + 8) % 24).padStart(2, '0')}:00` : 
                            "00:00");
            
            csvContent += `${device},${dateStr},${timeStr},${dataPoint.co2?.toFixed(2) || "0.00"},${dataPoint.temp?.toFixed(2) || "0.00"},${dataPoint.humidity?.toFixed(2) || "0.00"}\n`;
          });
        });
      }
      
      // Add P-sensor data if available (with similar fixes)
      if (extraSensorData && Object.keys(extraSensorData).length > 0) {
        csvContent += "\n\nAdvanced Sensor Data (IAQ-P Devices Only)\n";
        csvContent += "Device,Date,Time,PM2.5 (µg/m³),PM10 (µg/m³),TVOC,CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        Object.keys(extraSensorData).forEach(device => {
          extraSensorData[device].forEach(dataPoint => {
            // Similar fix for timestamps
            let dateStr = dateString; // Use report date as fallback
            
            try {
              const timestamp = new Date(dataPoint.hour || dataPoint.day || dateRange.fromDate);
              if (!isNaN(timestamp.getTime())) {
                dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
              }
            } catch (e) {
              console.error('Error parsing sensor timestamp:', e);
            }
            
            const timeStr = reportType === "daily" ? 
                         (dataPoint.displayTime || "00:00") : 
                         "Daily Average";
            
            // Use optional chaining and nullish coalescing to avoid null/undefined errors
            csvContent += `${device},${dateStr},${timeStr},${dataPoint.pm2_5?.toFixed(2) || "0.00"},${dataPoint.pm10?.toFixed(2) || "0.00"},${dataPoint.tvoc?.toFixed(2) || "0.00"},${dataPoint.co2?.toFixed(2) || "0.00"},${dataPoint.temp?.toFixed(2) || "0.00"},${dataPoint.humidity?.toFixed(2) || "0.00"}\n`;
          });
        });
      }
    } else {
      csvContent += "No IAQ data available for the selected date range";
    }
    
    filename = `IAQ_Report_${dateStr}.csv`;
  } 
  else if (reportFor === "mdr" && mdrComponentRef.current) {
    // MDR CSV Export
    const { tableData } = mdrComponentRef.current;
    
    csvContent = "data:text/csv;charset=utf-8," +
      "Device Name,Magnet Status,Battery (%),Time\n";
      
    if (tableData && tableData.length > 0) {
      csvContent += tableData
        .map(item => {
          // Format date for CSV
          const date = new Date(item.time);
          const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          
          return `${item.deviceName},${item.magnet_status},${item.battery},${formattedDate}`;
        })
        .join("\n");
    } else {
      csvContent += "No MDR data available for the selected date range";
    }
    
    filename = `MDR_Report_${dateStr}.csv`;
  } 
  else if (reportFor === "waterLeak" && waterLeakComponentRef.current) {
    // Water Leak CSV Export
    const { tableData, convertToHKT } = waterLeakComponentRef.current;
    
    csvContent = "data:text/csv;charset=utf-8," +
      "Sensor ID,Leak Status,Leak Time (HKT),Acknowledgment Status,Acknowledged By,Acknowledgment Time (HKT)\n";
      
    if (tableData && tableData.length > 0 && typeof convertToHKT === 'function') {
      csvContent += tableData
        .map(item => {
          // Convert leak time to HKT
          const leakTime = convertToHKT(item.leak_time);
          
          // Handle acknowledgment status and related fields
          const ackStatus = item.ack_time ? "Acknowledged" : "Pending";
          const ackBy = item.ack_time ? (item.userName || "Unknown") : "";
          const ackTime = item.ack_time ? convertToHKT(item.ack_time) : "";
          
          // Format leak status text
          const leakStatusText = item.leakage_status === 1 ? "Leak Detected" : "No Leak";
          
          return `${item.sensor},${leakStatusText},${leakTime},${ackStatus},${ackBy},${ackTime}`;
        })
        .join("\n");
    } else {
      csvContent += "No water leak data available for the selected date range";
    }
    
    filename = `WaterLeak_Report_${dateStr}.csv`;
  } else {
    // Fallback for other report types
    csvContent = "data:text/csv;charset=utf-8," + "No data available for " + reportFor;
    filename = `${reportFor}_Report_${dateStr}.csv`;
  }
  
  // Create a link element to trigger the download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to prepare and download CSV
const prepareAndDownloadCSV = (params) => {
  let csvContent = "";
  const dateStr = getExportDateString().replace(/\s/g, "_").replace(/[\/\(\)]/g, "");
  let filename = "";
  
  if (params.reportFor === "iaq") {
    // IAQ CSV Export logic
    const { tableData, extraSensorData, hourlyDataPoints } = params.iaqData;
    const dateString = getExportDateString();
    
    // Create header and data rows
    csvContent = "data:text/csv;charset=utf-8," +
      "Device,CO2 (ppm),Temperature (°C),Humidity (%),Date\n";
      
    if (tableData && tableData.length > 0) {
      csvContent += tableData
        .map(item => {
          return `${item.device},${item.co2.toFixed(2)},${item.temp.toFixed(2)},${item.humidity.toFixed(2)},${dateString}`;
        })
        .join("\n");
      
      // Add P-sensor data if available
      if (extraSensorData && Object.keys(extraSensorData).length > 0) {
        csvContent += "\n\nAdvanced Sensor Data (IAQ-P Devices Only)\n";
        csvContent += "Device,Date,Time,PM2.5 (µg/m³),PM10 (µg/m³),TVOC,CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        Object.keys(extraSensorData).forEach(device => {
          extraSensorData[device].forEach(dataPoint => {
            const timestamp = new Date(dataPoint.hour || dataPoint.day);
            const dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
            const timeStr = params.reportType === "daily" ? dataPoint.displayTime : "Daily Average";
            
            csvContent += `${device},${dateStr},${timeStr},${dataPoint.pm2_5.toFixed(2)},${dataPoint.pm10.toFixed(2)},${dataPoint.tvoc.toFixed(2)},${dataPoint.co2.toFixed(2)},${dataPoint.temp.toFixed(2)},${dataPoint.humidity.toFixed(2)}\n`;
          });
        });
      }
      
      // Add hourly data if available
      if (params.reportType === "daily" && hourlyDataPoints && Object.keys(hourlyDataPoints).length > 0) {
        csvContent += "\n\nHourly Data\n";
        csvContent += "Device,Date,Time (HKT),CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        Object.keys(hourlyDataPoints).forEach(device => {
          hourlyDataPoints[device].forEach(dataPoint => {
            const timestamp = new Date(dataPoint.hour);
            const dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
            
            csvContent += `${device},${dateStr},${dataPoint.displayTime},${dataPoint.co2.toFixed(2)},${dataPoint.temp.toFixed(2)},${dataPoint.humidity.toFixed(2)}\n`;
          });
        });
      }
    }
    
    filename = `IAQ_Report_${dateStr}.csv`;
  } 
  else if (params.reportFor === "mdr") {
    // MDR CSV Export logic
    const { tableData } = params.mdrData;
    
    csvContent = "data:text/csv;charset=utf-8," +
      "Device Name,Magnet Status,Battery (%),Time\n";
      
    if (tableData && tableData.length > 0) {
      csvContent += tableData
        .map(item => {
          const date = new Date(item.time);
          const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          
          return `${item.deviceName},${item.magnet_status},${item.battery},${formattedDate}`;
        })
        .join("\n");
    }
    
    filename = `MDR_Report_${dateStr}.csv`;
  } 
  else if (params.reportFor === "waterLeak") {
    // Water Leak CSV Export logic
    const { tableData, convertToHKT } = params.waterLeakData;
    
    csvContent = "data:text/csv;charset=utf-8," +
      "Sensor ID,Leak Status,Leak Time (HKT),Acknowledgment Status,Acknowledged By,Acknowledgment Time (HKT)\n";
      
    if (tableData && tableData.length > 0) {
      csvContent += tableData
        .map(item => {
          const leakTime = convertToHKT(item.leak_time);
          const ackStatus = item.ack_time ? "Acknowledged" : "Pending";
          const ackBy = item.ack_time ? (item.userName || "Unknown") : "";
          const ackTime = item.ack_time ? convertToHKT(item.ack_time) : "";
          const leakStatusText = item.leakage_status === 1 ? "Leak Detected" : "No Leak";
          
          return `${item.sensor},${leakStatusText},${leakTime},${ackStatus},${ackBy},${ackTime}`;
        })
        .join("\n");
    }
    
    filename = `WaterLeak_Report_${dateStr}.csv`;
  }
  
  // Create a link element to trigger the download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // Render occupancy report content
  const renderOccupancyContent = () => {
    return (
      <div className="mb-10 rounded-xl border custom-shadow  border-gray-300 overflow-hidden bg-white w-11/12 mx-auto">
        {isLoading ? (
          <div className="text-center py-10">Loading data...</div>
        ) : tableData.length > 0 ? (
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center px-4 py-4">Device Name</th>
                <th className="text-center px-4 py-4">Average Occupancy</th>
                <th className="text-center px-4 py-4">Max Capacity</th>
                <th className="text-center px-4 py-4">Overview</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((item, index) => (
                <React.Fragment key={`${item.deviceName}-${item.date}`}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50 ${
                      index === currentRows.length - 1 && expandedRow !== item.deviceName
                        ? ""
                        : "border-b border-gray-300"
                    }`}
                    onClick={() => toggleRowExpansion(item.deviceName)}
                  >
                    <td className="text-center px-4 py-4">{item.deviceName}</td>
                    <td className="text-center px-4 py-4">
                      {item.avgOccupancy.toFixed(2)}%
                    </td>
                    <td className="text-center px-4 py-4">
                      {item.maxOccupancy}
                    </td>
                    <td className="text-center px-4 py-4">
                      {expandedRow === item.deviceName ? (
                        <ChevronUp className="w-5 h-5 mx-auto" />
                      ) : (
                        <ChevronDown className="w-5 h-5 mx-auto" />
                      )}
                    </td>
                  </tr>
                  {expandedRow === item.deviceName && (
                    <tr>
                      <td colSpan="6" className="p-0">
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
            No data available for the selected date range
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
    );
  };

  return (
    <div>
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} logout={logout} />

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
        <img src="/library-logo-final_2024.png" alt="LNU Logo" className='h-6 sm:h-10 lg:h-12 xl:h-14 mx-auto' />
      </header>

      <div className="relative mt-24">
        <div className="bg-[#C0444E] text-white pt-6 px-6 pb-20 rounded-b-2xl w-full flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Historical Report</h2>
          <button
            className="bg-white text-[#C0444E] px-4 py-2 rounded-md font-medium border border-[#C0444E]"
            onClick={handleExportCSV}
          >
            {getExportButtonConfig().text}
          </button>
        </div>

        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white p-6 shadow-md rounded-xl w-11/12 max-w-5xl">
  <form
    onSubmit={handleSubmit}
    className="flex flex-col md:flex-row flex-wrap md:items-end gap-4"
  >
    <div className="w-full md:w-auto md:flex-1">
      <label className="block text-gray-800 font-medium text-md mb-1">
        Report For
      </label>
      <select
        className="border text-gray-500 p-2 rounded-full w-full"
        value={reportFor}
        onChange={handleReportForChange}
      >
        <option value="occupancy">Occupancy</option>
        <option value="iaq">IAQ</option>
        <option value="mdr">MDR</option>
        <option value="waterLeak">Water Leak</option>
      </select>
    </div>
    
    <div className="w-full md:w-auto md:flex-1">
    <label className="block text-gray-800 font-medium text-md mb-1">
    {reportType === "monthly" ? "Select Month" :
     reportType === "custom" ? "Select Date Range" :
     reportType === "weekly" ? (
       <div className="flex items-center">
         <span>Select Week</span>
         <span className="ml-2 text-xs text-gray-500">
           {(() => {
             const fromDate = new Date(dateRange.fromDate);
             const toDate = new Date(dateRange.toDate);
             return `Week: ${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')} to ${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}`;
           })()}
         </span>
       </div>
     ) : "Select Date"}
  </label>
      <div className={`flex ${reportType === "custom" ? "flex-col sm:flex-row" : ""} gap-2`}>
        {reportType === "monthly" ? (
          // Month selector for monthly reports
          <input
            type="month"
            name="month"
            value={dateRange.month}
            onChange={handleMonthChange}
            className="border p-2 rounded-full w-full"
          />
        ) : reportType === "custom" ? (
          // Two date selectors for custom date range
          <>
            <div className="w-full">
              <input
                type="date"
                name="fromDate"
                value={dateRange.fromDate}
                onChange={handleDateChange}
                className="border p-2 rounded-full w-full"
                placeholder="From"
              />
              <span className="text-xs text-gray-500 mt-1 block sm:hidden">From</span>
            </div>
            <div className="w-full">
              <input
                type="date"
                name="toDate"
                value={dateRange.toDate}
                onChange={handleDateChange}
                className="border p-2 rounded-full w-full"
                placeholder="To"
              />
              <span className="text-xs text-gray-500 mt-1 block sm:hidden">To</span>
            </div>
          </>
        ) : (
          // Single date selector for daily and weekly reports
          <input
            type="date"
            name="fromDate"
            value={dateRange.fromDate}
            onChange={handleDateChange}
            className="border p-2 rounded-full w-full"
          />
        )}
      </div>
      
    </div>
    
    <div className="w-full md:w-auto md:flex-1">
      <label className="block text-gray-800 font-medium text-md mb-1">
        Report Type
      </label>
      <select
        className="border text-gray-500 p-2 rounded-full w-full"
        value={reportType}
        onChange={handleReportTypeChange}
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom</option>
      </select>
    </div>
    
    <div className="w-full md:w-auto flex justify-start md:justify-end mt-2 md:mt-0">
      <button
        type="submit"
        className="bg-[#C0444E] text-white px-6 py-2 rounded-[8px]"
      >
        Generate Report
      </button>
    </div>
  </form>
</div>

        {/* Main Content - Conditionally render based on report type */}
        {/* Main Content - Conditionally render based on report type */}
<div className="mt-28">
  {reportFor === "occupancy" ? (
    renderOccupancyContent()
  ) : reportFor === "iaq" ? (
    <HistoricalIAQ 
      ref={iaqComponentRef}
      dateRange={dateRange} 
      reportType={reportType} 
    />
  ) : reportFor === "mdr" ? (
    <MDRHistorical 
      ref={mdrComponentRef}
      dateRange={dateRange} 
      reportType={reportType} 
    />
  ) : reportFor === "waterLeak" ? (
    <WaterLeakHistorical 
      ref={waterLeakComponentRef}
      dateRange={dateRange} 
      reportType={reportType} 
    />
  ) : (
    // Placeholder for future report types
    <div className="w-11/12 mx-auto mb-10 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
      <p className="text-yellow-700 py-8">
        <strong>Note:</strong> {reportFor.toUpperCase()} reports are currently under development. 
        This is a preview showing the report interface format.
      </p>
    </div>
  )}
</div>
      </div>
    </div>
  );
};

export default Historical;