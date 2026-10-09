import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { COLORS, Card, DataTable, PageHead, Risk, Situacion, cx, inp } from '../components/ui';
import { materiasDe, situacion } from '../utils/student';
import { byRecent, periodLabel } from '../utils/periods';

const nota = (n) => (n == null ? <span className="text-muted" title="Aún no aplica o no se ha capturado">—</span> : <b>{Number(n).toFixed(1)}</b>);

export default function Subjects() {
  const { user, db, periodo } = useApp();
  // Solo los periodos (ordinarios o intersemestrales) en los que el alumno tuvo inscripciones.
  const propios = new Set(db.inscripciones.filter((i) => i.alumnoId === user.alumnoId).map((i) => i.periodo));
  if (periodo) propios.add(periodo.id);
  const opciones = db.periodos.filter((p) => propios.has(p.id)).sort(byRecent);
  const [pid, setPid] = useState(periodo?.id ?? opciones[0]?.id);
  const mats = materiasDe(db, user.alumnoId, pid);
  const sit = situacion(mats);

  const cols = [
    { h: 'Materia', v: (m) => m.nombre, r: (m) => <span><b className="block">{m.nombre}</b><span className="text-xs text-muted">{m.grupo.asignaturaId} · grupo {m.grupo.id} · {m.docente}</span></span> },
    { h: 'Parcial 1', v: (m) => m.c?.p1 ?? -1, r: (m) => nota(m.c?.p1) },
    { h: 'Parcial 2', v: (m) => m.c?.p2 ?? -1, r: (m) => nota(m.c?.p2) },
    { h: 'Faltas', v: (m) => m.faltas ?? -1, r: (m) => (m.faltas == null ? '—' : <b>{m.faltas}</b>) },
    {
      h: 'Asistencia', v: (m) => m.asistencia ?? -1,
      r: (m) => m.asistencia == null ? '—' : (
        <span className="flex min-w-32 items-center gap-2">
          <span className="h-2 flex-1 rounded-full bg-canvas"><i className="block h-2 rounded-full" style={{ width: `${m.asistencia}%`, background: m.asistencia >= 80 ? COLORS['Sin riesgo'] : COLORS.Alto }} /></span>
          <b className={cx(m.asistencia < 80 && 'text-[#d94b4b]')}>{m.asistencia}%</b>
        </span>
      ),
    },
    {
      h: 'Estado de riesgo', v: (m) => m.ev?.score ?? -1,
      r: (m) => m.ev ? (
        <div className="min-w-48"><Risk nivel={m.nivel} />{m.ev.motivos.length > 0 && <p className="mt-1 text-xs text-muted">{m.ev.motivos.join(' · ')}</p>}</div>
      ) : <span className="text-xs text-muted">Sin registro</span>,
    },
  ];

  return (
    <>
      <PageHead eyebrow="Consulta académica" title="Mis materias" sub="Calificaciones parciales, faltas y asistencia de cada materia inscrita.">
        <select aria-label="Periodo" className={cx(inp, '!w-auto')} value={pid} onChange={(e) => setPid(e.target.value)}>
          {opciones.map((p) => <option key={p.id} value={p.id}>{periodLabel(p.id)}{p.activo ? ' (actual)' : ''}</option>)}
        </select>
      </PageHead>
      <Situacion sit={sit} />
      <DataTable key={pid} cols={cols} rows={mats} sort={5} dir={-1} size={10} rk={(m) => m.grupo.id} empty="No tienes materias inscritas en este periodo." />
      <Card className="mt-6 !p-4 text-sm text-muted">
        Una materia entra en <b className="text-forest">riesgo alto</b> cuando el promedio es menor a 6.0 o las faltas superan el 20 % de las sesiones. Un guion (—) indica que el parcial aún no aplica o no se ha capturado.
      </Card>
    </>
  );
}
