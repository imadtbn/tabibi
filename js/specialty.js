// js/specialty.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const specId = urlParams.get('spec');

    if (!specId) {
        window.location.href = 'index.html';
        return;
    }

    const specialtyMeta = SPECIALTIES.find(s => s.id === specId);
    if (specialtyMeta) {
        document.getElementById('specialtyTitle').innerHTML = `<i class="fa-solid ${specialtyMeta.icon}"></i> أطباء ${specialtyMeta.name}`;
        document.title = `طبيبي | ${specialtyMeta.name}`;
    }

    populateWilayaFilter();
    loadSpecialtyData(specId);
});

let currentDoctors = [];
let userLocation = null;

function populateWilayaFilter() {
    const select = document.getElementById('wilayaFilter');
    WILAYAS.forEach(w => {
        const option = document.createElement('option');
        option.value = w;
        option.textContent = w;
        select.appendChild(option);
    });

    select.addEventListener('change', renderDoctors);
    document.getElementById('nameFilter').addEventListener('input', renderDoctors);

    document.getElementById('sortByDistanceBtn').addEventListener('click', () => {
        if (navigator.geolocation) {
            const btn = document.getElementById('sortByDistanceBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديد...';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> تم التحديد';
                    btn.classList.remove('btn-outline');
                    btn.classList.add('btn-primary');
                    renderDoctors();
                },
                (error) => {
                    alert('تعذر تحديد موقعك. يرجى السماح للمتصفح بالوصول إلى موقعك.');
                    btn.innerHTML = originalText;
                }
            );
        } else {
            alert('متصفحك لا يدعم تحديد الموقع.');
        }
    });
}

function loadSpecialtyData(specId) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('doctorsGrid');

    fetch(`js/data/specialties/${specId}.json`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            currentDoctors = data;
            loading.classList.add('hidden');
            renderDoctors();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            loading.classList.add('hidden');
            grid.innerHTML = '<p style="text-align:center; color: var(--danger-color); grid-column: 1 / -1;">حدث خطأ أثناء تحميل البيانات. يرجى المحاولة لاحقاً.</p>';
        });
}

function renderDoctors() {
    const grid = document.getElementById('doctorsGrid');
    const noResults = document.getElementById('noResults');
    const wilayaFilter = document.getElementById('wilayaFilter').value;
    const nameFilter = document.getElementById('nameFilter').value.toLowerCase();

    let filteredDoctors = currentDoctors.filter(doc => {
        const matchWilaya = wilayaFilter === 'all' || doc.wilaya === wilayaFilter;
        const matchName = doc.name.toLowerCase().includes(nameFilter) ||
                          (doc.city && doc.city.toLowerCase().includes(nameFilter));
        return matchWilaya && matchName;
    });

    if (userLocation) {
        filteredDoctors.forEach(doc => {
            doc.distance = calculateDistance(userLocation.lat, userLocation.lng, doc.lat, doc.lng);
        });
        filteredDoctors.sort((a, b) => a.distance - b.distance);
    }

    grid.innerHTML = '';

    if (filteredDoctors.length === 0) {
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
        filteredDoctors.forEach(doc => {
            grid.innerHTML += generateDoctorCardHTML(doc, doc.distance);
        });
    }
}