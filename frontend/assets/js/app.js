// Try different API URLs to handle various hosting scenarios
const API_URLS = {
    direct: 'http://localhost:3000',   // Direct connection to JSON server (most reliable)
    relative: 'api',                   // Relative path if running from same domain
    proxy: '/api',                     // Proxy path if using middleware
    proxyServer: 'http://localhost:8090/api' // Proxy server we set up
};

// We'll try all of these URLs in sequence until one works
// Using the proxy server to avoid CORS issues
const API_URL = API_URLS.proxyServer;
let currentUser = { id: 1, name: 'Demo User' }; // Mock user for demo purposes

// Configure Axios defaults for better error handling
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Accept'] = 'application/json';

// Configure Axios for error handling

// App state
const appState = {
    currentScreen: 'home', // 'home' or 'detail'
    selectedDinner: null,
    myDinners: [], // Dinners created by current user
    availableDinners: [], // All other dinners
    filter: 'all'
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Show loading indicator
    document.getElementById('dinnersContainer').innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div>Loading dinners...</div>
        </div>
    `;
    
    // First check if API is accessible
    console.log('Testing API availability...');
    fetch(`${API_URL}/dinners`)
        .then(response => {
            console.log('API test response:', response.status);
            if (!response.ok) throw new Error('API not accessible');
            return response.json();
        })
        .then(data => {
            console.log('API test successful, received data:', data);
            // API is working, load data properly
            setTimeout(loadDinners, 300);
        })
        .catch(error => {
            console.error('API test failed:', error);
            // Show error message to user
            document.getElementById('dinnersContainer').innerHTML = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> Connection Error</h4>
                    <p>Unable to connect to the API server at ${API_URL}</p>
                    <p>Please make sure the JSON server is running at port 3000.</p>
                    <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                        Retry Connection
                    </button>
                </div>
            `;
        });
});

function setupEventListeners() {
    // Filter chip selection
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            appState.filter = chip.textContent.toLowerCase();
            filterDinners();
        });
    });
    
    // Back navigation from detail screen
    document.addEventListener('click', (e) => {
        if (e.target.id === 'backButton') {
            navigateToHome();
        }
    });
    
    // Setup reservation modal events
    const reservationModal = document.getElementById('reservationModal');
    if (reservationModal) {
        reservationModal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            const dinnerId = button.getAttribute('data-id');
            setupReservationModal(dinnerId);
        });
    }
    
    // Reservation form submission
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', handleReservation);
    }
}

