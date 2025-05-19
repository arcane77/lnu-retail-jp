
// Helper function to get formatted date string for export
export const getExportDateString = (reportType, dateRange) => {
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
  
  // Prepare CSV content based on report type
  export const prepareCSVContent = (params) => {
    const { 
      reportFor, 
      reportType, 
      dateRange, 
      tableData,
      iaqData,
      mdrData,
      waterLeakData
    } = params;
    
    if (reportFor === "occupancy") {
      // Occupancy export logic (keep your existing implementation)
      // ...
    } else if (reportFor === "iaq") {
      // IAQ CSV Export - using iaqData passed from parent
      const { tableData, extraSensorData, hourlyDataPoints, dailyDataPoints } = iaqData;
      const dateString = getExportDateString(reportType, dateRange);
      
      // Create header row
      let csvContent = "data:text/csv;charset=utf-8," +
        "Device,CO2 (ppm),Temperature (°C),Humidity (%),Date\n";
        
      // Add data rows 
      csvContent += tableData
        .map(item => {
          return `${item.device},${item.co2.toFixed(2)},${item.temp.toFixed(2)},${item.humidity.toFixed(2)},${dateString}`;
        })
        .join("\n");
        
      // Add P-sensor data if available
      const pSensorDevices = tableData.filter(item => item.device.includes('IAQ-P'));
      
      if (pSensorDevices.length > 0 && extraSensorData && Object.keys(extraSensorData).length > 0) {
        // Add section for P-Sensors data
        csvContent += "\n\n";
        csvContent += "Advanced Sensor Data (IAQ-P Devices Only)\n";
        csvContent += "Device,Date,Time,PM2.5 (µg/m³),PM10 (µg/m³),TVOC,CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        Object.keys(extraSensorData).forEach(device => {
          extraSensorData[device].forEach(dataPoint => {
            const timestamp = new Date(dataPoint.hour || dataPoint.day);
            const dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
            const timeStr = reportType === "daily" ? dataPoint.displayTime : "Daily Average";
            
            csvContent += `${device},${dateStr},${timeStr},${dataPoint.pm2_5.toFixed(2)},${dataPoint.pm10.toFixed(2)},${dataPoint.tvoc.toFixed(2)},${dataPoint.co2.toFixed(2)},${dataPoint.temp.toFixed(2)},${dataPoint.humidity.toFixed(2)}\n`;
          });
        });
      }
      
      // Add hourly data if available
      if (reportType === "daily" && hourlyDataPoints && Object.keys(hourlyDataPoints).length > 0) {
        csvContent += "\n\n";
        csvContent += "Hourly Data\n";
        csvContent += "Device,Date,Time (HKT),CO2 (ppm),Temperature (°C),Humidity (%)\n";
        
        Object.keys(hourlyDataPoints).forEach(device => {
          hourlyDataPoints[device].forEach(dataPoint => {
            const timestamp = new Date(dataPoint.hour);
            const dateStr = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
            
            csvContent += `${device},${dateStr},${dataPoint.displayTime},${dataPoint.co2.toFixed(2)},${dataPoint.temp.toFixed(2)},${dataPoint.humidity.toFixed(2)}\n`;
          });
        });
      }
      
      return csvContent;
    } else if (reportFor === "mdr") {
      // MDR CSV Export - using mdrData
      const { tableData } = mdrData;
      
      return "data:text/csv;charset=utf-8," +
        "Device Name,Magnet Status,Battery (%),Time\n" +
        tableData
          .map(item => {
            const date = new Date(item.time);
            const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            return `${item.deviceName},${item.magnet_status},${item.battery},${formattedDate}`;
          })
          .join("\n");
    } else if (reportFor === "waterLeak") {
      // Water Leak CSV Export - using waterLeakData
      const { tableData, convertToHKT } = waterLeakData;
      
      return "data:text/csv;charset=utf-8," +
        "Sensor ID,Leak Status,Leak Time (HKT),Acknowledgment Status,Acknowledged By,Acknowledgment Time (HKT)\n" +
        tableData
          .map(item => {
            const leakTime = convertToHKT(item.leak_time);
            const ackStatus = item.ack_time ? "Acknowledged" : "Pending";
            const ackBy = item.ack_time ? (item.userName || "Unknown") : "";
            const ackTime = item.ack_time ? convertToHKT(item.ack_time) : "";
            const leakStatusText = item.leakage_status === 1 ? "Leak Detected" : "No Leak";
            
            return `${item.sensor},${leakStatusText},${leakTime},${ackStatus},${ackBy},${ackTime}`;
          })
          .join("\n");
    } else {
      // Fallback for other report types
      return "data:text/csv;charset=utf-8," + "No data available for " + reportFor;
    }
  };
  
  // Function to handle the CSV export
  export const handleExportCSV = (params) => {
    const csvContent = prepareCSVContent(params);
    const encodedUri = encodeURI(csvContent);
    
    // Create filename based on report type
    let filename = "";
    const dateStr = getExportDateString(params.reportType, params.dateRange).replace(/\s/g, "_").replace(/[\/\(\)]/g, "");
    
    if (params.reportFor === "occupancy") {
      filename = `Occupancy_Report_${dateStr}.csv`;
    } else if (params.reportFor === "iaq") {
      filename = `IAQ_Report_${dateStr}.csv`;
    } else if (params.reportFor === "mdr") {
      filename = `MDR_Report_${dateStr}.csv`;
    } else if (params.reportFor === "waterLeak") {
      filename = `WaterLeak_Report_${dateStr}.csv`;
    }
    
    // Create a link element to trigger the download
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };