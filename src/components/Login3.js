import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login3 = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Both email and password fields are required.");
      return;
    }
  
    try {
      const tokenData = new URLSearchParams({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        username: email,
        password: password,
        audience: "https://retail-tech.us.auth0.com/api/v2/",
        client_id: "n9I94AZIJcNyUf1eYAv2vR1vRyIy0jbm",
        realm: "Username-Password-Authentication",
        scope: "openid profile email",
      });
  
      const response = await fetch("https://retail-tech.us.auth0.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: tokenData,
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error_description || "Login failed");
      }
  
      const userResponse = await fetch("https://retail-tech.us.auth0.com/userinfo", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });
  
      const userData = await userResponse.json();
  
      // Extract username from metadata or fallback to email
      const storedUsername = userData.user_metadata?.username || userData.email.split("@")[0];
  
      //  Store user details in localStorage
      localStorage.setItem("user", JSON.stringify({
        username: storedUsername,  //  Store username
        email: userData.email,
      }));
      
  
      localStorage.setItem("access_token", data.access_token);
      
      console.log("User info saved:", storedUsername, userData.email); 
  
      navigate("/dashboard");
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    }
  };
  
const handleSignUp = async () => {
  if (!email || !password || !username) {
    setError("All fields are required.");
    return;
  }

  try {
    const signUpData = {
      client_id: "n9I94AZIJcNyUf1eYAv2vR1vRyIy0jbm",
      email: email,
      password: password,
      connection: "Username-Password-Authentication",
      user_metadata: { username: username }, // ✅ Store username in metadata
    };

    const response = await fetch("https://retail-tech.us.auth0.com/dbconnections/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signUpData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "User already exists. Please log in.");
    }

    console.log("Sign-Up successful! Username stored:", username); // ✅ Debugging line
    
    // ✅ Instead of redirecting to dashboard, show success message and switch to login
    setError("Sign-Up successful! Please log in.");
    setIsSignUp(false); // ✅ Toggle back to login mode

    // ✅ Reset form fields after successful signup
    setEmail("");
    setPassword("");
    setUsername("");

  } catch (error) {
    setError(error.message || "Sign-up failed. Please try again.");
  }
};



  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      {/* Logo */}
      <img
        src="/sp.svg"
        alt="Lingnan Library Logo"
        className="md:w-[330px] sm:w-[280px] w-[240px] h-auto mx-auto mb-14"
      />
  
      {/* Login/Signup Box */}
      <div className="border border-gray-300 shadow-md bg-white p-8 rounded-xl text-center md:w-[500px] sm:w-[490px] w-[340px]">
        <p className="text-gray-700 text-lg font-semibold mb-6">
          {isSignUp ? "Sign Up" : "Login"}
        </p>
  
        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
  
        {/* Username Field (Only in Sign-Up Mode) */}
        {isSignUp && (
          <div className="mb-4 text-left">
            <label className="block mb-2 text-sm font-bold" htmlFor="username">
              Username
            </label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}
  
        {/* Email Field */}
        <div className="mb-4 text-left">
          <label className="block mb-2 text-sm font-bold" htmlFor="email">
            Email Address
          </label>
          <input
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="email"
            type="email"
            placeholder="name@address.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
  
        {/* Password Field */}
        <div className="mb-6 text-left">
          <label className="block mb-2 text-sm font-bold" htmlFor="password">
            Password
          </label>
          <input
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
  
        {/* Login/Sign-Up Button */}
        <button
          className="bg-[#3a65d0] text-white font-bold py-2 w-full rounded-lg hover:bg-[#4774e5] transition duration-200"
          onClick={isSignUp ? handleSignUp : handleLogin}
        >
          {isSignUp ? "Sign Up" : "Login"}
        </button>
  
        {/* Toggle Between Login & Sign Up */}
        {/* <p className="text-sm text-gray-600 mt-4">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <span
            className="text-blue-500 underline cursor-pointer hover:underline"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setEmail("");
              setPassword("");
              setUsername(""); 
            }}
          >
            {isSignUp ? "Login" : "Sign Up"}
          </span>
        </p> */}
      </div>
    </div>
  );
  
};

export default Login3;