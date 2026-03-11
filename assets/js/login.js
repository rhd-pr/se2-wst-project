document.addEventListener('DOMContentLoaded', () => {

    const form          = document.getElementById('loginForm');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError    = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const loginBtn      = document.getElementById('loginBtn');
    const togglePw      = document.getElementById('togglePassword');
    const pwIcon        = document.getElementById('pwIcon');

    // ── Toggle password visibility ──────────────────────────
    if (togglePw) {
        togglePw.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            // swap icon
            pwIcon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
            lucide.createIcons();
        });
    }

    // ── Clear field error on input ──────────────────────────
    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('input-error');
        emailError.textContent = '';
    });

    passwordInput.addEventListener('input', () => {
        passwordInput.classList.remove('input-error');
        passwordError.textContent = '';
    });

    // ── Form submission ─────────────────────────────────────
    form.addEventListener('submit', (e) => {
        let valid = true;

        // Validate email
        const emailVal = emailInput.value.trim();
        if (!emailVal) {
            emailError.textContent = 'Email address is required.';
            emailInput.classList.add('input-error');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            emailError.textContent = 'Please enter a valid email address.';
            emailInput.classList.add('input-error');
            valid = false;
        }

        // Validate password
        const passwordVal = passwordInput.value;
        if (!passwordVal) {
            passwordError.textContent = 'Password is required.';
            passwordInput.classList.add('input-error');
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
            return;
        }

        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    });

});