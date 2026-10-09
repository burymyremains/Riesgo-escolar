import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import App from './App';
import './index.css';

// Si algo falla al renderizar, muestra el error en lugar de dejar la pantalla en blanco.
class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
        <h1>Ocurrió un error al cargar la aplicación</h1>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#b53a3a' }}>{String(this.state.error?.stack || this.state.error)}</pre>
        <button onClick={() => { localStorage.clear(); sessionStorage.clear(); location.reload(); }}>Limpiar sesión y recargar</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Boundary><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></Boundary></StrictMode>,
);
