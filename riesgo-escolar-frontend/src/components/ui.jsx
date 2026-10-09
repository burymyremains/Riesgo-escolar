import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Search, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LEVELS } from '../utils/risk';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const ROLES = { docente: 'Docente', tutor: 'Tutor', admin: 'Administrador' };
export const ROLE_LONG = { alumno: 'Alumno', docente: 'Docente', tutor: 'Tutor académico', admin: 'Administrador' };
// Roles con los que se puede iniciar sesión (el alumno no se administra desde "Usuarios y roles").
export const LOGIN_ROLES = { alumno: 'Alumno', ...ROLES };
export const COLORS = { 'Sin riesgo': '#4b9e33', Bajo: '#d4ad1e', Medio: '#e8862f', Alto: '#d94b4b' };
export const inp = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-forest outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15';
export const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const btn = (v = 'dark') => cx(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
  v === 'dark' && 'bg-moss text-white shadow-md shadow-moss/25 hover:bg-pine',
  v === 'light' && 'border border-line bg-white text-forest hover:bg-canvas',
  v === 'text' && '!px-2 !py-1 text-moss hover:underline',
);
export const Btn = ({ v, className, ...p }) => <button {...p} className={cx(btn(v), className)} />;
export const Card = ({ className, ...p }) => <div {...p} className={cx('rounded-2xl border border-line bg-white p-6', className)} />;
export const Field = ({ label, children }) => <label className="grid gap-1.5 text-sm font-medium text-forest">{label}{children}</label>;
export const Note = ({ err, children }) => (
  <p role="status" className={cx('rounded-xl px-4 py-2.5 text-sm', err ? 'bg-[#d94b4b]/10 text-[#b53a3a]' : 'bg-leaf text-moss')}>{children}</p>
);

export const PageHead = ({ eyebrow, title, sub, children }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-gold"><i className="h-0.5 w-8 bg-gold" />{eyebrow}</p>}
      <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-forest">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-base text-muted">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-3 print:hidden">{children}</div>
  </div>
);

export const Risk = ({ nivel }) => (
  <span style={{ background: `${COLORS[nivel]}22`, color: COLORS[nivel] }} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold">
    <i className="size-1.5 rounded-full" style={{ background: COLORS[nivel] }} />
    {nivel === 'Sin riesgo' ? nivel : `Riesgo ${nivel.toLowerCase()}`}
  </span>
);

