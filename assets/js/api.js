// api.js — chamadas ao backend.

let csrfToken = null;

async function obterToken() {
  if (csrfToken) return csrfToken;
  const r = await fetch('/api/token', { credentials: 'include' });
  if (!r.ok) throw new Error('Non se puido obter token de seguridade.');
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'Token rexeitado.');
  csrfToken = j.datos.csrf;
  return csrfToken;
}

export async function gardarPartida(payload) {
  const token = await obterToken();
  const r = await fetch('/api/game-end', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok || !j.ok) {
    if (j.codigo && j.codigo.startsWith('CSRF')) csrfToken = null;
    throw new Error(j.erro || 'Erro gardando a partida.');
  }
  return j.datos;
}

export async function obterRanking(periodo = 'semana', top = 20) {
  const r = await fetch(`/api/ranking?periodo=${encodeURIComponent(periodo)}&top=${top}`);
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j.erro || 'Erro cargando ranking.');
  return j.datos;
}

export function uuidV4() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
