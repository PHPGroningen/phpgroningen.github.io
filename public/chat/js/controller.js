import { state, TEAM_COLORS, UNSAFE_KEYS } from './state.js';
import { generatePin, generateToken, updateStatus, showScreen, getPeerConfig } from './utils.js';
import { applyColorToMessages } from './colors.js';
import { renderMessage } from './renderer.js';

export function broadcastToAll(msg) {
    Object.values(state.peers).forEach(conn => {
        if (conn.open) conn.send(msg);
    });
}

export function assignColor(name, colorId) {
    const lower = (name || '').toLowerCase();
    if (UNSAFE_KEYS.includes(lower)) return;
    if (colorId) {
        state.nameColors[lower] = colorId;
    } else {
        delete state.nameColors[lower];
    }
    applyColorToMessages(name, colorId || null);
    if (state.role === 'controller') {
        broadcastToAll({ type: 'assign-color', name, colorId: colorId || null });
        updateParticipantCount();
    }
}

export function updateParticipantCount() {
    const count = Object.values(state.peers).filter(c => c.open).length;
    const countEl = document.getElementById('ctrl-participant-count');
    if (countEl) countEl.textContent = count;

    const listEl = document.getElementById('ctrl-participant-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    document.querySelectorAll('.color-popover').forEach(p => p.remove());

    Object.entries(state.participantNames).forEach(([peerId, name]) => {
        if (!state.peers[peerId]?.open) return;

        const item = document.createElement('div');
        item.className = 'participant-list-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'participant-item-name';
        nameSpan.textContent = name;

        const colorId = state.nameColors[name.toLowerCase()];
        const currentColor = TEAM_COLORS.find(c => c.id === colorId);

        const colorBtn = document.createElement('button');
        colorBtn.className = 'color-picker-btn';
        colorBtn.style.backgroundColor = currentColor ? currentColor.bg : '#e9ecef';
        colorBtn.title = currentColor
            ? `Team: ${currentColor.label} — click to change`
            : 'Assign team color';

        colorBtn.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('.color-popover').forEach(p => p.remove());

            const popover = document.createElement('div');
            popover.className = 'color-popover';

            const noneBtn = document.createElement('button');
            noneBtn.className = 'color-swatch color-swatch-none' + (!colorId ? ' selected' : '');
            noneBtn.title = 'None';
            noneBtn.textContent = '✕';
            noneBtn.addEventListener('click', ev => {
                ev.stopPropagation();
                assignColor(name, null);
                popover.remove();
            });
            popover.appendChild(noneBtn);

            TEAM_COLORS.forEach(c => {
                const swatch = document.createElement('button');
                swatch.className = 'color-swatch' + (c.id === colorId ? ' selected' : '');
                swatch.style.backgroundColor = c.bg;
                swatch.title = c.label;
                swatch.addEventListener('click', ev => {
                    ev.stopPropagation();
                    assignColor(name, c.id);
                    popover.remove();
                });
                popover.appendChild(swatch);
            });

            const rect = colorBtn.getBoundingClientRect();
            popover.style.top = (rect.bottom + 4) + 'px';
            const popWidth = 4 * 26 + 3 * 5 + 16;
            popover.style.left = Math.max(4, rect.right - popWidth) + 'px';
            document.body.appendChild(popover);

            const closeOnOutside = ev => {
                if (!popover.contains(ev.target)) {
                    popover.remove();
                    document.removeEventListener('click', closeOnOutside);
                }
            };
            setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
        });

        item.appendChild(nameSpan);
        item.appendChild(colorBtn);
        listEl.appendChild(item);
    });
}

function onParticipantMessage(conn, data) {
    // Relay to all other participants
    Object.values(state.peers).forEach(c => {
        if (c !== conn && c.open) c.send(data);
    });

    if (data.type === 'chat' || data.type === 'snippet') {
        state.messages.push(data);
        renderMessage(data, document.getElementById('ctrl-feed'));
    }
}

