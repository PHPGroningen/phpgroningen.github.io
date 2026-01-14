document.addEventListener('DOMContentLoaded', () => {
    // --- Copy to Clipboard Functionality ---
    const copyButtons = document.querySelectorAll('.copy-btn');
    const toast = document.getElementById('toast');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Find the sibling content div
            const card = this.closest('.prompt-card');
            const contentDiv = card.querySelector('.prompt-content');

            if (contentDiv) {
                const textToCopy = contentDiv.innerText;

                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast();

                    // Optional: Visual feedback on button
                    const originalHTML = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied';
                    this.style.backgroundColor = '#1b8e2d';
                    this.style.color = '#fff';

                    setTimeout(() => {
                        this.innerHTML = originalHTML;
                        this.style.backgroundColor = '';
                        this.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            }
        });
    });

    function showToast() {
        toast.className = "toast show";
        setTimeout(function(){
            toast.className = toast.className.replace("show", "");
        }, 3000);
    }

    // --- Typewriter Animation for Descriptive Instructions ---

    // Configuration
    const typeSpeed = 50; // ms per char
    const deleteSpeed = 30; // ms per char
    const pauseDelay = 2000; // time to wait before deleting

    // Targets
    const el1 = document.getElementById('typewriter-1');
    const el2 = document.getElementById('typewriter-2');

    // Data - Expanded Examples
    const text1Options = [
        "Cyberpunk city with neon lights, wireframes, and fog.",
        "Fractal landscape with recursive geometry.",
        "Particle system simulating a galaxy collision.",
        "Low-poly terrain with water reflections."
    ];

    const text2Options = [
        "Solarized palette",
        "Vaporwave aesthetic",
        "Neon-noir high contrast",
        "Iridescent metallic shader",
        "Pastel gradients with noise"
    ];

    if (el1 && el2) {
        // Start animation loops
        typeWriterLoop(el1, text1Options);
        typeWriterLoop(el2, text2Options);
    }

    function typeWriterLoop(element, textArray) {
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let currentText = textArray[textIndex];

        function step() {
            // Determine current string state
            if (isDeleting) {
                charIndex--;
                element.textContent = currentText.substring(0, charIndex);
            } else {
                charIndex++;
                element.textContent = currentText.substring(0, charIndex);
            }

            // Determine next step timing
            let nextSpeed = isDeleting ? deleteSpeed : typeSpeed;

            // Check boundaries
            if (!isDeleting && charIndex === currentText.length) {
                // Finished typing
                isDeleting = true;
                nextSpeed = pauseDelay;
            } else if (isDeleting && charIndex === 0) {
                // Finished deleting
                isDeleting = false;
                textIndex = (textIndex + 1) % textArray.length; // Loop through array
                currentText = textArray[textIndex];
                nextSpeed = 500; // Slight pause before re-typing
            }

            setTimeout(step, nextSpeed);
        }

        step();
    }
});