// ranking.js — fetch e render do ranking público.

import { obterRanking } from '../api.js';

let periodoActual = 'semana';

export function montarRanking(raiz) {
  const tabs = raiz.querySelectorAll('[data-periodo]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const p = tab.dataset.periodo;
      if (!p || p === periodoActual) return;
      periodoActual = p;
      tabs.forEach((t) => {
        t.classList.toggle('is-activo', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      cargarRanking(raiz);
    });
  });
  cargarRanking(raiz);
}

export async function cargarRanking(raiz) {
  const lista = raiz.querySelector('[data-zona="ranking-lista"]');
  const mensaxe = raiz.querySelector('[data-zona="ranking-mensaxe"]');
  lista.innerHTML = '';
  mensaxe.textContent = 'Cargando…';

  try {
    const datos = await obterRanking(periodoActual, 20);
    const filas = datos.ranking || [];
    if (filas.length === 0) {
      mensaxe.textContent = 'Aínda non hai partidas neste período. Sé o primeiro!';
      return;
    }
    mensaxe.textContent = '';
    filas.forEach((fila, i) => {
      const li = document.createElement('li');
      li.className = 'ranking-fila' + (i < 3 ? ' ranking-fila--top' : '');
      const posto = document.createElement('span');
      posto.className = 'ranking-fila__posto';
      posto.textContent = String(i + 1);
      const info = document.createElement('div');
      const nome = document.createElement('div');
      nome.className = 'ranking-fila__nome';
      nome.textContent = fila.nome || '—';
      const detalle = document.createElement('div');
      detalle.className = 'ranking-fila__detalle';
      detalle.textContent =
        `${fila.sopas} sopas · ${fila.palabras} palabras` +
        (fila.racha ? ` · racha ${fila.racha}` : '');
      info.appendChild(nome);
      info.appendChild(detalle);
      const puntos = document.createElement('span');
      puntos.className = 'ranking-fila__puntos';
      puntos.textContent = String(fila.puntos);
      li.appendChild(posto);
      li.appendChild(info);
      li.appendChild(puntos);
      lista.appendChild(li);
    });
  } catch (e) {
    mensaxe.textContent = 'Erro cargando o ranking. Téntao máis tarde.';
  }
}
