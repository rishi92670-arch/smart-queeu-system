// js/display.js

document.addEventListener('DOMContentLoaded', () => {
    db.onReady(() => {
        const config = db.getConfig();
        if (!config) return;

        document.title = `${config.name} Display`;
        document.getElementById('orgName').textContent = config.name;
        document.getElementById('orgLogo').textContent = config.name.charAt(0);
        document.getElementById('orgLogo').style.background = config.themeColor || 'var(--color-brand-primary)';

        // Generate QR Code (handles Vercel clean URLs & subdirectories)
        const path = window.location.pathname;
        const basePath = path.substring(0, path.lastIndexOf('/'));
        const url = window.location.origin + basePath + '/user.html';
        new QRCode(document.getElementById("qrcodeDisplay"), {
            text: url,
            width: 140,
            height: 140,
            colorDark : config.themeColor || "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        loadDisplayData();
    });

    // Listen for updates
    window.addEventListener('qsync_update', (event) => {
        const { action, payload } = event.detail;
        if (action === 'FIREBASE_UPDATE') {
            loadDisplayData();
        }
    });
});

function loadDisplayData() {
    const config = db.getConfig();
    if (!config) return;

    const counters = db.getCounters();
    const servingGrid = document.getElementById('servingGrid');
    
    // Initial render of cards
    if(servingGrid.children.length === 0) {
        counters.forEach(c => {
            servingGrid.innerHTML += `
                <div class="serving-card" id="card-${c.id}">
                    <div class="counter-name">${c.name}</div>
                    <div class="serving-token" id="display-token-${c.id}">--</div>
                </div>
            `;
        });
    }

    // Update tokens inside cards
    counters.forEach(c => {
        const tokenDisplay = document.getElementById(`display-token-${c.id}`);
        if(c.currentServingTokenId) {
            const t = db.getToken(c.currentServingTokenId);
            tokenDisplay.textContent = t ? t.tokenNumber : '--';
            if (t) tokenDisplay.style.color = config.themeColor || 'var(--color-brand-primary)';
        } else {
            tokenDisplay.textContent = '--';
            tokenDisplay.style.color = 'var(--color-text-secondary)';
        }
    });

    // 2. Render Upcoming List
    const upcomingList = document.getElementById('upcomingList');
    upcomingList.innerHTML = '';

    let waitingTokens = db.getTokensByStatus('WAITING');
    waitingTokens.sort((a, b) => new Date(a.issuedAt) - new Date(b.issuedAt));
    
    // Show top 6 waiting
    const topWaiting = waitingTokens.slice(0, 6);
    
    if(topWaiting.length === 0) {
        upcomingList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--color-text-secondary); font-size:1.5rem;">Queue is empty</div>';
    } else {
        topWaiting.forEach((t, index) => {
            upcomingList.innerHTML += `
                <div class="upcoming-item ${index === 0 ? 'pulse' : ''}" style="${index === 0 ? `border-left: 4px solid ${config.themeColor || 'var(--color-brand-primary)'}` : ''}">
                    <span>${t.tokenNumber}</span>
                    <span style="font-size: 1.2rem; color: var(--color-text-secondary)">WAITING</span>
                </div>
            `;
        });
    }
}

function highlightCounter(counterId) {
    const card = document.getElementById(`card-${counterId}`);
    if (card) {
        card.classList.add('highlight');
        setTimeout(() => {
            card.classList.remove('highlight');
        }, 5000); // Remove highlight after 5s
    }
}
