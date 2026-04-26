<?php
declare(strict_types=1);

const TAMANO_MAXIMO_BODY = 16384;
const COOKIE_SESION = 'sopadeletras_sid';

function responderJson(array $datos, int $codigo = 200): void {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}
function responderOk(array $datos = []): void { responderJson(['ok' => true, 'datos' => $datos]); }
function responderErro(int $codigo, string $clave, string $mensaxe): void {
    responderJson(['ok' => false, 'erro' => $mensaxe, 'codigo' => $clave], $codigo);
}

function configurarCors(array $config): void {
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    $permitidas = [$config['origen_permitido']];
    if (($config['env'] ?? 'production') === 'development') {
        $permitidas[] = 'http://localhost:8000';
        $permitidas[] = 'http://127.0.0.1:8000';
    }
    if ($origen && in_array($origen, $permitidas, true)) {
        header('Access-Control-Allow-Origin: ' . $origen);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Credentials: true');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function obterOuCrearSesion(array $config): string {
    $sid = $_COOKIE[COOKIE_SESION] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $sid)) {
        $sid = bin2hex(random_bytes(32));
        $secure = (($config['env'] ?? 'production') !== 'development');
        setcookie(COOKIE_SESION, $sid, [
            'expires' => 0, 'path' => '/', 'secure' => $secure,
            'httponly' => true, 'samesite' => 'Strict',
        ]);
        $_COOKIE[COOKIE_SESION] = $sid;
    }
    return $sid;
}

function xerarCsrfToken(string $sesion, array $config): string {
    return hash_hmac('sha256', $sesion, $config['csrf_salt']);
}

function validarCsrf(array $config): void {
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sesion   = $_COOKIE[COOKIE_SESION] ?? '';
    if ($sesion === '' || !preg_match('/^[a-f0-9]{64}$/', $sesion)) {
        responderErro(403, 'CSRF_NO_SESION', 'Falta sesión. Pide /api/token primeiro.');
    }
    if ($recibido === '' || strlen($recibido) !== 64) {
        responderErro(403, 'CSRF_MISSING', 'Falta token de seguridade.');
    }
    $esperado = xerarCsrfToken($sesion, $config);
    if (!hash_equals($esperado, $recibido)) {
        responderErro(403, 'CSRF_INVALID', 'Token inválido.');
    }
}

function lerBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false) responderErro(400, 'BODY_ERR', 'Non se puido ler o corpo.');
    if (strlen($raw) > TAMANO_MAXIMO_BODY) responderErro(413, 'BODY_TOO_LARGE', 'Petición demasiado grande.');
    if ($raw === '') responderErro(400, 'BODY_VACIO', 'Corpo baleiro.');
    $datos = json_decode($raw, true);
    if (!is_array($datos)) responderErro(400, 'BODY_JSON', 'JSON inválido.');
    return $datos;
}

function validarNomeXogador(string $nome): string {
    $nome = trim($nome);
    if (mb_strlen($nome) < 1 || mb_strlen($nome) > 60) {
        throw new InvalidArgumentException('Nome: lonxitude inválida.');
    }
    if (!preg_match('/^[\p{L}\p{N} \-\'·]+$/u', $nome)) {
        throw new InvalidArgumentException('Nome: caracteres non permitidos.');
    }
    return $nome;
}

function validarRangoInt($valor, int $min, int $max, string $campo): int {
    if (!is_int($valor) && !(is_string($valor) && ctype_digit($valor))) {
        throw new InvalidArgumentException("$campo: ten que ser un enteiro.");
    }
    $n = (int) $valor;
    if ($n < $min || $n > $max) {
        throw new InvalidArgumentException("$campo: fóra de rango ($min..$max).");
    }
    return $n;
}

function validarUuid(string $uuid): string {
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $uuid)) {
        throw new InvalidArgumentException('Identificador de partida inválido.');
    }
    return strtolower($uuid);
}

function obterFingerprint(array $config): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    return hash_hmac('sha256', $ip . '|' . $ua, $config['fingerprint_salt']);
}

function verificarLimite(PDO $pdo, string $endpoint, int $maxPorMinuto): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (obterDriver() === 'sqlite') {
        $sqlBorrar = "DELETE FROM rate_limit WHERE creado_en < datetime('now', '-1 minute')";
    } else {
        $sqlBorrar = "DELETE FROM rate_limit WHERE creado_en < (NOW() - INTERVAL 1 MINUTE)";
    }
    try { $pdo->exec($sqlBorrar); } catch (Throwable $_) {}
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM rate_limit WHERE ip = ? AND endpoint = ?');
    $stmt->execute([$ip, $endpoint]);
    if ((int) $stmt->fetchColumn() >= $maxPorMinuto) {
        responderErro(429, 'RATE_LIMIT', 'Demasiadas peticións. Agarda un momento.');
    }
    $pdo->prepare('INSERT INTO rate_limit (ip, endpoint) VALUES (?, ?)')->execute([$ip, $endpoint]);
}

function msIso8601(int $ms): string {
    $dt = (new DateTimeImmutable('@' . intdiv($ms, 1000)))->setTimezone(new DateTimeZone('UTC'));
    return $dt->format('Y-m-d H:i:s');
}

function rexistrarErro(Throwable $e, array $config): void {
    $linha = '[' . date('c') . '] ' . $e->getMessage()
           . ' @ ' . $e->getFile() . ':' . $e->getLine() . "\n";
    @error_log($linha, 3, $config['log_path']);
}
