// js/stats.js

document.addEventListener('DOMContentLoaded', () => {
    loadStatsData();
});

async function loadStatsData() {
    let allDoctors = [];

    // Fetch all dummy data
    const fetchPromises = SPECIALTIES.map(spec =>
        fetch(`js/data/specialties/${spec.id}.json`)
        .then(res => res.json())
        .then(data => {
            return data.map(d => ({...d, specName: spec.name}));
        })
        .catch(() => [])
    );

    const results = await Promise.all(fetchPromises);
    allDoctors = results.flat();

    renderSummaryStats(allDoctors);
    renderCharts(allDoctors);
}

function renderSummaryStats(doctors) {
    document.getElementById('totalDoctorsCount').textContent = doctors.length;

    const uniqueWilayas = new Set(doctors.map(d => d.wilaya)).size;
    document.getElementById('coveredWilayasCount').textContent = uniqueWilayas;

    document.getElementById('specialtiesCount').textContent = SPECIALTIES.length;
}

function renderCharts(doctors) {
    // Process data for Specialties Chart
    const specCounts = {};
    doctors.forEach(d => {
        specCounts[d.specName] = (specCounts[d.specName] || 0) + 1;
    });

    const specLabels = Object.keys(specCounts);
    const specData = Object.values(specCounts);

    // Process data for Wilayas Chart (Top 10)
    const wilayaCounts = {};
    doctors.forEach(d => {
        const wilayaNumName = d.wilaya.split(' - ')[1] || d.wilaya;
        wilayaCounts[wilayaNumName] = (wilayaCounts[wilayaNumName] || 0) + 1;
    });

    const sortedWilayas = Object.entries(wilayaCounts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10);

    const wilayaLabels = sortedWilayas.map(item => item[0]);
    const wilayaData = sortedWilayas.map(item => item[1]);

    // Common Chart.js options
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#2b2d42';
    const gridColor = isDark ? '#333333' : '#e9ecef';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    // Draw Specialty Chart (Doughnut)
    const ctxSpec = document.getElementById('specialtyChart').getContext('2d');
    new Chart(ctxSpec, {
        type: 'doughnut',
        data: {
            labels: specLabels,
            datasets: [{
                data: specData,
                backgroundColor: [
                    '#0077b6', '#2a9d8f', '#e76f51', '#f4a261', '#264653',
                    '#8ab17d', '#e9c46a', '#f4a261', '#e76f51', '#00b4d8'
                ],
                borderWidth: 1,
                borderColor: isDark ? '#1e1e1e' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Draw Wilaya Chart (Bar)
    const ctxWilaya = document.getElementById('wilayaChart').getContext('2d');
    new Chart(ctxWilaya, {
        type: 'bar',
        data: {
            labels: wilayaLabels,
            datasets: [{
                label: 'عدد الأطباء',
                data: wilayaData,
                backgroundColor: '#0077b6',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}