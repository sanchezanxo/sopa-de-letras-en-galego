// app.js — orquestador. Router, listeners, control do reto.

import {
  palabrasValidas,
  elixirPalabras,
  xerarSopa,
  puntosPorPalabra,
  puntosPorSopaCompleta,
} from './game.js';
import * as Storage from './storage.js';
import * as Api from './api.js';
import {
  configurarPlay,
  renderSopa,
  actualizarCabeceira,
  actualizarTempo,
  renderListaPalabras,
} from './screens/play.js';
import { renderResults, resetEstadoConsentimento } from './screens/results.js';
import { montarRanking, cargarRanking } from './screens/ranking.js';

const PANTALLAS = ['home', 'play', 'results', 'ranking', 'como-se-xoga', 'legal'];
const PANTALLA_DEFECTO = 'home';

let configXogo = {
  tempoTotalSeg: 300,
  tamanoGrade: 10,
  palabrasPorSopa: [5, 6, 7, 8],
  puntosPorLetra: 10,
  bonusSopaCompleta: 100,
  bonusSopaPerfecta: 50,
  bonusSegundoRestante: 2,
  multiplicadorRacha: 1.1,
};

let todasAsPalabras = [];
const usadas = new Set();

let reto = null;     // estado global do reto (todas as sopas)
let sopa = null;     // estado da sopa actual
let timerId = null;
let partidaId = null;
let rankingMontado = false;

const root = document;

document.addEventListener('DOMContentLoaded', async () => {
  await cargarConfig();
  await cargarPalabras();
  configurarListeners();
  irPantalla(rutaActualOuDefecto());
  window.addEventListener('hashchange', () => irPantalla(rutaActualOuDefecto()));
});

async function cargarConfig() {
  try {
    const r = await fetch('/data/config.json');
    if (!r.ok) return;
    const c = await r.json();
    configXogo = {
      tempoTotalSeg: c.tempo_total_seg ?? configXogo.tempoTotalSeg,
      tamanoGrade: c.tamano_grade ?? configXogo.tamanoGrade,
      palabrasPorSopa: c.palabras_por_sopa ?? configXogo.palabrasPorSopa,
      puntosPorLetra: c.puntos_por_letra ?? configXogo.puntosPorLetra,
      bonusSopaCompleta: c.bonus_sopa_completa ?? configXogo.bonusSopaCompleta,
      bonusSopaPerfecta: c.bonus_sopa_perfecta ?? configXogo.bonusSopaPerfecta,
      bonusSegundoRestante: c.bonus_segundo_restante ?? configXogo.bonusSegundoRestante,
      multiplicadorRacha: c.multiplicador_racha ?? configXogo.multiplicadorRacha,
    };
  } catch (_) {}
}

async function cargarPalabras() {
  try {
    const r = await fetch('/data/palabras.json');
    if (!r.ok) throw new Error('palabras.json non dispoñible');
    const j = await r.json();
    todasAsPalabras = palabrasValidas(j.palabras || [], configXogo.tamanoGrade);
  } catch (e) {
    console.error('Erro cargando palabras', e);
    todasAsPalabras = [];
  }
}

// ---------- Router ----------

function rutaActualOuDefecto() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  if (PANTALLAS.includes(hash)) return hash;
  return PANTALLA_DEFECTO;
}

function irPantalla(nome) {
  const nodo = root.querySelector(`[data-pantalla="${nome}"]`);
  if (!nodo) return irPantalla(PANTALLA_DEFECTO);
  root.querySelectorAll('[data-pantalla]').forEach((el) => {
    el.hidden = el.dataset.pantalla !== nome;
  });
  document.body.dataset.pantallaActiva = nome;
  if (window.location.hash !== '#' + nome) {
    history.replaceState(null, '', '#' + nome);
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: '/#' + nome,
      page_title: 'sopa-de-letras · ' + nome,
    });
  }
  if (nome === 'play') {
    if (!reto || reto.estado === 'rematado') comezarReto();
    else renderizarPlay();
  } else if (timerId && nome !== 'play' && reto?.estado === 'xogando') {
    // Pausamos timer ao saír de play (o usuario pode estar mirando ranking, etc).
    pausarTimer();
  }
  if (nome === 'ranking') {
    if (!rankingMontado) {
      montarRanking(root.querySelector('[data-pantalla="ranking"]'));
      rankingMontado = true;
    } else {
      cargarRanking(root.querySelector('[data-pantalla="ranking"]'));
    }
  }
}

