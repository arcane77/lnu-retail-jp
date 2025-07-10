import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./components/Sidebar";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import Header from "./components/Header";

const EditCallNumber = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Form data state
  const [formData, setFormData] = useState({
    book_shelf_number: "",
    location_code: "",
    start_character: "",
    start_number: "",
    stop_character: "",
    stop_number: "",
    prefix: "",
    suffix: "",
    book_defn: "",
  });

  // Data state
  const [callNumberData, setCallNumberData] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchCallNumbers();
  }, []);

  const fetchCallNumbers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://lnudevices-dot-optimus-hk.df.r.appspot.com/shelf-number",
        {
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();
      setCallNumberData(data);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    setEditingRow(row.id);
    setFormData({
      book_shelf_number: row.book_shelf_number || "",
      location_code: row.location_code || "",
      start_character: row.start_character || "",
      start_number: row.start_number?.toString() || "",
      stop_character: row.stop_character || "",
      stop_number: row.stop_number?.toString() || "",
      prefix: row.prefix || "",
      suffix: row.suffix || "",
      book_defn: row.book_defn || "",
    });
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setFormData({
      book_shelf_number: "",
      location_code: "",
      start_character: "",
      start_number: "",
      stop_character: "",
      stop_number: "",
      prefix: "",
      suffix: "",
      book_defn: "",
    });
  };

  const handleCancel = () => {
    setEditingRow(null);
    setShowAddForm(false);
    setFormData({
      book_shelf_number: "",
      location_code: "",
      start_character: "",
      start_number: "",
      stop_character: "",
      stop_number: "",
      prefix: "",
      suffix: "",
      book_defn: "",
    });
  };

  const handleInputChange = (field, value) => {
    // Validate character fields to only allow letters
    if (field === "start_character" || field === "stop_character") {
      if (!/^[A-Za-z]*$/.test(value)) return;
    }

    // Validate number fields to only allow numbers
    if (field === "start_number" || field === "stop_number") {
      if (!/^[0-9]*$/.test(value)) return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.book_shelf_number.trim()) {
      setError("書架番号は必須です。");
      return;
    }
    if (!formData.location_code.trim()) {
      setError("ロケーションコードは必須です。");
      return;
    }
    if (!formData.start_character.trim()) {
      setError("開始文字は必須です。");
      return;
    }
    if (!formData.start_number.trim()) {
      setError("	開始番号は必須です。");
      return;
    }
    if (!formData.stop_character.trim()) {
      setError("終了文字は必須です。");
      return;
    }
    if (!formData.stop_number.trim()) {
      setError("終了番号は必須です。");
      return;
    }

    setLoading(true);
    try {
      let url =
        "https://lnudevices-dot-optimus-hk.df.r.appspot.com/shelf-number";
      let method = "POST";

      // Create body with all fields (database has these columns)
      const body = {
        book_shelf_number: formData.book_shelf_number.trim(),
        location_code: formData.location_code.trim(),
        start: formData.start_character.trim() + formData.start_number.trim(),
        end: formData.stop_character.trim() + formData.stop_number.trim(),
        prefix: formData.prefix.trim() || null,
        suffix: formData.suffix.trim() || null,
        book_defn: formData.book_defn.trim() || null,
      };

      // For editing, include ID in body
      if (editingRow) {
        method = "PUT";
        body.id = editingRow;
      }

      console.log("API Request Details:", {
        method,
        url,
        body,
        editingRow,
        formData,
      });

      const response = await fetch(url, {
        method,
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      setSuccessMessage(
        editingRow ? "正常に更新されました。" : "正常に作成されました。"
      );
      setTimeout(() => setSuccessMessage(""), 3000);

      setEditingRow(null);
      setShowAddForm(false);
      setFormData({
        book_shelf_number: "",
        location_code: "",
        start_character: "",
        start_number: "",
        stop_character: "",
        stop_number: "",
        prefix: "",
        suffix: "",
        book_defn: "",
      });

      await fetchCallNumbers();
    } catch (err) {
      console.error("Save error:", err);
      setError(`Failed to save: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このレコードを削除してもよろしいですか？")) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://lnudevices-dot-optimus-hk.df.r.appspot.com/shelf-number?id=${id}`,
        {
          method: "DELETE",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      setSuccessMessage("Deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      await fetchCallNumbers();
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4 text-gray-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-gray-600" />
    );
  };

  // Filter data based on search
  const filteredData = callNumberData.filter(
  (row) =>
    row.book_shelf_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.book_defn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.start_character?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.start_number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.stop_character?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.stop_number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.prefix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.suffix?.toLowerCase().includes(searchTerm.toLowerCase())
);

  // Apply sorting to filtered data
  const sortedAndFilteredData = React.useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

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
      <main className="pt-28 xl:pt-32 px-4 md:px-8 pb-10">
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
            コールナンバーを編集  
            </h1>
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium"
            >
              コールナンバーを追加
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="書架番号、名称、開始文字、接頭辞などで検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notification Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
              新しいコールナンバーを追加
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  書架番号
                  </label>
                  <input
                    type="text"
                    value={formData.book_shelf_number}
                    onChange={(e) =>
                      handleInputChange("book_shelf_number", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  場所コード 
                  </label>
                  <input
                    type="text"
                    value={formData.location_code}
                    onChange={(e) =>
                      handleInputChange("location_code", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始文字
                  </label>
                  <input
                    type="text"
                    value={formData.start_character}
                    onChange={(e) =>
                      handleInputChange("start_character", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. DS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始番号
                  </label>
                  <input
                    type="text"
                    value={formData.start_number}
                    onChange={(e) =>
                      handleInputChange("start_number", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 727"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了文字
                  </label>
                  <input
                    type="text"
                    value={formData.stop_character}
                    onChange={(e) =>
                      handleInputChange("stop_character", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. DS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了番号
                  </label>
                  <input
                    type="text"
                    value={formData.stop_number}
                    onChange={(e) =>
                      handleInputChange("stop_number", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 815"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  接頭辞
                  </label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) =>
                      handleInputChange("prefix", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. DVD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  接尾辞
                  </label>
                  <input
                    type="text"
                    value={formData.suffix}
                    onChange={(e) =>
                      handleInputChange("suffix", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. VOL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  ラベル
                  </label>
                  <input
                    type="text"
                    value={formData.book_defn}
                    onChange={(e) =>
                      handleInputChange("book_defn", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. book"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md shadow-sm font-medium disabled:opacity-50"
                >
                  {loading ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={handleCancel}
                  className="border border-gray-500 bg-transparent hover:bg-gray-600 text-black hover:text-white px-4 py-2 rounded-md shadow-sm font-medium"
                >
                 キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && !showAddForm && !editingRow ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[520px] relative">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("book_shelf_number")}
                      >
                        <div className="flex items-center justify-between">
                        書架番号
                          {getSortIcon("book_shelf_number")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("book_defn")}
                      >
                        <div className="flex items-center justify-between">
                        ラベル
                          {getSortIcon("book_defn")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("location_code")}
                      >
                        <div className="flex items-center justify-between">
                        場所コード
                          {getSortIcon("location_code")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("start_character")}
                      >
                        <div className="flex items-center justify-between">
                        開始文字
                          {getSortIcon("start_character")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("start_number")}
                      >
                        <div className="flex items-center justify-between">
                        開始番号
                          {getSortIcon("start_number")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("stop_character")}
                      >
                        <div className="flex items-center justify-between">
                        終了文字
                          {getSortIcon("stop_character")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("stop_number")}
                      >
                        <div className="flex items-center justify-between">
                        終了番号
                          {getSortIcon("stop_number")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("prefix")}
                      >
                        <div className="flex items-center justify-between">
                        接頭辞
                          {getSortIcon("prefix")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("suffix")}
                      >
                        <div className="flex items-center justify-between">
                        接尾辞
                          {getSortIcon("suffix")}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-sm font-medium text-gray-600"
                      >
                        アクション​
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAndFilteredData.map((row) => (
                      <tr key={row.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.book_shelf_number}
                              onChange={(e) =>
                                handleInputChange(
                                  "book_shelf_number",
                                  e.target.value
                                )
                              }
                              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.book_shelf_number
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.book_defn}
                              onChange={(e) =>
                                handleInputChange("book_defn", e.target.value)
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.book_defn || "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.location_code}
                              onChange={(e) =>
                                handleInputChange(
                                  "location_code",
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.location_code
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.start_character}
                              onChange={(e) =>
                                handleInputChange(
                                  "start_character",
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.start_character || ""
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.start_number}
                              onChange={(e) =>
                                handleInputChange(
                                  "start_number",
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.start_number || ""
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.stop_character}
                              onChange={(e) =>
                                handleInputChange(
                                  "stop_character",
                                  e.target.value
                                )
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.stop_character || ""
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.stop_number}
                              onChange={(e) =>
                                handleInputChange("stop_number", e.target.value)
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.stop_number || ""
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.prefix}
                              onChange={(e) =>
                                handleInputChange("prefix", e.target.value)
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.prefix || "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {editingRow === row.id ? (
                            <input
                              type="text"
                              value={formData.suffix}
                              onChange={(e) =>
                                handleInputChange("suffix", e.target.value)
                              }
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            row.suffix || "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingRow === row.id ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={handleSave}
                                disabled={loading}
                                className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-600 rounded-md hover:bg-green-50 disabled:opacity-50"
                              >
                                {loading ? " 保存中..." : "保存"}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-500 rounded-md hover:bg-gray-50"
                              >
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(row)}
                                className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded-md hover:bg-blue-50"
                              >
                               編集
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="text-red-600 hover:text-red-900 p-2 border border-red-600 rounded-md hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedAndFilteredData.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                 コールナンバーが見つかりません。「コールナンバーを追加」をクリックして作成してください。
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditCallNumber;
