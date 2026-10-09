import { useState } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { Btn, DataTable, Field, Hier, Note, PageHead, ROLES, cx, inp } from '../components/ui';
import { byRecent, periodLabel } from '../utils/periods';

// Orden = jerarquía institucional: plantel → carrera → materia → grupo → alumno.
const CAT = {
  planteles: { label: 'Planteles', f: [['id', 'Clave'], ['nombre', 'Plantel']] },
  carreras: { label: 'Carreras', f: [['id', 'Clave'], ['nombre', 'Carrera'], ['plantelId', 'Plantel', 'planteles']] },
  asignaturas: { label: 'Materias', f: [['id', 'Clave'], ['nombre', 'Materia'], ['carreraId', 'Carrera', 'carreras']] },
  grupos: { label: 'Grupos', f: [['id', 'Grupo'], ['asignaturaId', 'Materia', 'asignaturas'], ['docenteId', 'Docente', 'docentes']] },
  alumnos: { label: 'Alumnos', f: [['id', 'Matrícula'], ['nombre', 'Nombre'], ['correo', 'Correo institucional (acceso)'], ['carreraId', 'Carrera', 'carreras'], ['semestre', 'Semestre', 'sems'], ['grupoId', 'Grupo principal', 'grupos'], ['tutorId', 'Tutor', 'tutores']] },
  inscripciones: { label: 'Inscripciones', f: [['alumnoId', 'Alumno', 'alumnosOpt'], ['grupoId', 'Grupo', 'grupos'], ['periodo', 'Periodo', 'periodos']] },
  docentes: { label: 'Docentes', f: [['id', 'Clave (usuario)'], ['nombre', 'Nombre'], ['correo', 'Correo']] },
  usuarios: { label: 'Usuarios y roles', f: [['nombre', 'Nombre'], ['correo', 'Correo institucional'], ['rol', 'Rol', 'roles']] },
};
const SCOPED = ['carreras', 'asignaturas', 'grupos', 'alumnos', 'inscripciones'];

export default function Catalogs() {
  const { db, run } = useApp();
  const [tab, setTab] = useState('planteles');
  const [h, setH] = useState({});
  const [per, setPer] = useState('');
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const { f } = CAT[tab];
  const car = (id) => db.carreras.find((c) => c.id === id);
  const carOf = (t, x) => (t === 'carreras' ? x.id
    : t === 'grupos' ? db.asignaturas.find((a) => a.id === x.asignaturaId)?.carreraId
      : t === 'inscripciones' ? db.alumnos.find((a) => a.id === x.alumnoId)?.carreraId : x.carreraId);
  const plOf = (t, x) => (t === 'carreras' ? x.plantelId : car(carOf(t, x))?.plantelId);
  const rows = db[tab].filter((x) => !SCOPED.includes(tab)
    || ((!h.pl || plOf(tab, x) === h.pl) && (!h.car || carOf(tab, x) === h.car) && (tab !== 'alumnos' || !h.sem || String(x.semestre) === h.sem)))
    .filter((x) => tab !== 'inscripciones' || !per || x.periodo === per);
  const opts = {
    planteles: db.planteles.map((p) => [p.id, p.nombre]),
    carreras: db.carreras.map((c) => [c.id, c.nombre]),
    asignaturas: db.asignaturas.map((a) => [a.id, `${a.id} · ${a.nombre}`]),
    grupos: db.grupos.map((g) => [g.id, g.id]),
    alumnosOpt: db.alumnos.map((a) => [a.id, `${a.id} · ${a.nombre}`]),
    periodos: [...db.periodos].sort(byRecent).map((p) => [p.id, periodLabel(p.id)]),
    tutores: db.usuarios.filter((u) => u.rol === 'tutor' || u.tutor).map((u) => [u.id, u.tutor ? `${u.nombre} (docente y tutor)` : u.nombre]),
    docentes: db.docentes.map((d) => [d.id, d.nombre]),
    roles: Object.entries(ROLES),
    sems: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [String(n), String(n)]),
  };
  const show = (row, [k, , o]) => (o ? opts[o].find(([v]) => v === String(row[k]))?.[1] ?? row[k] : row[k]);
  const go = async (fn) => { setErr(''); try { await run(fn); return true; } catch (e) { setErr(e.message); return false; } };
  const add = async (e) => { e.preventDefault(); if (await go(() => api.upsert(tab, { ...form }, true))) setForm({}); };
  const change = (t) => { setTab(t); setForm({}); setErr(''); setPer(''); };

  const cols = [
    ...f.map((x) => ({ h: x[1], v: (r) => show(r, x) })),
    ...(tab === 'usuarios' ? [{ h: 'Estado', v: (r) => (r.activo ? 'Activo' : 'Inactivo') }, { h: 'Tutoría', v: (r) => (r.rol === 'tutor' ? 'Tutor' : r.tutor ? 'Docente y tutor' : '—') }] : []),
    {
      h: 'Acciones', s: false, v: () => '',
      r: (row) => (
        <span className="whitespace-nowrap">
          {tab === 'usuarios' && <Btn v="text" onClick={() => go(() => api.upsert('usuarios', { id: row.id, activo: !row.activo }))}>{row.activo ? 'Deshabilitar' : 'Habilitar'}</Btn>}
          {tab === 'usuarios' && row.rol === 'docente' && <Btn v="text" onClick={() => go(() => api.upsert('usuarios', { id: row.id, tutor: !row.tutor }))}>{row.tutor ? 'Quitar tutoría' : 'Asignar tutoría'}</Btn>}
          <Btn v="text" onClick={() => go(() => api.remove(tab, row.id))}>Eliminar</Btn>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHead eyebrow="Administración" title="Planteles, carreras y alumnos" sub="Cada plantel oferta carreras, cada carrera tiene sus materias y los alumnos se agrupan por carrera." />
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(CAT).map(([k, v]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => change(k)}
            className={cx('cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold', tab === k ? 'border-moss bg-moss text-white' : 'border-line bg-white text-muted hover:text-forest')}>{v.label}</button>
        ))}
      </div>
      {SCOPED.includes(tab) && <Hier v={h} set={setH} sem={tab === 'alumnos'} />}
      <form onSubmit={add} className="mb-6 grid items-end gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        {f.filter(([k]) => !(tab === 'usuarios' && k === 'id')).map(([k, label, o]) => (
          <Field key={k} label={label}>
            {o ? (
              <select required className={inp} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                <option value="">Selecciona…</option>{opts[o].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : <input required className={inp} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
          </Field>
        ))}
        <Btn>Guardar registro</Btn>
      </form>
      {err && <div className="mb-4"><Note err>{err}</Note></div>}
      <DataTable key={tab} cols={cols} rows={rows} rk={(r) => r.id}
        toolbar={tab === 'inscripciones' && (
          <select aria-label="Periodo" className={cx(inp, '!w-auto')} value={per} onChange={(e) => setPer(e.target.value)}>
            <option value="">Todos los periodos</option>{opts.periodos.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )} />
    </>
  );
}
