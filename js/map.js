// js/map.js

document.addEventListener('DOMContentLoaded', () => {
    initMapFilters();
    initMap();
});

let map;
let markers;
let allMapDoctors = []; // We will fetch all files to show on map (for demo purposes)

function initMapFilters() {
    const specSelect = document.getElementById('mapSpecFilter');
    const wilayaSelect = document.getElementById('mapWilayaFilter');

    SPECIALTIES.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.name;
        specSelect.appendChild(option);
    });

    WILAYAS.forEach(w => {
        const option = document.createElement('option');
        option.value = w;
        option.textContent = w;
        wilayaSelect.appendChild(option);
    });

    specSelect.addEventListener('change', updateMapMarkers);
    wilayaSelect.addEventListener('change', updateMapMarkers);

    document.getElementById('locateMeMapBtn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                map.setView([position.coords.latitude, position.coords.longitude], 12);
            });
        }
    });
}

function initMap() {
    // Center of Algeria
    map = L.map('map').setView([28.0339, 1.6596], 5);

    // Check if dark mode is active to load a dark map tileset
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark ?
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' :
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markers = L.markerClusterGroup({
        showCoverageOnHover: false
    });
    map.addLayer(markers);

    loadAllDoctorsData();
}

async function loadAllDoctorsData() {
    // For a real app with thousands of records, we would fetch via API based on bounds
    // Here we load the dummy JSONs directly
    let fetchPromises = SPECIALTIES.map(spec =>
        fetch(`js/data/specialties/${spec.id}.json`)
        .then(res => res.json())
        .then(data => {
            // Attach specialty ID to each doctor for filtering
            return data.map(d => ({...d, _specId: spec.id}));
        })
        .catch(() => [])
    );

    const results = await Promise.all(fetchPromises);
    allMapDoctors = results.flat();

    updateMapMarkers();
}

function updateMapMarkers() {
    markers.clearLayers();

    const specFilter = document.getElementById('mapSpecFilter').value;
    const wilayaFilter = document.getElementById('mapWilayaFilter').value;

    const filtered = allMapDoctors.filter(doc => {
        const matchSpec = specFilter === 'all' || doc._specId === specFilter;
        const matchWilaya = wilayaFilter === 'all' || doc.wilaya === wilayaFilter;
        return matchSpec && matchWilaya;
    });

    const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: var(--primary-color); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fa-solid fa-user-doctor"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });

    filtered.forEach(doc => {
        if(doc.lat && doc.lng) {
            const popupContent = `
                <div class="map-popup-card">
                    <h3>${doc.name}</h3>
                    <p><span class="specialty-chip">${doc.specialties[0]}</span></p>
                    <p><i class="fa-solid fa-location-dot"></i> ${doc.wilaya} - ${doc.city}</p>
                    <a href="geo:${doc.lat},${doc.lng}?q=${doc.lat},${doc.lng}(${doc.name})" class="btn btn-primary btn-sm" style="padding: 5px 10px; font-size:0.8rem; margin-top:5px;"><i class="fa-solid fa-route"></i> مسار</a>
                </div>
            `;
            const marker = L.marker([doc.lat, doc.lng], {icon: customIcon})
                            .bindPopup(popupContent);
            markers.addLayer(marker);
        }
    });
}