// Banner de situación académica del alumno: indica si el riesgo es general o de asignaturas específicas.
const SIT_ICON = { ninguno: CheckCircle2, especifico: TriangleAlert, general: ShieldAlert, vacio: Eye };
export function Situacion({ sit, children }) {
  const I = SIT_ICON[sit.alcance] ?? Eye;
  const color = sit.alcance === 'vacio' ? '#6b7a70' : sit.alcance === 'ninguno' && !sit.observacion.length ? COLORS['Sin riesgo'] : COLORS[sit.nivel];
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border bg-white p-6" style={{ borderColor: `${color}55`, background: `${color}0f` }}>
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}26`, color }}><I size={28} /></span>
      <div className="min-w-64 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Situación académica</p>
        <h2 className="mt-1 text-2xl font-bold text-forest">{sit.titulo}</h2>
        <p className="mt-1 text-sm text-muted">{sit.detalle}</p>
      </div>
      <div className="flex flex-col items-end gap-3">
        {sit.alcance !== 'vacio' && <Risk nivel={sit.nivel} />}
        {children}
      </div>
    </div>
  );
}

export const Avatar = ({ name, nivel = 'Sin riesgo' }) => (
  <span style={{ background: `${COLORS[nivel]}26`, color: COLORS[nivel] }} className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold">{initials(name)}</span>
);

export const Stat = ({ icon: I, label, value, note, bad }) => (
  <Card className="!p-5">
    <div className="flex items-center gap-4">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl', bad ? 'bg-[#d94b4b]/12 text-[#d94b4b]' : 'bg-leaf text-moss')}><I size={20} /></span>
      <div><p className="text-sm text-muted">{label}</p><p className="text-3xl font-bold text-forest">{value}</p></div>
    </div>
    <p className={cx('mt-3 text-xs', bad ? 'text-[#d94b4b]' : 'text-muted')}>{note}</p>
  </Card>
);

export const Donut = ({ counts, total }) => {
  let acc = 0;
  const stops = LEVELS.map((l) => { const s = acc; acc += (counts[l] / (total || 1)) * 100; return `${COLORS[l]} ${s}% ${acc}%`; }).join(',');
  return (
    <div role="img" aria-label="Distribución del riesgo" className="grid size-44 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}>
      <div className="grid size-28 place-items-center rounded-full bg-white text-center"><div><b className="block text-3xl text-forest">{total}</b><span className="text-xs text-muted">alumnos</span></div></div>
    </div>
  );
};

// Filtro jerárquico: plantel → carrera → semestre.
export const fit = (v, r) => (!v.pl || r.pl?.id === v.pl) && (!v.car || r.car?.id === v.car) && (!v.sem || String(r.a.semestre) === v.sem);
const Sel = ({ label, value, onChange, children }) => (
  <select aria-label={label} className={cx(inp, '!w-auto min-w-44')} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
);
export function Hier({ v, set, sem }) {
  const { hier } = useApp();
  const cars = hier.carreras.filter((c) => !v.pl || c.plantelId === v.pl);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
      <span className="mr-1 text-sm text-muted">Plantel › Carrera{sem ? ' › Semestre' : ''}</span>
      {hier.planteles.length > 1 && (
        <Sel label="Plantel" value={v.pl || ''} onChange={(x) => set({ pl: x })}>
          <option value="">Todos los planteles</option>{hier.planteles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Sel>
      )}
      <Sel label="Carrera" value={v.car || ''} onChange={(x) => set({ ...v, car: x })}>
        <option value="">Todas las carreras</option>{cars.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </Sel>
      {sem && (
        <Sel label="Semestre" value={v.sem || ''} onChange={(x) => set({ ...v, sem: x })}>
          <option value="">Todos los semestres</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>Semestre {n}</option>)}
        </Sel>
      )}
    </div>
  );
}

// Tabla con búsqueda, ordenamiento y paginación. cols: { h, v(row) → valor, r?(row) → nodo, s?: false }
export function DataTable({ cols, rows, sort = 0, dir = 1, size = 10, rk, toolbar, empty = 'No hay registros que coincidan.' }) {
  const [q, setQ] = useState('');
  const [s, setS] = useState({ i: sort, d: dir });
  const [pg, setPg] = useState(0);
  const data = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = t ? rows.filter((r) => cols.some((c) => c.s !== false && String(c.v(r) ?? '').toLowerCase().includes(t))) : [...rows];
    const c = cols[s.i];
    return out.sort((a, b) => {
      const x = c.v(a), y = c.v(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true })) * s.d;
    });
  }, [rows, q, s]);
  const pages = Math.max(1, Math.ceil(data.length / size));
  const cur = Math.min(pg, pages - 1);
  const view = data.slice(cur * size, cur * size + size);
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        <label className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Buscar" placeholder="Buscar…" className={cx(inp, '!w-64 !pl-9')} value={q} onChange={(e) => { setQ(e.target.value); setPg(0); }} />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wider text-muted">
            <tr>
              {cols.map((c, i) => (
                <th key={c.h} className="px-4 py-3 font-semibold">
                  {c.s === false ? c.h : (
                    <button className="cursor-pointer font-semibold uppercase tracking-wider" onClick={() => setS({ i, d: s.i === i ? -s.d : 1 })}>
                      {c.h}{s.i === i ? (s.d > 0 ? ' ▲' : ' ▼') : ''}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line [&_td]:px-4 [&_td]:py-3">
            {view.map((r, i) => <tr key={rk ? rk(r) : i}>{cols.map((c) => <td key={c.h}>{c.r ? c.r(r) : c.v(r)}</td>)}</tr>)}
            {!view.length && <tr><td colSpan={cols.length} className="text-muted">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4 text-sm text-muted print:hidden">
        <span>{data.length ? `Mostrando ${cur * size + 1}–${cur * size + view.length} de ${data.length}` : '0 resultados'}</span>
        <div className="flex items-center gap-2">
          <Btn v="light" className="!px-3 !py-1.5" disabled={cur === 0} onClick={() => setPg(cur - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></Btn>
          <span>Página {cur + 1} de {pages}</span>
          <Btn v="light" className="!px-3 !py-1.5" disabled={cur >= pages - 1} onClick={() => setPg(cur + 1)} aria-label="Página siguiente"><ChevronRight size={16} /></Btn>
        </div>
      </div>
    </div>
  );
}
