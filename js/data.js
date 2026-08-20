// js/data.js

// Broadcast Channel for cross-tab synchronization
const qChannel = new BroadcastChannel('qsync_events');

const STORAGE_KEY = 'qsync_db_v2'; // New key for single-tenant

class QDatabase {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEY)) {
            this.seedData();
        } else {
            // Ensure backwards compatibility if DB exists but missing users array
            const db = this._read();
            if (!db.users) {
                db.users = [
                    { username: "admin", password: "password123", role: "ADMIN" }
                ];
                this._write(db);
            }
        }
    }

    _read() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    }

    _write(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    _notify(action, payload) {
        qChannel.postMessage({ action, payload });
    }

    // --- Authentication ---
    authenticate(username, password) {
        const db = this._read();
        if (!db.users) return null;
        const user = db.users.find(u => u.username === username && u.password === password);
        return user || null;
    }

    // --- Organization Config ---
    getConfig() {
        return this._read().config;
    }

    // --- Services ---
    getServices() {
        return this._read().services;
    }

    getService(serviceId) {
        return this._read().services.find(s => s.id === serviceId);
    }

    // --- Counters ---
    getCounters() {
        return this._read().counters;
    }

    // --- Tokens / Queue ---
    getTokens() {
        return this._read().tokens;
    }
    
    getTokensByStatus(status) {
        return this.getTokens().filter(t => t.status === status);
    }

    getToken(tokenId) {
        return this._read().tokens.find(t => t.id === tokenId);
    }
    
    getTokenByTrackingId(trackingId) {
        // tracking IDs are stored uppercase
        return this._read().tokens.find(t => t.trackingId === trackingId.toUpperCase());
    }

    _generateTrackingId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like 1, I, O, 0
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generateToken(serviceId) {
        const db = this._read();
        const service = db.services.find(s => s.id === serviceId);
        
        const serviceTokens = db.tokens.filter(t => t.serviceId === serviceId);
        let maxNum = 100;
        
        if (serviceTokens.length > 0) {
            maxNum = Math.max(...serviceTokens.map(t => {
                const parts = t.tokenNumber.split('-');
                return parseInt(parts[1]) || 100;
            }));
        }
        
        const nextNum = maxNum + 1;
        const tokenNumber = `${service.prefix}-${nextNum}`;
        const trackingId = this._generateTrackingId();
        
        const newToken = {
            id: 'TKN_' + Date.now(),
            serviceId,
            tokenNumber,
            trackingId,
            status: 'WAITING',
            issuedAt: new Date().toISOString(),
            servedAt: null,
            completedAt: null,
            servedByCounterId: null
        };

        db.tokens.push(newToken);
        this._write(db);
        this._notify('NEW_TOKEN', newToken);
        
        return newToken;
    }

    updateTokenStatus(tokenId, status, counterId = null) {
        const db = this._read();
        const idx = db.tokens.findIndex(t => t.id === tokenId);
        
        if (idx !== -1) {
            const token = db.tokens[idx];
            token.status = status;
            
            if (status === 'SERVING') {
                token.servedAt = new Date().toISOString();
                token.servedByCounterId = counterId;
                
                const cIdx = db.counters.findIndex(c => c.id === counterId);
                if(cIdx !== -1) {
                    db.counters[cIdx].status = 'SERVING';
                    db.counters[cIdx].currentServingTokenId = tokenId;
                }
            } else if (status === 'COMPLETED' || status === 'SKIPPED') {
                token.completedAt = new Date().toISOString();
                
                const cIdx = db.counters.findIndex(c => c.id === token.servedByCounterId || c.id === counterId);
                if(cIdx !== -1) {
                    db.counters[cIdx].status = 'IDLE';
                    db.counters[cIdx].currentServingTokenId = null;
                }
            }

            db.tokens[idx] = token;
            this._write(db);
            this._notify('TOKEN_UPDATED', token);
            return token;
        }
        return null;
    }

    getQueueStats(tokenId) {
        const token = this.getToken(tokenId);
        if (!token) return null;

        const allWaitingTokens = this.getTokensByStatus('WAITING')
                                     .filter(t => t.serviceId === token.serviceId)
                                     .sort((a, b) => new Date(a.issuedAt) - new Date(b.issuedAt));

        let peopleAhead = 0;
        let position = 0;

        for (let i = 0; i < allWaitingTokens.length; i++) {
            if (allWaitingTokens[i].id === tokenId) {
                position = i + 1;
                peopleAhead = i;
                break;
            }
        }

        const service = this.getService(token.serviceId);
        const estWaitTime = peopleAhead * (service.avgServiceTime || 5);

        const servingToken = this.getTokensByStatus('SERVING')
                                 .find(t => t.serviceId === token.serviceId);

        return {
            peopleAhead,
            position,
            estWaitTime,
            currentTokenNumber: servingToken ? servingToken.tokenNumber : '--',
            status: token.status
        };
    }

    // --- Seed Data (Single Tenant) ---
    seedData() {
        const db = {
            config: {
                name: "ABC Hospital",
                themeColor: "#2563eb",
            },
            services: [
                { id: "SRV_1", name: "Registration", prefix: "R", avgServiceTime: 4, isActive: true },
                { id: "SRV_2", name: "Consultation", prefix: "C", avgServiceTime: 10, isActive: true },
                { id: "SRV_3", name: "Billing", prefix: "B", avgServiceTime: 5, isActive: true }
            ],
            counters: [
                { id: "CTR_1", name: "Counter 1 (Reg)", servicesHandled: ["SRV_1"], status: "IDLE", currentServingTokenId: null },
                { id: "CTR_2", name: "Counter 2 (Cons)", servicesHandled: ["SRV_2"], status: "IDLE", currentServingTokenId: null },
                { id: "CTR_3", name: "Counter 3 (All)", servicesHandled: ["SRV_1", "SRV_2", "SRV_3"], status: "IDLE", currentServingTokenId: null }
            ],
            users: [
                { username: "admin", password: "password123", role: "ADMIN" }
            ],
            tokens: []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
}

const db = new QDatabase();
