// Nomenclatura oficial de periodos: AAAA + letra.  A = ene–jun · B = ago–dic · I = intersemestral (vacaciones).
const RE = /^(\d{4})([ABI])$/;
const INFO = {
  A: { tipo: 'Ordinario', nombre: 'Semestre A (ene–jun)' },
  B: { tipo: 'Ordinario', nombre: 'Semestre B (ago–dic)' },
  I: { tipo: 'Intersemestral', nombre: 'Intersemestral intensivo' },
};
export const PERIOD_FORMAT_HELP = 'Formato AAAA + A (ene–jun), B (ago–dic) o I (intersemestral). Ej.: 2026A, 2026B, 2026I.';

// Acepta variantes comunes ("2026-b", "2026 B", "2026 intersemestral") y las lleva al formato estándar.
export function normalizePeriod(raw = '') {
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/^(\d{4})(A|B|INT|INTERSEMESTRAL|I)$/);
  return m ? `${m[1]}${m[2][0]}` : String(raw).trim().toUpperCase();
}
export const isValidPeriod = (id) => RE.test(id);
export const periodYear = (id) => (RE.test(id) ? id.slice(0, 4) : '');
export const periodType = (id) => INFO[RE.exec(id)?.[2]]?.tipo ?? 'Desconocido';
export const isIntersemestral = (id) => RE.exec(id)?.[2] === 'I';
export const periodName = (id) => INFO[RE.exec(id)?.[2]]?.nombre ?? id;
export const periodLabel = (id) => `${id} · ${periodType(id)}`;
export const byRecent = (a, b) => (b.inicio ?? '').localeCompare(a.inicio ?? '');

// Devuelve el mensaje de error o null. `others`: el resto de periodos registrados.
export function validatePeriod(p, others = []) {
  if (!RE.test(p.id)) return `Error: Periodo "${p.id}" no válido. ${PERIOD_FORMAT_HELP}`;
  if (!p.inicio || !p.fin || !p.corte) return 'Error: Captura las fechas de inicio, fin y corte';
  if (p.inicio >= p.fin) return 'Error: La fecha de inicio debe ser anterior a la fecha de fin';
  if (p.corte < p.inicio || p.corte > p.fin) return 'Error: La fecha de corte debe estar dentro del periodo';
  if (p.inicio.slice(0, 4) !== p.id.slice(0, 4)) return `Error: El año ${p.id.slice(0, 4)} del periodo no coincide con la fecha de inicio`;
  const clash = others.find((o) => o.id !== p.id && p.inicio <= o.fin && o.inicio <= p.fin);
  return clash ? `Error: Las fechas se traslapan con el periodo ${clash.id}` : null;
}
