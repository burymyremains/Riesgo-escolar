export const LEVELS = ['Sin riesgo', 'Bajo', 'Medio', 'Alto'];

// Motor de IA simulado: puntaje ponderado + reglas de negocio RN-01.
export function evaluate(r) {
  const notas = [r.p1, r.p2].filter((n) => n !== '' && n != null).map(Number);
  const prom = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const faltas = Number(r.faltas || 0);
  const total = Number(r.asistencias || 0) + faltas;
  const pf = total ? (faltas / total) * 100 : 0;
  const trend = notas.length === 2 ? notas[1] - notas[0] : 0;
  const score = (prom == null ? 0 : (10 - prom) * 7) + pf * 1.6 + (trend < 0 ? -trend * 4 : 0);
  const motivos = [];
  if (prom != null && prom < 6) motivos.push(`Promedio ${prom.toFixed(1)} menor a 6.0`);
  if (pf > 20) motivos.push(`Faltas ${pf.toFixed(0)}% (más del 20%)`);
  const rn01 = motivos.length > 0;
  if (trend <= -1.5) motivos.push('Tendencia a la baja entre parciales');
  let i = score >= 60 ? 3 : score >= 40 ? 2 : score >= 22 ? 1 : 0;
  if (rn01) i = 3;
  return { prom, pf, trend, score: Math.round(score), rn01, nivel: LEVELS[i], motivos };
}

export function recomendaciones(ev) {
  const out = [];
  if (ev.prom != null && ev.prom < 6) out.push('Ofrecer asesoría académica y un plan de regularización.');
  if (ev.pf > 20) out.push('Contactar al alumno para conocer las causas de sus inasistencias.');
  if (ev.trend <= -1.5) out.push('Revisar qué cambió entre parciales y reforzar los temas recientes.');
  if (!out.length && ev.nivel !== 'Sin riesgo') out.push('Programar una tutoría preventiva y dar seguimiento en el siguiente parcial.');
  return out;
}

// Evaluación general del alumno a partir de todas sus materias: el nivel es el de la materia más crítica,
// de modo que un riesgo localizado en una asignatura no queda diluido por el resto.
// items: [{ c: calificación, grupoId, nombre }]
export function evaluateAll(items) {
  if (!items.length) return null;
  const materias = items.map(({ c, grupoId, nombre }) => {
    const ev = evaluate(c);
    return { grupoId, nombre, ...ev, recomendaciones: recomendaciones(ev) };
  });
  const multi = materias.length > 1;
  const tag = (m, t) => (multi ? `${m.nombre}: ${t}` : t);
  const proms = materias.map((m) => m.prom).filter((x) => x != null);
  const faltas = items.reduce((s, { c }) => s + Number(c.faltas || 0), 0);
  const total = items.reduce((s, { c }) => s + Number(c.asistencias || 0) + Number(c.faltas || 0), 0);
  const peor = materias.reduce((a, b) => (LEVELS.indexOf(b.nivel) > LEVELS.indexOf(a.nivel) ? b : a));
  return {
    prom: proms.length ? proms.reduce((a, b) => a + b, 0) / proms.length : null,
    pf: total ? (faltas / total) * 100 : 0,
    trend: Math.min(...materias.map((m) => m.trend)),
    score: Math.max(...materias.map((m) => m.score)),
    rn01: materias.some((m) => m.rn01),
    nivel: peor.nivel,
    motivos: materias.flatMap((m) => m.motivos.map((t) => tag(m, t))),
    recomendaciones: [...new Set(materias.flatMap((m) => m.recomendaciones.map((t) => tag(m, t))))],
    materias,
  };
}
