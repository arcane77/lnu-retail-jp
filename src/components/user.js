import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const UserManagement = () => {
  const { logout } = useAuth0();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetUserId, setResetUserId] = useState(null);
  const [resetError, setResetError] = useState("");
  const [editRoleId, setEditRoleId] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addUserError, setAddUserError] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "User", // Default role
  });

  // Auth0 Management API configuration
  const config = {
    domain: "optimus-sandbox.us.auth0.com",
    clientId: "yuB3H9KXumDFmTJxmJAZaHWU4lKTdsw1",
    audience: "https://optimus-sandbox.us.auth0.com/api/v2/",
  };

  // Fetch access token
  const getAccessToken = async () => {
    const response = await fetch(`https://${config.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret:
          "IimPkgggEtML5dusNSqzBAD7kYF80eY5q-hZxaktThaZEjhCjUsGyBhrYzkaeHEs",
        audience: config.audience,
        grant_type: "client_credentials",
        scope:
          "read:users read:users_app_metadata update:users_app_metadata read:user_idp_tokens read:client_grants create:users update:users delete:users read:clients read:client_credentials create:client_credentials read:roles update:roles create:roles",
      }),
    });
    const data = await response.json();
    return data.access_token;
  };

  // Fetch users from Auth0
  const fetchUsers = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${config.audience}users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      // Transform Auth0 user data
      const transformedUsers = data.map((user) => ({
        id: user.user_id,
        username: user.user_metadata?.username || user.email.split("@")[0],
        email: user.email,
        role: user.app_metadata?.role || "User",
        status: user.blocked ? "Blocked" : "Active",
      }));
      console.log(data);

      setUsers(transformedUsers);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const checkPasswordRequirements = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordRequirements(requirements);

    // Return true if all requirements are met
    return Object.values(requirements).every((req) => req);
  };

  // Delete user
  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const token = await getAccessToken();
      const response = await fetch(`${config.audience}users/${deleteUserId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setUsers((prevUsers) =>
          prevUsers.filter((user) => user.id !== deleteUserId)
        );
        setIsDeleteOverlayOpen(false);
        setDeleteUserId(null);
        setDeleteUserName("");
      } else {
        console.error("Failed to delete user:", await response.text());
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUppercase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasNumber) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }
    return "";
  };

  // Reset password
  const handleResetClick = (userId) => {
    setResetUserId(userId);
    setNewPassword("");
    setResetError("");
    setOverlayMessage("Change Password");
    setIsOverlayOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!newPassword) {
      setResetError("Password cannot be empty");
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(`${config.audience}users/${resetUserId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
          connection: "Username-Password-Authentication",
        }),
      });

      if (response.ok) {
        setOverlayMessage("Password Reset Successfully!");
        setNewPassword("");
        setResetUserId(null);
        setTimeout(() => {
          setIsOverlayOpen(false);
          setOverlayMessage("");
        }, 2000);
      } else {
        const errorData = await response.json();
        setResetError(errorData.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setResetError("An error occurred while resetting the password");
    }
  };

  const handleAddUserClick = () => {
    setNewUser({ username: "", email: "", password: "", role: "User" });
    setPasswordRequirements({
      minLength: false,
      hasUppercase: false,
      hasNumber: false,
      hasSpecialChar: false,
    });
    setAddUserError("");
    setIsAddingUser(false);
    setIsAddUserOverlayOpen(true);
  };

  const assignUserRole = async (userId, newRole) => {
    try {
      const token = await getAccessToken();
      const newRoleId =
        newRole === "Admin" ? "rol_atrpv1Xx2T4nnNcM" : "rol_ngh0Bwn2b2T5eH37";

      // Remove existing roles first (if required)
      await fetch(`${config.audience}users/${userId}/roles`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles: ["rol_atrpv1Xx2T4nnNcM", "rol_ngh0Bwn2b2T5eH37"],
        }),
      });

      // Assign new role
      const response = await fetch(`${config.audience}users/${userId}/roles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles: [newRoleId],
        }),
      });

      if (response.ok) {
        console.log(`Role assigned successfully: ${newRole}`);

        // also update app_metadata.role in Auth0 Dashboard
        const metadataResponse = await fetch(
          `${config.audience}users/${userId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              app_metadata: {
                role: newRole, // Store the role in app_metadata
              },
            }),
          }
        );

        if (metadataResponse.ok) {
          console.log("app_metadata updated successfully!");
        } else {
          console.error(
            "Failed to update app_metadata:",
            await metadataResponse.text()
          );
        }

        // Update local state so UI reflects the change
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      } else {
        console.error("Failed to assign new role:", await response.text());
      }
    } catch (error) {
      console.error("Error assigning role:", error);
    }
  };

  // Handler for Add User form submission
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!Object.values(passwordRequirements).every((req) => req)) {
      return;
    }

    setIsAddingUser(true);
    setAddUserError("");

    try {
      const token = await getAccessToken();

      // Create user in Auth0
      const response = await fetch(`${config.audience}users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          connection: "Username-Password-Authentication", // Adjust based on your setup
          app_metadata: { role: newUser.role }, // Store role in app_metadata initially
          user_metadata: { username: newUser.username },
        }),
      });

      if (response.ok) {
        const createdUser = await response.json();
        console.log(`User created: ${createdUser.user_id}`);

        // Assign Auth0 role using Role ID
        const roleId =
          newUser.role === "Admin"
            ? "rol_atrpv1Xx2T4nnNcM"
            : "rol_ngh0Bwn2b2T5eH37";
        await assignUserRole(createdUser.user_id, newUser.role);

        // app_metadata is updated after role assignment
        const metadataResponse = await fetch(
          `${config.audience}users/${createdUser.user_id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              app_metadata: {
                role: newUser.role, // Ensure correct role is stored
              },
            }),
          }
        );

        if (!metadataResponse.ok) {
          console.error(
            "Failed to update app_metadata:",
            await metadataResponse.text()
          );
        }

        // Add user to UI state
        setUsers((prevUsers) => [
          ...prevUsers,
          {
            id: createdUser.user_id,
            email: newUser.email,
            username: newUser.email.split("@")[0],
            role: newUser.role, // Ensure correct role is stored
            status: "Active",
          },
        ]);

        // Reset form and close modal
        setNewUser({ email: "", password: "", role: "User" });
        setPasswordRequirements({
          minLength: false,
          hasUppercase: false,
          hasNumber: false,
          hasSpecialChar: false,
        });
        setAddUserError("");
        setIsAddUserOverlayOpen(false);
        // Show success overlay instead of alert
        setSuccessMessage("User added successfully!");
        setIsSuccessOverlayOpen(true);

        // Hide overlay after 3 seconds
        setTimeout(() => {
          setIsSuccessOverlayOpen(false);
          setSuccessMessage("");
        }, 3000);
      } else {
        const errorDetails = await response.json();
        console.error("Failed to add user:", errorDetails);

        // Check for specific error types
        if (
          response.status === 409 ||
          errorDetails.message?.toLowerCase().includes("already exists") ||
          errorDetails.message?.toLowerCase().includes("user exists")
        ) {
          setAddUserError("A user with this email already exists.");
        } else if (errorDetails.message?.toLowerCase().includes("email")) {
          setAddUserError("Invalid email address.");
        } else {
          setAddUserError(
            errorDetails.message || "Failed to add user. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error adding user:", error);
      setAddUserError(
        "An error occurred while adding the user. Please try again."
      );
    } finally {
      setIsAddingUser(false);
    }
  };

  const sidebarRef = useRef(null);

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState("");
  const [isAddUserOverlayOpen, setIsAddUserOverlayOpen] = useState(false);

  const [isDeleteOverlayOpen, setIsDeleteOverlayOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState("");

  const handleDeleteClick = (user) => {
    setDeleteUserId(user.id);
    setDeleteUserName(user.email);
    setIsDeleteOverlayOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteOverlayOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsSidebarOpen(false); // close sidebar after navigating
  };

  const handleOverlayClose = () => {
    setIsOverlayOpen(false);
  };

  const handleOverlayReset = () => {
    setOverlayMessage("ユーザーのパスワードは正常にリセットされました!");
  };

  const [isSuccessOverlayOpen, setIsSuccessOverlayOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // calculate pagination based on filtered users
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div style={{ backgroundColor: "#f6f6f6", minHeight: "100vh" }}>
      {/* Sidebar */}

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />

      {isSuccessOverlayOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] transition-transform transform translate-y-0">
            <h2 className="text-lg font-semibold text-center text-green-600">
              {successMessage}
            </h2>
          </div>
        </div>
      )}

      {isAddUserOverlayOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40"
          onClick={() => setIsAddUserOverlayOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-[400px] transition-transform transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg mx-auto font-semibold">新しいユーザーを追加</h2>
              <button
                className="text-gray-600 hover:text-black"
                onClick={() => setIsAddUserOverlayOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                >
                  <path d="M 38.982422 6.9707031 A 2.0002 2.0002 0 0 0 37.585938 7.5859375 L 24 21.171875 L 10.414062 7.5859375 A 2.0002 2.0002 0 0 0 8.9785156 6.9804688 A 2.0002 2.0002 0 0 0 7.5859375 10.414062 L 21.171875 24 L 7.5859375 37.585938 A 2.0002 2.0002 0 1 0 10.414062 40.414062 L 24 26.828125 L 37.585938 40.414062 A 2.0002 2.0002 0 1 0 40.414062 37.585938 L 26.828125 24 L 40.414062 10.414062 A 2.0002 2.0002 0 0 0 38.982422 6.9707031 z"></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <input
                type="text"
                placeholder="Username"
                className="w-full border rounded p-2 mb-4"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
                required
              />

              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2 mb-4"
                value={newUser.email}
                onChange={(e) => {
                  console.log("Email:", e.target.value);
                  setNewUser({ ...newUser, email: e.target.value });
                  setAddUserError("");
                }}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full border rounded p-2 mb-2"
                value={newUser.password}
                onChange={(e) => {
                  const password = e.target.value;
                  setNewUser({ ...newUser, password });
                  checkPasswordRequirements(password);
                }}
                required
              />

              {/* Password Requirements - Grey by default, Red when not met */}
              <div className="mb-4 text-sm">
                <p className="mb-1 font-medium text-gray-700">
                パスワードの条件：
                </p>
                <ul className="space-y-0.5 text-xs">
                  <li
                    className={
                      passwordRequirements.minLength
                        ? "text-gray-500"
                        : "text-red-500"
                    }
                  >
                    • 8文字以上であること
                  </li>
                  <li
                    className={
                      passwordRequirements.hasUppercase
                        ? "text-gray-500"
                        : "text-red-500"
                    }
                  >
                    • 英大文字を1文字含むこと
                  </li>
                  <li
                    className={
                      passwordRequirements.hasNumber
                        ? "text-gray-500"
                        : "text-red-500"
                    }
                  >
                    • 数字を1つ含むこと
                  </li>
                  <li
                    className={
                      passwordRequirements.hasSpecialChar
                        ? "text-gray-500"
                        : "text-red-500"
                    }
                  >
                    • 次のいずれかの記号を1つ含むこと： !@#$%^&*(),.?":{}|&lt;&gt;
                  </li>
                </ul>
              </div>
              {/* Error Message */}
              {addUserError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{addUserError}</p>
                </div>
              )}

              <select
                className="w-full border rounded p-2 mb-4"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={
                  !Object.values(passwordRequirements).every((req) => req) ||
                  isAddingUser
                }
                className={`text-white w-full py-2 rounded-md ${
                  !Object.values(passwordRequirements).every((req) => req) ||
                  isAddingUser
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#88D89F] hover:bg-[#7bc490]"
                }`}
              >
                {isAddingUser ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ユーザーを追加中...
                  </div>
                ) : (
                  "ユーザーを追加"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isOverlayOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40"
          onClick={() => setIsOverlayOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-[400px] transition-transform transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg mx-auto font-semibold">
                {overlayMessage === "Change Password"
                  ? "RESET PASSWORD"
                  : overlayMessage}
              </h2>
              <button
                className="text-gray-600 -mt-1 hover:text-black"
                onClick={() => setIsOverlayOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                >
                  <path d="M 38.982422 6.9707031 A 2.0002 2.0002 0 0 0 37.585938 7.5859375 L 24 21.171875 L 10.414062 7.5859375 A 2.0002 2.0002 0 0 0 8.9785156 6.9804688 A 2.0002 2.0002 0 0 0 7.5859375 10.414062 L 21.171875 24 L 7.5859375 37.585938 A 2.0002 2.0002 0 1 0 10.414062 40.414062 L 24 26.828125 L 37.585938 40.414062 A 2.0002 2.0002 0 1 0 40.414062 37.585938 L 26.828125 24 L 40.414062 10.414062 A 2.0002 2.0002 0 0 0 38.982422 6.9707031 z"></path>
                </svg>
              </button>
            </div>
            {overlayMessage === "Change Password" ? (
              <>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full border rounded p-2 mb-4"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {resetError && (
                  <p className="text-red-500 text-sm mb-4">{resetError}</p>
                )}
                <button
                  className="bg-[#88D89F] text-white w-full py-2 rounded-md hover:bg-[#7bc490]"
                  onClick={handlePasswordReset}
                >
                  リセット
                </button>
              </>
            ) : (
              <p className="text-center text-green-500">{overlayMessage}</p>
            )}
          </div>
        </div>
      )}

      {isDeleteOverlayOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-[400px] transition-transform transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg mx-auto font-semibold">本当によろしいですか？</h2>
              <button
                className="text-gray-600 hover:text-black"
                onClick={handleCancelDelete}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                >
                  <path d="M 38.982422 6.9707031 A 2.0002 2.0002 0 0 0 37.585938 7.5859375 L 24 21.171875 L 10.414062 7.5859375 A 2.0002 2.0002 0 0 0 8.9785156 6.9804688 A 2.0002 2.0002 0 0 0 7.5859375 10.414062 L 21.171875 24 L 7.5859375 37.585938 A 2.0002 2.0002 0 1 0 10.414062 40.414062 L 24 26.828125 L 37.585938 40.414062 A 2.0002 2.0002 0 1 0 40.414062 37.585938 L 26.828125 24 L 40.414062 10.414062 A 2.0002 2.0002 0 0 0 38.982422 6.9707031 z"></path>
                </svg>
              </button>
            </div>
            <p className="text-center mb-6">
               "{deleteUserName}" を削除してもよろしいですか?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="border border-red-500 text-red-500 px-6 py-1 rounded-md hover:text-red-600 hover:border-red-600"
                onClick={handleCancelDelete}
              >
                キャンセル
              </button>
              <button
                className="bg-red-500 text-white px-6 py-1 rounded-md hover:bg-red-600"
                onClick={confirmDeleteUser}
              >
                削除 
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}
        showLiveCount={true}
      />

      <div className="p-8 bg-[#f6f6f6] min-h-screen">
        {/* Header */}
        <header className="mt-[48px] sm:mt-[48px] md:mt-[54px] lg:mt-[72px] xl:mt-[90px] flex justify-between items-center">
          <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-800">
            ユーザー​
          </h1>
          <button
            className="bg-[#88D89F] text-white sm:text-xl text-[16px] font-semibold px-5 py-1 rounded-md hover:bg-[#7bc490]"
            onClick={handleAddUserClick}
          >
            <span className="text-xl sm:text-xl">+</span> ユーザーを追加​
          </button>
        </header>

        {/* Search Bar */}
        <div className="mt-6 bg-white mb-8 flex items-center w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="20"
            height="20"
            viewBox="0,0,256,256"
          >
            <g
              fill="#4d4d4d"
              fill-rule="nonzero"
              stroke="none"
              stroke-width="1"
              stroke-linecap="butt"
              stroke-linejoin="miter"
              stroke-miterlimit="10"
              stroke-dasharray=""
              stroke-dashoffset="0"
              font-family="none"
              font-weight="none"
              font-size="none"
              text-anchor="none"
            >
              <g transform="scale(8.53333,8.53333)">
                <path d="M13,3c-5.511,0 -10,4.489 -10,10c0,5.511 4.489,10 10,10c2.39651,0 4.59738,-0.85101 6.32227,-2.26367l5.9707,5.9707c0.25082,0.26124 0.62327,0.36648 0.97371,0.27512c0.35044,-0.09136 0.62411,-0.36503 0.71547,-0.71547c0.09136,-0.35044 -0.01388,-0.72289 -0.27512,-0.97371l-5.9707,-5.9707c1.41266,-1.72488 2.26367,-3.92576 2.26367,-6.32227c0,-5.511 -4.489,-10 -10,-10zM13,5c4.43012,0 8,3.56988 8,8c0,4.43012 -3.56988,8 -8,8c-4.43012,0 -8,-3.56988 -8,-8c0,-4.43012 3.56988,-8 8,-8z"></path>
              </g>
            </g>
          </svg>
          <input
            type="text"
            placeholder="ユーザーを検索"
            className="ml-2 pl-2 w-full border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* User Table */}
        <div className="rounded-xl border border-[#d4d4d4]  bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-center px-6 py-4">ユーザー名​</th>
                  <th className="text-center px-6 py-4">電子メール​</th>
                  <th className="text-center px-6 py-4">役割​</th>
                  <th className="text-center px-6 py-4">地位​</th>
                  <th className="text-center px-6 py-4">
                    パスワードのリセット​
                  </th>
                  <th className="text-center px-6 py-4">アクション​</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-300">
                    <td className="pl-8 py-4 text-center flex items-center">
                      <span className="bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-black mr-4">
                        {user.username ? user.username.charAt(0) : "N/A"}
                      </span>
                      {user.username || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">{user.email}</td>
                    <td className="px-6 py-4 text-center flex items-center justify-center">
                      {editRoleId === user.id ? (
                        <select
                          className="border p-1 rounded"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="User">ユーザー</option>
                          <option value="Admin">管理者</option>
                        </select>
                      ) : (
                        <span>{user.role}</span>
                      )}

                      {editRoleId === user.id ? (
                        <button
                          className="ml-2 text-green-600"
                          onClick={() => {
                            assignUserRole(user.id, selectedRole);
                            setEditRoleId(null);
                          }}
                        >
                          ✅
                        </button>
                      ) : (
                        <button
                          className="ml-2 text-blue-500"
                          onClick={() => {
                            setEditRoleId(user.id);
                            setSelectedRole(user.role);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="black"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="feather feather-edit"
                          >
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                          </svg>
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-7 py-1 rounded-md text-[#6cb17f] text-sm font-medium ${
                          user.status === "Active"
                            ? "text-[#6cb17f] border border-[#6cb17f] "
                            : "text-[#cf6a61] border border-[#cf6a61]"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className=" border border-[#6cb17f] text-[#6cb17f] px-7 py-1 rounded-md "
                        onClick={() => handleResetClick(user.id)}
                      >
                        リセット
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className="text-[#b24035] hover:text-red-500"
                        onClick={() => handleDeleteClick(user)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          x="0px"
                          y="0px"
                          width="24"
                          height="24"
                          viewBox="0,0,256,256"
                        >
                          <g
                            fill="#eb4444"
                            fill-rule="nonzero"
                            stroke="none"
                            stroke-width="1"
                            stroke-linecap="butt"
                            stroke-linejoin="miter"
                            stroke-miterlimit="10"
                            stroke-dasharray=""
                            stroke-dashoffset="0"
                            font-family="none"
                            font-weight="none"
                            font-size="none"
                            text-anchor="none"
                          >
                            <g transform="scale(8,8)">
                              <path d="M15,4c-0.52344,0 -1.05859,0.18359 -1.4375,0.5625c-0.37891,0.37891 -0.5625,0.91406 -0.5625,1.4375v1h-6v2h1v16c0,1.64453 1.35547,3 3,3h12c1.64453,0 3,-1.35547 3,-3v-16h1v-2h-6v-1c0,-0.52344 -0.18359,-1.05859 -0.5625,-1.4375c-0.37891,-0.37891 -0.91406,-0.5625 -1.4375,-0.5625zM15,6h4v1h-4zM10,9h14v16c0,0.55469 -0.44531,1 -1,1h-12c-0.55469,0 -1,-0.44531 -1,-1zM12,12v11h2v-11zM16,12v11h2v-11zM20,12v11h2v-11z"></path>
                            </g>
                          </g>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-8 py-3  bg-white ">
            <div className="text-sm text-gray-600">
              表示中: {filteredUsers.length > 0 ? startIndex + 1 : 0}-
              {Math.min(endIndex, filteredUsers.length)} /{" "}
              {filteredUsers.length} 件
            </div>
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx + 1}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                    currentPage === idx + 1
                      ? "bg-gray-500 text-white border-gray-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
