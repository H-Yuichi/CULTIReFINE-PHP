<?php
/*require_once 'config.php';
require_once 'LineAuth.php';

$lineAuth = new LineAuth();

// リッチメニューからのアクセスを処理
// state パラメータを生成してセッションに保存
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

// LINE認証URLを生成
$authUrl = $lineAuth->getAuthorizationUrl($state);

// LINE認証ページへリダイレクト
header('Location: ' . $authUrl);
exit;*/
require_once 'config.php';
require_once 'LineAuth.php';

// 既に認証済みかチェック
if (isset($_SESSION['line_user_id']) && isset($_SESSION['user_data'])) {
    // 認証済みの場合は予約画面へリダイレクト
    header('Location: ' . getRedirectUrl('/reserve/'));
    exit;
}

$lineAuth = new LineAuth();

// 未認証の場合のみLINE認証を開始
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

$authUrl = $lineAuth->getAuthorizationUrl($state);
header('Location: ' . $authUrl);
exit;