async function loadDinners() {
    try {
        console.log('Starting dinner data load process');
        document.getElementById('dinnersContainer').innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div>Loading dinners...</div>
            </div>
        `;
        
        let response = null;
        let successUrl = null;
        
        // Try all possible API URLs until one works
        for (const [urlType, baseUrl] of Object.entries(API_URLS)) {
            if (response) break; // Stop if we already have data
            
            const fullUrl = `${baseUrl}/dinners`;
            console.log(`Trying API URL (${urlType}):`, fullUrl);
            
            try {
                // First try with Axios
                response = await axios.get(fullUrl, {
                    timeout: 5000,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`Success with ${urlType} URL!`, response.status);
                successUrl = fullUrl;
                break;
                
            } catch (axiosError) {
                console.warn(`Failed with ${urlType} URL using Axios:`, axiosError.message);
                
                // Try with Fetch API as backup for this URL
                try {
                    console.log(`Trying ${urlType} URL with fetch API`);
                    const fetchResponse = await fetch(fullUrl);
                    
                    if (!fetchResponse.ok) {
                        console.warn(`Fetch also failed for ${urlType} URL: ${fetchResponse.status}`);
                        continue; // Try next URL
                    }
                    
                    const data = await fetchResponse.json();
                    console.log(`Success with ${urlType} URL using fetch!`);
                    response = { data }; // Match axios response format
                    successUrl = fullUrl;
                    break;
                    
                } catch (fetchError) {
                    console.warn(`Fetch also failed for ${urlType} URL:`, fetchError.message);
                    // Continue to next URL
                }
            }
        }
        
        // If we didn't get data from any URL, use mock data
        if (!response) {
            console.warn('All API URLs failed, falling back to mock data');
            loadMockData();
            return;
        }
        
        // If we get here, we have data! Display a success message about which URL worked
        console.log(`Successfully loaded data from ${successUrl}`, response.data);
        if (successUrl !== `${API_URLS.direct}/dinners`) {
            // Show a message if we're not using the primary URL
            document.getElementById('app').insertAdjacentHTML('afterbegin', `
                <div class="alert alert-info m-0" style="border-radius: 0;">
                    <div class="container d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-info-circle"></i> 
                            Connected via alternative API URL: ${successUrl}
                        </div>
                        <button class="btn btn-sm btn-outline-info" onclick="reconnectToApi()">
                            <i class="fas fa-sync"></i> Reconnect
                        </button>
                    </div>
                </div>
            `);
        }
        
        console.log('Dinners received:', response.data);
        
        // For demo purposes, split dinners into "my dinners" and "available dinners"
        // Make sure we handle both string and number IDs
        const userId = currentUser.id.toString();
        appState.myDinners = response.data.filter(dinner => 
            dinner.hostId.toString() === userId || 
            dinner.id.toString() === "1"); // For demo assume first dinner is user's
        appState.availableDinners = response.data.filter(dinner => 
            dinner.hostId.toString() !== userId && 
            dinner.id.toString() !== "1");
        
        renderUserDinners(appState.myDinners);
        renderAvailableDinners(appState.availableDinners);
    } catch (error) {
        console.error('Error loading dinners:', error);
        
        // Create a detailed error report
        let errorDetails = '';
        
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Server response error:', error.response.status, error.response.data);
            errorDetails = `Server returned status code ${error.response.status}`;
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            errorDetails = 'No response received from server';
            
            // Automatically try direct API check
            fetch(`${API_URL}/dinners`)
                .then(response => {
                    console.log('Direct fetch test response:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Direct fetch successful, data:', data);
                    // If direct fetch worked, we might have a CORS issue
                    errorDetails += ' (CORS issue detected)';
                    document.getElementById('dinnersContainer').innerHTML = `
                        <div class="alert alert-warning">
                            <h5><i class="fas fa-exclamation-triangle"></i> CORS Issue Detected</h5>
                            <p>Your browser blocked the API request due to CORS policy.</p>
                            <div class="mt-2">
                                <strong>Troubleshooting:</strong>
                                <ul>
                                    <li>We found data at ${API_URL}/dinners</li>
                                    <li>But your browser blocked access from ${window.location.origin}</li>
                                </ul>
                                <button class="btn btn-primary mt-2" onclick="loadDinnersWithLocalhost()">
                                    Try Alternative Connection
                                </button>
                            </div>
                        </div>
                    `;
                })
                .catch(fetchErr => console.error('Direct fetch also failed:', fetchErr));
        } else {
            // Something happened in setting up the request
            console.error('Request setup error:', error.message);
            errorDetails = error.message;
        }
        
        // Display error on UI
        document.getElementById('dinnersContainer').innerHTML = `
            <div class="alert alert-warning">
                <h5><i class="fas fa-exclamation-triangle"></i> Connection Error</h5>
                <p>Unable to load dinners: ${errorDetails}</p>
                <div class="mt-2">
                    <strong>Troubleshooting steps:</strong>
                    <ol>
                        <li>Make sure the JSON server is running (execute <code>cd frontend && npm run api</code>)</li>
                        <li>Try the start script: <code>./frontend/start-services.sh</code></li>
                        <li>Check that your browser can access <code>http://localhost:3000/dinners</code> directly</li>
                    </ol>
                </div>
                <div class="mt-3 d-flex gap-2">
                    <button class="btn btn-primary" onclick="loadDinners()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                    <button class="btn btn-outline-secondary" onclick="loadMockData()">
                        <i class="fas fa-database"></i> Use Demo Data
                    </button>
                </div>
            </div>
        `;
    }
}

function renderUserDinners(dinners) {
    const container = document.getElementById('userDinnersContainer');
    if (!dinners || dinners.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="mb-3">
                    <i class="fas fa-utensils fs-1 text-muted"></i>
                </div>
                <p class="text-muted">You haven't created any dinners yet.</p>
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#createDinnerModal">
                    Create Your First Dinner
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = dinners.map(dinner => `
        <div class="dinner-card" data-id="${dinner.id}" onclick="showDinnerDetail(${dinner.id})">
            <img src="${dinner.image}" class="dinner-image" alt="${dinner.title}" 
                 onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1'">
            <div class="dinner-info">
                <div class="dinner-card-content">
                    <div>
                        <h3 class="dinner-title">${dinner.title}</h3>
                        <div class="dinner-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(dinner.date)}</span>
                            <span><i class="fas fa-clock"></i> ${formatTime(dinner.time)}</span>
                            <span class="badge bg-${dinner.category === 'vegetarian' || dinner.category === 'vegan' ? 'success' : 'secondary'} rounded-pill">
                                ${dinner.category}
                            </span>
                        </div>
                        <p class="dinner-description mt-2">${dinner.description}</p>
                    </div>
                    <div class="dinner-footer">
                        <div class="dinner-price-tag">$${dinner.price} per person</div>
                        <div class="dinner-host">
                            <div class="host-avatar">
                                ${dinner.hostName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <div class="small">Hosted by</div>
                                <div class="fw-medium">${dinner.hostName}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAvailableDinners(dinners) {
    const container = document.getElementById('dinnersContainer');
    if (dinners.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="mb-3">
                    <i class="fas fa-search fs-1 text-muted"></i>
                </div>
                <p class="text-muted">No available dinners found with the current filters.</p>
                <button class="btn btn-sm btn-outline-primary filter-chip active" onclick="resetFilters()">
                    Show All Dinners
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = dinners.map(dinner => {
        // Get reservations count (in a real app, would come from API)
        const reservedSeats = Math.floor(Math.random() * dinner.maxGuests); // Simulate some reservations
        const remainingSeats = dinner.maxGuests - reservedSeats;
        const percentFull = (reservedSeats / dinner.maxGuests) * 100;
        
        let availabilityBadge = '';
        if (remainingSeats === 0) {
            availabilityBadge = '<span class="badge bg-danger ms-2">Fully booked</span>';
        } else if (remainingSeats <= 2) {
            availabilityBadge = `<span class="badge bg-warning ms-2">Only ${remainingSeats} left!</span>`;
        }
        
        return `
        <div class="dinner-card" data-id="${dinner.id}" onclick="showDinnerDetail(${dinner.id})">
            <img src="${dinner.image}" class="dinner-image" alt="${dinner.title}"
                 onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1'">
            <div class="dinner-info">
                <div class="d-flex justify-content-between align-items-center">
                    <h3 class="dinner-title">${dinner.title}</h3>
                    <span class="badge bg-${dinner.category === 'vegetarian' || dinner.category === 'vegan' ? 'success' : 'secondary'} rounded-pill">${dinner.category}</span>
                </div>
                <div class="dinner-time">
                    ${formatDate(dinner.date)}, ${formatTime(dinner.time)}
                </div>
                <p class="dinner-description">${dinner.description}</p>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <span class="dinner-price">$${dinner.price}</span>
                    <span class="small">${getRelativeDate(dinner.date)} ${availabilityBadge}</span>
                </div>
                
                <!-- Capacity indicator -->
                <div class="progress mt-2" style="height: 4px;">
                    <div class="progress-bar ${percentFull > 75 ? 'bg-danger' : 'bg-success'}" style="width: ${percentFull}%"></div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <small class="text-muted">${dinner.hostName}</small>
                    <small class="text-muted">${remainingSeats} of ${dinner.maxGuests} spots left</small>
                </div>
            </div>
        </div>
    `}).join('');
}

// Reset all filters
function resetFilters() {
    appState.filter = 'all';
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.textContent.toLowerCase() === 'all') {
            chip.classList.add('active');
        }
    });
    filterDinners();
}

// Helper functions for formatting dates and times
function formatDate(dateStr) {
    const date = new Date(dateStr);
    
    // For today, use "Today"
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return "Today";
    }
    
    // For tomorrow, use "Tomorrow"
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
    }
    
    // For next 7 days, use "This Monday", "This Tuesday", etc.
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (date < nextWeek) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `This ${days[date.getDay()]}`;
    }
    
    // Otherwise use full date format
    return new Intl.DateTimeFormat('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
    }).format(date);
}

