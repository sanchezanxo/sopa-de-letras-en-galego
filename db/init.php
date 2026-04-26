<?php
// Inicializa a BBDD segundo o driver activo.
// Uso: php db/init.php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script só se executa en liña de comandos.\n");
    exit(1);
}

if (!file_exists(__DIR__ . '/../api/config.php')) {
    fwrite(STDERR, "Falta api/config.php. Copia api/config.sample.php a api/config.php e edítao primeiro.\n");
    exit(1);
}

require __DIR__ . '/../api/db.php';

$driver = obterDriver();
$schemaFile = __DIR__ . "/schema.{$driver}.sql";

if (!file_exists($schemaFile)) {
    fwrite(STDERR, "Non atopo {$schemaFile}\n");
    exit(1);
}

try {
    $pdo = obterConexion();
    $sql = file_get_contents($schemaFile);
    $pdo->exec($sql);

    if ($driver === 'sqlite') {
        $config = obterConfig();
        $rutaDb = $config['db']['sqlite_path'];
        if (file_exists($rutaDb)) {
            @chmod($rutaDb, 0640);
        }
    }

    echo "BBDD inicializada con driver: {$driver}\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Erro: {$e->getMessage()}\n");
    exit(1);
}
