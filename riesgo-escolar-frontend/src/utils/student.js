import { evaluate, evaluateAll } from './risk';

// Materias que cursa un alumno en un periodo, con su calificación, asistencia y riesgo propios.
export function materiasDe(db, alumnoId, periodo) {
  return db.inscripciones
    .filter((i) => i.alumnoId === alumnoId && i.periodo === periodo)
    .map((i) => {
      const grupo = db.grupos.find((g) => g.id === i.grupoId);
      const asig = db.asignaturas.find((a) => a.id === grupo?.asignaturaId);
      const c = db.calificaciones.find((x) => x.alumnoId === alumnoId && x.grupoId === i.grupoId && x.periodo === periodo);
      const ev = c ? evaluate(c) : null;
      const total = c ? Number(c.asistencias) + Number(c.faltas) : 0;
      return {
        grupo, asig, c, ev,
        nombre: asig?.nombre ?? i.grupoId,
        docente: db.docentes.find((d) => d.id === grupo?.docenteId)?.nombre ?? '—',
        faltas: c ? Number(c.faltas) : null,
        asistencia: total ? Math.round((Number(c.asistencias) / total) * 1000) / 10 : null,
        nivel: ev?.nivel ?? null,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ¿El riesgo es general o está en una asignatura específica?
// Se consideran "en riesgo" las materias con nivel Medio o Alto; es general cuando afecta al menos a 2 materias y a la mitad o más.
export function situacion(mats) {
  const con = mats.filter((m) => m.ev);
  if (!mats.length) return { alcance: 'vacio', nivel: 'Sin riesgo', titulo: 'Sin materias inscritas', detalle: 'No tienes materias inscritas en este periodo.', riesgo: [], observacion: [] };
  if (!con.length) return { alcance: 'vacio', nivel: 'Sin riesgo', titulo: 'Aún sin calificaciones registradas', detalle: 'Tus docentes todavía no capturan calificaciones ni asistencias de este periodo.', riesgo: [], observacion: [] };
  const general = evaluateAll(con.map((m) => ({ c: m.c, grupoId: m.grupo.id, nombre: m.nombre })));
  const riesgo = con.filter((m) => ['Medio', 'Alto'].includes(m.ev.nivel));
  const observacion = con.filter((m) => m.ev.nivel === 'Bajo');
  const lista = (l) => l.map((m) => m.nombre).join(', ');
  let alcance = 'ninguno', titulo = 'Sin riesgo académico', detalle = 'Vas bien en todas tus materias. Sigue así.';
  if (riesgo.length) {
    alcance = riesgo.length >= 2 && riesgo.length / con.length >= 0.5 ? 'general' : 'especifico';
    if (alcance === 'general') {
      titulo = 'Riesgo académico general';
      detalle = `${riesgo.length} de ${con.length} materias presentan riesgo medio o alto: ${lista(riesgo)}.`;
    } else {
      titulo = riesgo.length === 1 ? 'Riesgo en una asignatura específica' : 'Riesgo en asignaturas específicas';
      detalle = `Requiere atención: ${lista(riesgo)}.${con.length > riesgo.length ? ' El resto de tus materias va bien.' : ''}`;
    }
  } else if (observacion.length) {
    titulo = 'Seguimiento preventivo';
    detalle = `Riesgo bajo en ${lista(observacion)}. Conviene darle seguimiento antes del siguiente parcial.`;
  }
  return { alcance, nivel: general.nivel, general, riesgo, observacion, titulo, detalle };
}
