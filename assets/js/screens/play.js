// play.js — render da grade e xestión da selección con Pointer Events.

import { éLiñaRecta, palabraDe, comprobarPalabra } from '../game.js';

let estadoSeleccion = {
  activa: false,
  celdas: [],
};

let onPalabraAtopada = null;
let estadoSopa = null;

export function configurarPlay(estado, callback) {
  estadoSopa = estado;
  onPalabraAtopada = callback;
}

export function renderSopa(estado, raiz) {
  estadoSopa = estado;
  const cont = raiz.querySelector('[data-zona="sopa"]');
  if (!cont) return;
  cont.innerHTML = '';
  for (let r = 0; r < estado.grade.length; r++) {
    for (let c = 0; c < estado.grade[r].length; c++) {
      const div = document.createElement('div');
      div.className = 'celda';
      div.dataset.r = String(r);
      div.dataset.c = String(c);
      div.textContent = estado.grade[r][c];
      div.setAttribute('role', 'gridcell');
      div.setAttribute('aria-label', `Letra ${estado.grade[r][c]}`);
      if (estado.celdasAtopadas.has(claveCelda(r, c))) {
        div.classList.add('celda--atopada');
      }
      cont.appendChild(div);
    }
  }
  ligarEventos(cont, estado);
}

function claveCelda(r, c) { return `${r},${c}`; }

function ligarEventos(cont, estado) {
  // Eliminar listeners anteriores clonando o nodo (simple para resetear).
  const novo = cont.cloneNode(true);
  cont.parentNode.replaceChild(novo, cont);
  cont = novo;

  cont.addEventListener('pointerdown', (e) => {
    const celda = e.target.closest('.celda');
    if (!celda) return;
    e.preventDefault();
    cont.setPointerCapture(e.pointerId);
    estadoSeleccion.activa = true;
    estadoSeleccion.celdas = [];
    engadirCelda(celda);
  });

  cont.addEventListener('pointermove', (e) => {
    if (!estadoSeleccion.activa) return;
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    if (!elem) return;
    const celda = elem.closest('.celda');
    if (!celda || !cont.contains(celda)) return;
    engadirCelda(celda);
  });

  const rematar = (e) => {
    if (!estadoSeleccion.activa) return;
    estadoSeleccion.activa = false;
    try { cont.releasePointerCapture(e.pointerId); } catch (_) {}
    procesarSeleccion();
  };
  cont.addEventListener('pointerup', rematar);
  cont.addEventListener('pointercancel', rematar);
}

function engadirCelda(celda) {
  const r = parseInt(celda.dataset.r, 10);
  const c = parseInt(celda.dataset.c, 10);

  // Se xa estaba na selección, se foi a anterior, deshacer último (permite "retroceder").
  const ultima = estadoSeleccion.celdas[estadoSeleccion.celdas.length - 1];
  if (ultima && ultima.r === r && ultima.c === c) return;

  const xaIdx = estadoSeleccion.celdas.findIndex((x) => x.r === r && x.c === c);
  if (xaIdx >= 0) {
    // Retroceso: cortar selección ata esa celda.
    estadoSeleccion.celdas = estadoSeleccion.celdas.slice(0, xaIdx + 1);
    pintarSeleccion();
    return;
  }

  const proba = [...estadoSeleccion.celdas, { r, c }];
  if (!éLiñaRecta(proba)) {
    // Permitir cambiar de dirección só desde a primeira celda.
    if (estadoSeleccion.celdas.length === 1) {
      estadoSeleccion.celdas = [estadoSeleccion.celdas[0], { r, c }];
      pintarSeleccion();
    }
    return;
  }
  estadoSeleccion.celdas = proba;
  pintarSeleccion();
}

function pintarSeleccion() {
  const todas = document.querySelectorAll('.celda');
  todas.forEach((c) => c.classList.remove('celda--seleccionada'));
  estadoSeleccion.celdas.forEach(({ r, c }) => {
    const sel = document.querySelector(`.celda[data-r="${r}"][data-c="${c}"]`);
    if (sel) sel.classList.add('celda--seleccionada');
  });
}

function procesarSeleccion() {
  if (estadoSeleccion.celdas.length < 2) {
    pintarSeleccion();
    estadoSeleccion.celdas = [];
    pintarSeleccion();
    return;
  }
  const palabra = palabraDe(estadoSeleccion.celdas, estadoSopa.grade);
  const pendentes = estadoSopa.palabrasObxectivo.filter(
    (p) => !estadoSopa.palabrasAtopadas.includes(p)
  );
  const atopada = comprobarPalabra(palabra, pendentes);
  if (atopada) {
    estadoSeleccion.celdas.forEach(({ r, c }) => {
      estadoSopa.celdasAtopadas.add(claveCelda(r, c));
    });
    estadoSopa.palabrasAtopadas.push(atopada);
    pintarTodasComoAtopadas();
    onPalabraAtopada && onPalabraAtopada(atopada);
  } else {
    // Animar erro nas celdas seleccionadas.
    estadoSeleccion.celdas.forEach(({ r, c }) => {
      const sel = document.querySelector(`.celda[data-r="${r}"][data-c="${c}"]`);
      if (!sel) return;
      sel.classList.remove('celda--seleccionada');
      sel.classList.add('celda--erro');
      setTimeout(() => sel.classList.remove('celda--erro'), 350);
    });
  }
  estadoSeleccion.celdas = [];
  pintarSeleccion();
}

function pintarTodasComoAtopadas() {
  estadoSopa.celdasAtopadas.forEach((clave) => {
    const [r, c] = clave.split(',');
    const sel = document.querySelector(`.celda[data-r="${r}"][data-c="${c}"]`);
    if (sel) {
      sel.classList.remove('celda--seleccionada');
      sel.classList.add('celda--atopada');
    }
  });
}

// ---------- Cabeceira ----------

export function actualizarCabeceira(estado, raiz) {
  raiz.querySelector('[data-zona="sopa-num"]').textContent = String(estado.sopaIndex);
  raiz.querySelector('[data-zona="puntos"]').textContent = String(estado.puntos);
}

export function actualizarTempo(segundosRestantes, totalSegundos, raiz) {
  const min = Math.floor(segundosRestantes / 60);
  const seg = segundosRestantes % 60;
  raiz.querySelector('[data-zona="tempo"]').textContent =
    `${min}:${String(seg).padStart(2, '0')}`;
  const pc = Math.max(0, (segundosRestantes / totalSegundos) * 100);
  raiz.querySelector('[data-zona="barra-tempo"]').style.width = pc + '%';

  raiz.classList.remove('modo-aviso', 'modo-critico');
  if (segundosRestantes <= 30) raiz.classList.add('modo-critico');
  else if (segundosRestantes <= 60) raiz.classList.add('modo-aviso');
}

// ---------- Lista de palabras a buscar ----------

export function renderListaPalabras(estado, raiz) {
  const cont = raiz.querySelector('[data-zona="palabras-lista"]');
  if (!cont) return;
  cont.innerHTML = '';
  estado.palabrasObxectivo.forEach((p) => {
    const span = document.createElement('span');
    span.className = 'palabras-buscar__palabra';
    if (estado.palabrasAtopadas.includes(p)) {
      span.classList.add('palabras-buscar__palabra--atopada');
    }
    span.textContent = p;
    cont.appendChild(span);
  });
  raiz.querySelector('[data-zona="progreso"]').textContent =
    `${estado.palabrasAtopadas.length} de ${estado.palabrasObxectivo.length} atopadas`;
}
