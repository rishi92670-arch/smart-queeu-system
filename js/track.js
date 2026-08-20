// js/track.js

let currentTokenId = null;

document.addEventListener('DOMContentLoaded', () => {
    db.onReady(() => {
        const config = db.getConfig();
        if (config) {
            document.title = `Track Queue | ${config.name}`;
            document.getElementById('orgNameHeader').textContent = config.name;
        }

        lucide.createIcons();

        // Auto-check if URL has param
        const urlParams = new URLSearchParams(window.location.search);
        const trackingId = urlParams.get('id');
        if (trackingId) {
            document.getElementById('trackingIdInput').value = trackingId;
            handleTrack();
        }
    });

    document.getElementById('btnTrack').onclick = handleTrack;

    document.getElementById('trackingIdInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleTrack();
        }
    });

    // Listen for updates
    window.addEventListener('qsync_update', (event) => {
        if (currentTokenId) {
            updateTrackingData(currentTokenId);
        }
    });
});

function handleTrack() {
    const input = document.getElementById('trackingIdInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    if (!input) return;

    const token = db.getTokenByTrackingId(input);

    if (token) {
        errorMsg.style.display = 'none';
        currentTokenId = token.id;
        document.getElementById('trackCard').style.display = 'block';
        document.getElementById('currentServingBox').style.display = 'block';
        updateTrackingData(currentTokenId);
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('trackCard').style.display = 'none';
        document.getElementById('currentServingBox').style.display = 'none';
        currentTokenId = null;
    }
}

function updateTrackingData(tokenId) {
    const token = db.getToken(tokenId);
    const banner = document.getElementById('trackStatusBanner');

    if (!token) {
        // Token was deleted upon completion
        banner.textContent = 'SERVICE COMPLETED / REMOVED';
        banner.className = 'status-banner';
        
        document.getElementById('trackAhead').textContent = '--';
        document.getElementById('trackWait').textContent = '--';
        document.getElementById('trackCurrentServing').textContent = 'Thank you for visiting.';
        return;
    }

    const stats = db.getQueueStats(tokenId);

    document.getElementById('trackToken').textContent = token.tokenNumber;

    const banner = document.getElementById('trackStatusBanner');

    if (token.status === 'WAITING') {
        banner.textContent = 'WAITING IN QUEUE';
        banner.className = 'status-banner';

        document.getElementById('trackAhead').textContent = stats.peopleAhead;
        document.getElementById('trackWait').textContent = stats.estWaitTime;
        document.getElementById('trackCurrentServing').textContent = stats.currentTokenNumber;

        // Highlight if next
        if (stats.peopleAhead === 0) {
            banner.textContent = 'YOU ARE NEXT';
            banner.style.background = 'var(--color-warning)';
            banner.style.color = '#fff';
        }

    } else if (token.status === 'SERVING') {
        banner.textContent = 'YOUR TURN';
        banner.className = 'status-banner serving';

        let counterName = 'Counter';
        if (token.servedByCounterId) {
            const ctr = db._read().counters.find(c => c.id === token.servedByCounterId);
            if (ctr) counterName = ctr.name;
        }

        document.getElementById('trackAhead').textContent = '--';
        document.getElementById('trackWait').textContent = '--';
        document.getElementById('trackCurrentServing').textContent = 'Please proceed to ' + counterName;

    } else if (token.status === 'COMPLETED') {
        banner.textContent = 'SERVICE COMPLETED';
        banner.className = 'status-banner';

        document.getElementById('trackAhead').textContent = '--';
        document.getElementById('trackWait').textContent = '--';
        document.getElementById('trackCurrentServing').textContent = 'Thank you for visiting.';
    } else if (token.status === 'SKIPPED') {
        banner.textContent = 'TOKEN SKIPPED';
        banner.className = 'status-banner skipped';

        document.getElementById('trackAhead').textContent = '--';
        document.getElementById('trackWait').textContent = '--';
        document.getElementById('trackCurrentServing').textContent = 'Your token was skipped by staff.';
    }
}
