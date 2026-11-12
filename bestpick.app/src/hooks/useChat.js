import { useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useUsuario } from '../contexts/UsuarioContext';
import chatAPI from '../services/chatAPI';
import historicoAPI from '../services/historicoAPI';
import produtoAPI from '../services/produtoAPI';
import favoritoAPI from '../services/favoritoAPI';
export function useChat() {
    const { usuario: perfil } = useUsuario();
    const token = localStorage.getItem("token");
    const usuario = token ? jwtDecode(token) : {};

    const nomeUsuario =
        perfil?.nome || usuario["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "Usuário";

    const usuarioId =
        usuario["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    
    const chaveChat = `bestpickChat_${usuarioId || "usuario"}`;

    const dadosSalvos = useRef(
        JSON.parse(localStorage.getItem(chaveChat) || "{}")
    ).current;

    const [mensagem, setMensagem] = useState("");
    const [mensagens, setMensagens] = useState(dadosSalvos.mensagens || []);

    const [produto, setProduto] = useState(dadosSalvos.produto ?? null);
    const [valorCompra, setValorCompra] = useState(dadosSalvos.valorCompra ?? null);
    const [motivoCompra, setMotivoCompra] = useState(dadosSalvos.motivoCompra ?? null);

    const [carregando, setCarregando] = useState(false);
    const [buscaCompleta, setBuscaCompleta] = useState(dadosSalvos.buscaCompleta || false);
    const [aguardandoNovaBusca, setAguardandoNovaBusca] = useState(false);
    const [erroFavorito, setErroFavorito] = useState("");
    const [favoritando, setFavoritando] = useState(false);
    const [favoritos, setFavoritos] = useState(dadosSalvos.favoritos || {});

    const finalMensagensRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(chaveChat, JSON.stringify({
            mensagens,
            produto,
            valorCompra,
            motivoCompra,
            buscaCompleta,
            favoritos
        }));
    }, [
        chaveChat,
        mensagens,
        produto,
        valorCompra,
        motivoCompra,
        buscaCompleta,
        favoritos
    ]);

    useEffect(() => {
        finalMensagensRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [mensagens, carregando]);

    function adicionarMensagem(tipo, texto, produtos = []) {
        setMensagens(atuais => [
            ...atuais,
            { tipo, texto, produtos }
        ]);
    }

    async function salvarBusca(resposta) {
        const historico = await historicoAPI.adicionarAsync(
            resposta.produto,
            resposta.valorCompra,
            resposta.motivoCompra
        );

        return Promise.all(
            resposta.produtos.map(async produto => {
                const salvo = await produtoAPI.adicionarAsync(
                    produto,
                    historico.id
                );

                return {
                    ...produto,
                    id: salvo.id
                };
            })
        );
    }

    async function handleEnviar(e) {
        e.preventDefault();

        if (!mensagem.trim() || carregando || buscaCompleta)
            return;

        const texto = mensagem.trim();

        adicionarMensagem("usuario", texto);
        setMensagem("");
        setCarregando(true);

        try {
            const resposta = await chatAPI.enviarMensagemAsync(
                texto,
                produto,
                valorCompra,
                motivoCompra
            );

            setProduto(resposta.produto);
            setValorCompra(resposta.valorCompra);
            setMotivoCompra(resposta.motivoCompra);

            let produtos = resposta.produtos || [];

            if (resposta.completo && produtos.length > 0)
                produtos = await salvarBusca(resposta);

            adicionarMensagem(
                "bestpick",
                resposta.mensagem,
                produtos
            );

            if (resposta.completo) {
                setBuscaCompleta(true);
                setAguardandoNovaBusca(true);

                setTimeout(() => {
                    setAguardandoNovaBusca(false);
                }, 5000);
            }

        } catch (error) {
            console.error(error);

            adicionarMensagem(
                "bestpick",
                "Não foi possível enviar sua mensagem. Tente novamente."
            );
        } finally {
            setCarregando(false);
        }
    }

    async function handleFavoritar(produto) {
        if (favoritando) return;
        setFavoritando(true);
        setErroFavorito("");
        try {
            {
                const favorito = favoritos[produto.id];

                if (favorito) {
                    await favoritoAPI.removerAsync(favorito.id);

                    setFavoritos(atuais => {
                        const novos = { ...atuais };
                        delete novos[produto.id];
                        return novos;
                    });

                    return;
                }

                const salvo = await favoritoAPI.adicionarAsync(produto.id);

                setFavoritos(atuais => ({
                    ...atuais,
                    [produto.id]: salvo
                }));
            }
        } catch (error) {
            setErroFavorito("Não foi possível atualizar os favoritos. Tente novamente.");
        } finally {
            setFavoritando(false);
        }
    }

    function handleNovaBusca() {
        if (aguardandoNovaBusca || carregando)
            return;

        setMensagem("");
        setMensagens([]);
        setProduto(null);
        setValorCompra(null);
        setMotivoCompra(null);
        setBuscaCompleta(false);
        setFavoritos({});

        setErroFavorito("");
    }


return { nomeUsuario, mensagem, setMensagem, mensagens, carregando, buscaCompleta, aguardandoNovaBusca, favoritos, finalMensagensRef, handleEnviar, handleFavoritar, handleNovaBusca, erroFavorito, favoritando };
}
