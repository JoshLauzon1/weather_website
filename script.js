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
        };

        updateWeatherInfo(transformedData);
        hideLoading();
        
        // Show radar for the searched location
        showRadarForLocation(latitude, longitude);
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
        showRadarForLocation(lat, lon);
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
        // Get available radar frames from RainViewer API
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        
        radarFrames = data.radar.past.concat(data.radar.nowcast);
        
        if (radarFrames.length > 0) {
            showRadarFrame(radarFrames.length - 1); // Show latest frame
            updateRadarTimestamp(radarFrames[radarFrames.length - 1].time);
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
        radarLayer = L.tileLayer(
            `https://tilecache.rainviewer.com/v2/radar/${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
            {
                opacity: 0.6,
                attribution: 'RainViewer'
            }
        ).addTo(radarMap);
        
        updateRadarTimestamp(frame.time);
    }
}

function updateRadarTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const timeString = date.toLocaleTimeString();
    document.getElementById('radar-timestamp').textContent = `Radar: ${timeString}`;
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
    const toggleBtn = document.getElementById('radar-toggle-btn');
    const toggleIcon = toggleBtn.querySelector('i');
    
    if (radarSection.style.display === 'none') {
        radarSection.style.display = 'block';
        toggleIcon.className = 'fas fa-eye-slash';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Radar';
        
        // Initialize radar if not already done
        if (!radarMap && lastUserLocation) {
            setTimeout(() => {
                initializeRadar(lastUserLocation.lat, lastUserLocation.lon);
            }, 100);
        }
    } else {
        radarSection.style.display = 'none';
        toggleIcon.className = 'fas fa-eye';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Radar';
        
        // Stop animation when hiding
        if (animationTimer) {
            toggleRadarAnimation();
        }
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