function formatTime(timeStr) {
    // Convert 24h format to 12h format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
}

function getEndTime(timeStr) {
    // Add 2 hours to the start time as a default dinner duration
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10) + 2);
    date.setMinutes(parseInt(minutes, 10));
    return `${date.getHours() % 12 || 12}:${minutes.padStart(2, '0')} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}

// Format relative date like "in 3 days" or "today"
function getRelativeDate(dateStr) {
    const dinnerDate = new Date(dateStr);
    const today = new Date();
    
    // Reset time portion for accurate day comparison
    today.setHours(0, 0, 0, 0);
    const tempDinnerDate = new Date(dinnerDate);
    tempDinnerDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = tempDinnerDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return "today";
    } else if (diffDays === 1) {
        return "tomorrow";
    } else if (diffDays > 1 && diffDays < 7) {
        return `in ${diffDays} days`;
    } else {
        const options = { month: 'short', day: 'numeric' };
        return `on ${dinnerDate.toLocaleDateString('en-US', options)}`;
    }
}

function filterDinners() {
    // Apply filters to the available dinners
    let filtered = [...appState.availableDinners];
    
    switch(appState.filter) {
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(dinner => dinner.date === today);
            break;
        case 'this week':
            const weekStart = new Date();
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            filtered = filtered.filter(dinner => {
                const dinnerDate = new Date(dinner.date);
                return dinnerDate >= weekStart && dinnerDate <= weekEnd;
            });
            break;
        case 'vegetarian':
            filtered = filtered.filter(dinner => 
                dinner.category === 'vegetarian' || 
                dinner.category === 'vegan');
            break;
        case 'under $20':
            filtered = filtered.filter(dinner => dinner.price < 20);
            break;
    }
    
    renderAvailableDinners(filtered);
}

// Navigation and UI functions
function navigateToHome() {
    document.getElementById('homeScreen').classList.remove('d-none');
    document.getElementById('dinnerDetailScreen').classList.add('d-none');
    appState.currentScreen = 'home';
    appState.selectedDinner = null;
}

function navigateToDetail() {
    document.getElementById('homeScreen').classList.add('d-none');
    document.getElementById('dinnerDetailScreen').classList.remove('d-none');
    appState.currentScreen = 'detail';
}

async function showDinnerDetail(dinnerId) {
    try {
        console.log('Fetching dinner details for ID:', dinnerId);
        
        let dinner;
        try {
            // Try to get the specific dinner
            const response = await axios.get(`${API_URL}/dinners/${dinnerId}`);
            console.log('Dinner details received:', response.data);
            dinner = response.data;
        } catch (detailError) {
            console.warn('Error fetching specific dinner, trying alternative approach:', detailError);
            
            // If that fails, get all dinners and find the one we need
            const allDinnersResponse = await axios.get(`${API_URL}/dinners`);
            dinner = allDinnersResponse.data.find(d => d.id.toString() === dinnerId.toString());
            
            if (!dinner) {
                throw new Error(`Dinner with ID ${dinnerId} not found`);
            }
            console.log('Found dinner through alternative method:', dinner);
        }
        appState.selectedDinner = dinner;
        
        // Load reservations for this dinner
        const reservationsResponse = await axios.get(`${API_URL}/reservations?dinnerId=${dinnerId}`);
        const reservations = reservationsResponse.data;
        
        // Calculate remaining spots
        const reservedSeats = reservations.reduce((total, res) => total + res.seats, 0);
        const remainingSpots = dinner.maxGuests - reservedSeats;
        const percentFull = (reservedSeats / dinner.maxGuests) * 100;
        
        // Render detail view
        const detailScreen = document.getElementById('dinnerDetailScreen');
        detailScreen.innerHTML = `
            <header class="dinner-header">
                <div class="d-flex align-items-center">
                    <button id="backButton" class="btn btn-link text-light">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h1 class="navbar-brand mb-0">Hosting Your <span class="accent">Dinner</span></h1>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <h2 class="dinner-detail-title">${dinner.title}</h2>
                    ${dinner.hostId === currentUser.id ? 
                        `<button class="btn btn-sm btn-outline-light" onclick="editDinner(${dinner.id})">
                            <i class="fas fa-pencil-alt"></i> Edit
                        </button>` : ''}
                </div>
                <div class="mt-2">
                    <span class="badge bg-${dinner.category === 'vegetarian' || dinner.category === 'vegan' ? 'success' : 'secondary'}">${dinner.category}</span>
                    <span class="badge bg-info ms-1">${getRelativeDate(dinner.date)}</span>
                </div>
            </header>
            
            <div class="position-relative">
                <img src="${dinner.image}" class="detail-image" alt="${dinner.title}" 
                     onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1'">
                <div class="position-absolute bottom-0 start-0 end-0 p-3" 
                     style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-light text-dark">
                                <i class="fas fa-calendar"></i> ${formatDate(dinner.date)}
                            </span>
                        </div>
                        <div>
                            <span class="badge bg-light text-dark">
                                <i class="fas fa-clock"></i> ${formatTime(dinner.time)} - ${getEndTime(dinner.time)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tabs for dinner details -->
            <div class="tabs">
                <div class="tab active" id="tab-details" onclick="switchTab('details')">Details</div>
                <div class="tab" id="tab-guests" onclick="switchTab('guests')">Guests</div>
                <div class="tab" id="tab-location" onclick="switchTab('location')">Location</div>
            </div>
            
            <!-- Tab content -->
            <div id="tab-content-details" class="tab-content">
                <div class="detail-section">
                    <h3>About this dinner</h3>
                    <p>${dinner.description}</p>
                </div>
                
                <div class="detail-section">
                    <h3>About your host</h3>
                    <div class="d-flex align-items-center">
                        <div class="attendee-avatar" style="background-color: #61dafb">
                            ${dinner.hostName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div class="ms-3">
                            <strong>${dinner.hostName}</strong>
                            <p class="small text-muted mb-0">Host</p>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Price</h3>
                    <p class="fs-3 mb-1">$${dinner.price} <span class="fs-6">per person</span></p>
                    <div class="progress mt-2" style="height: 6px;">
                        <div class="progress-bar ${percentFull > 75 ? 'bg-danger' : 'bg-success'}" style="width: ${percentFull}%"></div>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <small class="text-muted">${reservedSeats} guests attending</small>
                        <small class="text-muted">${remainingSpots} of ${dinner.maxGuests} spots left</small>
                    </div>
                </div>
            </div>
            
            <div id="tab-content-guests" class="tab-content d-none">
                <div class="detail-section">
                    <h3>Who's coming</h3>
                    <div class="attendees">
                        ${renderAttendees(reservations)}
                        ${remainingSpots > 0 ? 
                            `<div class="attendee">
                                <div class="attendee-avatar add-attendee" data-bs-toggle="modal" data-bs-target="#reservationModal" data-id="${dinner.id}">
                                    <i class="fas fa-plus"></i>
                                </div>
                                <small>Join</small>
                            </div>` : ''}
                    </div>
                    ${remainingSpots <= 3 && remainingSpots > 0 ? 
                        `<div class="mt-3"><span class="badge bg-warning">Only ${remainingSpots} spots left!</span></div>` : ''}
                    ${remainingSpots === 0 ? 
                        `<div class="mt-3"><span class="badge bg-danger">Fully booked!</span></div>` : ''}
                </div>
                
                <div class="detail-section">
                    <h3>Dietary preferences</h3>
                    <p class="text-muted">
                        ${dinner.category === 'vegetarian' || dinner.category === 'vegan' ? 
                            `This is a ${dinner.category} dinner. All dishes will be ${dinner.category}.` : 
                            'No specific dietary restrictions for this dinner. Contact the host for special accommodations.'}
                    </p>
                </div>
            </div>
            
            <div id="tab-content-location" class="tab-content d-none">
                <div class="detail-section">
                    <h3>Location</h3>
                    <p class="text-muted">Exact address will be shared after your reservation is confirmed.</p>
                    <div class="rounded bg-dark p-2 mt-3 text-center">
                        <i class="fas fa-map-marker-alt fs-1 mb-2"></i>
                        <p>Approximately 3 miles from city center</p>
                    </div>
                </div>
            </div>
            
            ${dinner.hostId !== currentUser.id && remainingSpots > 0 ? 
                `<div class="p-4 text-center">
                    <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#reservationModal" data-id="${dinner.id}">
                        Reserve a Spot - $${dinner.price}
                    </button>
                </div>` : ''}
        `;
        
        navigateToDetail();
    } catch (error) {
        console.error('Error fetching dinner details:', error);
        alert('Failed to load dinner details. Please try again.');
    }
}

// Tab switching function
window.switchTab = function(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('d-none');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab and content
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-content-${tabName}`).classList.remove('d-none');
}

