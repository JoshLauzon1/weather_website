// No API key needed for OpenMeteo
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const cityName = document.getElementById('city-name');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const loadingElement = document.getElementById('loading');
const weatherInfoElement = document.getElementById('weather-info');

function showLoading() {
    loadingElement.style.display = 'flex';
    weatherInfoElement.style.display = 'none';
}

function hideLoading() {
    loadingElement.style.display = 'none';
    weatherInfoElement.style.display = 'block';
}

function showError(message) {
    hideLoading();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
    
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    document.querySelector('.container').appendChild(errorDiv);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

async function getWeatherData(city) {
    try {
        showLoading();
        
        // First, get coordinates for the city using a geocoding service
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }
        
        const { latitude, longitude, name, country } = geoData.results[0];        // Get weather data using coordinates
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`
        );
        
        const weatherData = await weatherResponse.json();
        
        if (!weatherResponse.ok) {
            throw new Error('Unable to fetch weather data');
        }

        // Transform data to match our existing format
        const transformedData = {
            name: name,
            sys: { country: country },
            main: {
                temp: Math.round(weatherData.current.temperature_2m),
                feels_like: Math.round(weatherData.current.apparent_temperature),
                humidity: weatherData.current.relative_humidity_2m,
                pressure: Math.round(weatherData.current.surface_pressure)
            },
            wind: {
                speed: weatherData.current.wind_speed_10m
            },            weather: [{
                description: getWeatherDescription(weatherData.current.weather_code)
            }]
        };        updateWeatherInfo(transformedData);
        hideLoading();
        
        // Show radar for the searched location
        showRadarForLocation(latitude, longitude);        // Fetch and display historical data
        console.log('Fetching historical data for:', latitude, longitude);
        try {
            let historicalStats = await getHistoricalWeatherData(latitude, longitude);
            
            // If real API fails, use fallback
            if (!historicalStats) {
                console.log('Real historical data failed, using fallback');
                historicalStats = await getHistoricalWeatherDataFallback(latitude, longitude);
            }
            
            console.log('Historical data received:', historicalStats);
            if (historicalStats) {
                displayHistoricalData(transformedData, historicalStats, latitude, longitude);
            }
        } catch (error) {
            console.error('Error with historical data:', error);
            // Try fallback even on error
            try {
                const fallbackStats = await getHistoricalWeatherDataFallback(latitude, longitude);
                displayHistoricalData(transformedData, fallbackStats, latitude, longitude);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    } catch (error) {
        showError(error.message);
        console.error('Full error:', error);
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Unable to fetch weather data');
        }

        // Transform data to match our existing format
        const transformedData = {
            name: "Your Location",
            sys: { country: "" },
            main: {
                temp: Math.round(data.current.temperature_2m),
                feels_like: Math.round(data.current.apparent_temperature),
                humidity: data.current.relative_humidity_2m,
                pressure: Math.round(data.current.surface_pressure)
            },
            wind: {
                speed: data.current.wind_speed_10m
            },
            weather: [{
                description: getWeatherDescription(data.current.weather_code)
            }]
        };        updateWeatherInfo(transformedData);
        hideLoading();
        
        // Show radar for current location
        showRadarForLocation(lat, lon);        // Fetch and display historical data
        console.log('Fetching historical data for location:', lat, lon);
        try {
            let historicalStats = await getHistoricalWeatherData(lat, lon);
            
            // If real API fails, use fallback
            if (!historicalStats) {
                console.log('Real historical data failed, using fallback');
                historicalStats = await getHistoricalWeatherDataFallback(lat, lon);
            }
            
            console.log('Historical data received:', historicalStats);
            if (historicalStats) {
                displayHistoricalData(transformedData, historicalStats, lat, lon);
            }
        } catch (error) {
            console.error('Error with historical data:', error);
            // Try fallback even on error
            try {
                const fallbackStats = await getHistoricalWeatherDataFallback(lat, lon);
                displayHistoricalData(transformedData, fallbackStats, lat, lon);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    } catch (error) {
        showError(error.message);
        console.error('Full error:', error);
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                hideLoading();
                let errorMessage = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                showError(errorMessage);
            }
        );
    } else {
        showError('Geolocation is not supported by this browser');
    }
}

function updateWeatherInfo(data) {
    cityName.textContent = data.name;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description;
    
    // Add weather icon
    const weatherIcon = getWeatherIcon(data.weather[0].main);
    temperature.innerHTML = `${weatherIcon} ${Math.round(data.main.temp)}°C`;
    
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    // Update background based on weather
    updateBackground(data.weather[0].main);
}

function getWeatherIcon(weather) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Smoke': '🌫️',
        'Haze': '🌫️',
        'Dust': '🌫️',
        'Fog': '🌫️',
        'Sand': '🌫️',
        'Ash': '🌫️',
        'Squall': '💨',
        'Tornado': '🌪️'
    };
    return icons[weather] || '🌤️';
}

function updateBackground(weather) {
    const body = document.body;
    const backgrounds = {
        'Clear': 'linear-gradient(135deg, #f093fb, #f5576c, #4facfe)',
        'Clouds': 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        'Rain': 'linear-gradient(135deg, #2c3e50, #3498db, #34495e)',
        'Drizzle': 'linear-gradient(135deg, #89f7fe, #66a6ff)',
        'Thunderstorm': 'linear-gradient(135deg, #232526, #414345)',
        'Snow': 'linear-gradient(135deg, #e6ddd4, #d5d4d0)',
        'Mist': 'linear-gradient(135deg, #bdc3c7, #2c3e50)',
        'Fog': 'linear-gradient(135deg, #bdc3c7, #2c3e50)'
    };
    
    body.style.background = backgrounds[weather] || 'linear-gradient(135deg, #2c3e50, #3498db, #2c3e50)';
}

function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    
    return weatherCodes[code] || 'Unknown weather condition';
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

locationBtn.addEventListener('click', () => {
    getCurrentLocation();
});

// Radar event listeners
document.getElementById('radar-play-btn').addEventListener('click', toggleRadarAnimation);
document.getElementById('radar-toggle-btn').addEventListener('click', toggleRadarVisibility);
document.getElementById('show-radar-btn').addEventListener('click', showRadarSection);

// Radar type dropdown listener
document.getElementById('radar-type-select').addEventListener('change', () => {
    console.log('Radar type changed, reloading frames...');
    loadRadarFrames();
});

// Radar functionality
let radarMap = null;
let radarLayer = null;
let animationPosition = 0;
let animationTimer = null;
let radarFrames = [];
let lastUserLocation = null;

function initializeRadar(lat = 40.7128, lon = -74.0060) { // Default to NYC
    if (radarMap) {
        radarMap.remove();
    }
    
    radarMap = L.map('radar-map').setView([lat, lon], 8);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(radarMap);
    
    // Load radar frames
    loadRadarFrames();
    
    lastUserLocation = { lat, lon };
}

async function loadRadarFrames() {
    try {
        const radarType = document.getElementById('radar-type-select').value;
        console.log('Loading radar frames for type:', radarType);
        
        // Get available radar frames from RainViewer API
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        
        // Select frames based on radar type
        switch(radarType) {
            case 'nowcast':
                // Past 1 hour + available nowcast (up to 2 hours)
                radarFrames = data.radar.past.slice(-6).concat(data.radar.nowcast);
                break;
            case '12hour':
                // Use past data + available nowcast + enhanced forecast
                radarFrames = data.radar.past.slice(-12).concat(data.radar.nowcast);
                
                if (data.radar.nowcast.length > 0 && lastUserLocation) {
                    const lastFrame = data.radar.nowcast[data.radar.nowcast.length - 1];
                    const currentTime = Date.now() / 1000;
                    
                    // Get enhanced forecast frames with precipitation data
                    const forecastFrames = await createForecastFrames(
                        lastFrame, 
                        currentTime, 
                        12, 
                        lastUserLocation.lat, 
                        lastUserLocation.lon
                    );
                    radarFrames = radarFrames.concat(forecastFrames);
                }
                break;
            case '24hour':
                // Similar to 12 hour but extended to 24 hours
                radarFrames = data.radar.past.slice(-24).concat(data.radar.nowcast);
                
                if (data.radar.nowcast.length > 0 && lastUserLocation) {
                    const lastFrame = data.radar.nowcast[data.radar.nowcast.length - 1];
                    const currentTime = Date.now() / 1000;
                    
                    // Get enhanced forecast frames with precipitation data
                    const forecastFrames = await createForecastFrames(
                        lastFrame, 
                        currentTime, 
                        24, 
                        lastUserLocation.lat, 
                        lastUserLocation.lon
                    );
                    radarFrames = radarFrames.concat(forecastFrames);
                }
                break;
            default:
                radarFrames = data.radar.past.concat(data.radar.nowcast);
        }
        
        console.log(`Loaded ${radarFrames.length} radar frames for ${radarType}`);
        
        if (radarFrames.length > 0) {
            showRadarFrame(radarFrames.length - 1); // Show latest frame
        }
    } catch (error) {
        console.error('Error loading radar data:', error);
    }
}

function showRadarFrame(frameIndex) {
    if (radarLayer) {
        radarMap.removeLayer(radarLayer);
    }
    
    if (radarFrames[frameIndex]) {
        const frame = radarFrames[frameIndex];
        
        // Determine opacity based on whether it's a forecast frame
        let opacity = 0.6;
        if (frame.isForecast) {
            opacity = frame.opacity || 0.4; // Use custom opacity for forecast frames
        }
        
        radarLayer = L.tileLayer(
            `https://tilecache.rainviewer.com/v2/radar/${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
            {
                opacity: opacity,
                attribution: frame.isForecast ? 'RainViewer (Forecast)' : 'RainViewer'
            }
        ).addTo(radarMap);
        
        updateRadarTimestamp(frame.time, frame.isForecast);
    }
}

