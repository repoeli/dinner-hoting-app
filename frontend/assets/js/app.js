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


// Unsplash Integration
const UNSPLASH_ACCESS_KEY = 'jbLyVpcZxCaNeFlbcRQ5cH_GsL8NzmotumC-RvkyZtw'; // Replace with your key

document.getElementById('searchImageBtn').addEventListener('click', async () => {
    const query = document.getElementById('imageSearch').value;
    if (!query) return;

    try {
        const response = await axios.get(
            `https://api.unsplash.com/search/photos?query=${query}&per_page=6&client_id=${UNSPLASH_ACCESS_KEY}`
        );

        const imagesContainer = document.getElementById('imageResults');
        imagesContainer.innerHTML = response.data.results.map(img => `
      <img src="${img.urls.thumb}" 
           class="img-thumbnail cursor-pointer" 
           style="width: 100px; height: 100px; object-fit: cover"
           data-regular="${img.urls.regular}"
           onclick="selectImage('${img.urls.regular}')">
    `).join('');
    } catch (error) {
        console.error('Unsplash error:', error);
    }
});

function selectImage(url) {
    document.getElementById('selectedImage').value = url;
    document.getElementById('imagePreview').innerHTML = `
    <img src="${url}" class="img-fluid rounded" style="max-height: 200px">
  `;
}

// Handle form submission
document.getElementById('createDinnerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        title: e.target.title.value,
        date: e.target.datetime.value.split('T')[0],
        time: e.target.datetime.value.split('T')[1].slice(0, 5),
        description: e.target.description.value,
        price: parseFloat(e.target.price.value),
        maxGuests: parseInt(e.target.maxGuests.value),
        image: e.target.image.value
    };

    try {
        await axios.post(`${API_URL}/dinners`, formData);

        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('createDinnerModal')).hide();
        e.target.reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imageResults').innerHTML = '';

        // Refresh dinners list
        loadDinners();
    } catch (error) {
        console.error('Error creating dinner:', error);
        alert('Error creating dinner. Please try again.');
    }
});

// Add functions for:
// - Creating new dinners
// - Handling reservations
// - Searching/filtering
// - Image fetching from Unsplash