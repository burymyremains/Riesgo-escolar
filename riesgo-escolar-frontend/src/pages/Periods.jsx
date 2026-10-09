import { useState } from 'react';
import { api } from '../api/api';
import { useApp } from '../context/AppContext';
import { Btn, DataTable, Field, Note, PageHead, cx, inp } from '../components/ui';
import { PERIOD_FORMAT_HELP, isValidPeriod, normalizePeriod, periodName, periodType, periodYear } from '../utils/periods';

const BLANK = { id: '', inicio: '', fin: '', corte: '' };
const Tipo = ({ id }) => (
  <span className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold', periodType(id) === 'Intersemestral' ? 'bg-gold/20 text-[#8a6a10]' : 'bg-leaf text-moss')}>{periodType(id)}</span>
);

export default function Periods() {
  const { db, run } = useApp();
  const [form, setForm] = useState(BLANK);
  const [err, setErr] = useState('');
  const [tipo, setTipo] = useState('');
  const [anio, setAnio] = useState('');
  const go = async (fn) => { setErr(''); try { await run(fn); return true; } catch (e) { setErr(e.message); return false; } };
  const add = async (e) => { e.preventDefault(); if (await go(() => api.upsert('periodos', { ...form, id: normalizePeriod(form.id), activo: false }, true))) setForm(BLANK); };
  const id = normalizePeriod(form.id);

  // Cuántos alumnos están inscritos y cuántos registros de calificación tiene cada periodo.
  const insc = (p) => new Set(db.inscripciones.filter((i) => i.periodo === p.id).map((i) => i.alumnoId)).size;
  const regs = (p) => db.calificaciones.filter((c) => c.periodo === p.id).length;
  const anios = [...new Set(db.periodos.map((p) => periodYear(p.id)).filter(Boolean))].sort().reverse();
  const rows = db.periodos.filter((p) => (!tipo || periodType(p.id) === tipo) && (!anio || periodYear(p.id) === anio));

  const F = (k, label, type = 'date') => <Field label={label}><input required type={type} className={inp} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>;
  const cols = [
    { h: 'Periodo', v: (p) => p.id, r: (p) => <span><b className="block">{p.id}</b><span className="text-xs text-muted">{periodName(p.id)}</span></span> },
    { h: 'Inicio', v: (p) => p.inicio }, { h: 'Fin', v: (p) => p.fin },
    { h: 'Tipo', v: (p) => periodType(p.id), r: (p) => <Tipo id={p.id} /> },
    { h: 'Fecha de corte', v: (p) => p.corte, r: (p) => <input type="date" aria-label={`Corte ${p.id}`} className={`${inp} !w-44`} value={p.corte} onChange={(e) => go(() => api.upsert('periodos', { id: p.id, corte: e.target.value }))} /> },
    { h: 'Alumnos inscritos', v: insc }, { h: 'Registros', v: regs },
    { h: 'Estado', v: (p) => (p.activo ? 'Activo' : 'Cerrado') },
    { h: 'Acciones', s: false, v: () => '', r: (p) => !p.activo && <Btn v="text" onClick={() => go(() => api.activatePeriod(p.id))}>Activar</Btn> },
  ];
  const toolbar = (
    <>
      <select aria-label="Tipo de periodo" className={cx(inp, '!w-auto')} value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="">Todos los tipos</option><option value="Ordinario">Ordinarios (A / B)</option><option value="Intersemestral">Intersemestrales (I)</option>
      </select>
      <select aria-label="Año" className={cx(inp, '!w-auto')} value={anio} onChange={(e) => setAnio(e.target.value)}>
        <option value="">Todos los años</option>{anios.map((y) => <option key={y}>{y}</option>)}
      </select>
    </>
  );
  return (
    <>
      <PageHead eyebrow="Administración" title="Periodos escolares" sub="Solo el periodo activo acepta registros, y únicamente hasta su fecha de corte. Incluye los periodos intersemestrales intensivos." />
      <form onSubmit={add} className="mb-2 grid items-end gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Periodo (ej. 2027A, 2027B, 2027I)">
          <input required placeholder="2027A" maxLength={20} className={inp} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} onBlur={() => setForm((f) => ({ ...f, id: normalizePeriod(f.id) }))} />
        </Field>
        {F('inicio', 'Inicio')}{F('fin', 'Fin')}{F('corte', 'Fecha de corte')}
        <Btn>Crear periodo</Btn>
      </form>
      <p className={cx('mb-6 px-1 text-sm', form.id && !isValidPeriod(id) ? 'text-[#b53a3a]' : 'text-muted')}>
        {form.id && isValidPeriod(id) ? `${id}: ${periodName(id)} · ${periodType(id)}` : PERIOD_FORMAT_HELP}
      </p>
      {err && <div className="mb-4"><Note err>{err}</Note></div>}
      <DataTable cols={cols} rows={rows} sort={1} dir={-1} rk={(p) => p.id} toolbar={toolbar} />
    </>
  );
}
