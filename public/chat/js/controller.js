import { state, TEAM_COLORS, UNSAFE_KEYS } from './state.js';
import { generatePin, generateToken, updateStatus, showScreen, getMqttBrokerUrl } from './utils.js';
import { applyColorToMessages } from './colors.js';
import { renderMessage } from './renderer.js';

const TOPIC = pin => `phpgrn/${pin}`;

export function broadcastToAll(msg) {
    if (state.mqttClient?.connected) {
        state.mqttClient.publish(TOPIC(state.currentPin) + '/broadcast', JSON.stringify(msg), { qos: 0, retain: false });
    }
}

function sendToParticipant(participantId, msg) {
    if (state.mqttClient?.connected) {
        state.mqttClient.publish(TOPIC(state.currentPin) + '/dm/' + participantId, JSON.stringify(msg), { qos: 1, retain: false });
    }
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
    const count = Object.keys(state.peers).length;
    const countEl = document.getElementById('ctrl-participant-count');
    if (countEl) countEl.textContent = count;

    const listEl = document.getElementById('ctrl-participant-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    document.querySelectorAll('.color-popover').forEach(p => p.remove());

    Object.entries(state.participantNames).forEach(([participantId, name]) => {
        if (!state.peers[participantId]) return;

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

function onParticipantMessage(data) {
    // Relay to all other participants
    broadcastToAll(data);

    if (data.type === 'chat' || data.type === 'snippet') {
        state.messages.push(data);
        renderMessage(data, document.getElementById('ctrl-feed'));
    }
}

function onJoinMessage(data) {
    const { participantId, displayName: requestedName, token: suppliedToken } = data;
    if (!participantId) return;

    const nameLower = (requestedName || '').trim().toLowerCase() || 'guest';
    const resolvedRequestedName = (requestedName || '').trim() || ('Guest-' + participantId.slice(-4));

    let resolvedName, assignedToken, rejectionReason;

    if (suppliedToken && state.tokenRegistry[suppliedToken]) {
        const reg = state.tokenRegistry[suppliedToken];

        if (nameLower === reg.displayName.toLowerCase()) {
            resolvedName = reg.displayName;
            assignedToken = suppliedToken;
            reg.participantId = participantId;
        } else {
            if (state.nameRegistry[nameLower] && !state.nameRegistry[nameLower].retired) {
                rejectionReason = `The name "${resolvedRequestedName}" is already taken in this session. Please choose a different name.`;
            } else {
                const oldLower = reg.displayName.toLowerCase();
                const MAX_PREVIOUS = 5;
                if (!reg.previousNames) reg.previousNames = [];
                reg.previousNames.push(oldLower);
                if (reg.previousNames.length > MAX_PREVIOUS) {
                    const evicted = reg.previousNames.shift();
                    delete state.nameRegistry[evicted];
                }
                if (state.nameRegistry[oldLower]) state.nameRegistry[oldLower].retired = true;

                resolvedName = resolvedRequestedName;
                assignedToken = suppliedToken;
                state.nameRegistry[nameLower] = { token: assignedToken, displayName: resolvedName, retired: false };
                reg.displayName = resolvedName;
                reg.participantId = participantId;
            }
        }
    } else if (state.nameRegistry[nameLower] && !state.nameRegistry[nameLower].retired) {
        rejectionReason = `The name "${resolvedRequestedName}" is already taken in this session. Please choose a different name.`;
    } else {
        assignedToken = generateToken();
        resolvedName = resolvedRequestedName;
        state.nameRegistry[nameLower] = { token: assignedToken, displayName: resolvedName, retired: false };
        state.tokenRegistry[assignedToken] = { displayName: resolvedName, participantId, previousNames: [] };
    }

    if (rejectionReason) {
        sendToParticipant(participantId, { type: 'name-taken', reason: rejectionReason });
        return;
    }

    state.peers[participantId] = { name: resolvedName };
    state.participantNames[participantId] = resolvedName;
    updateParticipantCount();

    sendToParticipant(participantId, {
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
}

function onLeaveMessage(data) {
    const { participantId } = data;
    if (!participantId || !state.peers[participantId]) return;
    const leftName = state.participantNames[participantId] || 'A participant';
    delete state.peers[participantId];
    delete state.participantNames[participantId];
    updateParticipantCount();
    renderMessage(
        { type: 'system', text: `${leftName} left.` },
        document.getElementById('ctrl-feed'),
    );
}

export function startController(name, pin) {
    state.sessionName = name;
    state.currentPin = pin;
    state.messages = [];
    state.peers = {};
    state.participantNames = {};
    state.nameRegistry = {};
    state.tokenRegistry = {};
    state.nameColors = {};

    updateStatus('ctrl-dot', 'ctrl-status-text', 'Connecting…', 'connecting');

    const client = window.mqtt.connect(getMqttBrokerUrl(), {
        clientId: 'phpgrn-ctrl-' + pin + '-' + Math.random().toString(36).slice(2, 6),
        clean: true,
        reconnectPeriod: 3000,
        will: {
            topic: TOPIC(pin) + '/broadcast',
            payload: JSON.stringify({ type: 'session-end', reason: 'host-closed' }),
            qos: 1,
            retain: false,
        },
    });
    state.mqttClient = client;

    client.on('connect', () => {
        updateStatus('ctrl-dot', 'ctrl-status-text', 'Connected', 'connected');

        client.subscribe([
            TOPIC(pin) + '/join',
            TOPIC(pin) + '/msg',
            TOPIC(pin) + '/leave',
        ], { qos: 1 });

        document.getElementById('ctrl-session-name').textContent = name;
        document.getElementById('ctrl-pin').textContent = pin;

        const brokerParam = state.useCustomBroker && state.mqttBrokerUrl
            ? '&broker=' + encodeURIComponent(state.mqttBrokerUrl) : '';
        const joinUrl  = window.location.origin + window.location.pathname + '?room=' + encodeURIComponent(name.toLowerCase()) + brokerParam;
        const joinPath = window.location.pathname + '?room=' + encodeURIComponent(name.toLowerCase()) + brokerParam;

        const urlDisplay = document.getElementById('ctrl-join-url');
        const urlStatus  = document.getElementById('ctrl-url-status');
        urlDisplay.textContent = joinPath;
        urlDisplay.dataset.fullUrl = joinUrl;
        urlStatus.textContent = 'Join URL (scan QR or type + enter PIN):';

        const brokerInfoEl = document.getElementById('ctrl-broker-info');
        if (brokerInfoEl) {
            if (state.useCustomBroker && state.mqttBrokerUrl) {
                document.getElementById('ctrl-broker-url').textContent = state.mqttBrokerUrl;
                brokerInfoEl.style.display = 'block';
            } else {
                brokerInfoEl.style.display = 'none';
            }
        }

        const qrEl = document.getElementById('qrcode');
        qrEl.innerHTML = '';
        if (window.QRCode) new QRCode(qrEl, { text: joinUrl, width: 180, height: 180 });

        showScreen('screen-controller');
        state.isControllerSession = true;
        document.getElementById('ctrl-msg-input').focus();
    });

    client.on('message', (topic, payload) => {
        let data;
        try { data = JSON.parse(payload.toString()); } catch { return; }
        const pin = state.currentPin;
        if (topic === TOPIC(pin) + '/join')  return onJoinMessage(data);
        if (topic === TOPIC(pin) + '/leave') return onLeaveMessage(data);
        if (topic === TOPIC(pin) + '/msg')   return onParticipantMessage(data);
    });

    client.on('reconnect', () => {
        updateStatus('ctrl-dot', 'ctrl-status-text', 'Reconnecting…', 'connecting');
    });

    client.on('error', err => {
        updateStatus('ctrl-dot', 'ctrl-status-text', 'Connection error', 'disconnected');
        console.error('MQTT controller error', err);
    });

    client.on('offline', () => {
        updateStatus('ctrl-dot', 'ctrl-status-text', 'Offline — reconnecting…', 'connecting');
    });
}
