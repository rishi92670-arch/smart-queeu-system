// js/staff.js

let currentCounterId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('qsync_user')) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentCounterId = urlParams.get('counter');

    if (!currentCounterId) {
        alert("No counter specified.");
        window.location.href = 'dashboard.html';
        return;
    }

    db.onReady(() => {
        const allCounters = db.getCounters();
        const counter = allCounters.find(c => c.id === currentCounterId);
        
        if (!counter) {
            alert("Counter not found.");
            window.location.href = 'dashboard.html';
            return;
        }
        
        const config = db.getConfig();
        document.title = `${counter.name} | ${config.name}`;
        document.getElementById('counterName').textContent = `${counter.name} - ${config.name}`;

        lucide.createIcons();
        
        loadTerminalData();
    });

    // Event Listeners
    document.getElementById('btnCallNext').onclick = callNextToken;
    document.getElementById('btnComplete').onclick = () => completeCurrentToken('COMPLETED');
    document.getElementById('btnSkip').onclick = () => completeCurrentToken('SKIPPED');

    // Listen for real-time updates
    window.addEventListener('qsync_update', (event) => {
        const { action, payload } = event.detail;
        if (action === 'FIREBASE_UPDATE') {
            loadTerminalData();
        }
    });
});

function loadTerminalData() {
    const counter = db.getCounters().find(c => c.id === currentCounterId);
    if(!counter) return;

    // Update Status Badge
    const statusBadge = document.getElementById('counterStatus');
    statusBadge.textContent = counter.status;
    statusBadge.className = `status-badge ${counter.status.toLowerCase()}`;

    // Update Current Token Display
    const currentTokenDisplay = document.getElementById('currentTokenDisplay');
    const btnCallNext = document.getElementById('btnCallNext');
    const btnComplete = document.getElementById('btnComplete');
    const btnSkip = document.getElementById('btnSkip');

    if (counter.currentServingTokenId) {
        const token = db.getToken(counter.currentServingTokenId);
        currentTokenDisplay.textContent = token ? token.tokenNumber : '--';
        btnCallNext.style.display = 'none';
        btnComplete.style.display = 'flex';
        btnSkip.style.display = 'flex';
    } else {
        currentTokenDisplay.textContent = '--';
        btnCallNext.style.display = 'flex';
        btnComplete.style.display = 'none';
        btnSkip.style.display = 'none';
    }

    // Populate Queue List
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    
    // Get all WAITING tokens for services this counter handles
    let waitingTokens = db.getTokensByStatus('WAITING');
    waitingTokens = waitingTokens.filter(t => counter.servicesHandled.includes(t.serviceId));
    
    // Sort by issue time (FIFO)
    waitingTokens.sort((a, b) => new Date(a.issuedAt) - new Date(b.issuedAt));

    document.getElementById('queueCount').textContent = waitingTokens.length;

    if (waitingTokens.length === 0) {
        queueList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--color-text-secondary);">Queue is empty</div>';
    } else {
        waitingTokens.forEach(t => {
            const service = db.getService(t.serviceId);
            const diffMs = new Date() - new Date(t.issuedAt);
            const diffMins = Math.floor(diffMs / 60000);
            
            queueList.innerHTML += `
                <div class="queue-item">
                    <div>
                        <div class="token-id">${t.tokenNumber}</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary)">${service.name}</div>
                    </div>
                    <div class="wait-time">Waiting ${diffMins}m</div>
                </div>
            `;
        });
    }
}

function callNextToken() {
    const counter = db.getCounters().find(c => c.id === currentCounterId);
    
    let waitingTokens = db.getTokensByStatus('WAITING');
    waitingTokens = waitingTokens.filter(t => counter.servicesHandled.includes(t.serviceId));
    waitingTokens.sort((a, b) => new Date(a.issuedAt) - new Date(b.issuedAt));

    if (waitingTokens.length > 0) {
        const nextToken = waitingTokens[0];
        db.updateTokenStatus(nextToken.id, 'SERVING', currentCounterId);
        loadTerminalData();
    } else {
        alert("No tokens in queue.");
    }
}

function completeCurrentToken(status) {
    const counter = db.getCounters().find(c => c.id === currentCounterId);
    if (counter && counter.currentServingTokenId) {
        db.updateTokenStatus(counter.currentServingTokenId, status, currentCounterId);
        loadTerminalData();
    }
}
