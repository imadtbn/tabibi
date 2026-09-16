// js/search.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearch');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return;

    // Helper to normalize Arabic text (remove harakat, normalize alif/yaa/taa marboota)
    function normalizeArabic(text) {
        return text.replace(/[\u064B-\u065F\u0670]/g, '') // Remove harakat
                   .replace(/[أإآ]/g, 'ا')
                   .replace(/ة/g, 'ه')
                   .replace(/ى/g, 'ي')
                   .toLowerCase();
    }

    // Debounce function to limit search execution rate
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const performSearch = debounce((query) => {
        if (!query || query.trim() === '') {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        const normalizedQuery = normalizeArabic(query.trim());

        // Search in index (if SEARCH_INDEX is loaded)
        if (typeof SEARCH_INDEX !== 'undefined') {
            const results = SEARCH_INDEX.filter(item => {
                return normalizeArabic(item.name).includes(normalizedQuery) ||
                       normalizeArabic(item.specialtyName).includes(normalizedQuery) ||
                       normalizeArabic(item.wilaya).includes(normalizedQuery);
            }).slice(0, 10); // Limit to 10 results

            if (results.length > 0) {
                searchResults.innerHTML = results.map(item => `
                    <a href="specialty.html?spec=${item.specialtyId}" class="search-result-item">
                        <strong>${item.name}</strong>
                        <small>${item.specialtyName} - ${item.wilaya}</small>
                    </a>
                `).join('');
                searchResults.classList.remove('hidden');
            } else {
                searchResults.innerHTML = `<div class="search-result-item text-secondary">لا توجد نتائج مطابقة لـ "${query}"</div>`;
                searchResults.classList.remove('hidden');
            }
        }
    }, 300);

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    // Geolocation button in Hero
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                getLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري...';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // In a real app, this might redirect to a map or set a global cookie/storage
                        localStorage.setItem('userLat', position.coords.latitude);
                        localStorage.setItem('userLng', position.coords.longitude);
                        getLocationBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم التحديد';
                        getLocationBtn.classList.remove('btn-primary');
                        getLocationBtn.classList.add('status-open'); // Just using an existing class for styling
                        setTimeout(() => {
                            getLocationBtn.innerHTML = '<i class="fa-solid fa-location-dot"></i> حدد موقعي';
                            getLocationBtn.classList.add('btn-primary');
                            getLocationBtn.classList.remove('status-open');
                        }, 3000);
                    },
                    (error) => {
                        alert('تعذر تحديد الموقع.');
                        getLocationBtn.innerHTML = '<i class="fa-solid fa-location-dot"></i> حدد موقعي';
                    }
                );
            }
        });
    }
});