import { useState } from 'react';
import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, HeadContent, redirect, Link } from '@tanstack/react-router';
import { UsuarioProvider } from './contexts/UsuarioContext';
import { Route as PerfilRoute } from './routes/perfil';
import { Login } from './pages/Login/Login';
import { Route as ChatRoute } from './routes/chat';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Historico } from './pages/Historico/Historico';
import { Favorito } from './pages/Favorito/Favorito';
import { Cadastro } from './pages/Cadastro/Cadastro';

export function createAppRouter(history) {
  const root = createRootRoute({ component: () => <><HeadContent /><Outlet /></>, notFoundComponent: () => <p>P?gina n?o encontrada. <Link to="/">Ir ao Dashboard</Link></p> });
  const privateRoute = createRoute({
    getParentRoute: () => root, id: 'authenticated',
    beforeLoad: () => { if (!localStorage.getItem('token')) throw redirect({ to: '/login', replace: true }); },
    component: () => <UsuarioProvider><Outlet /></UsuarioProvider>,
  });
  const pages = [['/', Dashboard], ['/favoritos', Favorito], ['/historico', Historico]];
  const routeTree = root.addChildren([
    createRoute({ getParentRoute: () => root, path: '/login', component: Login }),
    createRoute({ getParentRoute: () => root, path: '/cadastro', component: Cadastro }),
    createRoute({ getParentRoute: () => root, path: '/dashboard', beforeLoad: () => { throw redirect({ to: '/', replace: true }); } }),
    privateRoute.addChildren([...pages.map(([path, component]) => createRoute({ getParentRoute: () => privateRoute, path, component })), ChatRoute.update({ getParentRoute: () => privateRoute, path: '/chat' }), PerfilRoute.update({ getParentRoute: () => privateRoute, path: '/perfil' })]),
  ]);
  return createRouter({ routeTree, history, defaultViewTransition: true });
}
export default function App() {
  const [router] = useState(() => createAppRouter());
  return <RouterProvider router={router} />;
}