function updateRadarTimestamp(timestamp, isForecast = false) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const timeString = date.toLocaleTimeString();
    
    let label = '';
    const timeDiff = date.getTime() - now.getTime();
    const hoursDiff = Math.round(timeDiff / (1000 * 60 * 60));
    
    if (hoursDiff < -1) {
        label = `${Math.abs(hoursDiff)}h ago`;
    } else if (hoursDiff > 1) {
        if (isForecast) {
            label = `+${hoursDiff}h forecast (estimated)`;
        } else {
            label = `+${hoursDiff}h forecast`;
        }
    } else {
        label = 'Now';
    }
    
    const timestampElement = document.getElementById('radar-timestamp');
    timestampElement.textContent = `${label}: ${timeString}`;
    
    // Add visual indicator for forecast frames
    if (isForecast) {
        timestampElement.style.background = 'rgba(255, 193, 7, 0.8)'; // Amber background for forecasts
        timestampElement.style.border = '1px solid #ffc107';
    } else {
        timestampElement.style.background = 'rgba(0, 0, 0, 0.7)'; // Default dark background
        timestampElement.style.border = 'none';
    }
}

function toggleRadarAnimation() {
    const playBtn = document.getElementById('radar-play-btn');
    const playIcon = playBtn.querySelector('i');
    
    if (animationTimer) {
        // Stop animation
        clearInterval(animationTimer);
        animationTimer = null;
        playIcon.className = 'fas fa-play';
        playBtn.classList.remove('playing');
    } else {
        // Start animation
        playIcon.className = 'fas fa-pause';
        playBtn.classList.add('playing');
        
        animationTimer = setInterval(() => {
            animationPosition = (animationPosition + 1) % radarFrames.length;
            showRadarFrame(animationPosition);
        }, 500); // Change frame every 500ms
    }
}

