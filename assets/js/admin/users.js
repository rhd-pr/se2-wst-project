document.addEventListener('DOMContentLoaded', () => {

    // ── State ───────────────────────────────────────────────────
    let allUsers   = [];
    let editingId  = null;
    let deletingId = null;
    let searchQ    = '';

    // ── DOM refs ────────────────────────────────────────────────
    const tbody       = document.getElementById('usersTableBody');
    const countBadge  = document.getElementById('countBadge');
    const searchInput = document.getElementById('searchInput');
    const addUserBtn  = document.getElementById('addUserBtn');

    const userModal       = document.getElementById('userModal');
    const userModalTitle  = document.getElementById('userModalTitle');
    const userModalClose  = document.getElementById('userModalClose');
    const userModalCancel = document.getElementById('userModalCancel');
    const userSubmitBtn   = document.getElementById('userSubmitBtn');
    const userSubmitText  = document.getElementById('userSubmitText');

    const uFullName = document.getElementById('uFullName');
    const uUsername = document.getElementById('uUsername');
    const uEmail    = document.getElementById('uEmail');
    const uPassword = document.getElementById('uPassword');
    const pwReq     = document.getElementById('pwReq');
    const pwHint    = document.getElementById('pwHint');
    const pwToggle  = document.getElementById('pwToggle');

    const deleteModal      = document.getElementById('deleteModal');
    const deleteModalClose = document.getElementById('deleteModalClose');
    const deleteCancelBtn  = document.getElementById('deleteCancelBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteUserName   = document.getElementById('deleteUserName');

    // ── Toast ───────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 16px;
            border-radius:6px;font-size:.875rem;font-weight:500;
            box-shadow:0 4px 12px rgba(0,0,0,.15);animation:usr-fadein .2s ease;
            background:${type==='success'?'#2E8B57':type==='danger'?'#C0392B':'#1A3A5C'};color:#fff;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    }

    // ── Fetch ───────────────────────────────────────────────────
    async function loadUsers() {
        try {
            const res  = await fetch('../api/users.php');
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); }
            catch { showToast('API error — see console for details.', 'danger'); return; }
            if (!data.success) { showToast('Failed to load users.', 'danger'); return; }
            allUsers = data.users || [];
            renderTable();
        } catch (e) {
            showToast('Network error loading users.', 'danger');
            console.error(e);
        }
    }

    // ── Render ──────────────────────────────────────────────────
    function renderTable() {
        const q = searchQ.toLowerCase();
        const filtered = allUsers.filter(u => {
            if (!q) return true;
            return (u.full_name  || '').toLowerCase().includes(q)
                || (u.username   || '').toLowerCase().includes(q)
                || (u.email      || '').toLowerCase().includes(q);
        });

        countBadge.textContent = filtered.length + ' user' + (filtered.length !== 1 ? 's' : '');

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">
                <div class="empty-state">
                    <i data-lucide="users"></i>
                    <p>No users found.</p>
                </div>
            </td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = filtered.map(u => {
            const initials = (u.full_name || u.username)
                .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            const joined = new Date(u.created_at).toLocaleDateString('en-PH', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            // Detect "you" from a data attribute injected by PHP (or skip if unavailable)
            const currentId = document.body.dataset.userId
                            ? parseInt(document.body.dataset.userId) : null;
            const isYou = currentId && parseInt(u.user_id) === currentId;

            return `<tr>
                <td>
                    <div class="usr-cell">
                        <div class="usr-avatar">${initials}</div>
                        <span class="usr-name">
                            ${u.full_name || '—'}
                            ${isYou ? '<span class="usr-you-badge">You</span>' : ''}
                        </span>
                    </div>
                </td>
                <td class="td-muted">${u.username}</td>
                <td class="td-muted">${u.email || '—'}</td>
                <td>
                    <span class="badge badge-transport">
                        <i data-lucide="shield"></i> admin
                    </span>
                </td>
                <td class="td-muted">${joined}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn btn-icon btn-outline btn-sm"
                            data-action="edit" data-id="${u.user_id}" title="Edit user">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="btn btn-icon btn-danger btn-sm"
                            data-action="delete" data-id="${u.user_id}"
                            title="Delete user" ${isYou ? 'disabled' : ''}>
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        lucide.createIcons();
        bindRowActions();
    }

    function bindRowActions() {
        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => openEdit(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => openDelete(parseInt(btn.dataset.id)));
        });
    }

    // ── Search ──────────────────────────────────────────────────
    searchInput?.addEventListener('input', () => {
        searchQ = searchInput.value.trim();
        renderTable();
    });

    // ── Password toggle ─────────────────────────────────────────
    pwToggle?.addEventListener('click', () => {
        const isText = uPassword.type === 'text';
        uPassword.type = isText ? 'password' : 'text';
        pwToggle.querySelector('i').setAttribute('data-lucide', isText ? 'eye' : 'eye-off');
        lucide.createIcons();
    });

    // ── Error helpers ───────────────────────────────────────────
    function clearErrors() {
        ['errFullName', 'errUsername', 'errEmail', 'errPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }
    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
    }

    // ── Open Add ────────────────────────────────────────────────
    function openAdd() {
        editingId = null;
        userModalTitle.textContent = 'Add Admin User';
        userSubmitText.textContent = 'Add User';
        clearErrors();
        uFullName.value = '';
        uUsername.value = '';
        uEmail.value    = '';
        uPassword.value = '';
        uPassword.type  = 'password';
        if (pwReq)  pwReq.style.display  = '';
        if (pwHint) pwHint.style.display = 'none';
        userModal.classList.add('active');
        uFullName.focus();
    }

    // ── Open Edit ───────────────────────────────────────────────
    function openEdit(id) {
        const u = allUsers.find(u => parseInt(u.user_id) === id);
        if (!u) return;
        editingId = id;
        userModalTitle.textContent = 'Edit User';
        userSubmitText.textContent = 'Save Changes';
        clearErrors();
        uFullName.value = u.full_name || '';
        uUsername.value = u.username;
        uEmail.value    = u.email || '';
        uPassword.value = '';
        uPassword.type  = 'password';
        if (pwReq)  pwReq.style.display  = 'none';
        if (pwHint) pwHint.style.display = '';
        userModal.classList.add('active');
        uFullName.focus();
    }

    function closeUserModal() { userModal.classList.remove('active'); }

    addUserBtn?.addEventListener('click', openAdd);
    userModalClose?.addEventListener('click', closeUserModal);
    userModalCancel?.addEventListener('click', closeUserModal);
    userModal?.addEventListener('click', e => { if (e.target === userModal) closeUserModal(); });

    // ── Submit ──────────────────────────────────────────────────
    userSubmitBtn?.addEventListener('click', async () => {
        clearErrors();
        let valid = true;

        if (!uFullName.value.trim()) { showError('errFullName', 'Full name is required.'); valid = false; }
        if (!uUsername.value.trim()) { showError('errUsername', 'Username is required.'); valid = false; }
        if (!uEmail.value.trim())    { showError('errEmail',    'Email is required.'); valid = false; }
        if (!editingId && !uPassword.value) { showError('errPassword', 'Password is required.'); valid = false; }
        if (uPassword.value && uPassword.value.length < 6) {
            showError('errPassword', 'Password must be at least 6 characters.'); valid = false;
        }
        if (!valid) return;

        const payload = {
            full_name: uFullName.value.trim(),
            username:  uUsername.value.trim(),
            email:     uEmail.value.trim(),
            role:      'admin',
        };
        if (uPassword.value) payload.password = uPassword.value;

        userSubmitBtn.disabled = true;
        userSubmitBtn.innerHTML = '<i data-lucide="loader"></i> Saving…';
        lucide.createIcons();

        try {
            const url    = editingId ? `../api/users.php?id=${editingId}` : '../api/users.php';
            const method = editingId ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!data.success) {
                const msg = data.message || 'Failed to save.';
                if (msg.toLowerCase().includes('email'))    showError('errEmail',    msg);
                else if (msg.toLowerCase().includes('user')) showError('errUsername', msg);
                else showToast(msg, 'danger');
                return;
            }

            closeUserModal();
            showToast(editingId ? 'User updated.' : 'User created.', 'success');
            await loadUsers();

        } catch (e) {
            showToast('Network error. Please try again.', 'danger');
            console.error(e);
        } finally {
            userSubmitBtn.disabled = false;
            userSubmitBtn.innerHTML = `<i data-lucide="save"></i> <span id="userSubmitText">${editingId ? 'Save Changes' : 'Add User'}</span>`;
            lucide.createIcons();
        }
    });

    // ── Delete ──────────────────────────────────────────────────
    function openDelete(id) {
        const u = allUsers.find(u => parseInt(u.user_id) === id);
        if (!u) return;
        deletingId = id;
        deleteUserName.textContent = u.full_name || u.username;
        deleteModal.classList.add('active');
    }

    function closeDeleteModal() { deleteModal.classList.remove('active'); deletingId = null; }

    deleteModalClose?.addEventListener('click', closeDeleteModal);
    deleteCancelBtn?.addEventListener('click', closeDeleteModal);
    deleteModal?.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

    deleteConfirmBtn?.addEventListener('click', async () => {
        if (!deletingId) return;
        deleteConfirmBtn.disabled = true;
        try {
            const res  = await fetch(`../api/users.php?id=${deletingId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) { showToast(data.message || 'Failed to delete.', 'danger'); return; }
            closeDeleteModal();
            showToast('User deleted.', 'success');
            await loadUsers();
        } catch (e) {
            showToast('Network error.', 'danger');
        } finally {
            deleteConfirmBtn.disabled = false;
        }
    });

    // ── Escape ──────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeUserModal(); closeDeleteModal(); }
    });

    // ── Boot ────────────────────────────────────────────────────
    loadUsers();

});