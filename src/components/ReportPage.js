import React, { useState, useRef } from 'react';
import HistoricalIAQ from './HistoricalIAQ';
import MDRHistorical from './MDRHistorical';
import WaterLeakHistorical from './WaterLeakHistorical';

// Import the CSV export utility functions
import { prepareCSVContent, handleExportCSV, getExportDateString } from './csvExportUtils';

const ReportPage = () => {
  // State for controlling report type, date range, etc.
  const [reportFor, setReportFor] = useState("iaq");
  const [reportType, setReportType] = useState("daily");
  const [dateRange, setDateRange] = useState({
    fromDate: "2023-05-01",
    toDate: "2023-05-07",
    month: "2023-05"
  });
  
  // Create refs for all report components
  const iaqComponentRef = useRef();
  const mdrComponentRef = useRef();
  const waterLeakComponentRef = useRef();
  
  // Function to handle CSV export
  const exportReport = () => {
    // Create params object for CSV export
    let params = {
      reportFor,
      reportType,
      dateRange,
      tableData: []
    };
    
    // Add the appropriate data based on current report type
    if (reportFor === "iaq" && iaqComponentRef.current) {
      params.iaqData = {
        tableData: iaqComponentRef.current.tableData,
        extraSensorData: iaqComponentRef.current.extraSensorData,
        hourlyDataPoints: iaqComponentRef.current.hourlyDataPoints,
        dailyDataPoints: iaqComponentRef.current.dailyDataPoints
      };
    } else if (reportFor === "mdr" && mdrComponentRef.current) {
      params.mdrData = {
        tableData: mdrComponentRef.current.tableData
      };
    } else if (reportFor === "waterLeak" && waterLeakComponentRef.current) {
      params.waterLeakData = {
        tableData: waterLeakComponentRef.current.tableData,
        convertToHKT: waterLeakComponentRef.current.convertToHKT
      };
    }
    
    // Call the export function
    handleExportCSV(params);
  };
  
  return (
    <div className="p-4">
      {/* Report type selection controls */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Report Type</h2>
        <div className="flex space-x-4">
          <button 
            onClick={() => setReportFor("iaq")}
            className={`px-4 py-2 rounded ${reportFor === "iaq" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            IAQ Report
          </button>
          <button 
            onClick={() => setReportFor("mdr")}
            className={`px-4 py-2 rounded ${reportFor === "mdr" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            MDR Report
          </button>
          <button 
            onClick={() => setReportFor("waterLeak")}
            className={`px-4 py-2 rounded ${reportFor === "waterLeak" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Water Leak Report
          </button>
        </div>
      </div>
      
      {/* Date range controls would go here */}
      {/* ... */}
      
      {/* Export button */}
      <div className="mb-6">
        <button
          onClick={exportReport}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none flex items-center"
        >
          <span className="mr-2">Export to CSV</span>
        </button>
      </div>
      
      {/* Show the appropriate component based on report type */}
      {reportFor === "iaq" && (
        <HistoricalIAQ 
          ref={iaqComponentRef}
          dateRange={dateRange} 
          reportType={reportType} 
        />
      )}
      
      {reportFor === "mdr" && (
        <MDRHistorical 
          ref={mdrComponentRef}
          dateRange={dateRange} 
          reportType={reportType} 
        />
      )}
      
      {reportFor === "waterLeak" && (
        <WaterLeakHistorical 
          ref={waterLeakComponentRef}
          dateRange={dateRange} 
          reportType={reportType} 
        />
      )}
    </div>
  );
};

export default ReportPage;