export function onParticipantConnected(conn) {
    state.peers[conn.peer] = conn;
    const meta = conn.metadata || {};
    const requestedName = (meta.displayName || '').trim() || ('Guest-' + conn.peer.slice(-4));
    const suppliedToken = meta.token || null;

    conn.on('open', () => {
        let resolvedName, assignedToken, rejectionReason;
        const nameLower = requestedName.toLowerCase();

        if (suppliedToken && state.tokenRegistry[suppliedToken]) {
            const reg = state.tokenRegistry[suppliedToken];

            if (nameLower === reg.displayName.toLowerCase()) {
                // Seamless reconnect
                resolvedName = reg.displayName;
                assignedToken = suppliedToken;
                reg.peerId = conn.peer;
            } else {
                // Token valid but participant chose a different name
                if (state.nameRegistry[nameLower]) {
                    rejectionReason = `The name "${requestedName}" is already taken in this session. Please choose a different name.`;
                } else {
                    const oldLower = reg.displayName.toLowerCase();
                    const MAX_PREVIOUS = 5;
                    if (!reg.previousNames) reg.previousNames = [];
                    reg.previousNames.push(oldLower);
                    if (reg.previousNames.length > MAX_PREVIOUS) {
                        const evicted = reg.previousNames.shift();
                        delete state.nameRegistry[evicted];
                    }
                    state.nameRegistry[oldLower].retired = true;

                    resolvedName = requestedName;
                    assignedToken = suppliedToken;
                    state.nameRegistry[nameLower] = { token: assignedToken, displayName: resolvedName, retired: false };
                    reg.displayName = resolvedName;
                    reg.peerId = conn.peer;
                }
            }
        } else if (state.nameRegistry[nameLower]) {
            rejectionReason = `The name "${requestedName}" is already taken in this session. Please choose a different name.`;
        } else {
            assignedToken = generateToken();
            resolvedName = requestedName;
            state.nameRegistry[nameLower] = { token: assignedToken, displayName: resolvedName, retired: false };
            state.tokenRegistry[assignedToken] = { displayName: resolvedName, peerId: conn.peer, previousNames: [] };
        }

        if (rejectionReason) {
            conn.send({ type: 'name-taken', reason: rejectionReason });
            setTimeout(() => conn.close(), 300);
            delete state.peers[conn.peer];
            return;
        }

        state.participantNames[conn.peer] = resolvedName;
        updateParticipantCount();

        conn.send({
            type: 'history',
            messages: state.messages,
            sessionName: state.sessionName,
            yourToken: assignedToken,
            yourName: resolvedName,
            colors: state.nameColors,
        });

        renderMessage(
            { type: 'system', text: `${resolvedName} joined.` },
            document.getElementById('ctrl-feed'),
        );
    });

    conn.on('data', data => onParticipantMessage(conn, data));

    conn.on('close', () => {
        const leftName = state.participantNames[conn.peer] || 'A participant';
        delete state.peers[conn.peer];
        delete state.participantNames[conn.peer];
        updateParticipantCount();
        renderMessage(
            { type: 'system', text: `${leftName} left.` },
            document.getElementById('ctrl-feed'),
        );
    });

    conn.on('error', err => {
        console.warn('Participant connection error', err);
        delete state.peers[conn.peer];
        delete state.participantNames[conn.peer];
        updateParticipantCount();
    });
}

export function startController(name, pin, retries = 0) {
    if (retries > 10) {
        alert('Could not find a free PIN after several attempts. Please try again.');
        showScreen('screen-setup');
        return;
    }

    state.sessionName = name;
    state.currentPin = pin;
    state.messages = [];
    state.peers = {};
    state.participantNames = {};
    state.nameRegistry = {};
    state.tokenRegistry = {};
    state.nameColors = {};

    const peerId = 'phpgrn-' + pin;
    updateStatus('ctrl-dot', 'ctrl-status-text', 'Connecting…', 'connecting');

    let peerInstance;
    try {
        peerInstance = new Peer(peerId, getPeerConfig(state.useRelay));
    } catch {
        alert('PeerJS failed to initialise. Please check your internet connection.');
        showScreen('screen-setup');
        return;
    }

    state.peer = peerInstance;

    state.peer.on('open', () => {
        updateStatus('ctrl-dot', 'ctrl-status-text', 'Connected', 'connected');
        document.getElementById('ctrl-session-name').textContent = name;
        document.getElementById('ctrl-pin').textContent = pin;

        const relayParam = state.useRelay ? '&relay=1' : '';
        const joinUrl  = window.location.origin + window.location.pathname + '?room=' + encodeURIComponent(name.toLowerCase()) + relayParam;
        const joinPath = window.location.pathname + '?room=' + encodeURIComponent(name.toLowerCase()) + relayParam;

        const urlDisplay = document.getElementById('ctrl-join-url');
        const urlStatus  = document.getElementById('ctrl-url-status');
        urlDisplay.textContent = joinPath;
        urlDisplay.dataset.fullUrl = joinUrl;
        urlStatus.textContent = 'Join URL (scan QR or type + enter PIN):';

        const qrEl = document.getElementById('qrcode');
        qrEl.innerHTML = '';
        if (window.QRCode) new QRCode(qrEl, { text: joinUrl, width: 180, height: 180 });

        showScreen('screen-controller');
        state.isControllerSession = true;
        document.getElementById('ctrl-msg-input').focus();
    });

    state.peer.on('connection', conn => onParticipantConnected(conn));

    state.peer.on('error', e => {
        if (e.type === 'unavailable-id') {
            state.peer.destroy();
            startController(name, generatePin(), retries + 1);
        } else if (e.type === 'network' || e.type === 'socket-error' || e.type === 'socket-closed') {
            console.warn('PeerJS signaling hiccup (' + e.type + '), reconnecting…');
        } else {
            updateStatus('ctrl-dot', 'ctrl-status-text', 'Error: ' + e.type, 'disconnected');
            console.error('PeerJS error', e);
        }
    });

    state.peer.on('disconnected', () => {
        if (!state.peer.destroyed) {
            updateStatus('ctrl-dot', 'ctrl-status-text', 'Reconnecting…', 'connecting');
            state.peer.reconnect();
        }
    });
}
