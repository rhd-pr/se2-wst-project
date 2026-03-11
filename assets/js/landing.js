document.addEventListener('DOMContentLoaded', () => {

    // ── Navbar scroll effect ────────────────────────────────
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    // ── Fetch summary stats ─────────────────────────────────
    const valTerminals = document.getElementById('valTerminals');
    const valEmergency = document.getElementById('valEmergency');
    const valFacilities = document.getElementById('valFacilities');
    const valRisk       = document.getElementById('valRisk');

    // Set loading state
    [valTerminals, valEmergency, valFacilities, valRisk].forEach(el => {
        if (el) el.classList.add('loading');
    });

    fetch('api/map-summary.php')
        .then(res => {
            if (!res.ok) throw new Error('Network error');
            return res.json();
        })
        .then(data => {
            animateCount(valTerminals,  data.total_terminals  ?? 0);
            animateCount(valEmergency,  data.total_emergency  ?? 0);
            animateCount(valFacilities, data.total_facilities ?? 0);
            animateCount(valRisk,       data.active_risk_areas ?? 0);

            [valTerminals, valEmergency, valFacilities, valRisk].forEach(el => {
                if (el) el.classList.remove('loading');
            });
        })
        .catch(() => {
            // Fallback — show 0 if API not available yet
            [valTerminals, valEmergency, valFacilities, valRisk].forEach(el => {
                if (el) {
                    el.textContent = '0';
                    el.classList.remove('loading');
                }
            });
        });

    // ── Count-up animation ──────────────────────────────────
    function animateCount(el, target) {
        if (!el) return;

        const duration = 800;
        const start    = performance.now();
        const from     = 0;

        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(from + (target - from) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

});