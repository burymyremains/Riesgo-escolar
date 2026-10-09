import { useState } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { Avatar, Btn, Card, DataTable, Field, Note, PageHead, Risk, Stat, cx, inp } from '../components/ui';
import { materiasDe } from '../utils/student';
import { CalendarCheck, Clock, Inbox } from 'lucide-react';

const MOTIVOS = ['Bajo rendimiento académico', 'Inasistencias', 'Orientación sobre materias', 'Problemas personales o de salud', 'Otro'];
const ESTADOS = ['Pendiente', 'Cita agendada', 'Atendida', 'Rechazada', 'Cancelada'];
const TONE = {
  Pendiente: 'bg-gold/20 text-[#8a6a10]', 'Cita agendada': 'bg-leaf text-moss', Atendida: 'bg-canvas text-muted',
  Rechazada: 'bg-[#d94b4b]/10 text-[#b53a3a]', Cancelada: 'bg-canvas text-muted',
};
const Estado = ({ v }) => <span className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold', TONE[v])}>{v}</span>;
const hoy = () => new Date().toISOString().slice(0, 10);

export default function Requests() {
  return useApp().user.rol === 'alumno' ? <StudentView /> : <TutorView />;
}

/* ───────────── Alumno: genera su solicitud y da seguimiento ───────────── */
const NEW = { motivo: '', grupoId: '', modalidad: 'Indistinto', fechaSugerida: '', horario: 'Indistinto', detalle: '' };

