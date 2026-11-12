'use client';

import React, { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useApp, initials, logout } from '@/lib/store';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  LayoutGrid,
  Heart,
  MessageCircle,
  History,
  ChevronsLeft,
  LogOut,
} from 'lucide-react';
import logoCompleto from '../assets/Logo BestPick em Verde Lima (1).png';
import logoIcon from '../assets/Emblema de sacola com checkmark neon (1).png';

// ============================================================================
// Componente Logo SVG
// ============================================================================

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1024 1024" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Alça superior */}
    <path
      d="M 300 400 Q 300 150, 512 150 Q 724 150, 724 400"
      stroke="currentColor"
      strokeWidth="80"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bolsa principal */}
    <path
      d="M 250 400 L 774 400 Q 824 400, 824 475 L 824 850 Q 824 900, 774 900 L 250 900 Q 200 900, 200 850 L 200 475 Q 200 400, 250 400 Z"
      stroke="currentColor"
      strokeWidth="80"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Checkmark */}
    <path
      d="M 350 600 L 500 750 L 700 550"
      stroke="currentColor"
      strokeWidth="80"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ============================================================================
// Store do sidebar (fora do React, com useSyncExternalStore)
// ============================================================================

type SidebarState = 'auto' | 'open' | 'closed';

const STORAGE_KEY = 'bestpick:sidebar-collapsed';
let state: SidebarState = 'auto';
const subscribers = new Set<() => void>();
const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
};
const getSnapshot = () => state;
const getServerSnapshot = (): SidebarState => 'auto';
function setState(next: SidebarState) {
  if (next === state) return;
  state = next;
  subscribers.forEach(callback => callback());
}
const isMobile = () => window.innerWidth < 768;
function initializeSidebar() {
  if (state !== 'auto') return;
  // Mobile: sempre retraído
  if (isMobile()) {
    setState('closed');
    return;
  }
  // Desktop: respeita localStorage
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  setState(saved === '1' ? 'closed' : 'open');
}
function toggleSidebar() {
  const collapsed = state === 'closed' || (state === 'auto' && isMobile());
  const next = collapsed ? 'open' : 'closed';
  setState(next);
  if (!isMobile()) {
    try { window.localStorage.setItem(STORAGE_KEY, next === 'closed' ? '1' : '0'); } catch { /* Keep the in-memory preference. */ }
  }
}
function closeOnMobile() {
  if (isMobile()) setState('closed');
}

// ============================================================================
// Componente Avatar
// ============================================================================

interface AvatarProps {
  size?: 'sm' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ size = 'sm' }) => {
  const { name, avatar: src } = useApp();
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    lg: 'h-28 w-28 text-3xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses[size]} grid shrink-0 place-items-center rounded-full bg-hero font-bold text-primary-foreground`}
    >
      {initials(name)}
    </span>
  );
};

// ============================================================================
// Componente PageHeader
// ============================================================================

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-rise sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 break-words">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ============================================================================
// Componente AppShell
// ============================================================================

