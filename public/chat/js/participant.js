import { state, UNSAFE_KEYS } from './state.js';
import { updateStatus, showScreen, getMqttBrokerUrl, generateParticipantId } from './utils.js';
import { applyColorToMessages } from './colors.js';
import { renderMessage, renderHistory } from './renderer.js';

const TOPIC = pin => `phpgrn/${pin}`;

export function onControllerMessage(data) {
    const feedEl = document.getElementById('part-feed');

    if (data.type === 'history') {
        const receivedName = (data.sessionName || '').trim().toLowerCase();
        const enteredName  = (state.joinedSessionName || '').trim().toLowerCase();

        if (enteredName && receivedName && receivedName !== enteredName) {
            state.mqttClient?.end(true);
            state.mqttClient = null;
            const errorEl = document.getElementById('join-error');
            errorEl.textContent = `Wrong session — host says this is "${data.sessionName}". Check the name and try again.`;
            errorEl.classList.add('visible');
            const joinBtn = document.getElementById('btn-join-submit');
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join';
            showScreen('screen-join');
            return;
        }

        if (data.yourToken && state.currentPin) {
            localStorage.setItem('phpgrn-token-' + state.currentPin, data.yourToken);
        }
        if (data.yourName) state.displayName = data.yourName;

        if (data.colors && typeof data.colors === 'object') {
            const safeColors = Object.create(null);
            for (const key of Object.keys(data.colors)) {
                if (!UNSAFE_KEYS.includes(key)) safeColors[key] = data.colors[key];
            }
            state.nameColors = safeColors;
        }

        document.getElementById('part-session-name').textContent = data.sessionName || 'Chat';
        renderHistory(data.messages || [], feedEl);
        updateStatus('part-dot', 'part-status-text', 'Connected as ' + state.displayName, 'connected');
        document.getElementById('part-msg-input').disabled = false;
        document.getElementById('part-btn-send').disabled = false;
        document.getElementById('part-btn-code').disabled = false;
        document.getElementById('part-msg-input').focus();

    } else if (data.type === 'assign-color') {
        const lower = (data.name || '').toLowerCase();
        if (UNSAFE_KEYS.includes(lower)) return;
        if (data.colorId) {
            state.nameColors[lower] = data.colorId;
        } else {
            delete state.nameColors[lower];
        }
        applyColorToMessages(data.name, data.colorId || null);

    } else if (data.type === 'name-taken') {
        state.mqttClient?.end(true);
        state.mqttClient = null;
        const errorEl = document.getElementById('join-error');
        errorEl.textContent = data.reason || 'That name is already taken. Please choose a different name.';
        errorEl.classList.add('visible');
        const joinBtn = document.getElementById('btn-join-submit');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join';
        showScreen('screen-join');

    } else if (data.type === 'session-end') {
        state.sessionEnded = true;
        if (state.currentPin) localStorage.removeItem('phpgrn-token-' + state.currentPin);
        const notice = document.getElementById('part-session-ended');
        notice.textContent = 'Session ended by the host. Returning to start…';
        notice.classList.add('visible');
        document.getElementById('part-msg-input').disabled = true;
        document.getElementById('part-btn-send').disabled = true;
        document.getElementById('part-btn-code').disabled = true;
        updateStatus('part-dot', 'part-status-text', 'Session ended', 'ended');

        setTimeout(() => {
            state.mqttClient?.end(true);
            state.mqttClient = null;
            state.displayName = '';
            state.currentPin = '';
            state.joinedSessionName = '';
            state.sessionEnded = false;
            state.role = null;
            state.nameColors = {};
            document.getElementById('part-feed').innerHTML = '';
            notice.textContent = '';
            notice.classList.remove('visible');
            showScreen('screen-role');
        }, 3000);

    } else if (data.type === 'chat' || data.type === 'snippet') {
        renderMessage(data, feedEl);
    }
}

export function joinRoom(pin, name, enteredSessionName) {
    state.displayName     = name || ('Guest-' + Math.floor(1000 + Math.random() * 9000));
    state.currentPin      = pin;
    state.joinedSessionName = enteredSessionName || '';
    state.sessionEnded    = false;
    state.participantId   = generateParticipantId();

    const joinBtn = document.getElementById('btn-join-submit');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining…';

    const errorEl = document.getElementById('join-error');
    errorEl.classList.remove('visible');

    const storedToken = localStorage.getItem('phpgrn-token-' + pin) || null;

    const client = window.mqtt.connect(getMqttBrokerUrl(), {
        clientId: 'phpgrn-part-' + Math.random().toString(36).slice(2, 10),
        clean: true,
        reconnectPeriod: 3000,
        will: {
            topic: `phpgrn/${pin}/leave`,
            payload: JSON.stringify({ participantId: state.participantId, displayName: state.displayName }),
            qos: 1,
            retain: false,
        },
    });
    state.mqttClient = client;

    const joinTimeout = setTimeout(() => {
        if (!state.mqttClient?.connected) {
            client.end(true);
            state.mqttClient = null;
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join';
            errorEl.textContent = 'Could not connect to broker. Make sure the PIN is correct and the host is online.';
            errorEl.classList.add('visible');
        }
    }, 10000);

    client.on('connect', () => {
        clearTimeout(joinTimeout);

        client.subscribe([
            `phpgrn/${pin}/broadcast`,
            `phpgrn/${pin}/dm/${state.participantId}`,
        ], { qos: 1 });

        // Announce join
        client.publish(`phpgrn/${pin}/join`, JSON.stringify({
            participantId: state.participantId,
            displayName: state.displayName,
            token: storedToken,
        }), { qos: 1, retain: false });

        showScreen('screen-participant');
        updateStatus('part-dot', 'part-status-text', 'Connected', 'connected');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join';
    });

    client.on('message', (topic, payload) => {
        let data;
        try { data = JSON.parse(payload.toString()); } catch { return; }
        onControllerMessage(data);
    });

    client.on('reconnect', () => {
        if (!state.sessionEnded) {
            updateStatus('part-dot', 'part-status-text', 'Reconnecting…', 'connecting');
        }
    });

    client.on('offline', () => {
        if (!state.sessionEnded) {
            updateStatus('part-dot', 'part-status-text', 'Offline — reconnecting…', 'connecting');
        }
    });

    client.on('error', err => {
        clearTimeout(joinTimeout);
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join';
        errorEl.textContent = 'Connection failed: ' + (err.message || 'Unknown error');
        errorEl.classList.add('visible');
        console.error('MQTT participant error', err);
    });
}