// ---------- Listeners ----------

function configurarListeners() {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-accion],[data-ir-a]');
    if (!t) return;
    if (t.dataset.irA) {
      e.preventDefault();
      irPantalla(t.dataset.irA);
      return;
    }
    switch (t.dataset.accion) {
      case 'empezar-reto': comezarReto(); irPantalla('play'); break;
      case 'continuar-reto': irPantalla('play'); break;
      case 'rematar-desde-play': rematarManual(); break;
      case 'volver-home': irPantalla('home'); break;
      case 'enviar-ranking': enviarRanking(); break;
      case 'compartir': compartir(); break;
    }
  });
}

// ---------- Reto ----------

function comezarReto() {
  if (todasAsPalabras.length === 0) return;
  reto = {
    config: configXogo,
    estado: 'xogando',
    puntos: 0,
    sopaIndex: 1,
    sopasCompletadas: 0,
    palabrasAtopadasTotal: 0,
    racha: 0,
    rachaMax: 0,
    segundosRestantes: configXogo.tempoTotalSeg,
    inicio: Date.now(),
    fin: null,
    rematadoPorTempo: false,
  };
  partidaId = Api.uuidV4();
  usadas.clear();
  comezarSopaNova();
  iniciarTimer();
}

function comezarSopaNova() {
  const idxConta = Math.min(reto.sopasCompletadas, configXogo.palabrasPorSopa.length - 1);
  const numPalabras = configXogo.palabrasPorSopa[idxConta];
  const escollidas = elixirPalabras(todasAsPalabras, numPalabras, usadas);
  const { grade, colocadas } = xerarSopa(escollidas, configXogo.tamanoGrade);
  sopa = {
    grade,
    palabrasObxectivo: colocadas, // só as que se puideron colocar
    palabrasAtopadas: [],
    celdasAtopadas: new Set(),
    inicio: Date.now(),
  };
  configurarPlay(sopa, onPalabraAtopada);
  renderizarPlay();
}

function renderizarPlay() {
  const raiz = root.querySelector('[data-pantalla="play"]');
  renderSopa(sopa, raiz);
  actualizarCabeceira(reto, raiz);
  actualizarTempo(reto.segundosRestantes, configXogo.tempoTotalSeg, raiz);
  renderListaPalabras(sopa, raiz);
}

function onPalabraAtopada(palabra) {
  reto.palabrasAtopadasTotal += 1;
  const puntos = puntosPorPalabra(palabra, reto.racha, configXogo);
  reto.puntos += puntos;
  const raiz = root.querySelector('[data-pantalla="play"]');
  actualizarCabeceira(reto, raiz);
  renderListaPalabras(sopa, raiz);

  if (sopa.palabrasAtopadas.length === sopa.palabrasObxectivo.length) {
    completarSopa();
  }
}

