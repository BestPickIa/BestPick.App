import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import usuarioAPI from '../services/usuarioAPI';

const UsuarioContext = createContext(null);

export function UsuarioProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [foto, setFoto] = useState(null);
    const [erroFoto, setErroFoto] = useState('');
    const [carregandoFoto, setCarregandoFoto] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const fotoRequest = useRef(null);


    // A URL pertence ao provider, não a cada avatar ou mensagem.
    useEffect(() => {
        if (!foto) return;
        return () => URL.revokeObjectURL(foto);
    }, [foto]);

    const carregarFoto = useCallback(async (id) => {
        fotoRequest.current?.abort();
        const controle = new AbortController();
        fotoRequest.current = controle;
        setCarregandoFoto(true);
        setErroFoto('');
        try {
            const blob = await usuarioAPI.obterFotoAsync(id, controle.signal);
            if (!controle.signal.aborted) setFoto(URL.createObjectURL(blob));
        } catch (error) {
            if (!controle.signal.aborted) {
                setFoto(null);
                if (error.response?.status !== 404) setErroFoto('Não foi possível carregar a foto. Tente novamente.');
            }
        } finally {
            if (!controle.signal.aborted) setCarregandoFoto(false);
        }
    }, []);

    useEffect(() => {
        const controle = new AbortController();
        setCarregando(true);
        setErro('');
        async function carregar() {
            try {
                const dados = await usuarioAPI.obterAsync(controle.signal);
                if (controle.signal.aborted) return;
                setUsuario(dados);
                carregarFoto(dados.id);
            } catch {
                if (!controle.signal.aborted) setErro('Não foi possível carregar seu perfil. Tente novamente.');
            } finally {
                if (!controle.signal.aborted) setCarregando(false);
            }
        }
        carregar();
        return () => { controle.abort(); fotoRequest.current?.abort(); };
    }, [tentativa, carregarFoto]);

    async function salvarNome(nome) {
        await usuarioAPI.atualizarAsync(nome, usuario.email);
        setUsuario(atual => ({ ...atual, nome }));
    }

    async function enviarFoto(arquivo) {
        await usuarioAPI.enviarFotoAsync(arquivo);
        await carregarFoto(usuario.id);
    }

    async function removerFoto() {
        await usuarioAPI.removerFotoAsync();
        fotoRequest.current?.abort();
        setFoto(null);
        setErroFoto('');
        setCarregandoFoto(false);
    }

    return <UsuarioContext.Provider value={{ usuario, carregando, erro, foto, erroFoto, carregandoFoto,
        recarregar: () => setTentativa(atual => atual + 1),
        recarregarFoto: () => carregarFoto(usuario.id), salvarNome, enviarFoto, removerFoto }}>
        {children}
    </UsuarioContext.Provider>;
}

export function useUsuario() {
    return useContext(UsuarioContext);
}
