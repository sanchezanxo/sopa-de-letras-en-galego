CREATE TABLE IF NOT EXISTS partidas (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  fingerprint VARCHAR(64),
  puntos INT NOT NULL,
  sopas_completadas SMALLINT NOT NULL,
  palabras_atopadas INT NOT NULL,
  racha_max SMALLINT NOT NULL,
  rematado_por_tempo TINYINT DEFAULT 0,
  duracion_seg INT,
  inicio DATETIME NOT NULL,
  fin DATETIME,
  INDEX idx_partidas_inicio (inicio),
  INDEX idx_partidas_puntos (puntos),
  INDEX idx_partidas_fingerprint (fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  endpoint VARCHAR(60) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rl_ip_endpoint (ip, endpoint),
  INDEX idx_rl_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
