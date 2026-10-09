import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { Avatar, Btn, DataTable, Note, PageHead, Risk, btn, cx, inp } from '../components/ui';
import { evaluate } from '../utils/risk';

const bad = (v) => v !== '' && (isNaN(v) || v < 0 || v > 10);

export default function Grades() {
  const { rows, grupos, run, periodo } = useApp();
  const [gid, setGid] = useState(grupos[0]?.id || '');
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState(null);
  // Un registro = un alumno en un grupo (materia). Las ediciones pendientes se identifican por grupo|matrícula.
  const list = rows.filter((r) => r.mats.some((m) => m.g.id === gid));
  const byKey = new Map(rows.flatMap((r) => r.mats.map((m) => [`${m.g.id}|${r.a.id}`, { r, c: m.c }])));
  const key = (r) => `${gid}|${r.a.id}`;
  const val = (r, k) => edit[key(r)]?.[k] ?? byKey.get(key(r))?.c?.[k] ?? '';
  const set = (r, k, v) => setEdit((e) => ({ ...e, [key(r)]: { ...e[key(r)], [k]: v } }));
  const cur = (r) => ({ p1: val(r, 'p1'), p2: val(r, 'p2'), asistencias: val(r, 'asistencias'), faltas: val(r, 'faltas') });
  const pending = Object.keys(edit);
  const inEdit = (id, k) => edit[id]?.[k] ?? byKey.get(id)?.c?.[k] ?? '';
  const merged = (id) => ({ p1: inEdit(id, 'p1'), p2: inEdit(id, 'p2'), asistencias: inEdit(id, 'asistencias'), faltas: inEdit(id, 'faltas') });
  const anyBad = pending.some((id) => bad(inEdit(id, 'p1')) || bad(inEdit(id, 'p2')));

  const save = async () => {
    setMsg(null);
    try {
      await run(() => api.saveGrades(pending.map((id) => { const [grupoId, alumnoId] = id.split('|'); return { alumnoId, grupoId, ...merged(id) }; })));
      setEdit({}); setMsg({ ok: 'Registro guardado exitosamente. El riesgo se reevaluó.' });
    } catch (e) { setMsg({ err: e.message }); }
  };
  const importCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const next = { ...edit };
    let ok = 0, skip = 0;
    (await file.text()).split(/\r?\n/).slice(1).filter((l) => l.trim()).forEach((l) => {
      const [m, p1, p2, asistencias, faltas] = l.split(',').map((s) => s.trim());
      if (!byKey.has(`${gid}|${m}`) || [p1, p2, asistencias, faltas].some((x) => x === undefined || x === '' || isNaN(x))) { skip++; return; }
      next[`${gid}|${m}`] = { p1, p2, asistencias, faltas }; ok++;
    });
    setEdit(next); e.target.value = '';
    setMsg({ ok: `${ok} registros cargados en el grupo ${gid}${skip ? `, ${skip} omitidos (no inscritos en este grupo o con datos inválidos)` : ''}. Revisa los datos y guarda el registro.` });
  };
  const cell = (r, k) => (
    <input type="number" step={k === 'p1' || k === 'p2' ? '0.1' : '1'} min="0" aria-label={`${k} de ${r.a.nombre}`}
      className={cx(inp, '!w-24', bad(val(r, k)) && '!border-[#d94b4b]')} value={val(r, k)} onChange={(e) => set(r, k, e.target.value)} />
  );
  const num = (r, k) => Number(val(r, k) || 0);
  const cols = [
    { h: 'Alumno', v: (r) => r.a.nombre, r: (r) => <span className="flex items-center gap-3"><Avatar name={r.a.nombre} nivel={evaluate(cur(r)).nivel} /><span><b className="block">{r.a.nombre}</b><span className="text-xs text-muted">{r.a.id} · sem. {r.a.semestre}</span></span></span> },
    { h: 'Parcial 1', v: (r) => num(r, 'p1'), r: (r) => cell(r, 'p1') },
    { h: 'Parcial 2', v: (r) => num(r, 'p2'), r: (r) => cell(r, 'p2') },
    { h: 'Asistencias', v: (r) => num(r, 'asistencias'), r: (r) => cell(r, 'asistencias') },
    { h: 'Faltas', v: (r) => num(r, 'faltas'), r: (r) => cell(r, 'faltas') },
    { h: 'Riesgo estimado', v: (r) => evaluate(cur(r)).score, r: (r) => <Risk nivel={evaluate(cur(r)).nivel} /> },
  ];

  return (
    <>
      <PageHead eyebrow="Registro académico" title="Calificaciones y asistencias" sub={`Periodo ${periodo?.id} · los registros solo se aceptan antes de la fecha de corte (${periodo?.corte}).`}>
        <a href="/plantilla-calificaciones.csv" download className={btn('light')}><Download size={17} />Plantilla CSV</a>
        <label className={btn('light')}><Upload size={17} />Importar CSV<input type="file" accept=".csv" className="sr-only" onChange={importCsv} /></label>
      </PageHead>
      <DataTable cols={cols} rows={list} rk={(r) => r.a.id} size={10}
        toolbar={<select aria-label="Grupo" className={cx(inp, '!w-auto')} value={gid} onChange={(e) => setGid(e.target.value)}>{grupos.map((g) => <option key={g.id} value={g.id}>Grupo {g.id}</option>)}</select>} />
      {anyBad && <div className="mt-4"><Note err>Error: La calificación debe estar entre 0.0 y 10.0</Note></div>}
      {msg && <div className="mt-4"><Note err={!!msg.err}>{msg.err || msg.ok}</Note></div>}
      <div className="mt-6"><Btn disabled={anyBad || !pending.length} onClick={save}>Guardar y finalizar registro{pending.length ? ` (${pending.length})` : ''}</Btn></div>
    </>
  );
}