function StudentView() {
  const { user, db, periodo, solicitudes, nombre, run } = useApp();
  const [f, setF] = useState(NEW);
  const [msg, setMsg] = useState(null);
  const a = db.alumnos.find((x) => x.id === user.alumnoId);
  const mats = materiasDe(db, a.id, periodo?.id);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const citaDe = (s) => db.citas.find((c) => c.id === s.citaId);

  const send = async (e) => {
    e.preventDefault(); setMsg(null);
    try { await run(() => api.createRequest({ ...f, alumnoId: a.id })); setF(NEW); setMsg({ ok: 'Solicitud enviada. Tu tutor la revisará y te indicará fecha y hora.' }); } catch (x) { setMsg({ err: x.message }); }
  };
  const cancel = async (id) => { setMsg(null); try { await run(() => api.cancelRequest(id, a.id)); } catch (x) { setMsg({ err: x.message }); } };

  const cols = [
    { h: 'Enviada', v: (s) => s.creada },
    { h: 'Motivo', v: (s) => s.motivo, r: (s) => <div className="min-w-56"><b>{s.motivo}</b>{s.grupoId && <p className="text-xs text-muted">{nombre('asignaturas', db.grupos.find((g) => g.id === s.grupoId)?.asignaturaId)}</p>}<p className="mt-1 text-xs text-muted">{s.detalle}</p></div> },
    { h: 'Estado', v: (s) => s.estado, r: (s) => <Estado v={s.estado} /> },
    {
      h: 'Respuesta del tutor', v: (s) => s.respuesta,
      r: (s) => { const c = citaDe(s); return c ? <p><b>{c.fecha} · {c.hora}</b><br /><span className="text-xs text-muted">{c.modalidad}{c.acuerdos ? ` · ${c.acuerdos}` : ''}</span>{s.respuesta && <span className="block text-xs text-muted">{s.respuesta}</span>}</p> : (s.respuesta || '—'); },
    },
    { h: 'Acción', s: false, v: () => '', r: (s) => s.estado === 'Pendiente' && <Btn v="light" className="whitespace-nowrap !py-2" onClick={() => cancel(s.id)}>Cancelar</Btn> },
  ];

  return (
    <>
      <PageHead eyebrow="Atención tutorial" title="Solicitar atención de mi tutor" sub={`Tu tutor es ${nombre('usuarios', a.tutorId)}. Envía una solicitud para coordinar una reunión o asesoría.`} />
      <Card className="mb-8">
        <form onSubmit={send} className="grid gap-4 md:grid-cols-2">
          <Field label="Motivo"><select required className={inp} value={f.motivo} onChange={set('motivo')}><option value="">Selecciona…</option>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Materia relacionada (opcional)">
            <select className={inp} value={f.grupoId} onChange={set('grupoId')}>
              <option value="">Ninguna en particular</option>
              {mats.map((m) => <option key={m.grupo.id} value={m.grupo.id}>{m.nombre}{m.ev && ['Medio', 'Alto'].includes(m.nivel) ? ` · riesgo ${m.nivel.toLowerCase()}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Modalidad preferida"><select className={inp} value={f.modalidad} onChange={set('modalidad')}><option>Indistinto</option><option>Presencial</option><option>En línea</option></select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha sugerida (opcional)"><input type="date" min={hoy()} className={inp} value={f.fechaSugerida} onChange={set('fechaSugerida')} /></Field>
            <Field label="Horario"><select className={inp} value={f.horario} onChange={set('horario')}><option>Indistinto</option><option>Mañana</option><option>Tarde</option></select></Field>
          </div>
          <div className="md:col-span-2"><Field label="¿En qué necesitas apoyo?"><textarea required minLength={10} rows="3" className={inp} placeholder="Describe brevemente tu situación o lo que quieres tratar con tu tutor." value={f.detalle} onChange={set('detalle')} /></Field></div>
          {msg && <div className="md:col-span-2"><Note err={!!msg.err}>{msg.err || msg.ok}</Note></div>}
          <div className="md:col-span-2"><Btn>Enviar solicitud</Btn></div>
        </form>
      </Card>
      <h2 className="mb-4 text-2xl font-bold">Mis solicitudes</h2>
      <DataTable cols={cols} rows={solicitudes} sort={0} dir={-1} rk={(s) => s.id} empty="Aún no has enviado solicitudes." />
    </>
  );
}

/* ───────────── Tutor: visualiza y gestiona las solicitudes de sus tutorados ───────────── */
function TutorView() {
  const { user, db, rows, solicitudes, nombre, run } = useApp();
  const [filtro, setFiltro] = useState('Pendiente');
  const [sel, setSel] = useState(null); // { s, accion }
  const [form, setForm] = useState({ fecha: '', hora: '', modalidad: 'Presencial', acuerdos: '', respuesta: '' });
  const [err, setErr] = useState('');
  const byId = new Map(rows.map((r) => [r.a.id, r]));
  const cuenta = (e) => solicitudes.filter((s) => s.estado === e).length;
  const list = solicitudes.filter((s) => !filtro || s.estado === filtro);

  const open = (s, accion) => {
    setErr(''); setSel({ s, accion });
    setForm({ fecha: s.fechaSugerida || '', hora: '', modalidad: s.modalidad === 'En línea' ? 'En línea' : 'Presencial', acuerdos: '', respuesta: '' });
  };
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await run(() => api.resolveRequest(sel.s.id, user.id, sel.accion, { ...form, responsable: user.nombre })); setSel(null); } catch (x) { setErr(x.message); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const cols = [
    { h: 'Alumno', v: (s) => nombre('alumnos', s.alumnoId), r: (s) => { const r = byId.get(s.alumnoId); return <span className="flex items-center gap-3"><Avatar name={nombre('alumnos', s.alumnoId)} nivel={r?.e?.nivel} /><span><b className="block">{nombre('alumnos', s.alumnoId)}</b><span className="text-xs text-muted">{s.alumnoId}</span></span></span>; } },
    { h: 'Riesgo', v: (s) => byId.get(s.alumnoId)?.e?.score ?? 0, r: (s) => { const e = byId.get(s.alumnoId)?.e; return e ? <Risk nivel={e.nivel} /> : '—'; } },
    {
      h: 'Solicitud', v: (s) => `${s.motivo} ${s.detalle}`,
      r: (s) => (
        <div className="min-w-64"><b>{s.motivo}</b>
          {s.grupoId && <p className="text-xs text-moss">Materia: {nombre('asignaturas', db.grupos.find((g) => g.id === s.grupoId)?.asignaturaId)}</p>}
          <p className="mt-1 text-xs text-muted">{s.detalle}</p>
          <p className="mt-1 text-xs text-muted">Prefiere: {s.modalidad}{s.fechaSugerida ? ` · ${s.fechaSugerida}` : ''} · {s.horario}</p>
        </div>
      ),
    },
    { h: 'Enviada', v: (s) => s.creada },
    {
      h: 'Estado', v: (s) => s.estado,
      r: (s) => { const c = db.citas.find((x) => x.id === s.citaId); return <div><Estado v={s.estado} />{c && <p className="mt-1 text-xs text-muted">{c.fecha} · {c.hora} · {c.modalidad}</p>}{s.estado === 'Rechazada' && <p className="mt-1 text-xs text-muted">{s.respuesta}</p>}</div>; },
    },
    {
      h: 'Acción', s: false, v: () => '',
      r: (s) => s.estado === 'Pendiente'
        ? <span className="flex gap-2"><Btn className="whitespace-nowrap !py-2" onClick={() => open(s, 'agendar')}>Agendar cita</Btn><Btn v="light" className="whitespace-nowrap !py-2" onClick={() => open(s, 'rechazar')}>Rechazar</Btn></span>
        : s.estado === 'Cita agendada' && <Btn v="light" className="whitespace-nowrap !py-2" onClick={() => run(() => api.resolveRequest(s.id, user.id, 'atender'))}>Marcar atendida</Btn>,
    },
  ];

  return (
    <>
      <PageHead eyebrow="Atención tutorial" title="Solicitudes de tutoría" sub="Solicitudes de tus tutorados para reunirse contigo. Agenda la cita, o responde si no es posible atenderla." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={Inbox} label="Pendientes" value={cuenta('Pendiente')} note="Esperan tu respuesta" bad={cuenta('Pendiente') > 0} />
        <Stat icon={CalendarCheck} label="Citas agendadas" value={cuenta('Cita agendada')} note="Por realizarse" />
        <Stat icon={Clock} label="Atendidas" value={cuenta('Atendida')} note="Historial del periodo" />
      </div>
      <DataTable key={filtro} cols={cols} rows={list} sort={3} dir={-1} rk={(s) => s.id} empty="No hay solicitudes con este estado."
        toolbar={<select aria-label="Estado" className={cx(inp, '!w-auto')} value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todas</option>{ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}</select>} />
      {sel && (
        <div role="dialog" aria-modal="true" aria-label={sel.accion === 'agendar' ? 'Agendar cita' : 'Rechazar solicitud'} className="fixed inset-0 z-10 grid place-items-center bg-forest/50 p-4">
          <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-8">
            <h2 className="text-2xl font-bold">{sel.accion === 'agendar' ? 'Agendar cita con' : 'Rechazar solicitud de'} {nombre('alumnos', sel.s.alumnoId)}</h2>
            {sel.accion === 'agendar' ? (
              <>
                <Field label="Fecha"><input required type="date" min={hoy()} className={inp} value={form.fecha} onChange={set('fecha')} /></Field>
                <Field label="Hora"><input required type="time" className={inp} value={form.hora} onChange={set('hora')} /></Field>
                <Field label="Modalidad"><select className={inp} value={form.modalidad} onChange={set('modalidad')}><option>Presencial</option><option>En línea</option></select></Field>
                <Field label="Indicaciones o acuerdos"><textarea rows="3" className={inp} value={form.acuerdos} onChange={set('acuerdos')} /></Field>
              </>
            ) : <Field label="Motivo (se le mostrará al alumno)"><textarea required rows="3" className={inp} value={form.respuesta} onChange={set('respuesta')} /></Field>}
            {err && <Note err>{err}</Note>}
            <div className="flex justify-end gap-2"><Btn type="button" v="light" onClick={() => setSel(null)}>Cancelar</Btn><Btn>{sel.accion === 'agendar' ? 'Confirmar cita' : 'Rechazar'}</Btn></div>
          </form>
        </div>
      )}
    </>
  );
}
