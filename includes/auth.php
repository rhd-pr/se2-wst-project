<?php
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/Auth.php';

$auth = new Auth();
$auth->requireAdmin('../login.php');

// Make current user available to every admin page
$current_user = $auth->getUser();