/**
 * GroningenPHP Workshop Chat Widget
 * Embed on any workshop page:
 *   <script src="/chat/widget.js" data-pin="12345"></script>
 *
 * The widget reads the PIN from the data-pin attribute on this <script> tag,
 * or falls back to the ?join= URL query parameter.
 * It injects a floating chat button into the page that expands into a full
 * participant chat panel — no page navigation required.
 *
 * If PeerJS CDN becomes unavailable, the widget shows a friendly error and
 * renders a link to the full-page chat app as fallback.
 */
(function () {
    'use strict';

    // ── Escape helper (defined first — used throughout) ───────────────────────
    function escHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Brand colours (inherit from host page CSS vars if available) ──────────
    var style = getComputedStyle(document.documentElement);
    var RED   = style.getPropertyValue('--groningen-red').trim()   || '#DA121A';
    var BLUE  = style.getPropertyValue('--groningen-blue').trim()  || '#0F47AF';
    var GREEN = style.getPropertyValue('--groningen-green').trim() || '#078930';
    var DARK  = style.getPropertyValue('--dark-gray').trim()       || '#333333';
    var LIGHT = style.getPropertyValue('--light-gray').trim()      || '#f8f9fa';
    var MID   = style.getPropertyValue('--medium-gray').trim()     || '#666666';

    // ── Read PIN ──────────────────────────────────────────────────────────────
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    var selfScript = scripts[scripts.length - 1];
    var prefilledPin = (selfScript && selfScript.getAttribute('data-pin')) || '';
    if (!prefilledPin) {
        var urlParams = new URLSearchParams(window.location.search);
        prefilledPin = urlParams.get('join') || '';
    }

    // ── State ─────────────────────────────────────────────────────────────────
    var widgetPeer = null;
    var widgetConn = null;
    var widgetName = '';
    var widgetPin = '';
    var widgetSessionName = '';
    var widgetSessionEnded = false;
    var widgetOpen = false;
    var widgetJoined = false;
    var WIDGET_ID = 'phpgrn-widget';

    // ── Inject CSS ────────────────────────────────────────────────────────────
    var cssText = [
        '#' + WIDGET_ID + '-btn {',
        '  position:fixed; bottom:20px; right:20px; z-index:9999;',
        '  width:56px; height:56px; border-radius:50%;',
        '  background:' + GREEN + '; color:#fff;',
        '  border:none; font-size:1.5rem; cursor:pointer;',
        '  box-shadow:0 4px 16px rgba(0,0,0,0.25);',
        '  display:flex; align-items:center; justify-content:center;',
        '  transition:transform 0.2s, background 0.2s;',
        '}',
        '#' + WIDGET_ID + '-btn:hover { background:' + BLUE + '; transform:scale(1.1); }',
        '#' + WIDGET_ID + '-panel {',
        '  position:fixed; bottom:86px; right:20px; z-index:9998;',
        '  width:380px; height:500px;',
        '  background:#fff; border-radius:12px;',
        '  box-shadow:0 8px 40px rgba(0,0,0,0.2);',
        '  display:none; flex-direction:column; overflow:hidden;',
        '  font-family:\'Segoe UI\',\'Roboto\',\'Helvetica Neue\',Arial,sans-serif;',
        '  font-size:0.92rem; color:' + DARK + ';',
        '}',
        '#' + WIDGET_ID + '-panel.phpgrn-widget-open { display:flex; }',
        '.phpgrn-widget-header {',
        '  background:' + BLUE + '; color:#fff;',
        '  padding:12px 16px;',
        '  display:flex; align-items:center; justify-content:space-between;',
        '  flex-shrink:0;',
        '}',
        '.phpgrn-widget-header h4 { margin:0; font-size:1rem; font-weight:700; }',
        '.phpgrn-widget-close {',
        '  background:none; border:none; color:#fff; font-size:1.2rem;',
        '  cursor:pointer; line-height:1; padding:2px 6px; border-radius:3px;',
        '}',
        '.phpgrn-widget-close:hover { background:rgba(255,255,255,0.2); }',
        '.phpgrn-widget-body {',
        '  flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:8px;',
        '}',
        '.phpgrn-widget-join-form { display:flex; flex-direction:column; gap:10px; }',
        '.phpgrn-widget-join-form label { font-weight:600; font-size:0.85rem; }',
        '.phpgrn-widget-join-form input {',
        '  width:100%; padding:8px 10px; border:1.5px solid #d0d0d0;',
        '  border-radius:5px; font-size:0.95rem;',
        '  font-family:inherit; box-sizing:border-box;',
        '}',
        '.phpgrn-widget-join-form input:focus { outline:none; border-color:' + BLUE + '; }',
        '.phpgrn-widget-btn {',
        '  background:' + GREEN + '; color:#fff; border:none;',
        '  padding:9px 16px; border-radius:5px; font-size:0.92rem;',
        '  font-family:inherit; font-weight:600; cursor:pointer; transition:background 0.2s;',
        '}',
        '.phpgrn-widget-btn:hover { background:#056e25; }',
        '.phpgrn-widget-btn:disabled { background:#aaa; cursor:not-allowed; }',
        '.phpgrn-widget-btn-code {',
        '  background:#fff; color:' + BLUE + '; border:1.5px solid ' + BLUE + ';',
        '  padding:6px 12px; border-radius:5px; font-size:0.85rem;',
        '  font-family:inherit; font-weight:600; cursor:pointer;',
        '}',
        '.phpgrn-widget-btn-code:disabled { opacity:0.5; cursor:not-allowed; }',
        '.phpgrn-widget-status {',
        '  display:flex; align-items:center; gap:6px;',
        '  font-size:0.78rem; color:' + MID + '; padding:0 0 4px 0;',
        '}',
        '.phpgrn-widget-dot {',
        '  width:8px; height:8px; border-radius:50%; background:#aaa; flex-shrink:0;',
        '}',
        '.phpgrn-widget-dot.connecting { background:#f59e0b; animation:phpgrn-pulse 1.2s ease-in-out infinite; }',
        '.phpgrn-widget-dot.connected { background:' + GREEN + '; }',
        '.phpgrn-widget-dot.disconnected { background:' + RED + '; }',
        '.phpgrn-widget-dot.ended { background:#9ca3af; }',
        '@keyframes phpgrn-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }',
        '.phpgrn-widget-msg { padding:7px 9px; border-radius:5px; background:' + LIGHT + '; border-left:3px solid transparent; }',
        '.phpgrn-widget-msg-header { display:flex; align-items:baseline; gap:6px; margin-bottom:2px; }',
        '.phpgrn-widget-msg-sender { font-weight:700; font-size:0.82rem; color:' + BLUE + '; }',
        '.phpgrn-widget-msg-sender.is-host { color:' + GREEN + '; }',
        '.phpgrn-widget-msg-time { font-size:0.72rem; color:' + MID + '; }',
        '.phpgrn-widget-msg-text { font-size:0.9rem; line-height:1.45; word-break:break-word; }',
        '.phpgrn-widget-msg-system { font-style:italic; color:' + MID + '; font-size:0.82rem; text-align:center; }',
        '.phpgrn-widget-snippet { background:#1e1e2e; border-radius:6px; overflow:hidden; }',
        '.phpgrn-widget-snippet-hdr { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#13131f; }',
        '.phpgrn-widget-snippet-meta { display:flex; align-items:baseline; gap:6px; }',
        '.phpgrn-widget-snippet-sender { font-weight:700; font-size:0.78rem; color:#a0aec0; }',
        '.phpgrn-widget-snippet-time { font-size:0.7rem; color:#718096; }',
        '.phpgrn-widget-lang { font-size:0.7rem; font-weight:700; text-transform:uppercase; padding:1px 6px; border-radius:3px; letter-spacing:0.05em; }',
        '.phpgrn-widget-lang.lang-php { background:#6366f1; color:#fff; }',
        '.phpgrn-widget-lang.lang-javascript { background:#f59e0b; color:#1a1a1a; }',
        '.phpgrn-widget-copy { background:#2d3748; color:#a0aec0; border:none; padding:3px 8px; border-radius:3px; font-size:0.72rem; cursor:pointer; font-family:inherit; }',
        '.phpgrn-widget-copy:hover { background:#4a5568; color:#fff; }',
        '.phpgrn-widget-copy.copied { background:' + GREEN + '; color:#fff; }',
        '.phpgrn-widget-snippet pre { margin:0; overflow-x:auto; }',
        '.phpgrn-widget-snippet code { display:block; padding:10px 12px; font-size:0.82rem; line-height:1.5; font-family:\'Courier New\',monospace; }',
        '.phpgrn-widget-input-bar {',
        '  display:flex; gap:6px; padding:10px 12px;',
        '  border-top:1px solid #e0e0e0; flex-shrink:0; background:#fff;',
        '}',
        '.phpgrn-widget-input-bar input {',
        '  flex:1; border:1.5px solid #d0d0d0; border-radius:5px;',
        '  padding:7px 10px; font-size:0.9rem; font-family:inherit; min-width:0;',
        '}',
        '.phpgrn-widget-input-bar input:focus { outline:none; border-color:' + BLUE + '; }',
        '.phpgrn-widget-send {',
        '  background:' + GREEN + '; color:#fff; border:none;',
        '  padding:7px 12px; border-radius:5px; font-size:0.85rem;',
        '  font-family:inherit; font-weight:600; cursor:pointer;',
        '}',
        '.phpgrn-widget-send:disabled { background:#aaa; cursor:not-allowed; }',
        '.phpgrn-widget-ended {',
        '  background:#fef3c7; border:1px solid #f59e0b; color:#92400e;',
        '  padding:7px 10px; border-radius:5px; font-size:0.82rem; text-align:center; flex-shrink:0; margin:0 12px 8px;',
        '}',
        '.phpgrn-widget-error {',
        '  background:#fef2f2; border:1px solid #fca5a5; color:#dc2626;',
        '  padding:7px 10px; border-radius:5px; font-size:0.82rem;',
        '}',
        /* Snippet modal inside widget */
        '.phpgrn-widget-modal {',
        '  position:absolute; inset:0; background:rgba(0,0,0,0.5);',
        '  z-index:10; display:none; align-items:center; justify-content:center; padding:16px;',
        '}',
        '.phpgrn-widget-modal.open { display:flex; }',
        '.phpgrn-widget-modal-box {',
        '  background:#fff; border-radius:10px; padding:20px; width:100%;',
        '  box-shadow:0 8px 30px rgba(0,0,0,0.2); display:flex; flex-direction:column; gap:10px;',
        '}',
        '.phpgrn-widget-modal-box h4 { margin:0; font-size:1rem; }',
        '.phpgrn-widget-modal-box select, .phpgrn-widget-modal-box textarea {',
        '  width:100%; padding:7px 10px; border:1.5px solid #d0d0d0; border-radius:5px;',
        '  font-family:inherit; font-size:0.88rem; box-sizing:border-box;',
        '}',
        '.phpgrn-widget-modal-box textarea { font-family:\'Courier New\',monospace; min-height:120px; resize:vertical; }',
        '.phpgrn-widget-modal-actions { display:flex; gap:8px; justify-content:flex-end; }',
        '.phpgrn-widget-modal-cancel {',
        '  background:none; border:1.5px solid #d0d0d0; color:' + DARK + ';',
        '  padding:7px 14px; border-radius:5px; font-family:inherit; cursor:pointer; font-size:0.88rem;',
        '}',
    ].join('\n');

    var styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);

    // ── Inject Highlight.js CSS if not present ────────────────────────────────
    if (!document.querySelector('link[href*="highlight.js"]')) {
        var hlCss = document.createElement('link');
        hlCss.rel = 'stylesheet';
        hlCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        document.head.appendChild(hlCss);
    }

    // ── HTML ──────────────────────────────────────────────────────────────────
    var container = document.createElement('div');
    container.innerHTML = [
        '<button id="' + WIDGET_ID + '-btn" aria-label="Open workshop chat" title="Workshop Chat">💬</button>',
        '<div id="' + WIDGET_ID + '-panel" role="dialog" aria-label="Workshop Chat" style="position:fixed">',
        '  <div class="phpgrn-widget-header">',
        '    <h4 id="phpgrn-widget-title">Workshop Chat</h4>',
        '    <button class="phpgrn-widget-close" id="phpgrn-widget-close-btn" aria-label="Close chat">✕</button>',
        '  </div>',
        '  <!-- Join form -->',
        '  <div class="phpgrn-widget-body" id="phpgrn-widget-join-view">',
        '    <div class="phpgrn-widget-join-form">',
        '      <div id="phpgrn-widget-join-status" class="phpgrn-widget-status">',
        '        <span class="phpgrn-widget-dot" id="phpgrn-widget-dot"></span>',
        '        <span id="phpgrn-widget-status-text">Not connected</span>',
        '      </div>',
        '      <label for="phpgrn-widget-pin-input">Room PIN</label>',
        '      <input type="number" id="phpgrn-widget-pin-input" placeholder="12345" min="10000" max="99999" value="' + escHtml(prefilledPin) + '">',
        '      <label for="phpgrn-widget-name-input">Your name <span style="font-weight:400;color:' + MID + '">(optional)</span></label>',
        '      <input type="text" id="phpgrn-widget-name-input" placeholder="Guest-XXXX" maxlength="30">',
        '      <button class="phpgrn-widget-btn" id="phpgrn-widget-join-btn">Join</button>',
        '      <div id="phpgrn-widget-error" style="display:none" class="phpgrn-widget-error"></div>',
        '    </div>',
        '  </div>',
        '  <!-- Chat view (hidden until joined) -->',
        '  <div class="phpgrn-widget-body" id="phpgrn-widget-chat-view" style="display:none" aria-live="polite"></div>',
        '  <div id="phpgrn-widget-ended" class="phpgrn-widget-ended" style="display:none"></div>',
        '  <div class="phpgrn-widget-input-bar" id="phpgrn-widget-input-bar" style="display:none">',
        '    <input type="text" id="phpgrn-widget-msg-input" placeholder="Type a message…" disabled>',
        '    <button class="phpgrn-widget-btn-code" id="phpgrn-widget-code-btn" disabled>🖥</button>',
        '    <button class="phpgrn-widget-send" id="phpgrn-widget-send-btn" disabled>Send</button>',
        '  </div>',
        '  <!-- Snippet modal inside panel -->',
        '  <div class="phpgrn-widget-modal" id="phpgrn-widget-snippet-modal">',
        '    <div class="phpgrn-widget-modal-box">',
        '      <h4>🖥 Share Code</h4>',
        '      <select id="phpgrn-widget-snippet-lang"><option value="php">PHP</option><option value="javascript">JavaScript</option></select>',
        '      <textarea id="phpgrn-widget-snippet-code" rows="6" placeholder="Paste your code…" spellcheck="false"></textarea>',
        '      <div class="phpgrn-widget-modal-actions">',
        '        <button class="phpgrn-widget-modal-cancel" id="phpgrn-widget-modal-cancel">Cancel</button>',
        '        <button class="phpgrn-widget-btn" id="phpgrn-widget-modal-send" style="width:auto">Send Snippet</button>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</div>',
    ].join('');
    document.body.appendChild(container);

    // ── Element refs ──────────────────────────────────────────────────────────
    var btnToggle       = document.getElementById(WIDGET_ID + '-btn');
    var panel           = document.getElementById(WIDGET_ID + '-panel');
    var closeBtn        = document.getElementById('phpgrn-widget-close-btn');
    var joinView        = document.getElementById('phpgrn-widget-join-view');
    var chatView        = document.getElementById('phpgrn-widget-chat-view');
    var inputBar        = document.getElementById('phpgrn-widget-input-bar');
    var pinInput        = document.getElementById('phpgrn-widget-pin-input');
    var nameInput       = document.getElementById('phpgrn-widget-name-input');
    var joinBtn         = document.getElementById('phpgrn-widget-join-btn');
    var errorEl         = document.getElementById('phpgrn-widget-error');
    var msgInput        = document.getElementById('phpgrn-widget-msg-input');
    var sendBtn         = document.getElementById('phpgrn-widget-send-btn');
    var codeBtn         = document.getElementById('phpgrn-widget-code-btn');
    var endedEl         = document.getElementById('phpgrn-widget-ended');
    var dotEl           = document.getElementById('phpgrn-widget-dot');
    var statusTextEl    = document.getElementById('phpgrn-widget-status-text');
    var titleEl         = document.getElementById('phpgrn-widget-title');
    var snippetModal    = document.getElementById('phpgrn-widget-snippet-modal');
    var snippetLang     = document.getElementById('phpgrn-widget-snippet-lang');
    var snippetCode     = document.getElementById('phpgrn-widget-snippet-code');
    var modalCancel     = document.getElementById('phpgrn-widget-modal-cancel');
    var modalSend       = document.getElementById('phpgrn-widget-modal-send');

    // ── Escape helper (secondary ref kept for closure use) ───────────────────
    // escHtml is already defined at top of IIFE

    function formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ── Toggle ────────────────────────────────────────────────────────────────
    function openPanel() {
        widgetOpen = true;
        panel.classList.add('phpgrn-widget-open');
        if (!widgetJoined) pinInput.focus();
        else msgInput.focus();
    }

    function closePanel() {
        widgetOpen = false;
        panel.classList.remove('phpgrn-widget-open');
    }

    btnToggle.addEventListener('click', function () { widgetOpen ? closePanel() : openPanel(); });
    closeBtn.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (snippetModal.classList.contains('open')) {
                snippetModal.classList.remove('open');
            } else if (widgetOpen) {
                closePanel();
            }
        }
    });

    // ── Status ────────────────────────────────────────────────────────────────
    function setStatus(text, state) {
        dotEl.className = 'phpgrn-widget-dot ' + state;
        statusTextEl.textContent = text;
    }

    // ── Render message ────────────────────────────────────────────────────────
    function renderMsg(msg) {
        var el;

        if (msg.type === 'system') {
            el = document.createElement('div');
            el.className = 'phpgrn-widget-msg-system';
            el.textContent = msg.text;

        } else if (msg.type === 'chat') {
            el = document.createElement('div');
            el.className = 'phpgrn-widget-msg';
            var isHost = msg.sender === 'Host';
            el.innerHTML =
                '<div class="phpgrn-widget-msg-header">' +
                    '<span class="phpgrn-widget-msg-sender' + (isHost ? ' is-host' : '') + '">' + escHtml(msg.sender) + '</span>' +
                    '<span class="phpgrn-widget-msg-time">' + formatTime(msg.timestamp) + '</span>' +
                '</div>' +
                '<div class="phpgrn-widget-msg-text">' + escHtml(msg.text) + '</div>';

        } else if (msg.type === 'snippet') {
            el = document.createElement('div');
            el.className = 'phpgrn-widget-snippet';
            var langClass = 'lang-' + msg.language;
            var langLabel = msg.language === 'php' ? 'PHP' : 'JavaScript';
            el.innerHTML =
                '<div class="phpgrn-widget-snippet-hdr">' +
                    '<div class="phpgrn-widget-snippet-meta">' +
                        '<span class="phpgrn-widget-snippet-sender">' + escHtml(msg.sender) + '</span>' +
                        '<span class="phpgrn-widget-snippet-time">' + formatTime(msg.timestamp) + '</span>' +
                        '<span class="phpgrn-widget-lang ' + langClass + '">' + langLabel + '</span>' +
                    '</div>' +
                    '<button class="phpgrn-widget-copy">Copy</button>' +
                '</div>' +
                '<pre><code class="language-' + msg.language + '">' + escHtml(msg.code) + '</code></pre>';

            setTimeout(function () {
                var codeEl = el.querySelector('code');
                if (codeEl && window.hljs) hljs.highlightElement(codeEl);
            }, 0);

            var copyBtn = el.querySelector('.phpgrn-widget-copy');
            var codeToCopy = msg.code;
            copyBtn.addEventListener('click', function () {
                navigator.clipboard.writeText(codeToCopy).then(function () {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(function () {
                        copyBtn.textContent = 'Copy';
                        copyBtn.classList.remove('copied');
                    }, 1800);
                }).catch(function () {
                    copyBtn.textContent = 'Error';
                    setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1800);
                });
            });
        }

        if (el) {
            chatView.appendChild(el);
            chatView.scrollTop = chatView.scrollHeight;
        }
    }

    // ── Controller message handler ────────────────────────────────────────────
    function onControllerData(data) {
        if (data.type === 'history') {
            chatView.innerHTML = '';
            widgetSessionName = data.sessionName || 'Workshop Chat';
            titleEl.textContent = widgetSessionName;
            (data.messages || []).forEach(function (m) { renderMsg(m); });
            msgInput.disabled = false;
            sendBtn.disabled = false;
            codeBtn.disabled = false;
            msgInput.focus();

        } else if (data.type === 'session-end') {
            widgetSessionEnded = true;
            endedEl.textContent = 'Session ended by the host.';
            endedEl.style.display = 'block';
            msgInput.disabled = true;
            sendBtn.disabled = true;
            codeBtn.disabled = true;
            setStatus('Session ended', 'ended');

        } else if (data.type === 'chat' || data.type === 'snippet') {
            renderMsg(data);
        }
    }

    // ── Load CDN scripts ──────────────────────────────────────────────────────
    function loadScript(src, onload, onerror) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = onload;
        s.onerror = onerror || function () {
            console.warn('Failed to load: ' + src);
        };
        document.head.appendChild(s);
    }

    function ensureDeps(callback) {
        var needed = 0;
        var loaded = 0;

        function onLoaded() {
            loaded++;
            if (loaded >= needed) callback();
        }

        function onError(src) {
            return function () {
                showError('Failed to load required library. Check your internet connection.');
                console.error('Could not load: ' + src);
            };
        }

        if (!window.Peer) {
            needed++;
            loadScript(
                'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
                onLoaded,
                onError('peerjs')
            );
        }
        if (!window.hljs) {
            needed++;
            loadScript(
                'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
                function () {
                    // Load language packs after hljs loads
                    loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/php.min.js', function () {});
                    loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js', onLoaded);
                },
                onError('highlight.js')
            );
        }

        if (needed === 0) callback();
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join';
    }

    // ── Join ──────────────────────────────────────────────────────────────────
    function doJoin() {
        var pin = pinInput.value.trim();
        var name = nameInput.value.trim() || ('Guest-' + Math.floor(1000 + Math.random() * 9000));
        if (!pin) {
            showError('Please enter a PIN.');
            return;
        }
        widgetPin = pin;
        widgetName = name;
        widgetSessionEnded = false;

        joinBtn.disabled = true;
        joinBtn.textContent = 'Joining…';
        errorEl.style.display = 'none';
        setStatus('Connecting…', 'connecting');

        ensureDeps(function () {
            if (!window.Peer) {
                showError('PeerJS library is not available. Check your internet connection.');
                return;
            }

            var peerInstance;
            try {
                peerInstance = new Peer();
            } catch (e) {
                showError('PeerJS failed to initialise.');
                return;
            }

            widgetPeer = peerInstance;

            peerInstance.on('open', function () {
                var conn = peerInstance.connect('phpgrn-' + pin, {
                    reliable: true,
                    metadata: { displayName: name }
                });

                widgetConn = conn;

                var timeout = setTimeout(function () {
                    if (!conn.open) {
                        conn.close();
                        peerInstance.destroy();
                        widgetPeer = null;
                        showError('Could not connect. Check the PIN and make sure the host is online.');
                        setStatus('Not connected', '');
                    }
                }, 8000);

                conn.on('open', function () {
                    clearTimeout(timeout);
                    widgetJoined = true;
                    joinBtn.disabled = false;
                    joinBtn.textContent = 'Join';
                    joinView.style.display = 'none';
                    chatView.style.display = 'flex';
                    inputBar.style.display = 'flex';
                    setStatus('Connected', 'connected');
                });

                conn.on('data', onControllerData);

                conn.on('close', function () {
                    if (!widgetSessionEnded) {
                        setTimeout(function () {
                            if (!widgetSessionEnded) {
                                endedEl.textContent = 'Host disconnected — session may have ended.';
                                endedEl.style.display = 'block';
                                msgInput.disabled = true;
                                sendBtn.disabled = true;
                                codeBtn.disabled = true;
                                setStatus('Disconnected', 'disconnected');
                            }
                        }, 5000);
                    }
                });

                conn.on('error', function (err) {
                    clearTimeout(timeout);
                    setStatus('Error', 'disconnected');
                    console.error('Widget connection error', err);
                });
            });

            peerInstance.on('error', function (e) {
                showError('Connection failed: ' + (e.type || e.message || 'Unknown error'));
                setStatus('Error', 'disconnected');
            });
        });
    }

    joinBtn.addEventListener('click', doJoin);
    pinInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doJoin(); });
    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doJoin(); });

    // ── Send message ──────────────────────────────────────────────────────────
    function doSend() {
        var text = msgInput.value.trim();
        if (!text || !widgetConn || !widgetConn.open) return;
        var msg = {
            type: 'chat',
            sender: widgetName,
            text: text,
            timestamp: Date.now()
        };
        widgetConn.send(msg);
        renderMsg(msg);
        msgInput.value = '';
        msgInput.focus();
    }

    sendBtn.addEventListener('click', doSend);
    msgInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    // ── Snippet modal ─────────────────────────────────────────────────────────
    codeBtn.addEventListener('click', function () {
        snippetCode.value = '';
        snippetModal.classList.add('open');
        snippetCode.focus();
    });

    modalCancel.addEventListener('click', function () { snippetModal.classList.remove('open'); });

    modalSend.addEventListener('click', function () {
        var code = snippetCode.value.trim();
        if (!code || !widgetConn || !widgetConn.open) return;
        var msg = {
            type: 'snippet',
            sender: widgetName,
            language: snippetLang.value,
            code: code,
            timestamp: Date.now()
        };
        widgetConn.send(msg);
        renderMsg(msg);
        snippetModal.classList.remove('open');
    });

    // ── Auto-open if PIN pre-filled ───────────────────────────────────────────
    if (prefilledPin) {
        openPanel();
    }

    // ── Cleanup on page unload ────────────────────────────────────────────────
    window.addEventListener('pagehide', function () {
        if (widgetPeer) widgetPeer.destroy();
    });

})();
