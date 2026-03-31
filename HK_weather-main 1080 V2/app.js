class HKWeatherBanner {
    constructor() {
        // Support both traditional warnings and work heat stress warnings
        this.supportedWarnings = [
            "TC1", "TC3", "TC8NE", "TC8NW", "TC8SE", "TC8SW", "TC9", "TC10",
            "WCOLD", "WHOT", "WRAINA", "WRAINB", "WRAINR", "WTS", "WMSGNL",
            "AMBER", "RED", "BLACK"  // Work heat stress warnings
        ];
        
        this.weatherAPI = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";
        this.warningAPI = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc";
        this.hswwAPI = "https://data.weather.gov.hk/weatherAPI/opendata/hsww.php?lang=tc";  // New HSWW API
        
        this.weatherIconPaths = [
            "https://www.hko.gov.hk/images/HKOWxIconBlue/pic{iconCode}.png",
            "https://www.hko.gov.hk/images/HKOWxIconOutline/pic{iconCode}.png"
        ];
        this.fallbackData = {
            temperature: "--°C",
            humidity: "--%",
            weatherIcon: "50"
        };
        
        this.timeUpdateInterval = null;
        this.weatherUpdateInterval = null;
        this.warningUpdateInterval = null;
        
        this.init();
    }

    init() {
        // Initial updates
        this.updateTime();
        this.updateDate();
        
        // Set fallback data immediately
        this.setFallbackWeatherData();
        
        // Start fetching real data
        this.fetchWeatherData();
        this.fetchAllWarningData();  // Updated to fetch both warning types
        
        // Clear any existing intervals first
        this.clearIntervals();
        
        // Set up new intervals
        this.timeUpdateInterval = setInterval(() => {
            this.updateTime();
            this.updateDate(); // Also check date changes
        }, 60000); // Every minute
        
        this.weatherUpdateInterval = setInterval(() => {
            this.fetchWeatherData();
        }, 300000); // Every 5 minutes
        
        this.warningUpdateInterval = setInterval(() => {
            this.fetchAllWarningData();  // Updated to fetch both warning types
        }, 100000); // Every 5 minutes
        
        console.log('HK Weather Banner initialized successfully');
    }

    clearIntervals() {
        if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
        if (this.weatherUpdateInterval) clearInterval(this.weatherUpdateInterval);
        if (this.warningUpdateInterval) clearInterval(this.warningUpdateInterval);
    }

    updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = `${hours}:${minutes}`;
        }
        console.log(`Time updated: ${hours}:${minutes}`);
    }

    updateDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = `${day}/${month}/${year}`;
        }
    }

    async fetchWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async fetchWeatherData() {
        try {
            console.log('Fetching weather data...');
            const data = await this.fetchWithTimeout(this.weatherAPI);
            
            if (data && data.temperature && data.humidity) {
                // Update temperature
                const tempElement = document.getElementById('temperature');
                if (tempElement) {
                    if (data.temperature.data && data.temperature.data.length > 0) {
                        const temp = data.temperature.data[0].value;
                        tempElement.textContent = `${temp}°C`;
                    } else {
                        tempElement.textContent = this.fallbackData.temperature;
                    }
                }
                
                // Update humidity
                const humidityElement = document.getElementById('humidity');
                if (humidityElement) {
                    if (data.humidity && data.humidity.data && data.humidity.data.length > 0) {
                        const humidity = data.humidity.data[0].value;
                        humidityElement.textContent = `${humidity}%`;
                    } else {
                        humidityElement.textContent = this.fallbackData.humidity;
                    }
                }
                
                // Update weather icon
                if (data.icon && data.icon.length > 0) {
                    this.loadWeatherIcon(data.icon[0]);
                } else {
                    this.loadWeatherIcon(this.fallbackData.weatherIcon);
                }
                
                console.log('Weather data updated successfully');
            } else {
                this.setFallbackWeatherData();
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
            // Keep fallback data if already set
        }
    }

    setFallbackWeatherData() {
        const tempElement = document.getElementById('temperature');
        const humidityElement = document.getElementById('humidity');
        
        if (tempElement) tempElement.textContent = this.fallbackData.temperature;
        if (humidityElement) humidityElement.textContent = this.fallbackData.humidity;
        this.loadWeatherIcon(this.fallbackData.weatherIcon);
        
        console.log('Fallback weather data set');
    }

    loadWeatherIcon(iconCode) {
        const iconElement = document.getElementById('weather-icon');
        if (!iconElement) return;
        
        let currentPathIndex = 0;
        
        // Show loading animation first
        iconElement.style.display = 'none';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'weather-icon-loading';
        iconElement.parentNode.appendChild(loadingDiv);
        
        const tryLoadIcon = () => {
            if (currentPathIndex >= this.weatherIconPaths.length) {
                // All paths failed, show fallback icon
                const fallbackSvg = 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="70" height="70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
                        <rect width="70" height="70" fill="#4c1d95" rx="8"/>
                        <circle cx="40" cy="30" r="12" fill="#ffffff" opacity="0.8"/>
                        <path d="M20 50 Q25 45 30 50 Q35 45 40 50 Q45 45 50 50 Q55 45 60 50" stroke="#ffffff" stroke-width="3" fill="none"/>
                    </svg>
                `);
                
                iconElement.src = fallbackSvg;
                iconElement.style.display = 'block';
                if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
                console.log('Fallback weather icon loaded');
                return;
            }
            
            const iconPath = this.weatherIconPaths[currentPathIndex].replace('{iconCode}', iconCode);
            const img = new Image();
            
            img.onload = () => {
                iconElement.src = iconPath;
                iconElement.style.display = 'block';
                if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
                console.log(`Weather icon loaded: ${iconPath}`);
            };
            
            img.onerror = () => {
                console.log(`Failed to load icon from: ${iconPath}`);
                currentPathIndex++;
                tryLoadIcon();
            };
            
            img.src = iconPath;
        };
        
        tryLoadIcon();
    }

    // New method to fetch both traditional warnings and HSWW warnings
    async fetchAllWarningData() {
        try {
            console.log('Fetching all warning data...');
            
            // Fetch both APIs concurrently
            const [traditionalWarningsData, hswwData] = await Promise.allSettled([
                this.fetchWithTimeout(this.warningAPI),
                this.fetchWithTimeout(this.hswwAPI)
            ]);

            let allActiveWarnings = [];

            // Process traditional warnings
            if (traditionalWarningsData.status === 'fulfilled') {
                const traditionalWarnings = this.processTraditionalWarnings(traditionalWarningsData.value);
                allActiveWarnings = allActiveWarnings.concat(traditionalWarnings);
            } else {
                console.error('Error fetching traditional warnings:', traditionalWarningsData.reason);
            }

            // Process HSWW warnings
            if (hswwData.status === 'fulfilled') {
                const hswwWarnings = this.processHSWWWarnings(hswwData.value);
                allActiveWarnings = allActiveWarnings.concat(hswwWarnings);
            } else {
                console.error('Error fetching HSWW warnings:', hswwData.reason);
            }

            // Update warning icons with all active warnings
            this.displayWarningIcons(allActiveWarnings);

        } catch (error) {
            console.error('Error fetching warning data:', error);
            this.clearWarningIcons();
        }
    }

    // CRITICAL FIX: Corrected traditional warning processing logic
    processTraditionalWarnings(data) {
        const activeWarnings = [];
        
        if (!data) {
            console.log('No traditional warning data received');
            return activeWarnings;
        }
        
        // Handle object format data structure correctly
        // This is the main fix for WRAINA not displaying
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const warning = data[key];
                if (warning && typeof warning === 'object' && warning.code && warning.actionCode) {
                    // CRITICAL FIX: Use warning.code instead of key - this was the bug!
                    const warningCode = warning.code;
                    if (warning.actionCode !== "CANCEL" && this.supportedWarnings.includes(warningCode)) {
                        activeWarnings.push(warningCode);
                        console.log(`Active traditional warning found: ${warningCode} (${warning.name || 'Unknown'})`);
                    }
                }
            }
        }
        
        // Also handle array format (WTCSGNL) for backward compatibility
        if (data.WTCSGNL && Array.isArray(data.WTCSGNL)) {
            data.WTCSGNL.forEach(warning => {
                if (warning.actionCode !== "CANCEL" && this.supportedWarnings.includes(warning.warningStatementCode)) {
                    activeWarnings.push(warning.warningStatementCode);
                    console.log(`Active WTCSGNL warning found: ${warning.warningStatementCode}`);
                }
            });
        }
        
        return activeWarnings;
    }

    // New method to process HSWW warnings
    processHSWWWarnings(data) {
        const activeWarnings = [];
        
        if (!data) {
            console.log('No HSWW warning data received');
            return activeWarnings;
        }
        
        // Process HSWW data structure
        if (data.hsww && typeof data.hsww === 'object') {
            const hsww = data.hsww;
            if (hsww.actionCode !== "CANCEL" && hsww.warningLevel) {
                const level = hsww.warningLevel;
                if (["AMBER", "RED", "BLACK"].includes(level)) {
                    activeWarnings.push(level);
                    console.log(`Active HSWW warning found: ${level}`);
                }
            }
        }
        
        return activeWarnings;
    }

    displayWarningIcons(activeWarnings) {
        const warningSection = document.getElementById('warning-section');
        if (!warningSection) return;
        
        warningSection.innerHTML = '';
        warningSection.style.display = 'flex';
        
        // Remove duplicates
        const uniqueWarnings = [...new Set(activeWarnings)];
        
        console.log('All active warnings to display:', uniqueWarnings);
        
        // Create warning icons for active warnings
        uniqueWarnings.forEach(warningCode => {
            const img = document.createElement('img');
            img.src = `${warningCode}.png`;
            img.alt = warningCode;
            img.style.width = '70px';
            img.style.height = '70px';
            img.style.objectFit = 'contain';
            
            // Handle image load errors gracefully
            img.onerror = () => {
                console.log(`Warning icon not found: ${warningCode}.png, using fallback`);
                // Create a fallback warning icon
                img.src = 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
                        <rect width="80" height="80" fill="#dc2626" rx="8"/>
                        <text x="40" y="30" text-anchor="middle" fill="white" font-size="10" font-family="monospace">${warningCode}</text>
                        <polygon points="40,45 35,55 45,55" fill="white"/>
                        <circle cx="40" cy="60" r="2" fill="white"/>
                    </svg>
                `);
            };
            
            img.onload = () => {
                console.log(`Warning icon loaded: ${warningCode}.png`);
            };
            
            warningSection.appendChild(img);
        });
    }

    clearWarningIcons() {
        const warningSection = document.getElementById('warning-section');
        if (warningSection) {
            warningSection.innerHTML = '';
            warningSection.style.display = 'flex';
        }
        console.log('Warning icons cleared');
    }
}

// Initialize the weather banner when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing HK Weather Banner...');
    new HKWeatherBanner();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded (ready state check), initializing HK Weather Banner...');
        new HKWeatherBanner();
    });
} else {
    console.log('DOM already loaded, initializing HK Weather Banner immediately...');
    new HKWeatherBanner();
}