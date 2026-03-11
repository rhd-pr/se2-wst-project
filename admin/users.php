<?php
require_once '../includes/auth.php';

$page_title  = 'Users';
$active_page = 'users';
$base_path   = '../';
$breadcrumb  = ['System' => null, 'Users' => null];
$extra_css   = ['admin/users.css'];
$extra_js    = ['admin/users.js'];
$extra_head  = '';
$extra_js_head = '';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div>
        <h1>User Management</h1>
        <p>Manage admin and viewer accounts for the TURS admin panel.</p>
    </div>
    <button class="btn btn-primary" id="addUserBtn">
        <i data-lucide="user-plus"></i>
        Add User
    </button>
</div>

<!-- ── Filter Bar ────────────────────────────────────────────── -->
<div class="card usr-filters-card">
    <div class="usr-filters">

        <div class="usr-filter-search">
            <i data-lucide="search"></i>
            <input type="text" id="searchInput" placeholder="Search by name, username, or email…">
        </div>
    </div>
</div>

<!-- ── Users Table ───────────────────────────────────────────── -->
<div class="card">
    <div class="card-header">
        <h3><i data-lucide="users"></i> All Users</h3>
        <span class="usr-count-badge" id="countBadge">—</span>
    </div>
    <div class="card-body no-pad">
        <div class="table-wrap">
            <table id="usersTable">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th style="width:90px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <tr>
                        <td colspan="6">
                            <div class="usr-loading">
                                <i data-lucide="loader"></i> Loading users…
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ══ ADD / EDIT MODAL ══════════════════════════════════════ -->
<div class="modal-backdrop" id="userModal" role="dialog" aria-modal="true">
    <div class="modal">

        <div class="modal-header">
            <h3>
                <i data-lucide="user"></i>
                <span id="userModalTitle">Add User</span>
            </h3>
            <button class="modal-close" id="userModalClose"><i data-lucide="x"></i></button>
        </div>

        <div class="modal-body">

            <div class="form-row">
                <div class="form-group">
                    <label for="uFullName">Full Name <span class="req">*</span></label>
                    <input type="text" id="uFullName" placeholder="e.g. Juan dela Cruz">
                    <span class="form-error" id="errFullName"></span>
                </div>
                <div class="form-group">
                    <label for="uUsername">Username <span class="req">*</span></label>
                    <input type="text" id="uUsername" placeholder="e.g. jdelacruz" autocomplete="off">
                    <span class="form-error" id="errUsername"></span>
                </div>
            </div>

            <div class="form-group">
                <label for="uEmail">Email <span class="req">*</span></label>
                <input type="text" id="uEmail" placeholder="e.g. juan@lgu.gov.ph" autocomplete="off">
                <span class="form-error" id="errEmail"></span>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="uPassword">
                        Password
                        <span class="req" id="pwReq">*</span>
                        <span class="form-hint" id="pwHint" style="display:none;">(leave blank to keep current)</span>
                    </label>
                    <div class="usr-pw-wrap">
                        <input type="password" id="uPassword" placeholder="Min. 6 characters" autocomplete="new-password">
                        <button type="button" class="usr-pw-toggle" id="pwToggle" tabindex="-1">
                            <i data-lucide="eye"></i>
                        </button>
                    </div>
                    <span class="form-error" id="errPassword"></span>
                </div>
            </div>

        </div>

        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="userModalCancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="userSubmitBtn">
                <i data-lucide="save"></i>
                <span id="userSubmitText">Add User</span>
            </button>
        </div>

    </div>
</div>

<!-- ══ DELETE CONFIRM MODAL ══════════════════════════════════ -->
<div class="modal-backdrop" id="deleteModal" role="dialog" aria-modal="true">
    <div class="modal modal-sm">
        <div class="modal-header">
            <h3><i data-lucide="trash-2"></i> Delete User</h3>
            <button class="modal-close" id="deleteModalClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
            <div class="logout-modal-body">
                <div class="logout-modal-icon">
                    <i data-lucide="user-x"></i>
                </div>
                <p>Delete <strong id="deleteUserName">this user</strong>?</p>
                <span>This cannot be undone. Their audit log entries will remain.</span>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="deleteCancelBtn">Cancel</button>
            <button type="button" class="btn btn-danger-solid" id="deleteConfirmBtn">
                <i data-lucide="trash-2"></i> Delete
            </button>
        </div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>