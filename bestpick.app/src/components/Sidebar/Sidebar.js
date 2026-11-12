import { useState, useEffect } from 'react';
import style from './Sidebar.module.css';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import { MdDashboard, MdFavorite, MdHistory, MdMenu, MdClose } from "react-icons/md";
import { IoChatboxEllipses } from "react-icons/io5";
import { Link } from 'react-router-dom';
import { LayoutGrid, Heart, MessageCircle, History, ChevronsRight, ChevronsLeft } from 'lucide-react';

export function Sidebar({ children, dashboard = false }) {
    const [retraida, setRetraida] = useState(() => {
        try {
            const salvo = localStorage.getItem("sidebarRetraida");
            return salvo === null ? dashboard : salvo === "true";
        } catch {
            return false;
        }
    });

    const handleToggleSidebar = () => {
        setRetraida(prev => {
            const newState = !prev;
            try {
                localStorage.setItem("sidebarRetraida", String(newState));
            } catch {
                // Falha silenciosa se localStorage não disponível (ex: testes)
            }
            return newState;
        });
    };

    // Atualizar CSS variable quando estado muda
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--sidebar-width', retraida ? '64px' : '256px');
    }, [retraida]);

    const nomeAcessivel = retraida ? "Expandir menu" : "Retrair menu";
    const icone = dashboard ? (retraida ? <ChevronsRight /> : <ChevronsLeft />) : (retraida ? <MdMenu /> : <MdClose />);

    return (
        <div
            className={`${style.layout} ${dashboard ? style.dashboard : ''} ${retraida ? style.retraida : ''}`}
            style={{ '--sidebar-width': retraida ? '64px' : '256px' }}
        >
            <div className={style.sidebar_conteudo}>
                <div className={style.sidebar_header}>
                    <Link to="/dashboard" className={style.logo_link}>
                        <span className={style.logo}>{dashboard && retraida ? <>B<span>P</span></> : <>Best<span>Pick</span></>}</span>
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={handleToggleSidebar}
                    className={style.toggle_button}
                    aria-label={nomeAcessivel}
                    title={nomeAcessivel}
                >
                    {icone}
                </button>

                <div className={style.sidebar_corpo}>
                    <SidebarItem texto="Dashboard" link="/dashboard" logo={dashboard ? <LayoutGrid size={20} /> : <MdDashboard />} />

                    <SidebarItem texto="Favoritos" link="/favoritos" logo={dashboard ? <Heart size={20} /> : <MdFavorite />} />

                    <SidebarItem texto="Chat" link="/chat" logo={dashboard ? <MessageCircle size={20} /> : <IoChatboxEllipses />} />

                    <SidebarItem texto="Histórico" link="/historico" logo={dashboard ? <History size={20} /> : <MdHistory />} />
                </div>

            </div>

            <div className={style.pagina_conteudo}>
                {children}
            </div>
        </div>
    );
}
