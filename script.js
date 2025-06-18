const apiKey = 'f3957d4157cf1658e2e3d424015c78e9'; 
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
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'City not found');
        }

        updateWeatherInfo(data);
        hideLoading();
    } catch (error) {
        showError(error.message);
        console.error('Full error:', error);
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Unable to fetch weather data');
        }

        updateWeatherInfo(data);
        hideLoading();
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