import { state, TEAM_COLORS } from './state.js';

/**
 * Retroactively applies (or removes) a team color to all already-rendered
 * messages from a given sender.
 */
export function applyColorToMessages(senderName, colorId) {
    const lower = (senderName || '').toLowerCase();
    const color = TEAM_COLORS.find(c => c.id === colorId);

    document.querySelectorAll('[data-sender]').forEach(el => {
        if ((el.dataset.sender || '').toLowerCase() !== lower) return;

        if (el.classList.contains('msg-snippet')) {
            const header = el.querySelector('.snippet-header');
            if (color) {
                el.style.borderLeft = `6px solid ${color.accent}`;
                if (header) header.style.backgroundColor = color.bg;
            } else {
                el.style.borderLeft = '';
                if (header) header.style.backgroundColor = '';
            }
        } else {
            el.style.backgroundColor = color ? color.bg : '';
        }
    });
}
