import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Btn, Field, LOGIN_ROLES, Note, cx, inp } from '../components/ui';

export default function Login() {
  const { login } = useApp();
  const [f, setF] = useState({ correo: '', password: '', rol: 'docente', remember: false });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(f); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden p-14 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ background: 'radial-gradient(ellipse at 85% 0%, rgba(120,120,40,.45), transparent 50%), linear-gradient(160deg,#1f6a47,#123524 55%,#0d2a1c)' }}>
        <img src="/logos/ornamento.png" alt="" className="pointer-events-none absolute -bottom-24 -right-24 w-[460px] opacity-20" />
        <div className="relative w-fit rounded-2xl bg-white p-3"><img src="/logos/uaem-logo.png" alt="Universidad Autónoma del Estado de México" className="h-26" /></div>
        <div className="relative">
          <p className="mb-6 w-fit border-b border-gold pb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Acompañamiento académico</p>
          <h1 className="text-6xl font-extrabold leading-[1.05] tracking-[-0.04em]">Detecta el riesgo<br /><span className="text-gold">escolar a tiempo.</span></h1>
          <p className="mt-6 max-w-lg text-lg text-white/80">Consulta calificaciones, asistencias y alertas para acompañar a cada estudiante antes de que abandone o repruebe.</p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            {['Decisiones basadas en datos', 'Atención oportuna'].map((t) => <span key={t} className="flex items-center gap-2"><i className="grid size-6 place-items-center rounded-full bg-gold text-forest"><Check size={14} /></i>{t}</span>)}
          </div>
        </div>
        <p className="relative flex items-center gap-3 text-sm text-white/70"><ShieldCheck size={18} className="text-gold" />Dirección de Servicios Escolares · UAEMéx</p>
      </section>
      <section className="flex flex-col justify-between">
        <div className="m-auto w-full max-w-md p-8">
          <img src="/logos/uaem-logo.png" alt="UAEM" className="mb-8 h-16 lg:hidden" />
          <form onSubmit={submit} className="grid gap-5">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Panel académico</p>
              <h2 className="text-4xl font-extrabold tracking-[-0.03em]">Iniciar sesión</h2>
              <p className="mt-2 text-muted">{f.rol === 'alumno' ? 'Consulta tu situación académica y solicita atención de tu tutor.' : 'Ingresa para dar seguimiento a tus estudiantes.'}</p>
            </div>
            <div role="group" aria-label="Rol de acceso" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-1.5">
              {Object.entries(LOGIN_ROLES).map(([k, v]) => (
                <button type="button" key={k} aria-pressed={f.rol === k} onClick={() => setF({ ...f, rol: k })}
                  className={cx('cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold transition', f.rol === k ? 'bg-moss text-white shadow-md' : 'text-muted hover:text-forest')}>{v}</button>
              ))}
            </div>
            <Field label="Correo institucional">
              <span className="relative"><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input required type="email" placeholder={f.rol === 'alumno' ? 'matricula@alumno.uaemex.mx' : 'nombre@uaemex.mx'} className={cx(inp, '!py-4 !pl-11')} value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></span>
            </Field>
            <Field label="Contraseña">
              <span className="relative"><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input required type={show ? 'text' : 'password'} placeholder="Ingresa tu contraseña" className={cx(inp, '!py-4 !pl-11 !pr-12')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" className="size-4 accent-[#2a6547]" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} />Recordarme en este equipo</label>
            {err && <Note err>{err}</Note>}
            <Btn disabled={busy} className="!py-4 !text-base">{busy ? 'Validando…' : <>Iniciar sesión <ArrowRight size={18} /></>}</Btn>
            <p className="rounded-xl border border-line bg-white p-3 text-center text-sm text-muted"><ShieldCheck size={16} className="mr-2 inline text-moss" />Tus datos están protegidos y son de uso institucional.</p>
          </form>
        </div>
        <img src="/logos/banner-uaemex.png" alt="www.uaemex.mx" className="w-full" />
      </section>
    </div>
  );
}
