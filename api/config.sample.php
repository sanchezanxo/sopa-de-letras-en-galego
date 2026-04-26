<?php
return [
    'env' => 'development',

    'db' => [
        'driver'      => 'sqlite',
        'sqlite_path' => __DIR__ . '/../db/sopa.sqlite',
        'host'     => 'localhost',
        'port'     => 3306,
        'database' => 'sopa_chaves',
        'user'     => 'usuario',
        'password' => '__CAMBIAR__',
    ],

    'csrf_salt'        => '__XERAR_32_BYTES_ALEATORIOS__',
    'fingerprint_salt' => '__XERAR_OUTROS_32_BYTES__',

    'origen_permitido' => 'https://sopadeletras.aschavesdalingua.gal',
    'log_path' => __DIR__ . '/../sopa-erros.log',

    'rate_limit' => [
        'max_por_minuto' => 10,
    ],
];
