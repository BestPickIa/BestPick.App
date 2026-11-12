import style from "./Topbar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from '../Avatar/Avatar';
import { useUsuario } from '../../contexts/UsuarioContext';
import { MdLogout } from "react-icons/md";

export function Topbar({ titulo }) {
    const navigate = useNavigate();
    const { usuario } = useUsuario();

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/");
    }

    return (
        <div className={style.topbar_conteudo} data-dashboard={titulo === 'Dashboard'}>
            <h2>{titulo}</h2>

            <div className={style.acoes}>
            <Link to="/perfil" className={style.perfil} aria-label="Meu perfil">
                <Avatar /><span>{usuario?.nome || 'Meu perfil'}</span>
            </Link>
            <button
                onClick={handleLogout}
                className={style.botao_deslogar}
                aria-label="Sair"
            >
                <MdLogout />
            </button>
            </div>
        </div>
    );
}
