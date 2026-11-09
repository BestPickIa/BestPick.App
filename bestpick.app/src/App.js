import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { UsuarioProvider } from './contexts/UsuarioContext';
import { Perfil } from './pages/Perfil/Perfil';
import { Login } from './pages/Login/Login';
import { Home } from './pages/Home/Home';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Historico } from './pages/Historico/Historico';
import { Favorito } from './pages/Favorito/Favorito';
import { RotaPrivada } from './components/RotaPrivada/RotaPrivada';
import { Cadastro } from "./pages/Cadastro/Cadastro";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route element={<RotaPrivada><UsuarioProvider><Outlet /></UsuarioProvider></RotaPrivada>}>
          <Route path='/chat' element={<Home />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/historico' element={<Historico />} />
          <Route path='/favoritos' element={<Favorito />} />
          <Route path='/perfil' element={<Perfil />} />
        </Route>
        <Route path='/cadastro' element={<Cadastro />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
