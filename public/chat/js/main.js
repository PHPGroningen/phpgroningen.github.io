import { state } from './state.js';
import { generatePin, showScreen } from './utils.js';
import { renderMessage } from './renderer.js';
import { startController, broadcastToAll } from './controller.js';
import { joinRoom } from './participant.js';
import { openSnippetModal, closeSnippetModal, sendSnippet } from './modal.js';

// ── Role selection ────────────────────────────────────────────────────────────
document.getElementById('btn-start-room').addEventListener('click', () => {
    state.role = 'controller';
    showScreen('screen-setup');
    document.getElementById('setup-session-name').focus();
});

document.getElementById('btn-join-room').addEventListener('click', () => {
    state.role = 'participant';
    showScreen('screen-join');
    document.getElementById('input-pin').focus();
});

// ── Back buttons ──────────────────────────────────────────────────────────────
document.getElementById('btn-back-setup').addEventListener('click', () => showScreen('screen-role'));
document.getElementById('btn-back-join').addEventListener('click', () => showScreen('screen-role'));

// ── Session setup form ────────────────────────────────────────────────────────
document.getElementById('form-setup').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('setup-session-name').value.trim();
    if (!name) return;
    startController(name, generatePin(), 0);
});

// ── Join form ─────────────────────────────────────────────────────────────────
document.getElementById('form-join').addEventListener('submit', e => {
    e.preventDefault();
    const enteredSessionName = document.getElementById('input-session-name').value.trim();
    const pin  = document.getElementById('input-pin').value.trim();
    const name = document.getElementById('input-name').value.trim();
    if (!enteredSessionName || !pin || pin.length < 5) return;
    joinRoom(pin, name, enteredSessionName);
});

// ── Controller: send message ──────────────────────────────────────────────────
function ctrlSendMessage() {
    const input = document.getElementById('ctrl-msg-input');
    const text = input.value.trim();
    if (!text) return;
    const msg = { type: 'chat', sender: 'Host', text, timestamp: Date.now() };
    state.messages.push(msg);
    broadcastToAll(msg);
    renderMessage(msg, document.getElementById('ctrl-feed'));
    input.value = '';
    input.focus();
}

document.getElementById('ctrl-btn-send').addEventListener('click', ctrlSendMessage);
document.getElementById('ctrl-msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ctrlSendMessage(); }
});

// ── Participant: send message ─────────────────────────────────────────────────
function partSendMessage() {
    const input = document.getElementById('part-msg-input');
    const text = input.value.trim();
    if (!text || !state.controllerConn?.open) return;
    const msg = { type: 'chat', sender: state.displayName, text, timestamp: Date.now() };
    state.controllerConn.send(msg);
    renderMessage(msg, document.getElementById('part-feed'));
    input.value = '';
    input.focus();
}

document.getElementById('part-btn-send').addEventListener('click', partSendMessage);
document.getElementById('part-msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); partSendMessage(); }
});

// ── Code snippet modal ────────────────────────────────────────────────────────
document.getElementById('ctrl-btn-code').addEventListener('click', () => openSnippetModal('controller'));
document.getElementById('part-btn-code').addEventListener('click', () => openSnippetModal('participant'));
document.getElementById('btn-modal-cancel').addEventListener('click', closeSnippetModal);
document.getElementById('btn-modal-send').addEventListener('click', sendSnippet);
document.getElementById('snippet-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSnippetModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('snippet-modal').classList.contains('open')) {
        closeSnippetModal();
    }
});

// ── Copy join URL ─────────────────────────────────────────────────────────────
document.getElementById('ctrl-btn-copy-url').addEventListener('click', () => {
    const el = document.getElementById('ctrl-join-url');
    const url = el.dataset.fullUrl || el.textContent;
    const btn = document.getElementById('ctrl-btn-copy-url');
    navigator.clipboard.writeText(url).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy URL';
            btn.classList.remove('copied');
        }, 2000);
    });
});

// ── Fullscreen ────────────────────────────────────────────────────────────────
document.getElementById('ctrl-btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err);
        });
    } else {
        document.exitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    document.body.classList.toggle('is-fullscreen', isFs);
    const btn = document.getElementById('ctrl-btn-fullscreen');
    if (!btn) return;
    btn.textContent = isFs ? '✕' : '⛶';
    btn.title = isFs ? 'Exit fullscreen' : 'Enter fullscreen';
});

// ── QR toggle ────────────────────────────────────────────────────────────────
document.getElementById('qr-toggle-btn').addEventListener('click', () => {
    const btn = document.getElementById('qr-toggle-btn');
    const qr  = document.getElementById('qrcode');
    const collapsed = btn.classList.toggle('collapsed');
    qr.classList.toggle('hidden', collapsed);
});

// ── Page lifecycle ────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', e => {
    if (state.isControllerSession) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.addEventListener('pagehide', () => {
    if (state.role === 'controller') {
        state.isControllerSession = false;
        broadcastToAll({ type: 'session-end', reason: 'host-closed' });
    }
    if (state.peer) state.peer.destroy();
});

// ── Init: pre-fill join form from ?room= URL param ────────────────────────────
(function init() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam?.trim()) {
        state.role = 'participant';
        showScreen('screen-join');
        document.getElementById('input-session-name').value = roomParam.trim();
        document.getElementById('input-pin').focus();
    }
})();