function renderAttendees(reservations) {
    if (reservations.length === 0) {
        return `<p class="text-muted">No one has joined yet. Be the first!</p>`;
    }
    
    // Get unique guests and count their seats
    const guests = {};
    reservations.forEach(res => {
        if (!guests[res.guestName]) {
            guests[res.guestName] = {
                name: res.guestName,
                seats: res.seats
            };
        } else {
            guests[res.guestName].seats += res.seats;
        }
    });
    
    // Create attendee avatars (max 4 to display)
    let html = '';
    const guestArray = Object.values(guests);
    const maxToShow = Math.min(4, guestArray.length);
    
    for (let i = 0; i < maxToShow; i++) {
        const guest = guestArray[i];
        const initials = guest.name.split(' ').map(n => n[0]).join('');
        
        html += `
        <div class="attendee">
            <div class="attendee-avatar" style="background-color: hsl(${i * 60}, 70%, 60%)">
                ${initials}
            </div>
            <small>${guest.name}</small>
        </div>`;
    }
    
    // Add additional count if more than 4 guests
    if (guestArray.length > 4) {
        const remaining = guestArray.length - 4;
        html += `
        <div class="attendee">
            <div class="attendee-avatar" style="background-color: #555">
                +${remaining}
            </div>
            <small>more</small>
        </div>`;
    }
    
    return html;
}

