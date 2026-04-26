// results.js — render do resumo do reto.

export function renderResults(reto, raiz) {
  const segundosUsados = Math.max(0, reto.config.tempoTotalSeg - reto.segundosRestantes);
  const min = Math.floor(segundosUsados / 60);
  const seg = segundosUsados % 60;

  raiz.querySelector('[data-zona="results-titulo"]').textContent = 'Reto rematado';
  const subt = reto.rematadoPorTempo
    ? `Acabouse o tempo. Completaches ${reto.sopasCompletadas} ${reto.sopasCompletadas === 1 ? 'sopa' : 'sopas'}.`
    : `Rematáchelo en ${min}:${String(seg).padStart(2, '0')}.`;
  raiz.querySelector('[data-zona="results-subtitulo"]').textContent = subt;

  raiz.querySelector('[data-zona="results-puntos"]').textContent = String(reto.puntos);
  raiz.querySelector('[data-zona="results-sopas"]').textContent = String(reto.sopasCompletadas);
  raiz.querySelector('[data-zona="results-palabras"]').textContent = String(reto.palabrasAtopadasTotal);
  raiz.querySelector('[data-zona="results-racha"]').textContent = String(reto.rachaMax);
  raiz.querySelector('[data-zona="results-tempo"]').textContent =
    `${min}:${String(seg).padStart(2, '0')}`;
}

export function resetEstadoConsentimento(raiz) {
  const estado = raiz.querySelector('[data-zona="ranking-estado"]');
  if (estado) {
    estado.textContent = '';
    estado.removeAttribute('data-tipo');
  }
  const cons = raiz.querySelector('[data-zona="consentimento"]');
  if (cons) cons.hidden = false;
}
