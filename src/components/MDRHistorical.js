import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const MDRHistorical = forwardRef(({ dateRange, reportType }, ref) => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");

  useImperativeHandle(ref, () => ({
    tableData,
    exportToCSV: () => {
      const csvContent = generateCSV();
      downloadCSV(csvContent, `mdr-report-${dateRange.fromDate}-to-${dateRange.toDate}.csv`);
    }
  }));

  const generateCSV = () => {
    const headers = ['Device Name', 'Magnet Status', 'Battery (%)', 'Time'];
    const csvRows = [headers.join(',')];
    
    filteredData.forEach(item => {
      const row = [
        item.deviceName,
        item.magnet_status,
        `${item.battery}%`,
        formatDateTimeDisplay(item.time)
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    
    return csvRows.join('\n');
  };
  
  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const rowsPerPage = 15;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  // Filter out WS301-915M-01 device and apply device filter
  const filteredData = tableData
    .filter((item) => item.deviceName !== "WS301-915M-01") // Exclude WS301-915M-01
    .filter((item) => 
      deviceFilter === "all" ? true : item.deviceName.includes(deviceFilter)
    );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  

  // Fetch MDR data
  const fetchMDRData = async () => {
    setIsLoading(true);
    try {
      // Format dates for API request
      let startDateFormatted, endDateFormatted;

      startDateFormatted = `${dateRange.fromDate}T00:00:00.000Z`;
      endDateFormatted = `${dateRange.toDate}T23:59:59.999Z`;

      const url = 'https://lnuwaterleakack-dot-optimus-hk.df.r.appspot.com/lnu/historical/mdr';

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
        // Sort data by time (most recent first)
        const sortedData = [...data].sort((a, b) => 
          new Date(b.time) - new Date(a.time)
        );
        setTableData(sortedData);
      }
    } catch (error) {
      console.error("Error fetching MDR data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMDRData();
  }, [dateRange, reportType]);

  // Format date and time for display (DD-MM-YYYY HH:MM)
  const formatDateTimeDisplay = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-green-800';
      case 'close':
        return 'bg-green-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const translateMagnetStatus = (status) => {
    switch (status) {
      case 'open':
        return '開ける';
      case 'close':
        return '閉める';
      default:
        return status;
    }
  };
  
  // Get tamper status badge color
  const getTamperStatusColor = (status) => {
    switch (status) {
      case 'installed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  // Get battery level color
  const getBatteryLevelColor = (level) => {
    if (level >= 75) return 'text-green-600';
    if (level >= 50) return 'text-yellow-600';
    if (level >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="mb-10 rounded-xl border custom-shadow  border-gray-300 overflow-hidden bg-white w-[98%] mt-10 mx-auto">
        {isLoading ? (
          <div className="text-center py-10">Loading MDR data...</div>
        ) : tableData.length > 0 ? (
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center px-4 py-4">デバイス名​</th>
                <th className="text-center px-4 py-4">マグネットの状態​</th>
                {/* <th className="text-center px-4 py-4">Tamper Status</th> */}
                <th className="text-center px-4 py-4">電池​(%)</th>
                <th className="text-center px-4 py-4">時間​</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((item, index) => (
                <tr 
                  key={`${item.deviceName}-${item.time}`}
                  className={`hover:bg-gray-50 ${
                    index === currentRows.length - 1 
                      ? ""
                      : "border-b border-gray-300"
                  }`}
                >
                  <td className="text-center px-4 py-3">{item.deviceName}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.magnet_status)}`}>
                    {translateMagnetStatus(item.magnet_status)}
                    </span>
                  </td>
                  {/* <td className="text-center px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getTamperStatusColor(item.tamper_Status)}`}>
                      {item.tamper_Status}
                    </span>
                  </td> */}
                  <td className="text-center px-4 py-3">
                    <span className={getBatteryLevelColor(item.battery)}>
                      {item.battery}%
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    {formatDateTimeDisplay(item.time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10">
            選択した日に開いたドアはありません
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
                      ? "bg-blue-600 text-white"
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

export default MDRHistorical;