function completarSopa() {
  const segundosNaSopa = Math.floor((Date.now() - sopa.inicio) / 1000);
  const bonus = puntosPorSopaCompleta(
    sopa.palabrasObxectivo.length,
    sopa.palabrasAtopadas.length,
    segundosNaSopa,
    configXogo,
    reto.racha,
  );
  reto.puntos += bonus;
  reto.sopasCompletadas += 1;
  reto.racha += 1;
  if (reto.racha > reto.rachaMax) reto.rachaMax = reto.racha;

  // Mostrar diálogo de transición.
  const dlg = root.getElementById('dialogo-transicion');
  dlg.querySelector('[data-zona="trans-titulo"]').textContent = '✓ Sopa completa';
  dlg.querySelector('[data-zona="trans-puntos"]').textContent = `+${bonus}`;
  dlg.querySelector('[data-zona="trans-seguinte"]').textContent =
    `Pasando á sopa ${reto.sopaIndex + 1}…`;
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');

  setTimeout(() => {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');

    if (reto.segundosRestantes <= 0 || reto.estado !== 'xogando') return;
    reto.sopaIndex += 1;
    comezarSopaNova();
  }, 1500);
}

// ---------- Timer ----------

function iniciarTimer() {
  pausarTimer();
  timerId = setInterval(() => {
    if (!reto || reto.estado !== 'xogando') return;
    reto.segundosRestantes -= 1;
    const raiz = root.querySelector('[data-pantalla="play"]');
    actualizarTempo(reto.segundosRestantes, configXogo.tempoTotalSeg, raiz);
    if (reto.segundosRestantes <= 0) {
      reto.rematadoPorTempo = true;
      finalizar();
    }
  }, 1000);
}

function pausarTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function rematarManual() {
  if (!reto || reto.estado === 'rematado') return;
  finalizar();
}

function finalizar() {
  pausarTimer();
  reto.estado = 'rematado';
  reto.fin = Date.now();

  const raiz = root.querySelector('[data-pantalla="results"]');
  resetEstadoConsentimento(raiz);
  const inputNome = raiz.querySelector('[data-zona="nome-input"]');
  if (inputNome) inputNome.value = Storage.lerNome();
  renderResults(reto, raiz);
  irPantalla('results');
}

// ---------- Ranking submit ----------

async function enviarRanking() {
  const raiz = root.querySelector('[data-pantalla="results"]');
  const input = raiz.querySelector('[data-zona="nome-input"]');
  const estado = raiz.querySelector('[data-zona="ranking-estado"]');
  const btn = raiz.querySelector('[data-accion="enviar-ranking"]');

  const nome = (input.value || '').trim();
  if (!nome) {
    estado.textContent = 'Necesitamos un nome para gardar a puntuación.';
    estado.dataset.tipo = 'erro';
    input.focus();
    return;
  }
  Storage.gardarNome(nome);
  btn.disabled = true;
  estado.textContent = 'Enviando…';
  estado.removeAttribute('data-tipo');

  try {
    await Api.gardarPartida({
      id: partidaId,
      nome,
      puntos: reto.puntos,
      sopas_completadas: reto.sopasCompletadas,
      palabras_atopadas: reto.palabrasAtopadasTotal,
      racha_max: reto.rachaMax,
      rematado_por_tempo: reto.rematadoPorTempo ? 1 : 0,
      inicio: reto.inicio,
      fin: reto.fin || Date.now(),
    });
    estado.textContent = 'Puntuación gardada no ranking público.';
    estado.dataset.tipo = 'ok';
    raiz.querySelector('[data-zona="consentimento"]').hidden = true;
  } catch (e) {
    estado.textContent = e.message || 'Erro gardando.';
    estado.dataset.tipo = 'erro';
    btn.disabled = false;
  }
}

// ---------- Compartir ----------

async function compartir() {
  if (!reto) return;
  const texto = `Reto da sopa de letras en galego: ${reto.puntos} puntos en ${reto.sopasCompletadas} sopas (${reto.palabrasAtopadasTotal} palabras).`;
  const url = window.location.origin;
  if (navigator.share) {
    try { await navigator.share({ title: 'Sopa de letras en galego', text: texto, url }); } catch (_) {}
    return;
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      const raiz = root.querySelector('[data-pantalla="results"]');
      const estado = raiz.querySelector('[data-zona="ranking-estado"]');
      estado.textContent = 'Copiouse a ligazón ao portapapeis.';
      estado.dataset.tipo = 'ok';
    } catch (_) {}
  }
}
