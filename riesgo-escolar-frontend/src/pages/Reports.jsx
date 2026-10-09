import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Btn, DataTable, Hier, PageHead, Risk, cx, fit, inp } from '../components/ui';
import { byRecent, periodLabel } from '../utils/periods';

const KEY = {
  plantel: (r) => r.pl?.nombre, carrera: (r) => r.car?.nombre, grupo: (r) => r.g.id, semestre: (r) => `Semestre ${r.a.semestre}`,
};
// Tipos de reporte por rol: el tutor no tiene reportes por grupo ni por docente.
const TYPES = { admin: ['estudiante', 'plantel', 'carrera', 'grupo', 'docente'], docente: ['estudiante', 'grupo'], tutor: ['estudiante', 'carrera', 'semestre'] };
const LABEL = (t, rol) => ({ estudiante: rol === 'tutor' ? 'Por tutorado' : 'Por estudiante', plantel: 'Por plantel', carrera: 'Por carrera', grupo: 'Por grupo', docente: 'Por docente', semestre: 'Por semestre' }[t]);

export default function Reports() {
  const { user, db, rowsOf, nombre, periodo: activo } = useApp();
  const [pid, setPid] = useState(activo?.id);
  const periodo = { id: pid };
  const [tipo, setTipo] = useState('estudiante');
  const [h, setH] = useState({});
  const [all, setAll] = useState(false);
  const base = rowsOf(pid).filter((r) => r.c?.validado && fit(h, r)); // RN-08: solo información validada
  // Por grupo y por docente se analiza materia por materia; el resto, un registro por alumno.
  const porMateria = tipo === 'grupo' || tipo === 'docente';
  const data = porMateria ? base.flatMap((r) => r.mats.filter((m) => m.c?.validado).map((m) => ({ ...r, g: m.g, c: m.c, e: m.ev }))) : base;
  const keyOf = tipo === 'docente' ? (r) => nombre('docentes', r.g?.docenteId) : KEY[tipo];

  const student = [
    { h: 'Matrícula', v: (r) => r.a.id }, { h: 'Alumno', v: (r) => r.a.nombre },
    { h: 'Carrera', v: (r) => r.car?.nombre }, { h: 'Semestre', v: (r) => r.a.semestre }, { h: 'Grupos', v: (r) => r.mats.map((m) => m.g.id).join(', ') },
    { h: 'Parcial 1', v: (r) => r.c.p1 ?? '—' }, { h: 'Parcial 2', v: (r) => r.c.p2 ?? '—' },
    { h: 'Asistencias', v: (r) => r.c.asistencias }, { h: 'Faltas', v: (r) => r.c.faltas },
    { h: 'Promedio', v: (r) => Number(r.e?.prom?.toFixed(1) ?? 0) },
    { h: 'Riesgo', v: (r) => r.e?.nivel ?? '', r: (r) => r.e && <Risk nivel={r.e.nivel} /> },
  ];
  const groups = [...data.reduce((m, r) => {
    const k = keyOf?.(r) ?? '—';
    const o = m.get(k) || { k, n: 0, s: 0, c: 0, alto: 0, medio: 0 };
    o.n++; if (r.e?.prom != null) { o.s += r.e.prom; o.c++; }
    if (r.e?.nivel === 'Alto') o.alto++;
    if (r.e?.nivel === 'Medio') o.medio++;
    return m.set(k, o);
  }, new Map()).values()];
  const summary = [
    { h: LABEL(tipo, user.rol).replace('Por ', ''), v: (g) => g.k }, { h: 'Alumnos', v: (g) => g.n },
    { h: 'Promedio', v: (g) => Number((g.c ? g.s / g.c : 0).toFixed(1)) }, { h: 'Riesgo alto', v: (g) => g.alto },
    { h: 'Riesgo medio', v: (g) => g.medio }, { h: '% en riesgo', v: (g) => Math.round(((g.alto + g.medio) / g.n) * 100) },
  ];
  const isStudent = tipo === 'estudiante';
  const cols = isStudent ? student : summary;
  const list = isStudent ? data : groups;

  const exportCsv = () => {
    const csv = '\ufeff' + [cols.map((c) => c.h), ...list.map((r) => cols.map((c) => c.v(r)))].map((l) => l.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-${tipo}-${periodo?.id}.csv`; a.click();
  };
  const pdf = () => { setAll(true); setTimeout(() => { window.print(); setAll(false); }, 150); };

  return (
    <>
      <PageHead eyebrow="Reportes" title="Reportes académicos" sub={`Periodo ${periodo?.id} · solo incluye registros validados.`}>
        <Btn v="light" onClick={exportCsv}><Download size={17} />Exportar Excel (.csv)</Btn>
        <Btn onClick={pdf}><FileText size={17} />Exportar PDF</Btn>
      </PageHead>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        {TYPES[user.rol].map((t) => (
          <button key={t} aria-pressed={tipo === t} onClick={() => setTipo(t)}
            className={cx('cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold', tipo === t ? 'border-moss bg-moss text-white' : 'border-line bg-white text-muted hover:text-forest')}>{LABEL(t, user.rol)}</button>
        ))}
      </div>
      <Hier v={h} set={setH} sem />
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <span className="mr-1 text-sm text-muted">Periodo</span>
        <select aria-label="Periodo" className={cx(inp, '!w-auto min-w-44')} value={pid} onChange={(e) => setPid(e.target.value)}>
          {[...db.periodos].sort(byRecent).map((p) => <option key={p.id} value={p.id}>{periodLabel(p.id)}{p.activo ? ' (activo)' : ''}</option>)}
        </select>
      </div>
      <DataTable key={`${tipo}-${pid}`} cols={cols} rows={list} size={all ? 1e9 : 10} rk={(r) => (r.a ? `${r.a.id}${porMateria ? r.g.id : ''}` : r.k)} empty="No hay información validada para este filtro." />
    </>
  );
}
