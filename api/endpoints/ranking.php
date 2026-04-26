<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    responderErro(405, 'METODO', 'Método non permitido.');
}

$pdo = obterConexion();
verificarLimite($pdo, 'ranking', $config['rate_limit']['max_por_minuto'] * 3);

$periodo = $_GET['periodo'] ?? 'todo';
if (!in_array($periodo, ['semana', 'mes', 'todo'], true)) $periodo = 'todo';

$top = (int) ($_GET['top'] ?? 20);
if ($top < 1) $top = 1;
if ($top > 50) $top = 50;

$driverEsSqlite = obterDriver() === 'sqlite';

$where = '';
if ($periodo === 'semana') {
    $where = $driverEsSqlite
        ? "WHERE inicio >= datetime('now', '-7 days')"
        : "WHERE inicio >= (NOW() - INTERVAL 7 DAY)";
} elseif ($periodo === 'mes') {
    $where = $driverEsSqlite
        ? "WHERE inicio >= datetime('now', '-30 days')"
        : "WHERE inicio >= (NOW() - INTERVAL 30 DAY)";
}

$sql =
    "SELECT nome, puntos, sopas_completadas, palabras_atopadas, racha_max, inicio
     FROM partidas
     $where
     ORDER BY puntos DESC, sopas_completadas DESC, palabras_atopadas DESC, inicio DESC
     LIMIT $top";

$stmt = $pdo->query($sql);
$filas = $stmt->fetchAll();

$resultado = array_map(function ($f) {
    return [
        'nome'      => $f['nome'],
        'puntos'    => (int) $f['puntos'],
        'sopas'     => (int) $f['sopas_completadas'],
        'palabras'  => (int) $f['palabras_atopadas'],
        'racha'     => (int) $f['racha_max'],
        'data'      => $f['inicio'],
    ];
}, $filas);

responderOk(['periodo' => $periodo, 'top' => $top, 'ranking' => $resultado]);
