document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const card = this.closest('.prompt-card');
            const codeEl = card?.querySelector('.code-block code, .code-block, .prompt-content');
            if (!codeEl) return;

            const text = codeEl.innerText;

            navigator.clipboard.writeText(text).then(() => {
                showToast();
                const original = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Copied';
                this.style.backgroundColor = '#1b8e2d';
                this.style.color = '#fff';
                setTimeout(() => {
                    this.innerHTML = original;
                    this.style.backgroundColor = '';
                    this.style.color = '';
                }, 2000);
            }).catch(err => console.error('Copy failed:', err));
        });
    });

    function showToast() {
        if (!toast) return;
        toast.className = 'toast show';
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 2500);
    }
});