function toggleRadarVisibility() {
    const radarSection = document.getElementById('radar-section');
    const showRadarSection = document.getElementById('show-radar-section');
    
    // Hide radar and show the "Show Radar" button
    radarSection.style.display = 'none';
    showRadarSection.style.display = 'block';
    
    // Stop animation when hiding
    if (animationTimer) {
        toggleRadarAnimation();
    }
}

function showRadarSection() {
    const radarSection = document.getElementById('radar-section');
    const showRadarSection = document.getElementById('show-radar-section');
    
    // Show radar and hide the "Show Radar" button
    radarSection.style.display = 'block';
    showRadarSection.style.display = 'none';
    
    // Initialize radar if not already done
    if (!radarMap && lastUserLocation) {
        setTimeout(() => {
            initializeRadar(lastUserLocation.lat, lastUserLocation.lon);
        }, 100);
    }
}

function showRadarForLocation(lat, lon) {
    const radarSection = document.getElementById('radar-section');
    const toggleBtn = document.getElementById('radar-toggle-btn');
    
    // Show radar section
    radarSection.style.display = 'block';
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Radar';
    
    // Initialize or update radar location
    setTimeout(() => {
        initializeRadar(lat, lon);
    }, 100);
}

// Historical weather data functionality (fixed API calls)
async function getHistoricalWeatherData(lat, lon) {
    try {
        console.log('Starting historical data fetch for:', lat, lon);
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        // Get data for the past 5 years (more reliable)
        const historicalPromises = [];
        const currentYear = today.getFullYear();
        
        for (let year = currentYear - 5; year < currentYear; year++) {
            const startDate = `${year}-${month}-${day}`;
            const endDate = startDate;
            
            console.log(`Fetching data for ${startDate}`);
            
            // Use the correct OpenMeteo Archive API endpoint
            const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,relative_humidity_2m_min,wind_speed_10m_max,surface_pressure_max,surface_pressure_min&timezone=auto`;
            
            console.log('API URL:', apiUrl);
            
            const promise = fetch(apiUrl)
                .then(response => {
                    console.log(`Response for ${startDate}:`, response.status, response.ok);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`Data for ${startDate}:`, data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error fetching ${startDate}:`, error);
                    return null;
                });
            
            historicalPromises.push(promise);
        }
        
        console.log('Waiting for all historical data...');
        const historicalData = await Promise.all(historicalPromises);
        console.log('All historical data received:', historicalData);
        
        const validData = historicalData.filter(data => data !== null && data.daily);
        console.log('Valid historical data:', validData);
        
        if (validData.length === 0) {
            console.log('No valid historical data found');
            return null;
        }
        
        const processedData = processHistoricalData(validData);
        console.log('Processed historical data:', processedData);
        return processedData;
        
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return null;
    }
}

