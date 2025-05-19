import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const MDRHistorical = forwardRef(({ dateRange, reportType }, ref) => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");

  useImperativeHandle(ref, () => ({
    tableData
  }));

  const rowsPerPage = 15;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const filteredData =
    deviceFilter === "all"
      ? tableData
      : tableData.filter((item) => item.deviceName.includes(deviceFilter));

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
      <div className="mb-10 rounded-xl border custom-shadow  border-gray-300 overflow-hidden bg-white w-11/12 mx-auto">
        {isLoading ? (
          <div className="text-center py-10">Loading MDR data...</div>
        ) : tableData.length > 0 ? (
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center px-4 py-4">Device Name</th>
                <th className="text-center px-4 py-4">Magnet Status</th>
                {/* <th className="text-center px-4 py-4">Tamper Status</th> */}
                <th className="text-center px-4 py-4">Battery (%)</th>
                <th className="text-center px-4 py-4">Time</th>
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
                      {item.magnet_status}
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
            No doors are opened for the selected date range
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

export default MDRHistorical;