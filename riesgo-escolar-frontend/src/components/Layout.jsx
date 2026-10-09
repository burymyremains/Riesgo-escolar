import { Bell, ChevronRight, LogOut } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp, useRoot } from '../context/AppContext';
import { ROLE_LONG, cx, initials } from './ui';
import { ROUTES, canSee, labelOf, sectionOf } from '../routes';

const SECTIONS = [['main', 'Menú principal'], ['tutoria', 'Tutoría'], ['admin', 'Administración']];

export default function Layout() {
  const { user, db, alertas, solicitudes, esTutor, logout } = useApp();
  const { tutorView } = useRoot();
  const { pathname } = useLocation();

  if (!db) return <p className="p-10 text-muted">Cargando información…</p>;

  const nuevas = alertas.filter((a) => a.estado === 'Nueva').length;
  const tv = tutorView ?? (user.rol === 'tutor' ? { alertas, solicitudes } : null);
  const nuevasTut = tutorView ? tutorView.alertas.filter((a) => a.estado === 'Nueva').length : 0;
  const pendientes = tv ? tv.solicitudes.filter((s) => s.estado === 'Pendiente').length : 0;
  const badge = { '/alertas': nuevas, '/tutoria/alertas': nuevasTut, '/solicitudes': pendientes };
  const items = ROUTES.filter((r) => canSee(r, user.rol, esTutor));
  const route = ROUTES.find((r) => r.path === pathname);
  const current = route && labelOf(route, user.rol);
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[290px_1fr]">
      <aside className="flex flex-col bg-pine p-5 text-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex justify-center items-center rounded-2xl bg-white p-2 shadow-sm">
          <img 
            src="/logos/uaem-logo.png" 
            alt="Universidad Autónoma del Estado de México" 
            className="w-full h-auto max-h-36 object-contain py-1"          />
        </div>
        

        <div className="mt-5 flex items-center gap-3 border-y border-white/10 py-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold text-sm font-bold text-forest">{initials(user.nombre)}</span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.nombre}</p>
            <p className="text-sm text-white/65">{ROLE_LONG[user.rol]}{user.rol === 'docente' && esTutor ? ' y tutor' : ''}</p>
          </div>
        </div>

        <nav aria-label="Principal" className="flex-1">
          {SECTIONS.map(([k, title]) => {
            const list = items.filter((r) => sectionOf(r, user.rol) === k);
            return list.length > 0 && (
              <div key={k}>
                <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{title}</p>
                {list.map((r) => (
                  <NavLink key={r.path} to={r.path} end
                    className={({ isActive }) => cx('relative mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-white/85 transition hover:bg-white/10', isActive && 'bg-moss text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-full before:bg-gold')}>
                    <r.icon size={19} />
                    <span className="flex-1">{labelOf(r, user.rol)}</span>
                    {badge[r.path] > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#d94b4b] px-1.5 text-xs font-bold">{badge[r.path]}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-4">
          <button onClick={logout} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-white/85 hover:bg-white/10">
            <LogOut size={19} />Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4 text-sm print:hidden lg:px-10">
          <p className="flex items-center gap-2 text-muted">Panel académico <ChevronRight size={14} /><b className="font-semibold text-forest">{current}</b></p>
          <div className="flex items-center gap-5 text-muted">
            <span className="relative">
              <Bell size={20} aria-label={`${nuevas + nuevasTut + pendientes} avisos nuevos`} />
              {nuevas + nuevasTut + pendientes > 0 && <i className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#d94b4b]" />}
            </span>
            <span className="hidden border-l border-line pl-5 sm:block">Última actualización: hoy, {hora}</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1240px] flex-1 p-6 lg:p-10"><Outlet /></main>
      </div>
    </div>
  );
}