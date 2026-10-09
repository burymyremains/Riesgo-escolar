import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, CircleAlert, GraduationCap, MessageSquareText, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, PageHead, Risk, Situacion, Stat, btn } from '../components/ui';
import { materiasDe, situacion } from '../utils/student';
import { periodType } from '../utils/periods';

export default function StudentHome() {
  const { user, db, periodo, nombre, solicitudes } = useApp();
  const a = db.alumnos.find((x) => x.id === user.alumnoId);
  const mats = materiasDe(db, a.id, periodo?.id);
  const sit = situacion(mats);
  const g = sit.general;
  const riesgo = sit.riesgo.length ? sit.riesgo : sit.observacion;
  const asistencia = g ? Math.round((100 - g.pf) * 10) / 10 : null;
  const actual = solicitudes.find((s) => ['Pendiente', 'Cita agendada'].includes(s.estado));
  const cita = actual?.citaId && db.citas.find((c) => c.id === actual.citaId);

  return (
    <>
      <PageHead eyebrow="Mi panel" title={`Hola, ${a.nombre.split(' ')[0]}`}
        sub={`${nombre('carreras', a.carreraId)} · semestre ${a.semestre} · matrícula ${a.id}`}>
        <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm"><BookOpen size={17} className="text-muted" />Periodo {periodo?.id} · {periodType(periodo?.id)}</span>
      </PageHead>

      <Situacion sit={sit}>
        <Link to="/solicitudes" className={btn(sit.alcance === 'general' || sit.alcance === 'especifico' ? 'dark' : 'light')}><MessageSquareText size={17} />Solicitar atención tutorial</Link>
      </Situacion>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="Materias inscritas" value={mats.length} note={`Periodo ${periodo?.id}`} />
        <Stat icon={GraduationCap} label="Promedio" value={g?.prom != null ? g.prom.toFixed(1) : '—'} note="Promedio de tus parciales" bad={g?.prom != null && g.prom < 6} />
        <Stat icon={Percent} label="Asistencia" value={asistencia != null ? `${asistencia}%` : '—'} note="Considerando todas tus materias" bad={asistencia != null && asistencia < 80} />
        <Stat icon={CircleAlert} bad={sit.riesgo.length > 0} label="Materias en riesgo" value={sit.riesgo.length} note={sit.riesgo.length ? 'Riesgo medio o alto' : 'Ninguna por ahora'} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-xl font-bold">{sit.riesgo.length ? 'Materias que requieren atención' : sit.observacion.length ? 'Materias en observación' : 'Tus materias'}</h2>
          <p className="mb-4 text-sm text-muted">{riesgo.length ? 'Estas son las asignaturas donde conviene actuar primero.' : 'No hay materias con riesgo en este momento.'}</p>
          <ul className="grid gap-3">
            {riesgo.map((m) => (
              <li key={m.grupo.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><b>{m.nombre}</b><Risk nivel={m.nivel} /></div>
                <p className="mt-1 text-sm text-muted">{m.ev.motivos.join(' · ') || 'Seguimiento preventivo'}</p>
              </li>
            ))}
          </ul>
          {g?.recomendaciones.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-sm font-semibold">Qué puedes hacer</p>
              <ul className="list-disc pl-5 text-sm text-muted">{g.recomendaciones.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}
          <Link to="/mis-materias" className={`${btn('text')} mt-4`}>Ver el detalle de mis materias →</Link>
        </Card>

        <Card>
          <h2 className="text-xl font-bold">Atención tutorial</h2>
          <p className="mb-4 text-sm text-muted">Tu tutor: <b className="text-forest">{nombre('usuarios', a.tutorId)}</b></p>
          {actual ? (
            <div className="rounded-xl bg-leaf p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-moss"><CalendarCheck size={17} />{actual.estado === 'Pendiente' ? 'Solicitud enviada' : 'Cita agendada'}</p>
              {cita ? <p className="mt-1">{cita.fecha} · {cita.hora} · {cita.modalidad}</p> : <p className="mt-1 text-muted">Tu tutor la revisará pronto y te asignará fecha y hora.</p>}
            </div>
          ) : <p className="text-sm text-muted">No tienes solicitudes en curso. Si necesitas orientación o asesoría, pide una reunión con tu tutor.</p>}
          <Link to="/solicitudes" className={`${btn('light')} mt-4 w-full`}>{actual ? 'Ver mis solicitudes' : 'Solicitar atención'}</Link>
        </Card>
      </div>
    </>
  );
}
