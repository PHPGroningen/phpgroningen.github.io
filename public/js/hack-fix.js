function copyCode(id) {
    const codeElement = document.getElementById(id).querySelector('code');
    if (!codeElement) return;
    
    const text = codeElement.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.className = "toast show";
            setTimeout(() => { 
                toast.className = toast.className.replace("show", ""); 
            }, 3000);
        }
        
        // Visual feedback on the badge
        const badge = document.getElementById(id).querySelector('.copy-badge');
        if (badge) {
            const originalHTML = badge.innerHTML;
            badge.innerHTML = '<i class="fas fa-check"></i> Copied!';
            badge.style.background = '#1b8e2d';
            
            setTimeout(() => { 
                badge.innerHTML = originalHTML;
                badge.style.background = '';
            }, 3000);
        }
    });
}
