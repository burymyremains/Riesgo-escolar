import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bell, Download, GraduationCap, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, COLORS, Card, DataTable, Donut, Hier, PageHead, Risk, Stat, btn, fit } from '../components/ui';
import { LEVELS } from '../utils/risk';

const barColor = (v) => (v >= 7.5 ? COLORS['Sin riesgo'] : v >= 6.5 ? '#d4ad1e' : COLORS.Medio);
const avg = (arr) => { const v = arr.map((r) => r.e?.prom).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };

export default function Dashboard() {
  const { user, rows, alertas, periodo, reportesPath } = useApp();
  const [h, setH] = useState({});
  const list = rows.filter((r) => fit(h, r));
  const ids = new Set(list.map((r) => r.a.id));
  const al = alertas.filter((a) => ids.has(a.alumnoId));
  const counts = Object.fromEntries(LEVELS.map((l) => [l, list.filter((r) => r.e?.nivel === l).length]));
  const byGroup = user.rol === 'docente';
  // Docente: promedio por cada uno de sus grupos (materias); resto de roles: por carrera.
  const bars = byGroup ? list.flatMap((r) => r.mats.filter((m) => m.ev).map((m) => ({ k: m.g.id, e: m.ev }))) : list.map((r) => ({ k: r.car?.id, e: r.e }));
  const keys = [...new Set(bars.map((b) => b.k))].sort();
  const reviewed = al.length ? Math.round((al.filter((a) => a.estado !== 'Nueva').length / al.length) * 100) : 100;
  const watch = list.filter((r) => r.e && r.e.nivel !== 'Sin riesgo');
  const nuevas = al.filter((a) => a.estado === 'Nueva').length;

  const cols = [
    { h: 'Estudiante', v: (r) => r.a.nombre, r: (r) => <span className="flex items-center gap-3"><Avatar name={r.a.nombre} nivel={r.e.nivel} /><b>{r.a.nombre}</b></span> },
    { h: 'Matrícula', v: (r) => r.a.id },
    { h: 'Carrera · semestre', v: (r) => `${r.car?.id} · ${r.a.semestre}` },
    { h: 'Nivel de riesgo', v: (r) => r.e.score, r: (r) => <Risk nivel={r.e.nivel} /> },
    { h: 'Recomendación', v: (r) => r.e.recomendaciones[0] || '' },
  ];

  return (
    <>
      <PageHead eyebrow="Vista general" title="Indicadores de riesgo académico" sub="Visualiza el progreso y acompaña a tus estudiantes en el momento adecuado.">
        <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm"><BookOpen size={17} className="text-muted" />Periodo {periodo?.id}</span>
        <Link to={reportesPath} className={btn()}><Download size={17} />Descargar reporte</Link>
      </PageHead>
      <Hier v={h} set={setH} sem />
      {user.rol === 'tutor' && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#cfe3ca] bg-leaf/70 p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-leaf text-moss"><ShieldCheck size={22} /></span>
          <div className="flex-1"><p className="font-bold">Buen trabajo, {user.nombre.split(' ')[0]}.</p><p className="text-sm text-muted">Has revisado el {reviewed}% de las alertas de este periodo.</p></div>
          <div className="flex w-full max-w-sm items-center gap-3 sm:w-auto sm:min-w-72"><div className="h-2 flex-1 rounded-full bg-white"><div className="h-2 rounded-full bg-moss" style={{ width: `${reviewed}%` }} /></div><b className="text-sm text-moss">{reviewed}%</b></div>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Alumnos evaluados" value={list.length} note={`${keys.length} ${byGroup ? 'grupos' : 'carreras'} en el filtro`} />
        <Stat icon={TriangleAlert} bad label="En riesgo alto" value={counts.Alto} note={`${counts.Alto + counts.Medio} requieren seguimiento`} />
        <Stat icon={Bell} label="Alertas nuevas" value={nuevas} note="Pendientes de revisión" />
        <Stat icon={GraduationCap} label="Promedio general" value={avg(list).toFixed(1)} note={`Periodo ${periodo?.id}`} />
      </div>
      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold">Distribución del riesgo</h2><p className="mb-6 text-sm text-muted">Estado actual de los estudiantes</p>
          <div className="flex flex-wrap items-center justify-around gap-6">
            <Donut counts={counts} total={list.length} />
            <ul className="grid min-w-44 gap-3 text-sm">{LEVELS.map((l) => (
              <li key={l} className="flex items-center gap-3"><i className="size-2.5 rounded-full" style={{ background: COLORS[l] }} /><span className="flex-1 text-muted">{l === 'Sin riesgo' ? l : `Riesgo ${l.toLowerCase()}`}</span><b>{counts[l]}</b></li>
            ))}</ul>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">Promedio por {byGroup ? 'grupo' : 'carrera'}</h2><p className="mb-6 text-sm text-muted">Comparativa de desempeño</p>
          <div className="grid gap-4">
            {keys.map((k) => {
              const v = avg(bars.filter((b) => b.k === k));
              return <div key={k} className="grid grid-cols-[64px_1fr_36px] items-center gap-3 text-sm"><span className="text-muted">{k}</span><div className="h-2.5 rounded-full bg-canvas"><div className="h-2.5 rounded-full" style={{ width: `${v * 10}%`, background: barColor(v) }} /></div><b className="text-right">{v.toFixed(1)}</b></div>;
            })}
          </div>
          <div className="mt-6 flex justify-between border-t border-line pt-4 text-sm text-muted">Promedio institucional<b className="text-forest">{avg(list).toFixed(1)}</b></div>
        </Card>
      </div>
      <h2 className="text-2xl font-bold">Estudiantes que requieren atención</h2>
      <p className="mb-4 text-sm text-muted">Prioriza las acciones recomendadas para esta semana.</p>
      <DataTable cols={cols} rows={watch} sort={3} dir={-1} rk={(r) => r.a.id} />
    </>
  );
}
