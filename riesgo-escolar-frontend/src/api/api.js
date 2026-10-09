// Backend simulado: base en memoria + latencia. Cada método imita un endpoint REST.
import seed from './db.json';
import { evaluateAll } from '../utils/risk';
import { normalizePeriod, validatePeriod } from '../utils/periods';

let db = structuredClone(seed);
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => { throw new Error(m); };
const today = () => new Date().toISOString().slice(0, 10);
const active = () => db.periodos.find((p) => p.activo);
const snap = () => structuredClone(db);
const materia = (gid) => {
  const g = db.grupos.find((x) => x.id === gid);
  return db.asignaturas.find((a) => a.id === g?.asignaturaId)?.nombre ?? gid;
};

// RN-05: reevaluar riesgo al cambiar datos (una evaluación general por alumno y periodo, a partir de todas sus materias).
// RN-01/RN-06: alerta canalizada al tutor.
function reevaluate(ids) {
  const porAlumno = new Map();
  db.calificaciones.filter((c) => !ids || ids.includes(c.alumnoId)).forEach((c) => {
    const k = `${c.alumnoId}|${c.periodo}`;
    porAlumno.set(k, [...(porAlumno.get(k) ?? []), c]);
  });
  porAlumno.forEach((list) => {
    const { alumnoId, periodo } = list[0];
    const ev = evaluateAll(list.map((c) => ({ c, grupoId: c.grupoId, nombre: materia(c.grupoId) })));
    db.evaluaciones = db.evaluaciones.filter((e) => !(e.alumnoId === alumnoId && e.periodo === periodo));
    db.evaluaciones.push({ alumnoId, periodo, fecha: today(), ...ev });
    const al = db.alumnos.find((a) => a.id === alumnoId);
    const abierta = db.alertas.some((a) => a.alumnoId === alumnoId && a.periodo === periodo && a.estado !== 'Atendida');
    if (al && periodo === active()?.id && (ev.rn01 || ev.nivel === 'Alto') && !abierta) {
      db.alertas.push({
        id: `AL-${alumnoId}-${periodo}`, alumnoId, periodo, fecha: today(),
        motivo: ev.motivos.join('; ') || 'Riesgo alto estimado por el modelo', tutorId: al.tutorId, estado: 'Nueva',
      });
    }
  });
}
reevaluate();

const choque = (tutorId, fecha, hora) => db.citas.some((x) => x.tutorId === tutorId && x.fecha === fecha && x.hora === hora);

