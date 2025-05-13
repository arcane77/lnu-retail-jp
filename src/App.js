import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Viewer3 from "./components/Viewer3";
import Editor from "./components/Editor";
import Login3 from "./components/Login3";
import SecurityView from "./components/SecurityView";
import IAQ from "./components/IAQ"
import Leakage from "./components/Leakage"
import UserManagement from "./components/user"
import Analytics from "./components/Analytics";
import Wrapper from "./components/Wrapper";
import DeviceManagement from "./components/DeviceMangement";
import SpaceViewer from "./SpaceViewer";
import SmplrspaceViewer from "./SmplrspaceViewer";
import MainAnalytics from "./components/MainAnalytics";
import EditSpaces from "./components/EditSpaces";
import Historical from "./components/Historical"

// Authentication check function
const isAuthenticated = () => {
  return localStorage.getItem("access_token") !== null;
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    console.error("Unauthorized access attempt to a protected route.");
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login route */}
        <Route path="/login" element={<Login3 />} />
        <Route path="/" element={<Login3 />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Viewer3 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />

<Route
          path="/editspaces"
          element={
            <ProtectedRoute>
              <EditSpaces />
            </ProtectedRoute>
          }
        />

<Route
          path="/historical"
          element={
            <ProtectedRoute>
              <Historical />
            </ProtectedRoute>
          }
        />

        <Route
          path="/facility"
          element={
            <ProtectedRoute>
              <SpaceViewer />
            </ProtectedRoute>
          }
        />

<Route
          path="/test"
          element={
            <ProtectedRoute>
              <SmplrspaceViewer />
            </ProtectedRoute>
          }
        />



        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DeviceManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/security-view"
          element={
            <ProtectedRoute>
              <SecurityView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/iaq"
          element={
            <ProtectedRoute>
              <IAQ />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leakage"
          element={
            <ProtectedRoute>
              <Leakage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <MainAnalytics />
            </ProtectedRoute>
          }
        />

          <Route
          path="/users"
          element={
            
              <UserManagement />
            
          }
        />

        {/* Root route with conditional redirect */}
        <Route
          path="/"
          element={
            isAuthenticated() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;