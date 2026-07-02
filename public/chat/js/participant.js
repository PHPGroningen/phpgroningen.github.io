import { state, UNSAFE_KEYS } from './state.js';
import { updateStatus, showScreen, getPeerConfig } from './utils.js';
import { applyColorToMessages } from './colors.js';
import { renderMessage, renderHistory } from './renderer.js';

export function onControllerMessage(data) {
    const feedEl = document.getElementById('part-feed');

    if (data.type === 'history') {
        const receivedName = (data.sessionName || '').trim().toLowerCase();
        const enteredName  = (state.joinedSessionName || '').trim().toLowerCase();

        if (enteredName && receivedName && receivedName !== enteredName) {
            if (state.controllerConn) state.controllerConn.close();
            if (state.peer) { state.peer.destroy(); state.peer = null; }
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
        if (state.controllerConn) state.controllerConn.close();
        if (state.peer) { state.peer.destroy(); state.peer = null; }
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
            if (state.controllerConn) { state.controllerConn.close(); state.controllerConn = null; }
            if (state.peer) { state.peer.destroy(); state.peer = null; }
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

    const joinBtn = document.getElementById('btn-join-submit');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining…';

    const errorEl = document.getElementById('join-error');
    errorEl.classList.remove('visible');

    let peerInstance;
    try {
        peerInstance = new Peer(getPeerConfig(state.useRelay));
    } catch {
        errorEl.textContent = 'PeerJS failed to initialise. Check your internet connection.';
        errorEl.classList.add('visible');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join';
        return;
    }

    state.peer = peerInstance;

    state.peer.on('open', () => {
        const storedToken = localStorage.getItem('phpgrn-token-' + pin) || null;
        const conn = state.peer.connect('phpgrn-' + pin, {
            reliable: true,
            metadata: { displayName: state.displayName, token: storedToken },
        });
        state.controllerConn = conn;

        const timeout = setTimeout(() => {
            if (!conn.open) {
                conn.close();
                state.peer.destroy();
                state.peer = null;
                joinBtn.disabled = false;
                joinBtn.textContent = 'Join';
                errorEl.textContent = 'Could not connect. Make sure the PIN is correct and the host is online.';
                errorEl.classList.add('visible');
            }
        }, 8000);

        conn.on('open', () => {
            clearTimeout(timeout);
            showScreen('screen-participant');
            updateStatus('part-dot', 'part-status-text', 'Connected', 'connected');
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join';
        });

        conn.on('data', data => onControllerMessage(data));

        conn.on('close', () => {
            if (!state.sessionEnded && conn === state.controllerConn) {
                setTimeout(() => {
                    if (!state.sessionEnded && conn === state.controllerConn) {
                        const notice = document.getElementById('part-session-ended');
                        notice.textContent = 'Host disconnected — session may have ended.';
                        notice.classList.add('visible');
                        document.getElementById('part-msg-input').disabled = true;
                        document.getElementById('part-btn-send').disabled = true;
                        document.getElementById('part-btn-code').disabled = true;
                        updateStatus('part-dot', 'part-status-text', 'Disconnected', 'disconnected');
                    }
                }, 5000);
            }
        });

        conn.on('error', err => {
            clearTimeout(timeout);
            console.error('Connection error', err);
            updateStatus('part-dot', 'part-status-text', 'Connection error', 'disconnected');
        });
    });

    state.peer.on('error', e => {
        if (e.type === 'network' || e.type === 'socket-error' || e.type === 'socket-closed') {
            console.warn('PeerJS participant signaling hiccup (' + e.type + ')');
        } else {
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join';
            errorEl.textContent = 'Connection failed: ' + (e.type || e.message || 'Unknown error');
            errorEl.classList.add('visible');
            console.error('PeerJS participant error', e);
        }
    });

    state.peer.on('disconnected', () => {
        if (!state.sessionEnded && state.peer && !state.peer.destroyed) {
            console.warn('Participant lost signaling connection, reconnecting…');
            state.peer.reconnect();
        }
    });
}