export const api = {
  async login({ correo, password, rol }) {
    await wait();
    const mail = correo.trim().toLowerCase();
    if (rol === 'alumno') {
      const a = db.alumnos.find((x) => x.correo?.toLowerCase() === mail && (x.password ?? 'demo123') === password);
      if (!a) fail('Error: Usuario o contraseña incorrectos');
      if (a.activo === false) fail('Cuenta deshabilitada. Contacte al Administrador');
      return { id: a.id, nombre: a.nombre, correo: a.correo, rol: 'alumno', alumnoId: a.id };
    }
    const u = db.usuarios.find((x) => x.correo === mail && x.password === password);
    if (!u) fail('Error: Usuario o contraseña incorrectos');
    if (!u.activo) fail('Cuenta deshabilitada. Contacte al Administrador');
    // Un docente que también es tutor entra únicamente por la pestaña Docente (no tiene perfil de Tutor aparte).
    if (rol === 'tutor' && u.rol === 'docente' && u.tutor) fail('Eres docente y tutor: ingresa con la pestaña Docente');
    if (u.rol !== rol) fail('El usuario no tiene el rol seleccionado');
    const { password: _p, ...session } = u;
    return session;
  },
  async getDb() { await wait(200); return snap(); },

  // RN-02: solo dentro del periodo activo y antes de la fecha de corte. Cada registro es de un alumno en un grupo (materia).
  async saveGrades(rows) {
    await wait();
    const p = active();
    if (!p || today() > p.corte) fail('Periodo de evaluación cerrado. Contacte al Administrador');
    rows.forEach((r) => [r.p1, r.p2].forEach((n) => {
      if (n !== '' && n != null && (isNaN(n) || n < 0 || n > 10)) fail('Error: La calificación debe estar entre 0.0 y 10.0');
    }));
    rows.forEach((r) => {
      if (!db.inscripciones.some((i) => i.alumnoId === r.alumnoId && i.grupoId === r.grupoId && i.periodo === p.id)) fail(`Error: El alumno ${r.alumnoId} no está inscrito en el grupo ${r.grupoId} en ${p.id}`);
    });
    rows.forEach((r) => {
      const v = {
        p1: r.p1 === '' || r.p1 == null ? null : Number(r.p1), p2: r.p2 === '' || r.p2 == null ? null : Number(r.p2),
        asistencias: Number(r.asistencias || 0), faltas: Number(r.faltas || 0), validado: true,
      };
      const c = db.calificaciones.find((x) => x.alumnoId === r.alumnoId && x.grupoId === r.grupoId && x.periodo === p.id);
      if (c) Object.assign(c, v); else db.calificaciones.push({ alumnoId: r.alumnoId, grupoId: r.grupoId, periodo: p.id, ...v });
    });
    reevaluate([...new Set(rows.map((r) => r.alumnoId))]);
    return snap();
  },

  // RN-07: fecha, responsable, estudiante y acuerdos quedan registrados.
  async bookAppointment(c) {
    await wait();
    if (choque(c.tutorId, c.fecha, c.hora)) fail('Error: Ya existe una cita programada en ese horario');
    db.citas.push({ ...c, id: `CT-${Date.now()}`, registrada: today() });
    db.alertas.find((a) => a.id === c.alertaId).estado = 'Cita agendada';
    return snap();
  },
  async closeAlert(id) { await wait(150); db.alertas.find((a) => a.id === id).estado = 'Atendida'; return snap(); },

  // Solicitudes de atención tutorial (las genera el alumno y las gestiona su tutor).
  async createRequest(r) {
    await wait();
    const a = db.alumnos.find((x) => x.id === r.alumnoId);
    if (!a) fail('Error: Alumno no encontrado');
    if (!a.tutorId) fail('Error: No tienes un tutor asignado. Acude a Servicios Escolares');
    if (!r.motivo) fail('Error: Selecciona el motivo de tu solicitud');
    if ((r.detalle || '').trim().length < 10) fail('Error: Describe tu solicitud con al menos 10 caracteres');
    if (r.fechaSugerida && r.fechaSugerida < today()) fail('Error: La fecha sugerida no puede ser anterior a hoy');
    if (db.solicitudes.some((s) => s.alumnoId === a.id && ['Pendiente', 'Cita agendada'].includes(s.estado))) {
      fail('Error: Ya tienes una solicitud en curso. Espera la atención de tu tutor o cancélala');
    }
    db.solicitudes.push({
      id: `SO-${Date.now()}`, alumnoId: a.id, tutorId: a.tutorId, periodo: active()?.id ?? null, creada: today(),
      motivo: r.motivo, grupoId: r.grupoId || null, detalle: r.detalle.trim(), modalidad: r.modalidad || 'Indistinto',
      fechaSugerida: r.fechaSugerida || '', horario: r.horario || 'Indistinto', estado: 'Pendiente', respuesta: '', citaId: null,
    });
    return snap();
  },
  async cancelRequest(id, alumnoId) {
    await wait(150);
    const s = db.solicitudes.find((x) => x.id === id && x.alumnoId === alumnoId);
    if (!s || s.estado !== 'Pendiente') fail('Error: Solo puedes cancelar solicitudes pendientes');
    s.estado = 'Cancelada';
    return snap();
  },
  // accion: 'agendar' (fecha, hora, modalidad, acuerdos) · 'rechazar' (respuesta) · 'atender'
  async resolveRequest(id, tutorId, accion, d = {}) {
    await wait();
    const s = db.solicitudes.find((x) => x.id === id && x.tutorId === tutorId);
    if (!s) fail('Error: Solicitud no encontrada');
    if (accion === 'agendar') {
      if (s.estado !== 'Pendiente') fail('Error: La solicitud ya fue atendida');
      if (!d.fecha || !d.hora) fail('Error: Indica fecha y hora de la cita');
      if (d.fecha < today()) fail('Error: La fecha de la cita no puede ser anterior a hoy');
      if (choque(tutorId, d.fecha, d.hora)) fail('Error: Ya existe una cita programada en ese horario');
      const cita = {
        id: `CT-${Date.now()}`, alertaId: null, solicitudId: s.id, alumnoId: s.alumnoId, tutorId, responsable: d.responsable,
        fecha: d.fecha, hora: d.hora, modalidad: d.modalidad, acuerdos: d.acuerdos || '', registrada: today(),
      };
      db.citas.push(cita);
      Object.assign(s, { estado: 'Cita agendada', citaId: cita.id });
    } else if (accion === 'rechazar') {
      if (s.estado !== 'Pendiente') fail('Error: La solicitud ya fue atendida');
      if (!(d.respuesta || '').trim()) fail('Error: Explica brevemente el motivo al alumno');
      Object.assign(s, { estado: 'Rechazada', respuesta: d.respuesta.trim() });
    } else if (accion === 'atender') {
      if (s.estado !== 'Cita agendada') fail('Error: Primero debe haber una cita agendada');
      Object.assign(s, { estado: 'Atendida', respuesta: (d.respuesta || s.respuesta || '').trim() });
    }
    return snap();
  },

  async upsert(coll, item, isNew) {
    await wait(150);
    const list = db[coll];
    if (coll === 'periodos') {
      // Nomenclatura estándar (2026A / 2026B / 2026I), fechas coherentes y sin traslapes.
      if (isNew) item.id = normalizePeriod(item.id);
      const msg = validatePeriod(isNew ? item : { ...list.find((x) => x.id === item.id), ...item }, list);
      if (msg) fail(msg);
    }
    if (coll === 'usuarios' && !isNew && 'tutor' in item) {
      const u = list.find((x) => x.id === item.id);
      if (u?.rol !== 'docente') fail('Error: Solo un docente puede combinar el rol de tutor');
      if (!item.tutor && db.alumnos.some((a) => a.tutorId === u.id)) fail('Error: Reasigna a sus tutorados antes de quitarle la tutoría');
    }
    if (isNew) {
      if (!item.id) item.id = `${coll[0]}${Date.now()}`;
      if (list.some((x) => x.id === item.id)) fail('Error: La clave o matrícula ya se encuentra registrada');
      if (coll === 'usuarios') Object.assign(item, { password: 'demo123', activo: true });
      if (coll === 'alumnos') Object.assign(item, { password: 'demo123', activo: true });
      if (coll === 'inscripciones') {
        const a = db.alumnos.find((x) => x.id === item.alumnoId);
        const g = db.grupos.find((x) => x.id === item.grupoId);
        if (!a || !g || !db.periodos.some((p) => p.id === item.periodo)) fail('Error: Alumno, grupo o periodo no válidos');
        if (db.asignaturas.find((s) => s.id === g.asignaturaId)?.carreraId !== a.carreraId) fail('Error: El grupo no pertenece a la carrera del alumno');
        if (list.some((x) => x.alumnoId === item.alumnoId && x.grupoId === item.grupoId && x.periodo === item.periodo)) fail('Error: El alumno ya está inscrito en ese grupo y periodo');
      }
      list.push(item);
      // Un alumno nuevo queda inscrito en su grupo principal dentro del periodo activo.
      if (coll === 'alumnos' && active() && item.grupoId) db.inscripciones.push({ id: `i${Date.now()}`, alumnoId: item.id, grupoId: item.grupoId, periodo: active().id });
    } else Object.assign(list.find((x) => x.id === item.id), item);
    return snap();
  },
  async remove(coll, id) {
    await wait(150);
    db[coll] = db[coll].filter((x) => x.id !== id);
    if (coll === 'alumnos') {
      ['inscripciones', 'calificaciones', 'evaluaciones', 'alertas', 'solicitudes', 'citas'].forEach((k) => { db[k] = db[k].filter((x) => x.alumnoId !== id); });
    }
    return snap();
  },
  async activatePeriod(id) { await wait(150); db.periodos.forEach((p) => { p.activo = p.id === id; }); reevaluate(); return snap(); },
};
