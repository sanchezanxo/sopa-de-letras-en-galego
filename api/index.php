<?php
// Router simple da API.

declare(strict_types=1);

if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'erro' => 'Configuración non instalada.']);
    exit;
}

require __DIR__ . '/db.php';
require __DIR__ . '/lib/utils.php';

$config = obterConfig();

if (($config['env'] ?? 'production') === 'production') {
    ini_set('display_errors', '0');
    error_reporting(0);
} else {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

configurarCors($config);

header('Content-Type: application/json; charset=utf-8');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '';
$path = trim($path, '/');
$segments = explode('/', $path);
$endpoint = $segments[1] ?? '';

$rutas = [
    'token'    => 'endpoints/token.php',
    'game-end' => 'endpoints/game-end.php',
    'ranking'  => 'endpoints/ranking.php',
];

if (!isset($rutas[$endpoint])) {
    responderErro(404, 'NOT_FOUND', 'Endpoint non atopado.');
}

try {
    require __DIR__ . '/' . $rutas[$endpoint];
} catch (InvalidArgumentException $e) {
    responderErro(400, 'VALIDACION', $e->getMessage());
} catch (Throwable $e) {
    rexistrarErro($e, $config);
    responderErro(500, 'INTERNO', 'Erro interno. Téntao de novo.');
}
