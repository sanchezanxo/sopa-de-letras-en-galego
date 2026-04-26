<?php
// Conexión PDO singleton.

declare(strict_types=1);

function obterConfig(): array {
    static $config = null;
    if ($config !== null) return $config;
    $config = require __DIR__ . '/config.php';
    return $config;
}

function obterConexion(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $config = obterConfig();
    $driver = $config['db']['driver'] ?? 'sqlite';

    $opcions = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    if ($driver === 'sqlite') {
        $ruta = $config['db']['sqlite_path'];
        $dir  = dirname($ruta);
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        $pdo = new PDO('sqlite:' . $ruta, null, null, $opcions);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
    } elseif ($driver === 'mysql') {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['db']['host'],
            $config['db']['port'] ?? 3306,
            $config['db']['database']
        );
        $pdo = new PDO(
            $dsn,
            $config['db']['user'],
            $config['db']['password'],
            $opcions
        );
    } else {
        throw new RuntimeException('Driver de BBDD non soportado: ' . $driver);
    }

    return $pdo;
}

function obterDriver(): string {
    $config = obterConfig();
    return $config['db']['driver'] ?? 'sqlite';
}
