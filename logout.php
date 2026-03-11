<?php
require_once 'classes/Database.php';
require_once 'classes/Auth.php';

$auth = new Auth();
$auth->logout('login.php'); // root level — no ../ needed