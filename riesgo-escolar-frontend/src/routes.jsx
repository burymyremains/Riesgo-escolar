import { BookOpen, Building2, CalendarDays, ClipboardCheck, ClipboardList, LayoutGrid, MessageSquareText, TriangleAlert, UserRound, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Grades from './pages/Grades';
import Alerts from './pages/Alerts';
import Catalogs from './pages/Catalogs';
import Periods from './pages/Periods';
import Reports from './pages/Reports';
import StudentHome from './pages/StudentHome';
import Subjects from './pages/Subjects';
import Requests from './pages/Requests';

const ALL = ['admin', 'docente', 'tutor'];
export const ROUTES = [
  { path: '/', label: 'Resumen', El: Dashboard, roles: ALL, icon: LayoutGrid, section: 'main' },
  { path: '/mi-panel', label: 'Mi panel', El: StudentHome, roles: ['alumno'], icon: UserRound, section: 'main' },
  { path: '/mis-materias', label: 'Mis materias', El: Subjects, roles: ['alumno'], icon: BookOpen, section: 'main' },
  { path: '/tutoria', label: 'Resumen de tutorados', El: Dashboard, roles: ['docente'], tutorDoc: true, as: 'tutor', icon: Users, section: 'main' },
  { path: '/solicitudes', label: 'Solicitudes de tutoría', labels: { alumno: 'Solicitar tutoría' }, El: Requests, roles: ['alumno', 'tutor', 'docente'], tutorDoc: true, as: 'tutor', icon: MessageSquareText, section: 'main' },
  { path: '/tutoria/alertas', label: 'Alertas de tutorados', El: Alerts, roles: ['docente'], tutorDoc: true, as: 'tutor', icon: TriangleAlert, section: 'main' },
  { path: '/tutoria/reportes', label: 'Reportes de tutorados', El: Reports, roles: ['docente'], tutorDoc: true, as: 'tutor', icon: ClipboardList, section: 'main' },
  { path: '/calificaciones', label: 'Calificaciones y asistencias', El: Grades, roles: ['docente'], icon: ClipboardCheck, section: 'main' },
  { path: '/alertas', label: 'Alertas y recomendaciones', El: Alerts, roles: ['tutor', 'docente', 'admin'], icon: TriangleAlert, section: 'main' },
  { path: '/reportes', label: 'Reportes', El: Reports, roles: ALL, icon: ClipboardList, section: 'main' },
  // Apartados de tutoría de un docente que además es tutor: viven dentro del perfil Docente (no hay un perfil Tutor aparte).
  { path: '/catalogos', label: 'Planteles, carreras y alumnos', El: Catalogs, roles: ['admin'], icon: Building2, section: 'admin' },
  { path: '/periodos', label: 'Periodos escolares', El: Periods, roles: ['admin'], icon: CalendarDays, section: 'admin' },
];
// ¿Puede este usuario abrir la ruta? Las rutas `tutorDoc` solo se abren a un docente si además es tutor.
export const canSee = (r, rol, esTutor) => r.roles.includes(rol) && (!r.tutorDoc || rol !== 'docente' || esTutor);
// Un docente-tutor ve sus apartados de tutoría agrupados en su propia sección del menú.
export const sectionOf = (r, rol) => (rol === 'docente' && r.as === 'tutor' ? 'tutoria' : r.section);
export const labelOf = (r, rol) => r.labels?.[rol] ?? r.label;
export const homeOf = (rol) => (rol === 'alumno' ? '/mi-panel' : '/');
