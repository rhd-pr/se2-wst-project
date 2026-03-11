</main>

        <!-- ── Logout Confirmation Modal ───────────────────── -->
        <div class="modal-backdrop" id="logoutModal" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle">
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h3 id="logoutModalTitle">
                        <i data-lucide="log-out"></i>
                        Sign Out
                    </h3>
                    <button class="modal-close" id="logoutModalClose" aria-label="Cancel">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="logout-modal-body">
                        <div class="logout-modal-icon">
                            <i data-lucide="log-out"></i>
                        </div>
                        <p>Are you sure you want to sign out of <strong>TURS</strong>?</p>
                        <span>You will need to log in again to access the admin panel.</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" id="logoutCancelBtn">
                        <i data-lucide="x"></i>
                        Cancel
                    </button>
                    <a href="<?= $base_path ?? '' ?>logout.php" class="btn btn-danger-solid" id="logoutConfirmBtn">
                        <i data-lucide="log-out"></i>
                        Yes, Sign Out
                    </a>
                </div>
            </div>
        </div>

    </div>
</div>

<!-- ── Shared Scripts ──────────────────────────────────────── -->
<?php if (!empty($extra_js_head)) echo $extra_js_head; ?>
<script>
    // Initialize Lucide icons
    lucide.createIcons();

    // ── Logout confirmation modal ─────────────────────────
    const logoutModal      = document.getElementById('logoutModal');
    const logoutBtn        = document.getElementById('logoutBtn');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    const logoutModalClose = document.getElementById('logoutModalClose');
    const logoutCancelBtn  = document.getElementById('logoutCancelBtn');

    function openLogoutModal() {
        logoutModal.classList.add('active');
    }

    function closeLogoutModal() {
        logoutModal.classList.remove('active');
    }

    if (logoutBtn)        logoutBtn.addEventListener('click', openLogoutModal);
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', openLogoutModal);
    if (logoutModalClose) logoutModalClose.addEventListener('click', closeLogoutModal);
    if (logoutCancelBtn)  logoutCancelBtn.addEventListener('click', closeLogoutModal);

    // Close on backdrop click
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) closeLogoutModal();
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutModal?.classList.contains('active')) {
            closeLogoutModal();
        }
    });

    // ── Sidebar toggle (mobile) ───────────────────────────
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar       = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
</script>

<?php if (!empty($extra_js)): ?>
    <?php foreach ($extra_js as $js): ?>
        <script src="<?= $base_path ?? '' ?>assets/js/<?= htmlspecialchars($js) ?>"></script>
    <?php endforeach; ?>
<?php endif; ?>

</body>
</html>