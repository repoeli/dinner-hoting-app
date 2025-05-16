const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    loadDinners();
});

async function loadDinners() {
    try {
        const response = await axios.get(`${API_URL}/dinners`);
        renderDinners(response.data);
    } catch (error) {
        console.error('Error loading dinners:', error);
    }
}

function renderDinners(dinners) {
    const container = document.getElementById('dinnersContainer');
    container.innerHTML = dinners.map(dinner => `
        <div class="col-md-4 mb-4">
            <div class="card">
                <img src="${dinner.image}" class="card-img-top" alt="${dinner.title}">
                <div class="card-body">
                    <h5 class="card-title">${dinner.title}</h5>
                    <p class="card-text">${dinner.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${dinner.date} at ${dinner.time}</small>
                        <button class="btn btn-sm btn-primary" 
                                data-bs-toggle="modal" 
                                data-bs-target="#reservationModal"
                                data-id="${dinner.id}">
                            Reserve
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function fetchUnsplashImage(query) {
    const ACCESS_KEY = 'jbLyVpcZxCaNeFlbcRQ5cH_GsL8NzmotumC-RvkyZtw';
    const response = await axios.get(`https://api.unsplash.com/photos/random?query=${query}&client_id=${ACCESS_KEY}`);
    return response.data.urls.regular;
}

// Add functions for:
// - Creating new dinners
// - Handling reservations
// - Searching/filtering
// - Image fetching from Unsplash