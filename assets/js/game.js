// game.js — lóxica pura da sopa de letras: selección, xeración, puntuación.

const ABECEDARIO_RELLENO = 'ABCDEFGHILMNÑOPQRSTUVXZ';
const DIRECCIÓNS = [[0,1],[0,-1],[1,0],[-1,0]];
const MAX_INTENTOS = 100;

// Normaliza unha palabra: maiúsculas, sen tildes (excepto Ñ).
export function normalizar(palabra) {
  if (!palabra) return '';
  return palabra
    .toUpperCase()
    .split('')
    .map((c) => (c === 'Ñ' ? c : c.normalize('NFD').replace(/[̀-ͯ]/g, '')))
    .join('');
}

// Filtra a lista de palabras válidas (lonxitude entre 3 e tamano).
export function palabrasValidas(palabrasJson, tamano) {
  return palabrasJson
    .map((p) => normalizar((p?.palabra ?? '').trim()))
    .filter((p) => p.length >= 3 && p.length <= tamano);
}

// Selecciona n palabras evitando repeticións recentes; se non quedan, reseta usadas.
export function elixirPalabras(todas, n, usadas) {
  let dispoñibles = todas.filter((p) => !usadas.has(p));
  if (dispoñibles.length < n) {
    usadas.clear();
    dispoñibles = todas.slice();
  }
  mesturar(dispoñibles);
  const escollidas = dispoñibles.slice(0, n);
  escollidas.forEach((p) => usadas.add(p));
  return escollidas;
}

// Xera unha sopa de tamano×tamano cunha lista de palabras. Devolve {grade, colocadas}.
export function xerarSopa(palabras, tamano) {
  // Ordena por lonxitude descendente para mellor empacado.
  const orde = palabras.slice().sort((a, b) => b.length - a.length);

  let grade = matrizBaleira(tamano);
  const colocadas = [];

  for (const palabra of orde) {
    if (palabra.length > tamano) continue;
    if (colocarPalabra(grade, palabra, tamano)) colocadas.push(palabra);
  }

  // Recheo con letras aleatorias.
  for (let r = 0; r < tamano; r++) {
    for (let c = 0; c < tamano; c++) {
      if (grade[r][c] === '') {
        grade[r][c] = letraAleatoria();
      }
    }
  }

  return { grade, colocadas };
}

function colocarPalabra(grade, palabra, tamano) {
  let intentos = MAX_INTENTOS;
  while (intentos-- > 0) {
    const dir = DIRECCIÓNS[Math.floor(Math.random() * DIRECCIÓNS.length)];
    const r = Math.floor(Math.random() * tamano);
    const c = Math.floor(Math.random() * tamano);
    if (caben(grade, palabra, r, c, dir, tamano)) {
      for (let i = 0; i < palabra.length; i++) {
        grade[r + dir[0] * i][c + dir[1] * i] = palabra[i];
      }
      return true;
    }
  }
  return false;
}

function caben(grade, palabra, r, c, dir, tamano) {
  for (let i = 0; i < palabra.length; i++) {
    const nr = r + dir[0] * i;
    const nc = c + dir[1] * i;
    if (nr < 0 || nr >= tamano || nc < 0 || nc >= tamano) return false;
    const actual = grade[nr][nc];
    if (actual !== '' && actual !== palabra[i]) return false;
  }
  return true;
}

function matrizBaleira(tamano) {
  return Array.from({ length: tamano }, () => Array(tamano).fill(''));
}

function letraAleatoria() {
  return ABECEDARIO_RELLENO[Math.floor(Math.random() * ABECEDARIO_RELLENO.length)];
}

function mesturar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Validación de selección ----------

// Devolve true se a serie de celdas é unha liña recta horizontal ou vertical
// e todas son contiguas paso a paso.
export function éLiñaRecta(celdas) {
  if (celdas.length < 2) return celdas.length === 1;
  const r0 = celdas[0].r;
  const c0 = celdas[0].c;
  const horizontal = celdas.every((celda) => celda.r === r0);
  const vertical = celdas.every((celda) => celda.c === c0);
  if (!horizontal && !vertical) return false;
  // Verificar contigüidade: as celdas teñen que diferir en 1 posición consecutiva.
  for (let i = 1; i < celdas.length; i++) {
    const dr = Math.abs(celdas[i].r - celdas[i - 1].r);
    const dc = Math.abs(celdas[i].c - celdas[i - 1].c);
    if (dr + dc !== 1) return false;
  }
  return true;
}

// Forma a palabra concatenando o contido das celdas seleccionadas.
export function palabraDe(celdas, grade) {
  return celdas.map(({ r, c }) => grade[r][c]).join('');
}

// Comproba se a palabra (ou o seu reverso) está na lista pendente de atopar.
export function comprobarPalabra(palabra, palabrasPendentes) {
  const norm = palabra.toUpperCase();
  const reverso = norm.split('').reverse().join('');
  if (palabrasPendentes.includes(norm)) return norm;
  if (palabrasPendentes.includes(reverso)) return reverso;
  return null;
}

// ---------- Puntuación ----------

export function puntosPorPalabra(palabra, racha, config) {
  const base = palabra.length * config.puntosPorLetra;
  return Math.floor(base * Math.pow(config.multiplicadorRacha, racha));
}

export function puntosPorSopaCompleta(palabrasTotal, palabrasAtopadas, segundosNaSopa, config, racha) {
  const base = config.bonusSopaCompleta;
  const perfecta = palabrasTotal === palabrasAtopadas ? config.bonusSopaPerfecta : 0;
  const tempoBonus = Math.max(0, Math.floor((60 - segundosNaSopa) * config.bonusSegundoRestante));
  return Math.floor((base + perfecta + tempoBonus) * Math.pow(config.multiplicadorRacha, racha));
}