// Reservation functionality
function setupReservationModal(dinnerId) {
    document.getElementById('reservationDinnerId').value = dinnerId;
    
    // Get the dinner details
    const dinner = [...appState.myDinners, ...appState.availableDinners].find(d => d.id == dinnerId);
    
    if (dinner) {
        // Set price in the modal
        document.getElementById('reservationPrice').textContent = `$${dinner.price}`;
        
        // Calculate and set spots left
        axios.get(`${API_URL}/reservations?dinnerId=${dinnerId}`)
            .then(response => {
                const reservations = response.data;
                const reservedSeats = reservations.reduce((total, res) => total + res.seats, 0);
                const spotsLeft = dinner.maxGuests - reservedSeats;
                
                document.getElementById('spotsLeft').textContent = spotsLeft;
                
                // Limit max seats in the input
                const seatsInput = document.querySelector('input[name="seats"]');
                seatsInput.max = spotsLeft;
                
                // Update total when seats change
                seatsInput.addEventListener('input', () => {
                    const seats = parseInt(seatsInput.value) || 0;
                    document.getElementById('reservationTotal').textContent = 
                        `$${(seats * dinner.price).toFixed(2)}`;
                });
                
                // Initialize total
                document.getElementById('reservationTotal').textContent = 
                    `$${(dinner.price).toFixed(2)}`;
            })
            .catch(error => {
                console.error('Error loading reservations:', error);
            });
    }
}

async function handleReservation(e) {
    e.preventDefault();
    
    const formData = {
        dinnerId: parseInt(e.target.dinnerId.value),
        guestName: e.target.guestName.value,
        seats: parseInt(e.target.seats.value),
        notes: e.target.notes.value,
        createdAt: new Date().toISOString()
    };
    
    try {
        await axios.post(`${API_URL}/reservations`, formData);
        
        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('reservationModal')).hide();
        e.target.reset();
        
        // Refresh dinner detail if we're on the detail screen
        if (appState.currentScreen === 'detail' && appState.selectedDinner.id === formData.dinnerId) {
            showDinnerDetail(formData.dinnerId);
        } else {
            // Otherwise just reload dinners list
            loadDinners();
        }
        
        // Show a success message
        alert('Your reservation has been confirmed!');
    } catch (error) {
        console.error('Error creating reservation:', error);
        alert('Error creating reservation. Please try again.');
    }
}

// Unsplash Integration
const UNSPLASH_ACCESS_KEY = 'jbLyVpcZxCaNeFlbcRQ5cH_GsL8NzmotumC-RvkyZtw'; // Replace with your key

