document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

    // Copy buttons
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

    // Solution quiz gates
    document.querySelectorAll('.quiz-check-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const quiz = this.closest('.solution-quiz');
            const correct = this.dataset.answers.split(',');
            const questions = quiz.querySelectorAll('.quiz-question');
            const feedback = quiz.querySelector('.quiz-feedback');

            let allAnswered = true;
            let allCorrect = true;

            questions.forEach((q, i) => {
                const selected = q.querySelector('input[type="radio"]:checked');
                if (!selected) {
                    allAnswered = false;
                } else if (selected.value !== correct[i]) {
                    allCorrect = false;
                }
            });

            if (!allAnswered) {
                feedback.textContent = '⚠️ Please answer both questions first.';
                feedback.className = 'quiz-feedback wrong';
                return;
            }

            if (!allCorrect) {
                feedback.textContent = '❌ Not quite — review your answers and try again.';
                feedback.className = 'quiz-feedback wrong';
                return;
            }

            // Correct!
            feedback.textContent = '✅ Correct! Here\'s the solution:';
            feedback.className = 'quiz-feedback correct';
            btn.disabled = true;

            const solutionCode = quiz.nextElementSibling;
            if (solutionCode && solutionCode.classList.contains('solution-code')) {
                solutionCode.hidden = false;
            }
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
