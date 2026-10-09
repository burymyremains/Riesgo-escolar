import { Navigate, Route, Routes } from 'react-router-dom';
import { ViewCtx, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ROUTES, canSee, homeOf } from './routes';

export default function App() {
  const { user, esTutor } = useApp();
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path}
            element={canSee(r, user.rol, esTutor) ? <ViewCtx.Provider value={r.as ?? null}><r.El /></ViewCtx.Provider> : <Navigate to={homeOf(user.rol)} replace />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to={homeOf(user.rol)} replace />} />
    </Routes>
  );
}