document.addEventListener('DOMContentLoaded', () => {
    const searchImageBtn = document.getElementById('searchImageBtn');
    if (searchImageBtn) {
        searchImageBtn.addEventListener('click', searchUnsplashImages);
    }
});

async function searchUnsplashImages() {
    const searchInput = document.getElementById('imageSearch');
    const query = searchInput ? searchInput.value : '';
    
    if (!query) {
        alert('Please enter a search term for images');
        return;
    }

    // Show loading indicator
    const imagesContainer = document.getElementById('imageResults');
    if (imagesContainer) {
        imagesContainer.innerHTML = `<div class="text-center w-100 my-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2">Searching for images...</div>
        </div>`;
    }

    try {
        // First try using Unsplash API
        try {
            const response = await axios.get(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${UNSPLASH_ACCESS_KEY}`,
                { timeout: 5000 } // 5 second timeout
            );

            if (response.data && response.data.results && response.data.results.length > 0) {
                if (imagesContainer) {
                    imagesContainer.innerHTML = response.data.results.map(img => `
                        <img src="${img.urls.thumb}" 
                             class="img-thumbnail cursor-pointer" 
                             style="width: 100px; height: 100px; object-fit: cover"
                             data-regular="${img.urls.regular}"
                             onclick="selectImage('${img.urls.regular.replace(/'/g, "\\'")}')">
                    `).join('');
                }
                return; // Exit if we got results
            }
        } catch (unsplashError) {
            console.warn('Unsplash API error, falling back to alternative:', unsplashError);
        }

        // Fallback to a basic image search if Unsplash fails
        const fallbackImages = [
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
            'https://images.unsplash.com/photo-1513104890138-7c749659a591',
            'https://images.unsplash.com/photo-1498837167922-ddd27525d352',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
        ];
        
        if (imagesContainer) {
            imagesContainer.innerHTML = fallbackImages.map(img => `
                <img src="${img}?w=200&h=200" 
                     class="img-thumbnail cursor-pointer" 
                     style="width: 100px; height: 100px; object-fit: cover"
                     onclick="selectImage('${img}')">
            `).join('');
        }
        
    } catch (error) {
        console.error('Image search error:', error);
        if (imagesContainer) {
            imagesContainer.innerHTML = `
                <div class="alert alert-warning">
                    Error loading images. Please try again or enter an image URL directly.
                </div>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="provideSampleImages()">
                        Use Sample Images
                    </button>
                </div>
            `;
        }
    }
}

// Provide sample images when API fails
function provideSampleImages() {
    const sampleImages = [
        { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', label: 'Food Plate' },
        { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38', label: 'Pizza' },
        { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591', label: 'Pasta' },
        { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352', label: 'Salad' },
        { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', label: 'Meals' }
    ];
    
    const imagesContainer = document.getElementById('imageResults');
    if (imagesContainer) {
        imagesContainer.innerHTML = sampleImages.map(img => `
            <div class="text-center me-2">
                <img src="${img.url}?w=200&h=200" 
                     class="img-thumbnail cursor-pointer mb-1" 
                     style="width: 100px; height: 100px; object-fit: cover"
                     onclick="selectImage('${img.url}')">
                <small>${img.label}</small>
            </div>
        `).join('');
    }
}

function selectImage(url) {
    console.log('Image selected:', url);
    const selectedImageInput = document.getElementById('selectedImage');
    if (selectedImageInput) {
        selectedImageInput.value = url;
    } else {
        console.error('selectedImage input not found');
    }
    
    const previewElement = document.getElementById('imagePreview');
    if (previewElement) {
        previewElement.innerHTML = `
            <div class="position-relative">
                <img src="${url}" class="img-fluid rounded" style="max-height: 200px">
                <div class="mt-2 small text-success">
                    <i class="fas fa-check-circle"></i> Image selected
                </div>
            </div>
        `;
    } else {
        console.error('imagePreview element not found');
    }
}

// Handle create dinner form submission
document.addEventListener('DOMContentLoaded', () => {
    const createDinnerForm = document.getElementById('createDinnerForm');
    if (createDinnerForm) {
        createDinnerForm.addEventListener('submit', createDinner);
    }
});

async function createDinner(e) {
    e.preventDefault();

    // Debug form values
    console.log('Form submission data:', {
        title: e.target.title.value,
        datetime: e.target.datetime.value,
        price: e.target.price.value,
        maxGuests: e.target.maxGuests.value,
        description: e.target.description.value,
        selectedImage: document.getElementById('selectedImage')?.value
    });

    // Set a default date if none is provided (for demo purposes)
    if (!e.target.datetime.value) {
        // Default to tomorrow at 7pm as a reasonable dinner time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(19, 0, 0, 0);
        
        // Format for datetime-local input (YYYY-MM-DDThh:mm)
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        
        e.target.datetime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        console.log('Setting default datetime:', e.target.datetime.value);
    }

    // Validate required fields
    if (!e.target.title.value) {
        alert('Please enter a dinner title');
        return;
    }

    try {
        // Prepare a default image in case none is selected
        const defaultImage = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
        
        // Create dinner object with only required fields first
        const dinner = {
            id: Date.now(), // Generate a temporary ID (json-server will replace this)
            title: e.target.title.value.trim(),
            description: e.target.description.value.trim(),
            price: parseFloat(e.target.price.value) || 0,
            maxGuests: parseInt(e.target.maxGuests.value) || 4,
            hostId: 1, // Use a fixed ID for demonstration
            hostName: "Demo User",
            image: defaultImage,  // Start with default image
            isPublic: true,
            category: "casual",
            createdAt: new Date().toISOString()
        };
        
        // Handle datetime - if present, parse it correctly
        if (e.target.datetime.value) {
            const dateTimeParts = e.target.datetime.value.split('T');
            dinner.date = dateTimeParts[0];
            dinner.time = dateTimeParts.length > 1 ? dateTimeParts[1].slice(0, 5) : '18:00';
        } else {
            // Use today's date and default time if not specified
            const today = new Date();
            dinner.date = today.toISOString().split('T')[0];
            dinner.time = '18:00';
        }
        
        // Add image if selected
        const selectedImageInput = document.getElementById('selectedImage');
        if (selectedImageInput && selectedImageInput.value) {
            dinner.image = selectedImageInput.value;
        }
        
        // Add category if present
        if (e.target.category && e.target.category.value) {
            dinner.category = e.target.category.value;
        }
        
        // Add privacy setting if present
        if (typeof e.target.isPublic !== 'undefined') {
            dinner.isPublic = e.target.isPublic.checked;
        }

        console.log('Sending dinner to API:', dinner);
        
        // Make API request with proper error handling
        const response = await axios.post(`${API_URL}/dinners`, dinner, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API response:', response.data);

        // Close modal and reset form
        const modalElement = document.getElementById('createDinnerModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        
        // Reset form and preview elements
        e.target.reset();
        
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) imagePreview.innerHTML = '';
        
        const imageResults = document.getElementById('imageResults');
        if (imageResults) imageResults.innerHTML = '';

        // Show success message
        alert('Your dinner event has been created!');

        // Refresh dinners list
        loadDinners();
    } catch (error) {
        console.error('Error creating dinner:', error);
        
        // Detailed error message for debugging
        let errorMsg = 'Error creating dinner.';
        
        if (error.response) {
            errorMsg += ` Server responded with status: ${error.response.status}`;
            console.log('Server error details:', error.response.data);
        } else if (error.request) {
            errorMsg += ' No response received from server. Check your connection.';
        } else {
            errorMsg += ` ${error.message}`;
        }
        
        // Show error alert with more details
        alert(errorMsg + ' Please check the console for more details.');
    }
}

// Function to edit existing dinner
async function editDinner(dinnerId) {
    event.stopPropagation(); // Prevent triggering the detail view
    
    try {
        const response = await axios.get(`${API_URL}/dinners/${dinnerId}`);
        const dinner = response.data;
        
        // Populate the create dinner form with existing data
        const form = document.getElementById('createDinnerForm');
        form.title.value = dinner.title;
        
        // Format datetime for the datetime-local input
        const dateStr = dinner.date;
        const timeStr = dinner.time;
        form.datetime.value = `${dateStr}T${timeStr}`;
        
        form.price.value = dinner.price;
        form.maxGuests.value = dinner.maxGuests;
        form.description.value = dinner.description;
        form.image.value = dinner.image;
        document.getElementById('selectedImage').value = dinner.image;
        document.getElementById('imagePreview').innerHTML = `
            <img src="${dinner.image}" class="img-fluid rounded" style="max-height: 200px">
        `;
        
        if (dinner.isPublic !== undefined) {
            form.isPublic.checked = dinner.isPublic;
        }
        
        if (dinner.category) {
            form.category.value = dinner.category;
        }
        
        // Change the submit button to say "Update" instead of "Create"
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Dinner';
        
        // Store dinner ID in a data attribute for the submission handler
        form.dataset.editId = dinnerId;
        
        // Override the submit handler for the form
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const updateData = {
                title: e.target.title.value,
                date: e.target.datetime.value.split('T')[0],
                time: e.target.datetime.value.split('T')[1].slice(0, 5),
                description: e.target.description.value,
                price: parseFloat(e.target.price.value),
                maxGuests: parseInt(e.target.maxGuests.value),
                image: e.target.image.value || dinner.image,
                isPublic: e.target.isPublic.checked,
                category: e.target.category.value
            };
            
            try {
                await axios.patch(`${API_URL}/dinners/${dinnerId}`, updateData);
                
                // Close modal and reset form
                bootstrap.Modal.getInstance(document.getElementById('createDinnerModal')).hide();
                e.target.reset();
                e.target.dataset.editId = '';
                submitBtn.textContent = 'Create Dinner'; // Reset button text
                
                document.getElementById('imagePreview').innerHTML = '';
                document.getElementById('imageResults').innerHTML = '';
                
                // Reset the submit handler
                form.onsubmit = createDinner;
                
                // Show success message
                alert('Dinner updated successfully!');
                
                // Refresh the UI
                if (appState.currentScreen === 'detail') {
                    showDinnerDetail(dinnerId);
                }
                loadDinners();
                
            } catch (error) {
                console.error('Error updating dinner:', error);
                alert('Error updating dinner. Please try again.');
            }
        };
        
        // Open the modal
        const modal = new bootstrap.Modal(document.getElementById('createDinnerModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading dinner for editing:', error);
        alert('Could not load dinner details for editing.');
    }
}

// Additional helper functions for API access
function loadDinnersWithLocalhost() {
    // Force using localhost protocol with fetch
    fetch('http://localhost:3000/dinners', {
        headers: { 'Accept': 'application/json' }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('Localhost fetch successful:', data);
        // Process the data as if it came from axios
        const response = { data };
        
        // For demo purposes, split dinners into "my dinners" and "available dinners"
        const userId = currentUser.id.toString();
        appState.myDinners = response.data.filter(dinner => 
            dinner.hostId.toString() === userId || 
            dinner.id.toString() === "1"); // For demo assume first dinner is user's
        appState.availableDinners = response.data.filter(dinner => 
            dinner.hostId.toString() !== userId && 
            dinner.id.toString() !== "1");
            
        renderUserDinners(appState.myDinners);
        renderAvailableDinners(appState.availableDinners);
    })
    .catch(error => {
        console.error('Direct localhost fetch failed:', error);
        document.getElementById('dinnersContainer').innerHTML = `
            <div class="alert alert-danger">
                <h5><i class="fas fa-times-circle"></i> API Connection Failed</h5>
                <p>Could not connect to the API server even with direct method.</p>
                <p>Make sure the JSON server is running on port 3000.</p>
                <button class="btn btn-primary mt-2" onclick="loadMockData()">
                    <i class="fas fa-database"></i> Use Demo Data
                </button>
            </div>
        `;
    });
}

function loadMockData() {
    console.log('Loading mock data instead of API');
    
    // Mock data that looks like our API response
    const mockData = [
        {
            "id": "1",
            "title": "Pizza & Jazz (Demo)",
            "date": "2025-05-20",
            "time": "18:00",
            "description": "This is demo data loaded when the API is unavailable. Join us for pizza!",
            "price": 25,
            "maxGuests": 12,
            "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591",
            "hostId": "1",
            "hostName": "Demo User",
            "isPublic": true,
            "category": "casual",
            "createdAt": "2025-05-10T12:00:00.000Z"
        },
        {
            "id": "2",
            "title": "Dinner @ Tiffany's (Demo)",
            "date": "2025-05-22",
            "time": "19:00",
            "description": "Demo data: Hi, I'm Tiffany! I'll be your chef on Sunday ;)",
            "price": 35,
            "maxGuests": 5,
            "image": "https://images.unsplash.com/photo-1547592180-85f173990554",
            "hostId": "2",
            "hostName": "Tiffany Chen",
            "isPublic": true,
            "category": "gourmet",
            "createdAt": "2025-05-12T14:30:00.000Z"
        },
        {
            "id": "3",
            "title": "Vegan Delight (Demo)",
            "date": "2025-05-18",
            "time": "18:30",
            "description": "Demo data: Join us for a plant-based feast! All ingredients are organic.",
            "price": 22,
            "maxGuests": 8,
            "image": "https://images.unsplash.com/photo-1543362906-acfc16c67564",
            "hostId": "3",
            "hostName": "Michael Green",
            "isPublic": true,
            "category": "vegan",
            "createdAt": "2025-05-11T10:15:00.000Z"
        }
    ];
    
    // Process mock data
    const userId = currentUser.id.toString();
    appState.myDinners = mockData.filter(dinner => 
        dinner.hostId.toString() === userId || 
        dinner.id.toString() === "1");
    appState.availableDinners = mockData.filter(dinner => 
        dinner.hostId.toString() !== userId && 
        dinner.id.toString() !== "1");
        
    // Show warning banner that we're using mock data
    document.getElementById('app').insertAdjacentHTML('afterbegin', `
        <div class="alert alert-warning m-0" style="border-radius: 0;">
            <div class="container d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-exclamation-triangle"></i> 
                    Using demo data - API server not connected
                </div>
                <button class="btn btn-sm btn-outline-dark" onclick="reconnectToApi()">
                    <i class="fas fa-sync"></i> Try Reconnect
                </button>
            </div>
        </div>
    `);
        
    renderUserDinners(appState.myDinners);
    renderAvailableDinners(appState.availableDinners);
}

function reconnectToApi() {
    // Remove the warning banner
    const warningBanner = document.querySelector('.alert-warning');
    if (warningBanner) warningBanner.remove();
    
    // Try to load real data again
    loadDinners();
}

// Expose the functions to window for button click handlers
window.loadDinnersWithLocalhost = loadDinnersWithLocalhost;
window.loadMockData = loadMockData;
window.reconnectToApi = reconnectToApi;

//# sourceMappingURL=app.js.map