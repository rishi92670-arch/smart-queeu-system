// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('qsync_user')) {
        window.location.href = 'login.html';
        return;
    }

    db.onReady(() => {
        const config = db.getConfig();
        if (!config) {
            alert("Database error: config missing.");
            return;
        }

        // Initialize UI
        document.title = `${config.name} Dashboard | Q-Sync`;
        document.getElementById('orgNameHeader').textContent = config.name;
        document.getElementById('orgNameHeader').style.color = config.themeColor || 'var(--color-brand-primary)';

        loadDashboardData();
        generateQR(config);

        lucide.createIcons();
    });

    // Listen for real-time updates
    qChannel.onmessage = (event) => {
        if (event.data && event.data.payload) {
            loadDashboardData();
        }
    };
});

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.section-panel').forEach(el => el.classList.remove('active'));

    document.querySelector(`.menu-item[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function loadDashboardData() {
    const services = db.getServices();
    const counters = db.getCounters();
    const waitingTokens = db.getTokensByStatus('WAITING');

    // Update Overview Stats
    document.getElementById('statServices').textContent = services.length;
    document.getElementById('statCounters').textContent = counters.length;
    document.getElementById('statWaiting').textContent = waitingTokens.length;

    // Update Services Table
    const sBody = document.getElementById('servicesTableBody');
    sBody.innerHTML = '';
    services.forEach(s => {
        sBody.innerHTML += `
            <tr>
                <td style="font-weight:500;">${s.name}</td>
                <td><span class="badge" style="margin:0">${s.prefix}</span></td>
                <td>~${s.avgServiceTime}</td>
                <td><span style="color:var(--color-success); font-weight:600;">Active</span></td>
            </tr>
        `;
    });

    // Update Counters Table
    const cBody = document.getElementById('countersTableBody');
    cBody.innerHTML = '';
    counters.forEach(c => {
        const tokenDisplay = c.currentServingTokenId ? db.getToken(c.currentServingTokenId).tokenNumber : '--';
        const statusColor = c.status === 'SERVING' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)';
        
        cBody.innerHTML += `
            <tr>
                <td style="font-weight:500;">${c.name}</td>
                <td style="color:${statusColor}; font-weight:600;">${c.status}</td>
                <td style="font-weight:bold">${tokenDisplay}</td>
                <td>
                    <a href="staff.html?counter=${c.id}" target="_blank" class="action-link">Open Terminal</a>
                </td>
            </tr>
        `;
    });
    
    lucide.createIcons();
}

function generateQR(config) {
    // Construct URL for token generator (handles Vercel clean URLs & subdirectories)
    const path = window.location.pathname;
    const basePath = path.substring(0, path.lastIndexOf('/'));
    const url = window.location.origin + basePath + '/user.html';
    
    new QRCode(document.getElementById("qrcode"), {
        text: url,
        width: 250,
        height: 250,
        colorDark : config.themeColor || "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}
