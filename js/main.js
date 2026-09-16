// js/main.js - Core functionality for all pages

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
});

// --- Theme Management (Dark Mode) ---
function initTheme() {
    const themeToggle = document.getElementById('darkModeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        });
    }
}

// --- Mobile Menu ---
function initMobileMenu() {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');

    if (mobileBtn && mainNav) {
        mobileBtn.addEventListener('click', () => {
            // Very simple mobile menu toggle for now
            if (mainNav.style.display === 'block') {
                mainNav.style.display = 'none';
            } else {
                mainNav.style.display = 'block';
                mainNav.style.position = 'absolute';
                mainNav.style.top = '70px';
                mainNav.style.left = '0';
                mainNav.style.right = '0';
                mainNav.style.background = 'var(--bg-surface)';
                mainNav.style.padding = '20px';
                mainNav.style.boxShadow = 'var(--shadow-md)';

                const ul = mainNav.querySelector('ul');
                ul.style.flexDirection = 'column';
                ul.style.alignItems = 'center';
            }
        });
    }
}

// --- Helper Functions ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180);
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
}

function isOpenNow(workingHours) {
    if (!workingHours) return false;

    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[now.getDay()];

    const todayHours = workingHours[today];
    if (!todayHours || todayHours.length !== 2) return false;

    const [startStr, endStr] = todayHours;

    const startParts = startStr.split(':');
    const endParts = endStr.split(':');

    const startTime = new Date(now);
    startTime.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);

    const endTime = new Date(now);
    endTime.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0);

    return now >= startTime && now <= endTime;
}

function generateDoctorCardHTML(doc, distance = null) {
    const isOpen = isOpenNow(doc.workingHours);
    const statusClass = isOpen ? 'status-open' : 'status-closed';
    const statusText = isOpen ? 'متاح الآن' : 'مغلق';

    let distanceHTML = '';
    if (distance !== null) {
        distanceHTML = `<div class="info-row"><i class="fa-solid fa-route"></i> <span>تبعد ${distance.toFixed(1)} كم</span></div>`;
    }

    return `
        <div class="doctor-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    <i class="fa-solid fa-user-doctor"></i>
                </div>
                <div class="doctor-info">
                    <h3>${doc.name}</h3>
                    <span class="specialty-chip">${doc.specialties[0]}</span>
                    <br>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="doctor-body">
                <div class="info-row">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${doc.wilaya} - ${doc.city}<br><small>${doc.address}</small></span>
                </div>
                ${distanceHTML}
                <div class="info-row">
                    <i class="fa-solid fa-phone"></i>
                    <span><a href="tel:${doc.phone}" dir="ltr">${doc.phone}</a></span>
                </div>
            </div>
            <div class="doctor-footer">
                <a href="tel:${doc.phone}" class="btn btn-outline"><i class="fa-solid fa-phone"></i> اتصال</a>
                <a href="geo:${doc.lat},${doc.lng}?q=${doc.lat},${doc.lng}(${doc.name})" class="btn btn-primary" target="_blank"><i class="fa-solid fa-map-location-dot"></i> الاتجاهات</a>
            </div>
        </div>
    `;
}

// --- Homepage Logic ---
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    document.addEventListener('DOMContentLoaded', () => {
        loadSpecialtiesGrid();
        loadFeaturedDoctors();
    });

    function loadSpecialtiesGrid() {
        const grid = document.getElementById('specialtiesGrid');
        if (!grid || typeof SPECIALTIES === 'undefined') return;

        SPECIALTIES.forEach(spec => {
            const card = document.createElement('a');
            card.href = `specialty.html?spec=${spec.id}`;
            card.className = 'specialty-card';
            card.innerHTML = `
                <i class="fa-solid ${spec.icon}"></i>
                <h3>${spec.name}</h3>
            `;
            grid.appendChild(card);
        });
    }

    function loadFeaturedDoctors() {
        const grid = document.getElementById('featuredDoctorsGrid');
        if (!grid || typeof HOMEPAGE_DOCTORS === 'undefined') return;

        HOMEPAGE_DOCTORS.forEach(doc => {
            grid.innerHTML += generateDoctorCardHTML(doc);
        });
    }
}