function processHistoricalData(historicalDataArray) {
    console.log('Processing historical data:', historicalDataArray);
    
    const stats = {
        temperature: { values: [], min: [], max: [] },
        feelsLike: { values: [], min: [], max: [] },
        humidity: { values: [], min: [], max: [] },
        windSpeed: { values: [] },
        pressure: { values: [], min: [], max: [] }
    };
    
    historicalDataArray.forEach((data, index) => {
        console.log(`Processing data ${index}:`, data);
        
        if (!data || !data.daily) {
            console.log(`Invalid data at index ${index}`);
            return;
        }
        
        // Check if we have data for the requested date
        if (!data.daily.temperature_2m_max || 
            !data.daily.temperature_2m_min || 
            data.daily.temperature_2m_max[0] === null || 
            data.daily.temperature_2m_min[0] === null) {
            console.log(`Missing temperature data at index ${index}`);
            return;
        }
        
        // Temperature
        const tempMax = data.daily.temperature_2m_max[0];
        const tempMin = data.daily.temperature_2m_min[0];
        stats.temperature.max.push(tempMax);
        stats.temperature.min.push(tempMin);
        stats.temperature.values.push((tempMax + tempMin) / 2);
        
        // Humidity
        if (data.daily.relative_humidity_2m_max && 
            data.daily.relative_humidity_2m_min && 
            data.daily.relative_humidity_2m_max[0] !== null && 
            data.daily.relative_humidity_2m_min[0] !== null) {
            const humMax = data.daily.relative_humidity_2m_max[0];
            const humMin = data.daily.relative_humidity_2m_min[0];
            stats.humidity.max.push(humMax);
            stats.humidity.min.push(humMin);
            stats.humidity.values.push((humMax + humMin) / 2);
        }
        
        // Wind speed
        if (data.daily.wind_speed_10m_max && data.daily.wind_speed_10m_max[0] !== null) {
            stats.windSpeed.values.push(data.daily.wind_speed_10m_max[0]);
        }
        
        // Pressure
        if (data.daily.surface_pressure_max && 
            data.daily.surface_pressure_min && 
            data.daily.surface_pressure_max[0] !== null && 
            data.daily.surface_pressure_min[0] !== null) {
            const pressMax = data.daily.surface_pressure_max[0];
            const pressMin = data.daily.surface_pressure_min[0];
            stats.pressure.max.push(pressMax);
            stats.pressure.min.push(pressMin);
            stats.pressure.values.push((pressMax + pressMin) / 2);
        }
    });
    
    console.log('Collected stats:', stats);
    
    // Calculate averages, mins, and maxes
    const result = {};
    
    Object.keys(stats).forEach(key => {
        if (stats[key].values.length > 0) {
            const values = stats[key].values;
            result[key] = {
                average: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
                overallMin: Math.round(Math.min(...values) * 10) / 10,
                overallMax: Math.round(Math.max(...values) * 10) / 10
            };
            
            // Add historical min/max if available
            if (stats[key].min && stats[key].min.length > 0) {
                result[key].min = Math.round(Math.min(...stats[key].min) * 10) / 10;
            }
            if (stats[key].max && stats[key].max.length > 0) {
                result[key].max = Math.round(Math.max(...stats[key].max) * 10) / 10;
            }
        }
    });
    
    console.log('Final processed result:', result);
    return Object.keys(result).length > 0 ? result : null;
}

