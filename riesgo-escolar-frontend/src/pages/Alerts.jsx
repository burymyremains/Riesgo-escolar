import { useState } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { Avatar, Btn, DataTable, Field, Hier, Note, PageHead, Risk, fit, inp } from '../components/ui';

const EMPTY = { fecha: '', hora: '', modalidad: 'Presencial', acuerdos: '' };

export default function Alerts() {
  const { user, db, rows, alertas, nombre, run } = useApp();
  const [h, setH] = useState({});
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');
  const isTutor = user.rol === 'tutor';
  const byId = new Map(rows.map((r) => [r.a.id, r]));
  const items = alertas.map((al) => ({ al, r: byId.get(al.alumnoId) })).filter((x) => x.r && fit(h, x.r));
  const citas = db.citas.filter((c) => alertas.some((a) => a.id === c.alertaId));

  const book = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await run(() => api.bookAppointment({ ...form, alertaId: sel.id, alumnoId: sel.alumnoId, tutorId: user.id, responsable: user.nombre }));
      setSel(null); setForm(EMPTY);
    } catch (x) { setErr(x.message); }
  };

  // El docente ve el motivo solo de sus grupos; tutor y admin, el general del alumno.
  const motivo = (x) => (user.rol === 'docente' ? x.r.e?.motivos.join('; ') : '') || x.al.motivo;
  const cols = [
    { h: 'Estudiante', v: (x) => x.r.a.nombre, r: (x) => <span className="flex items-center gap-3"><Avatar name={x.r.a.nombre} nivel={x.r.e?.nivel} /><span><b className="block">{x.r.a.nombre}</b><span className="text-xs text-muted">{x.r.a.id}</span></span></span> },
    { h: 'Carrera · semestre', v: (x) => `${x.r.car?.id} · ${x.r.a.semestre}` },
    { h: 'Riesgo', v: (x) => x.r.e?.score ?? 0, r: (x) => x.r.e && <Risk nivel={x.r.e.nivel} /> },
    { h: 'Motivo y recomendaciones', v: (x) => `${motivo(x)} ${x.r.e?.recomendaciones.join(' ')}`, r: (x) => <div className="min-w-64"><p>{motivo(x)}</p><ul className="mt-1 list-disc pl-4 text-xs text-muted">{x.r.e?.recomendaciones.map((t) => <li key={t}>{t}</li>)}</ul></div> },
    { h: 'Estado', v: (x) => x.al.estado, r: (x) => <span className="whitespace-nowrap rounded-full bg-canvas px-3 py-1 text-xs font-semibold">{x.al.estado}</span> },
    {
      h: 'Acción', s: false, v: () => '',
      r: (x) => isTutor && (x.al.estado === 'Nueva'
        ? <Btn className="whitespace-nowrap !py-2" onClick={() => setSel(x.al)}>Agendar cita</Btn>
        : x.al.estado === 'Cita agendada' && <Btn v="light" className="whitespace-nowrap !py-2" onClick={() => run(() => api.closeAlert(x.al.id))}>Marcar atendida</Btn>),
    },
  ];
  const citaCols = [
    { h: 'Fecha', v: (c) => c.fecha }, { h: 'Hora', v: (c) => c.hora },
    { h: 'Alumno', v: (c) => nombre('alumnos', c.alumnoId) }, { h: 'Modalidad', v: (c) => c.modalidad },
    { h: 'Responsable', v: (c) => c.responsable }, { h: 'Acuerdos', v: (c) => c.acuerdos || '—' },
  ];

  return (
    <>
      <PageHead eyebrow="Seguimiento" title="Alertas y recomendaciones" sub="Se generan cuando el promedio es menor a 6.0, las faltas superan el 20 % o el modelo estima riesgo alto." />
      <Hier v={h} set={setH} sem />
      <DataTable cols={cols} rows={items} sort={2} dir={-1} rk={(x) => x.al.id} empty="No hay alertas activas." />
      <h2 className="mb-4 mt-10 text-2xl font-bold">Citas tutoriales</h2>
      <DataTable cols={citaCols} rows={citas} sort={0} dir={-1} rk={(c) => c.id} empty="Aún no hay citas programadas." />
      {sel && (
        <div role="dialog" aria-modal="true" aria-label="Agendar cita" className="fixed inset-0 z-10 grid place-items-center bg-forest/50 p-4">
          <form onSubmit={book} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-8">
            <h2 className="text-2xl font-bold">Agendar cita con {nombre('alumnos', sel.alumnoId)}</h2>
            <Field label="Fecha"><input required type="date" className={inp} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora"><input required type="time" className={inp} value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Modalidad"><select className={inp} value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value })}><option>Presencial</option><option>En línea</option></select></Field>
            <Field label="Observaciones y acuerdos"><textarea rows="3" className={inp} value={form.acuerdos} onChange={(e) => setForm({ ...form, acuerdos: e.target.value })} /></Field>
            {err && <Note err>{err}</Note>}
            <div className="flex justify-end gap-2"><Btn type="button" v="light" onClick={() => { setSel(null); setErr(''); }}>Cancelar</Btn><Btn>Confirmar cita</Btn></div>
          </form>
        </div>
      )}
    </>
  );
}
