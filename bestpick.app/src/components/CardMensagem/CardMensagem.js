import { useEffect, useState } from 'react';
import { Avatar } from '../Avatar/Avatar';
import style from './CardMensagem.module.css';

/**
 * Componente de Mensagem do Chat com Avatar Dinâmico
 * Suporta mensagens do usuário e do BestPick
 * Avatar é carregado dinamicamente do servidor
 */
export function CardMensagem({ mensagem, usuarioId, fotoUsuarioUrl, fotoUsuarioAtualizacao }) {
    const [avatarUrl, setAvatarUrl] = useState(null);

    // Atualizar avatar quando a foto do usuário mudar
    useEffect(() => {
        if (mensagem.tipo === 'usuario' && usuarioId && fotoUsuarioUrl) {
            // Usar timestamp para invalidar cache
            const url = `${fotoUsuarioUrl}?v=${fotoUsuarioAtualizacao || Date.now()}`;
            setAvatarUrl(url);
        }
    }, [mensagem.tipo, usuarioId, fotoUsuarioUrl, fotoUsuarioAtualizacao]);

    if (mensagem.tipo === 'usuario') {
        return (
            <div className={style.linhaUsuario}>
                <div className={style.mensagemUsuario}>
                    <div className={style.conteudoMensagem}>
                        {mensagem.texto && <p>{mensagem.texto}</p>}
                        {mensagem.produtos && mensagem.produtos.length > 0 && (
                            <div className={style.produtos}>
                                {/* Produtos renderizados pelo componente pai */}
                            </div>
                        )}
                    </div>
                </div>
                {avatarUrl ? (
                    <img 
                        src={avatarUrl} 
                        alt="Avatar do usuário" 
                        className={style.avatarUsuario}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className={style.avatarUsuarioPlaceholder}>
                        <Avatar tamanho={36} />
                    </div>
                )}
            </div>
        );
    }

    // Mensagem do BestPick
    return (
        <div className={style.linhaBestPick}>
            <div className={style.avatarBestPick} role="img" aria-label="BestPick Assistant">
                BP
            </div>
            <div className={style.mensagemBestPick}>
                <div className={style.conteudoMensagem}>
                    {mensagem.texto && <p>{mensagem.texto}</p>}
                    {mensagem.produtos && mensagem.produtos.length > 0 && (
                        <div className={style.produtos}>
                            {/* Produtos renderizados pelo componente pai */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
