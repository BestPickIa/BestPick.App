import { useState } from 'react';
import { MdPerson } from 'react-icons/md';
import { useUsuario } from '../../contexts/UsuarioContext';
import style from './Avatar.module.css';

export function Avatar({ tamanho = 44 }) {
    const { foto, usuario } = useUsuario();
    const [falhou, setFalhou] = useState(null);
    return <span className={style.avatar} style={{ width: tamanho, height: tamanho }}>
        {foto && falhou !== foto
            ? <img src={foto} alt={`Foto de ${usuario?.nome || 'perfil'}`} onError={() => setFalhou(foto)} />
            : <MdPerson role="img" aria-label="Avatar padrão do usuário" />}
    </span>;
}