interface AppShellProps {
  title: string;
  children: ReactNode;
  fullBleed?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  children,
  fullBleed = false,
}) => {
  const navigate = useNavigate();
  const { name: userName } = useApp();
  const sidebarState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(initializeSidebar, []);
  const isRecolhida = sidebarState === 'closed';
  const handleToggleSidebar = toggleSidebar;
  const handleCloseSidebar = closeOnMobile;
  const handleNavigate = closeOnMobile;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutGrid },
    { to: '/favoritos', label: 'Favoritos', icon: Heart },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/historico', label: 'Histórico', icon: History },
  ];

  // Obter pathname para usar como key no main (garante re-render e animate-rise)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <div
      data-app-shell
      data-state={sidebarState}
      className="min-h-screen bg-background overflow-x-hidden pl-16 transition-padding duration-300 md:pl-64 md:data-[state=closed]:pl-16"
    >
      {/* Overlay (mobile) - não aparece pois sidebar sempre fica retraída */}
      {sidebarState === 'open' && !isMobile() && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={handleCloseSidebar}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ viewTransitionName: 'sidebar' }}
        data-state={sidebarState}
        className="group/side fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar px-3 py-4 text-sidebar-foreground shadow-lift transition-width duration-300 data-[state=closed]:w-16 max-md:data-[state=auto]:w-16 md:shadow-none"
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={handleNavigate}
          aria-label="Ir para home"
          className="mb-4 flex flex-col items-center gap-3 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2"
        >
          {/* Logo aberto - com texto */}
          <img
            src={logoCompleto}
            alt="BestPick"
            className="h-24 w-24 object-contain group-data-[state=closed]/side:hidden max-md:group-data-[state=auto]/side:hidden"
          />
          
          {/* Logo retraído - só ícone (bem maior) */}
          <img
            src={logoIcon}
            alt="BestPick"
            className="h-14 w-14 object-contain hidden group-data-[state=closed]/side:block max-md:group-data-[state=auto]/side:block"
          />
        </Link>

        {/* Botão de recolher/expandir (apenas desktop) */}
        <button
          type="button"
          onClick={handleToggleSidebar}
          aria-label={isRecolhida ? 'Expandir menu' : 'Recolher menu'}
          title={isRecolhida ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-3.5 top-7 grid h-7 w-7 place-items-center rounded-full border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shadow-lift transition-transform hover:scale-110 hidden md:grid"
        >
          <ChevronsLeft
            className="h-4 w-4 transition-transform duration-300 group-data-[state=closed]/side:rotate-180 max-md:group-data-[state=auto]/side:rotate-180"
          />
        </button>

        {/* Navegação */}
        <nav aria-label="Navegação principal" className="mt-2 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              aria-label={label}
              title={isRecolhida ? label : undefined}
              onClick={handleNavigate}
              className="flex h-11 items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=closed]/side:justify-center group-data-[state=closed]/side:px-0 max-md:group-data-[state=auto]/side:justify-center max-md:group-data-[state=auto]/side:px-0 data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="group-data-[state=closed]/side:hidden max-md:group-data-[state=auto]/side:hidden">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Bloco de ajuda (aberto) */}
        {false && (
          <div className="mt-auto rounded-2xl bg-sidebar-accent p-4 group-data-[state=closed]/side:hidden max-md:group-data-[state=auto]/side:hidden">
            <h3 className="mt-2 text-sm font-semibold text-sidebar-accent-foreground">
              Precisa de ajuda?
            </h3>
            <p className="mt-1 text-xs text-sidebar-accent-foreground">
              Descreva o que procura e a IA encontra o melhor produto.
            </p>
            <Link
              to="/chat"
              onClick={handleNavigate}
              className="mt-3 inline-flex rounded-lg bg-sidebar-primary px-3 py-1.5 text-xs font-semibold text-sidebar-primary-foreground transition-colors hover:opacity-90"
            >
              Abrir chat
            </Link>
          </div>
        )}

        {/* Atalho de chat (recolhido) - REMOVIDO */}
        {false && (
          <Link
            to="/chat"
            title="Abrir chat"
            aria-label="Abrir chat"
            onClick={handleNavigate}
            className="mt-auto hidden h-11 place-items-center rounded-xl bg-sidebar-accent text-sidebar-primary transition-colors hover:opacity-90 group-data-[state=closed]/side:grid max-md:group-data-[state=auto]/side:hidden"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
        )}
      </aside>

      {/* Header */}
      <header
        style={{ viewTransitionName: 'topbar' }}
        className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur"
      >
        <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 pl-6 pr-3 sm:px-8">
          <h2 className="min-w-0 truncate font-display text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              to="/perfil"
              aria-label={`Meu perfil (${userName})`}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-1 shadow-soft transition-colors hover:border-primary data-[status=active]:border-primary sm:pr-3"
            >
              <Avatar />
              <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">
                {userName}
              </span>
            </Link>
            <button
              type="button"
              aria-label="Sair"
              onClick={() => { logout(); void navigate({ to: '/login', replace: true }); }}
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main
        key={pathname}
        className={`${
          fullBleed
            ? ''
            : 'mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-8 sm:pt-10'
        }`}
      >
        {children}
      </main>
    </div>
  );
};
