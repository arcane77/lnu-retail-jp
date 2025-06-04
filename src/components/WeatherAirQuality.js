import React, { useState, useEffect } from "react";
import { FaTemperatureHigh, FaTint, FaWind } from "react-icons/fa";

const WeatherAirQuality = ({ className = "" }) => {
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);

  // Fetch temperature data from Tuen Mun
  useEffect(() => {
    const fetchTemperature = async () => {
      try {
        console.log("Fetching temperature data...");
        const response = await fetch("https://njs-01.optimuslab.space/lnu-footfall/floor-zone/weather");
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log("Temperature data received");
        
        // Multiple parsing methods to extract Tuen Mun temperature
        const htmlPattern = /Tuen Mun<\/font><\/td><td[^>]*><font[^>]*>(\d{1,2}) degrees/;
        let match = responseText.match(htmlPattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature in HTML: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return;
        }
        
        // Fallback patterns
        const simplePattern = /Tuen Mun(?:(?!Tuen Mun).){1,100}?(\d{1,2}) degrees/s;
        match = responseText.match(simplePattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature using simple pattern: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return;
        }
        
        const textPattern = /Tuen Mun(\d{1,2}) degrees/;
        match = responseText.match(textPattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          console.log(`Found Tuen Mun temperature in plain text: ${temperature}°C`);
          
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return;
        }
        
        // Last resort - check semicolon separated
        const lines = responseText.split(';');
        for (const line of lines) {
          if (line.includes('Tuen Mun') && line.includes('degrees')) {
            const numberMatch = line.match(/(\d{1,2})\s*degrees/);
            if (numberMatch && numberMatch[1]) {
              const temperature = parseInt(numberMatch[1], 10);
              console.log(`Found Tuen Mun temperature in line: ${temperature}°C`);
              
              setWeather(prevWeather => ({
                temp: temperature,
                humidity: prevWeather ? prevWeather.humidity : 70
              }));
              return;
            }
          }
        }
        
        console.log("Could not find valid Tuen Mun temperature with any pattern");
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
        
      } catch (error) {
        console.error("Error fetching temperature data:", error);
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
      }
    };
    
    fetchTemperature();
    const intervalId = setInterval(fetchTemperature, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch humidity data from HKO
  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const response = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const data = await response.json();

        const humidity = data.humidity.data[0]?.value;

        if (humidity !== undefined) {
          setWeather((prevWeather) => ({
            temp: prevWeather ? prevWeather.temp : 32,
            humidity: humidity,
          }));
        }
      } catch (error) {
        console.error("Error fetching humidity data:", error);
      }
    };

    fetchHumidity();
    const intervalId = setInterval(fetchHumidity, 1800000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch air quality data
  useEffect(() => {
    const fallbackData = {
      pm10: 20.7,
      pm25: 15.9,
      timestamp: new Date(),
    };

    const fetchAirQuality = async () => {
      try {
        console.log("Fetching air quality data...");
        const response = await fetch(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/aqhi"
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log(
          "Response received, first 100 chars:",
          responseText.substring(0, 100)
        );

        if (
          responseText.trim().startsWith("<?xml") ||
          responseText.trim().startsWith("<")
        ) {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseText, "text/xml");

            const pollutantConcentrations = xmlDoc.getElementsByTagName(
              "PollutantConcentration"
            );
            console.log(
              `Found ${pollutantConcentrations.length} PollutantConcentration elements`
            );

            const tuenMunEntries = [];
            for (let i = 0; i < pollutantConcentrations.length; i++) {
              const stationElement =
                pollutantConcentrations[i].getElementsByTagName(
                  "StationName"
                )[0];

              if (stationElement && stationElement.textContent === "Tuen Mun") {
                const dateTimeElement =
                  pollutantConcentrations[i].getElementsByTagName(
                    "DateTime"
                  )[0];
                const pm10Element =
                  pollutantConcentrations[i].getElementsByTagName("PM10")[0];
                const pm25Element =
                  pollutantConcentrations[i].getElementsByTagName("PM2.5")[0];

                if (dateTimeElement && pm10Element && pm25Element) {
                  tuenMunEntries.push({
                    element: pollutantConcentrations[i],
                    dateTime: new Date(dateTimeElement.textContent),
                    pm10: parseFloat(pm10Element.textContent),
                    pm25: parseFloat(pm25Element.textContent),
                  });
                }
              }
            }

            if (tuenMunEntries.length > 0) {
              console.log(`Found ${tuenMunEntries.length} Tuen Mun entries`);

              tuenMunEntries.sort((a, b) => b.dateTime - a.dateTime);

              tuenMunEntries.forEach((entry, index) => {
                console.log(
                  `Entry ${index}: ${entry.dateTime.toISOString()}, PM10=${
                    entry.pm10
                  }, PM2.5=${entry.pm25}`
                );
              });

              const latestEntry = tuenMunEntries[0];
              console.log(
                `Using most recent entry: ${latestEntry.dateTime.toISOString()}`
              );

              setAirQuality({
                pm10: latestEntry.pm10,
                pm25: latestEntry.pm25,
                timestamp: latestEntry.dateTime,
              });
              return;
            } else {
              console.log("No valid Tuen Mun entries found");
            }
          } catch (xmlError) {
            console.error("Error parsing XML:", xmlError);
          }
        }

        console.warn(
          "Could not parse response correctly. Using fallback data."
        );
        setAirQuality(fallbackData);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        console.log("Using fallback air quality data");
        setAirQuality(fallbackData);
      }
    };

    fetchAirQuality();
    const intervalId = setInterval(fetchAirQuality, 1800000);

    return () => clearInterval(intervalId);
  }, []);

  // Helper functions for air quality levels
  const getPM25Level = (value) => {
    if (value <= 12) return { level: "Good", color: "text-green-500" };
    if (value <= 35.4) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 55.4)
      return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 150.4) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 250.4)
      return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  const getPM10Level = (value) => {
    if (value <= 54) return { level: "Good", color: "text-green-500" };
    if (value <= 154) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 254)
      return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 354) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 424)
      return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {/* Weather Information */}
      {weather && (
        <div className="bg-white py-2 px-4 rounded-xl border border-[#d4d4d4]">
          <div className="flex items-center space-x-4 text-sm sm:text-lg">
            <div className="flex items-center">
              <FaTemperatureHigh className="mr-2 text-red-400" />
              <span className="font-medium">{weather.temp}°C</span>
            </div>
            <div className="flex items-center">
              <FaTint className="mr-2 text-blue-300" />
              <span className="font-medium">{weather.humidity}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Air Quality Information */}
      {airQuality && (
        <div className="bg-white py-2 px-4 rounded-xl border border-[#d4d4d4]">
          <div className="flex items-center space-x-4 text-sm sm:text-lg">
            {/* PM2.5 */}
            <div className="flex items-center">
              <FaWind className="mr-2 text-gray-600" />
              <div className="flex items-center">
                <span className="font-semibold mr-1">PM2.5:</span>
                <span
                  className={`font-bold ${
                    getPM25Level(airQuality.pm25).color
                  }`}
                >
                  {airQuality.pm25.toFixed(1)}
                </span>
              </div>
            </div>

            {/* PM10 */}
            <div className="flex items-center">
              <FaWind className="mr-2 text-gray-400" />
              <div className="flex items-center">
                <span className="mr-1">PM10:</span>
                <span
                  className={`${
                    getPM10Level(airQuality.pm10).color
                  }`}
                >
                  {airQuality.pm10.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherAirQuality;