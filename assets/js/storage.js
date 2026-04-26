// storage.js — wrapper sobre localStorage para o nome do xogador.
// O reto en si non se persiste (sería complexo entre sopas e o tempo). Só o nome.

const CHAVE_NOME = 'sopa:nome';

export function gardarNome(nome) {
  try { localStorage.setItem(CHAVE_NOME, nome); } catch (_) {}
}
export function lerNome() {
  try { return localStorage.getItem(CHAVE_NOME) ?? ''; } catch (_) { return ''; }
}
