import { state } from './state.js';
import { renderMessage } from './renderer.js';
import { broadcastToAll } from './controller.js';

export function openSnippetModal(target) {
    state.snippetTarget = target;
    document.getElementById('snippet-code').value = '';
    document.getElementById('snippet-modal').classList.add('open');
    document.getElementById('snippet-code').focus();
}

export function closeSnippetModal() {
    document.getElementById('snippet-modal').classList.remove('open');
    state.snippetTarget = null;
}

export function sendSnippet() {
    const code = document.getElementById('snippet-code').value.trim();
    if (!code) return;

    const msg = {
        type: 'snippet',
        sender: state.snippetTarget === 'controller' ? 'Host' : state.displayName,
        language: document.getElementById('snippet-lang').value,
        code,
        timestamp: Date.now(),
    };

    if (state.snippetTarget === 'controller') {
        state.messages.push(msg);
        broadcastToAll(msg);
        renderMessage(msg, document.getElementById('ctrl-feed'));
    } else {
        if (state.mqttClient?.connected) {
            state.mqttClient.publish(`phpgrn/${state.currentPin}/msg`, JSON.stringify(msg), { qos: 0, retain: false });
        }
        // Don't render locally — the controller will echo it back via /broadcast
    }

    closeSnippetModal();
}