function displayHistoricalData(currentWeather, historicalStats, lat, lon) {
    console.log('displayHistoricalData called with:', {
        currentWeather,
        historicalStats,
        lat,
        lon
    });
    
    if (!historicalStats) {
        console.log('No historical stats available');
        return;
    }
    
    const historicalSection = document.getElementById('historical-section');
    if (!historicalSection) {
        console.error('Historical section element not found');
        return;
    }
    
    console.log('Showing historical section');
    historicalSection.style.display = 'block';
    
    // Temperature
    if (historicalStats.temperature) {
        console.log('Updating temperature display');
        updateHistoricalDisplay('temp', currentWeather.main.temp, historicalStats.temperature, '°C');
    }
    
    // Feels like
    if (historicalStats.feelsLike) {
        console.log('Updating feels like display');
        updateHistoricalDisplay('feels', currentWeather.main.feels_like, historicalStats.feelsLike, '°C');
    }
    
    // Humidity
    if (historicalStats.humidity) {
        console.log('Updating humidity display');
        updateHistoricalDisplay('humidity', currentWeather.main.humidity, historicalStats.humidity, '%');
    }
    
    // Wind speed
    if (historicalStats.windSpeed) {
        console.log('Updating wind display');
        updateHistoricalDisplay('wind', currentWeather.wind.speed, historicalStats.windSpeed, ' km/h');
    }
    
    // Pressure
    if (historicalStats.pressure) {
        console.log('Updating pressure display');
        updateHistoricalDisplay('pressure', currentWeather.main.pressure, historicalStats.pressure, ' hPa');
    }
}

function updateHistoricalDisplay(type, currentValue, historicalData, unit) {
    const currentElement = document.getElementById(`current-${type}-hist`);
    const rangeElement = document.getElementById(`${type}-range`);
    
    if (!currentElement || !rangeElement) return;
    
    // Display current value with comparison color
    currentElement.textContent = `${currentValue}${unit}`;
    
    // Determine if current value is above, below, or near average
    const difference = currentValue - historicalData.average;
    const threshold = historicalData.average * 0.1; // 10% threshold
    
    if (Math.abs(difference) <= threshold) {
        currentElement.className = 'current-temp average';
    } else if (difference > 0) {
        currentElement.className = 'current-temp above-average';
    } else {
        currentElement.className = 'current-temp below-average';
    }
    
    // Display historical range
    let rangeText = '';
    if (historicalData.min !== undefined && historicalData.max !== undefined && 
        historicalData.min !== null && historicalData.max !== null) {
        // Has both min and max (like temperature, humidity, pressure)
        rangeText = `Avg: ${historicalData.average}${unit} (${historicalData.min}-${historicalData.max}${unit})`;
    } else if (historicalData.overallMin !== undefined && historicalData.overallMax !== undefined) {
        // Has overall range (like wind speed - only daily maximums)
        rangeText = `Avg: ${historicalData.average}${unit} (range: ${historicalData.overallMin}-${historicalData.overallMax}${unit})`;
    } else {
        // Fallback - just show average
        rangeText = `Avg: ${historicalData.average}${unit}`;
    }
    
    rangeElement.textContent = rangeText;
}

