# Sistema Inteligente de Evaluación Académica y Detección de Riesgo Escolar (frontend)

React 18 + Vite + Tailwind CSS v4 + react-router-dom + React Context. Backend simulado en `src/api`.

    npm install
    npm run dev

Si ya tenías una versión anterior corriendo: detén el servidor, ejecuta `npm install` y arranca con `npm run dev -- --force`.
Si la pantalla sale en blanco, abre la consola del navegador (F12) y limpia el almacenamiento del sitio.

Usuarios demo (contraseña `demo123`): admin@, docente@, docente2@, tutor@ `uaemex.mx`.
- `docente@uaemex.mx` es **docente y tutor** (entra por la pestaña *Docente*); `docente2@` es solo docente; `tutor@` / `tutor2@` son tutores sin docencia (pestaña *Tutor*).

**Alumnos** (rol *Alumno* en el login, contraseña `demo123`):
- `alumno@uaemex.mx` → riesgo en una asignatura específica (y una materia cursada en el intersemestral 2026I).
- `alumno2@uaemex.mx` → riesgo académico general.
- Cualquier alumno: `<matrícula>@alumno.uaemex.mx` (ej. `20231005@alumno.uaemex.mx`).

## Estructura

- `src/api/db.json` datos mock · `src/api/api.js` endpoints simulados y reglas RN-01, 02, 05, 06, 07
- `src/utils/risk.js` motor de IA simulado (`evaluate` por materia, `evaluateAll` general) y recomendaciones
- `src/utils/student.js` materias del alumno y clasificación del riesgo (general / asignatura específica)
- `src/utils/periods.js` nomenclatura y validación de periodos
- `src/context/AppContext.jsx` estado global y visibilidad por rol (RN-03/04)
- `src/pages` una pantalla por caso de uso · `src/components` UI reutilizable (DataTable, filtro jerárquico)
- `public/plantilla-calificaciones.csv` archivo de prueba para importar calificaciones (se aplica al grupo seleccionado)

## Perfil de Alumno

| Ruta | Pantalla |
|---|---|
| `/mi-panel` | Situación académica, nivel de riesgo (general o por asignatura), promedio, asistencia y estado de su solicitud tutorial |
| `/mis-materias` | Materias del periodo: parciales, faltas, % de asistencia y riesgo por materia. Permite consultar periodos anteriores e intersemestrales |
| `/solicitudes` | Solicitud de atención tutorial (motivo, materia, modalidad, fecha/horario sugerido) y seguimiento |

El tutor gestiona esas solicitudes en `/solicitudes` (agendar cita, rechazar con motivo, marcar atendida).

**Riesgo general vs. específico:** una materia está "en riesgo" con nivel Medio o Alto. Si afecta a 2 o más materias y a la mitad o más de las inscritas, el riesgo es *general*; en otro caso es *de asignatura(s) específica(s)*. El nivel global es el de la materia más crítica.

## Modelo de datos (cambios)

- `inscripciones` (nuevo): alumno × grupo × periodo. Un alumno cursa varias materias.
- `calificaciones`: ahora lleva `grupoId` (un registro por alumno, grupo y periodo). `evaluaciones` sigue siendo una por alumno y periodo (general), con el detalle por materia en `materias`.
- `solicitudes` (nuevo): solicitudes de tutoría. `citas` puede referir a una `solicitudId`.
- `alumnos`: se añade `correo` (acceso al portal). `grupoId` pasa a ser el *grupo principal*.
- El docente captura y ve únicamente las materias de sus propios grupos.

## Docente que también es tutor

No existe un perfil de Tutor aparte para quien también es docente: entra por la pestaña **Docente** (la pestaña Tutor lo rechaza con un aviso) y su menú añade la sección **Tutoría** con *Resumen de tutorados*, *Solicitudes de tutoría*, *Alertas de tutorados* y *Reportes de tutorados*.

- Se marca con `tutor: true` en el usuario docente (Administración › Usuarios y roles › *Asignar / Quitar tutoría*). No se puede quitar mientras tenga tutorados asignados.
- Las mismas pantallas sirven a ambas calidades: la ruta indica la vista (`as: 'tutor'` en `routes.jsx`) y `useApp()` devuelve los datos de esa vista. Docencia = solo sus grupos; Tutoría = sus tutorados con la evaluación general.
- Los tutores sin docencia conservan su perfil y menú de siempre.

## Periodos

Formato `AAAA` + letra: `2026A` (ene–jun), `2026B` (ago–dic), `2026I` (intersemestral intensivo).
Al crear un periodo se normaliza la entrada (`2026-b` → `2026B`) y se valida: formato, año igual al de la fecha de inicio, inicio < fin, corte dentro del periodo y sin traslapes con otros periodos.
Administración › Periodos permite filtrar por tipo y año; Reportes y *Mis materias* permiten consultar cualquier periodo; Catálogos › Inscripciones registra y filtra inscripciones por periodo.
