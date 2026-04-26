<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responderErro(405, 'METODO', 'Método non permitido.');
}

validarCsrf($config);

$pdo = obterConexion();
verificarLimite($pdo, 'game-end', $config['rate_limit']['max_por_minuto']);

$body = lerBody();

$id = validarUuid((string)($body['id'] ?? ''));
$nome = validarNomeXogador((string)($body['nome'] ?? ''));

$puntos              = validarRangoInt($body['puntos']              ?? null, 0, 1_000_000, 'puntos');
$sopasCompletadas    = validarRangoInt($body['sopas_completadas']   ?? null, 0, 1_000,     'sopas_completadas');
$palabrasAtopadas    = validarRangoInt($body['palabras_atopadas']   ?? null, 0, 100_000,   'palabras_atopadas');
$rachaMax            = validarRangoInt($body['racha_max']           ?? null, 0, 1_000,     'racha_max');
$rematadoPorTempo    = validarRangoInt($body['rematado_por_tempo']  ?? null, 0, 1,         'rematado_por_tempo');

$inicio = validarRangoInt($body['inicio'] ?? null, 1_000_000_000_000, 9_999_999_999_999, 'inicio');
$fin    = validarRangoInt($body['fin']    ?? null, 1_000_000_000_000, 9_999_999_999_999, 'fin');
if ($fin < $inicio) {
    throw new InvalidArgumentException('A data de fin é anterior ao inicio.');
}
$duracionSeg = (int) round(($fin - $inicio) / 1000);
if ($duracionSeg > 24 * 3600) {
    throw new InvalidArgumentException('Duración da partida fóra de rango.');
}

$inicioIso = msIso8601($inicio);
$finIso    = msIso8601($fin);
$fingerprint = obterFingerprint($config);

try {
    $stmt = $pdo->prepare(
        'INSERT INTO partidas
         (id, nome, fingerprint, puntos, sopas_completadas, palabras_atopadas,
          racha_max, rematado_por_tempo, duracion_seg, inicio, fin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id, $nome, $fingerprint, $puntos, $sopasCompletadas, $palabrasAtopadas,
        $rachaMax, $rematadoPorTempo, $duracionSeg, $inicioIso, $finIso,
    ]);
} catch (PDOException $e) {
    if (str_contains((string)$e->getMessage(), 'UNIQUE') ||
        str_contains((string)$e->getMessage(), 'Duplicate')) {
        responderErro(409, 'DUPLICADO', 'Esta partida xa estaba gardada.');
    }
    throw $e;
}

responderOk(['id' => $id]);
