import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/api';
import { evaluate, evaluateAll } from '../utils/risk';

const Ctx = createContext(null);
// Cada ruta declara en qué calidad se muestra ('tutor' → vista de tutorados de un docente-tutor).
export const ViewCtx = createContext(null);
export const useRoot = () => useContext(Ctx);
export const useApp = () => {
  const c = useContext(Ctx);
  const as = useContext(ViewCtx);
  return as === 'tutor' && c?.tutorView ? c.tutorView : c;
};
const VALID = ['admin', 'docente', 'tutor', 'alumno'];

const stored = () => {
  const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
  return u && VALID.includes(u.rol) ? u : null;
};

// Calificación "resumen" de un alumno cuando cursa varias materias (promedio de parciales y suma de asistencias).
const resumen = (cs) => {
  if (!cs.length) return undefined;
  const mean = (k) => { const v = cs.map((c) => c[k]).filter((n) => n != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  const sum = (k) => cs.reduce((s, c) => s + Number(c[k] || 0), 0);
  return { alumnoId: cs[0].alumnoId, periodo: cs[0].periodo, p1: mean('p1'), p2: mean('p2'), asistencias: sum('asistencias'), faltas: sum('faltas'), validado: cs.every((c) => c.validado) };
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(stored);
  const [db, setDb] = useState(null);

  useEffect(() => {
    if (user) api.getDb().then(setDb); else setDb(null);
  }, [user]);

  const login = async ({ remember, ...cred }) => {
    const u = await api.login(cred);
    (remember ? localStorage : sessionStorage).setItem('user', JSON.stringify(u));
    setUser(u);
  };
  const logout = () => { localStorage.removeItem('user'); sessionStorage.removeItem('user'); setUser(null); };
  const run = async (fn) => setDb(await fn());

  const value = useMemo(() => {
    if (!db || !user) return { user, db, login, logout, run };
    const periodo = db.periodos.find((p) => p.activo);
    const gMap = new Map(db.grupos.map((g) => [g.id, g]));
    const aMap = new Map(db.asignaturas.map((s) => [s.id, s]));
    const cMap = new Map(db.carreras.map((c) => [c.id, c]));
    const pMap = new Map(db.planteles.map((p) => [p.id, p]));
    // Un docente puede ser además tutor (usuario.tutor). Se lee de la base para que el cambio del administrador se refleje de inmediato.
    const esTutor = user.rol === 'tutor' || (user.rol === 'docente' && !!db.usuarios.find((u) => u.id === user.id)?.tutor);
    const nombre = (coll, id) => db[coll].find((x) => x.id === id)?.nombre ?? id;

    // Vista de datos para un rol efectivo ('docente' | 'tutor' | 'admin' | 'alumno'). RN-03 / RN-04: cada rol solo ve su información.
    const build = (rol) => {
      const yo = { ...user, rol };
      let alumnos = db.alumnos;
      if (rol === 'tutor') alumnos = alumnos.filter((a) => a.tutorId === user.id);
      if (rol === 'alumno') alumnos = alumnos.filter((a) => a.id === user.alumnoId);

      // Filas (una por alumno) de cualquier periodo. Cada fila trae sus materias (`mats`); el docente solo ve las de sus propios grupos.
      const rowsOf = (pid) => {
        const calif = new Map(db.calificaciones.filter((c) => c.periodo === pid).map((c) => [`${c.alumnoId}|${c.grupoId}`, c]));
        const evals = new Map(db.evaluaciones.filter((e) => e.periodo === pid).map((e) => [e.alumnoId, e]));
        const insc = new Map();
        db.inscripciones.filter((i) => i.periodo === pid).forEach((i) => {
          const g = gMap.get(i.grupoId);
          if (!g || (rol === 'docente' && g.docenteId !== user.id)) return;
          const c = calif.get(`${i.alumnoId}|${i.grupoId}`);
          insc.set(i.alumnoId, [...(insc.get(i.alumnoId) ?? []), { g, c, nombre: aMap.get(g.asignaturaId)?.nombre ?? g.id, ev: c ? evaluate(c) : null }]);
        });
        return alumnos.filter((a) => insc.has(a.id)).map((a) => {
          const mats = insc.get(a.id);
          const car = cMap.get(a.carreraId);
          const conC = mats.filter((m) => m.c);
          // Docente: riesgo solo de sus grupos. Resto de roles: evaluación general guardada (RN-05).
          const e = rol === 'docente'
            ? (conC.length ? { alumnoId: a.id, periodo: pid, ...evaluateAll(conC.map((m) => ({ c: m.c, grupoId: m.g.id, nombre: m.nombre }))) } : undefined)
            : evals.get(a.id);
          return { a, g: mats[0].g, mats, c: resumen(conC.map((m) => m.c)), e, car, pl: pMap.get(car?.plantelId) };
        });
      };

      const rows = rowsOf(periodo?.id);
      const ids = new Set(rows.map((r) => r.a.id));
      const gids = new Set(rows.flatMap((r) => r.mats.map((m) => m.g.id)));
      const grupos = rol === 'admin' ? db.grupos : rol === 'docente' ? db.grupos.filter((g) => g.docenteId === user.id) : db.grupos.filter((g) => gids.has(g.id));
      // El alumno no ve alertas; el docente solo las de alumnos con riesgo en sus propios grupos (RN-03).
      const enRiesgo = new Set(rows.filter((r) => r.e && (r.e.rn01 || r.e.nivel === 'Alto')).map((r) => r.a.id));
      const alertas = rol === 'alumno' ? [] : db.alertas.filter((al) => (rol === 'docente' ? enRiesgo : ids).has(al.alumnoId));
      const solicitudes = rol === 'alumno' ? db.solicitudes.filter((s) => s.alumnoId === user.alumnoId)
        : rol === 'tutor' ? db.solicitudes.filter((s) => s.tutorId === user.id) : [];
      const uniq = (k) => [...new Map(rows.filter((r) => r[k]).map((r) => [r[k].id, r[k]])).values()];
      const hier = rol === 'admin' ? { planteles: db.planteles, carreras: db.carreras } : { planteles: uniq('pl'), carreras: uniq('car') };
      return { user: yo, db, periodo, esTutor, reportesPath: rol === 'tutor' && user.rol === 'docente' ? '/tutoria/reportes' : '/reportes', alumnos, grupos, rows, rowsOf, alertas, solicitudes, hier, nombre, login, logout, run };
    };

    const main = build(user.rol);
    // Docente que también es tutor: segunda vista, la de sus tutorados, dentro del mismo perfil.
    const tutorView = user.rol === 'docente' && esTutor ? build('tutor') : null;
    return { ...main, tutorView };
  }, [db, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