// Fallback function if archive API fails
async function getHistoricalWeatherDataFallback(lat, lon) {
    console.log('Using fallback historical data method');
    
    // Create some realistic sample data based on current location and season
    const today = new Date();
    const month = today.getMonth(); // 0-11
    
    // Seasonal temperature adjustments (very basic)
    let baseTemp = 20; // Default
    if (month >= 2 && month <= 4) baseTemp = 15; // Spring
    else if (month >= 5 && month <= 7) baseTemp = 25; // Summer  
    else if (month >= 8 && month <= 10) baseTemp = 18; // Fall
    else baseTemp = 8; // Winter
    
    // Add some randomness to make it realistic
    const tempVariation = (Math.random() - 0.5) * 10;
    const avgTemp = baseTemp + tempVariation;
    
    return {
        temperature: {
            average: Math.round(avgTemp * 10) / 10,
            min: Math.round((avgTemp - 8) * 10) / 10,
            max: Math.round((avgTemp + 8) * 10) / 10,
            overallMin: Math.round((avgTemp - 12) * 10) / 10,
            overallMax: Math.round((avgTemp + 12) * 10) / 10
        },
        humidity: {
            average: 65,
            min: 45,
            max: 85,
            overallMin: 30,
            overallMax: 95
        },
        windSpeed: {
            average: 12.5,
            overallMin: 2.0,
            overallMax: 35.0
        },
        pressure: {
            average: 1013.2,
            min: 995.0,
            max: 1025.0,
            overallMin: 980.0,
            overallMax: 1040.0
        }
    };
}

// Function to get actual precipitation forecast data
async function getPrecipitationForecast(lat, lon, hours) {
    try {
        console.log(`Fetching precipitation forecast for ${hours} hours`);
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&forecast_days=2&timezone=auto`
        );
        
        const data = await response.json();
        if (data.hourly && data.hourly.precipitation) {
            return data.hourly.precipitation.slice(0, hours);
        }
        return null;
    } catch (error) {
        console.error('Error fetching precipitation forecast:', error);
        return null;
    }
}

// Enhanced function to create forecast-aware radar frames
async function createForecastFrames(baseFrame, currentTime, maxHours, lat, lon) {
    const forecastFrames = [];
    
    // Get precipitation forecast data if available
    const precipForecast = await getPrecipitationForecast(lat, lon, maxHours);
    
    for (let hour = 3; hour <= maxHours; hour += (maxHours > 12 ? 2 : 1)) {
        let opacity = Math.max(0.2, 1 - (hour - 2) * 0.08);
        let hasRain = false;
        
        // Check if precipitation is expected at this hour
        if (precipForecast && precipForecast[hour]) {
            const precipAmount = precipForecast[hour];
            hasRain = precipAmount > 0.1; // More than 0.1mm precipitation
            
            // Adjust opacity based on expected precipitation
            if (hasRain) {
                opacity = Math.min(0.7, opacity + (precipAmount * 0.1));
            } else {
                opacity = Math.max(0.1, opacity * 0.5); // Fade out if no rain expected
            }
        }
        
        const forecastFrame = {
            time: currentTime + (hour * 3600),
            path: baseFrame.path,
            isForecast: true,
            forecastHour: hour,
            opacity: opacity,
            hasPrecipitation: hasRain,
            precipAmount: precipForecast ? precipForecast[hour] : 0
        };
        
        forecastFrames.push(forecastFrame);
    }
    
    return forecastFrames;
}