import { state, ALLOWED_LANGUAGES, TEAM_COLORS } from './state.js';
import { escapeHtml, formatTime, scrollFeedToBottom, applyHighlight } from './utils.js';

export function renderMessage(msg, feedEl) {
    let el;

    if (msg.type === 'system') {
        el = document.createElement('div');
        el.className = 'msg-system';
        el.textContent = msg.text;

    } else if (msg.type === 'chat') {
        el = document.createElement('div');
        el.className = 'msg';
        el.dataset.sender = msg.sender || '';
        const isHost = msg.sender === 'Host';
        el.innerHTML =
            '<div class="msg-header">' +
                '<span class="msg-sender' + (isHost ? ' is-host' : '') + '">' + escapeHtml(msg.sender) + '</span>' +
                '<span class="msg-time">' + formatTime(msg.timestamp) + '</span>' +
            '</div>' +
            '<div class="msg-text">' + escapeHtml(msg.text) + '</div>';

        const chatColor = TEAM_COLORS.find(c => c.id === state.nameColors[(msg.sender || '').toLowerCase()]);
        if (chatColor) el.style.backgroundColor = chatColor.bg;

    } else if (msg.type === 'snippet') {
        el = document.createElement('div');
        el.className = 'msg-snippet';
        el.dataset.sender = msg.sender || '';

        const safeLanguage = ALLOWED_LANGUAGES.includes((msg.language || '').toLowerCase())
            ? msg.language.toLowerCase() : 'javascript';
        const langClass = 'lang-' + safeLanguage;
        const langLabel = safeLanguage === 'php' ? 'PHP' : 'JavaScript';

        el.innerHTML =
            '<div class="snippet-header">' +
                '<div class="snippet-meta">' +
                    '<span class="snippet-sender">' + escapeHtml(msg.sender) + '</span>' +
                    '<span class="snippet-time">' + formatTime(msg.timestamp) + '</span>' +
                    '<span class="snippet-lang-badge ' + langClass + '">' + langLabel + '</span>' +
                '</div>' +
                '<button class="snippet-copy-btn" data-code>Copy</button>' +
            '</div>' +
            '<pre class="snippet-code-block"><code class="language-' + safeLanguage + '">' + escapeHtml(msg.code) + '</code></pre>';

        const snippetColor = TEAM_COLORS.find(c => c.id === state.nameColors[(msg.sender || '').toLowerCase()]);
        if (snippetColor) {
            el.style.borderLeft = `6px solid ${snippetColor.accent}`;
            const hdr = el.querySelector('.snippet-header');
            if (hdr) hdr.style.backgroundColor = snippetColor.bg;
        }

        // Highlight after insertion, then re-scroll since height changes
        setTimeout(() => {
            const codeEl = el.querySelector('code');
            if (codeEl) applyHighlight(codeEl);
            scrollFeedToBottom(feedEl);
        }, 0);

        const copyBtn = el.querySelector('.snippet-copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(msg.code).then(() => {
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                    copyBtn.classList.remove('copied');
                }, 1800);
            }).catch(() => {
                copyBtn.textContent = 'Error';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
            });
        });
    }

    if (el) {
        feedEl.appendChild(el);
        scrollFeedToBottom(feedEl);
    }
}

export function renderHistory(history, feedEl) {
    feedEl.innerHTML = '';
    history.forEach(msg => renderMessage(msg, feedEl));
    // Deferred scroll — waits for snippet highlights to finish
    setTimeout(() => scrollFeedToBottom(feedEl), 50);
}
