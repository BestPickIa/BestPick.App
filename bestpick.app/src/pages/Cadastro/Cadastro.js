import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Cadastro.module.css";
import usuarioAPI from "../../services/usuarioAPI";
import imagemTelaLogin from "../../assets/imagemTelaLogin.png";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export function Cadastro() {

    const navigate = useNavigate();

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    const handleCadastrar = async (e) => {
        e.preventDefault();
        setErro('');

        if (senha.length < 6 || senha.length > 40) {
            setErro('A senha deve ter entre 6 e 40 caracteres.');
            return;
        }

        if (!confirmarSenha) {
            setErro('Confirme sua senha.');
            return;
        }

        if (senha !== confirmarSenha) {
            setErro('As senhas não coincidem.');
            return;
        }

        setCarregando(true);

        try {
            await usuarioAPI.criarAsync(nome, email, senha, confirmarSenha);

            await new Promise(resolve => setTimeout(resolve, 750));

            navigate('/');

        } catch (error) {
            const resposta = error.response?.status === 400 ? error.response.data : null;
            const mensagem = typeof resposta === 'string' ? resposta : resposta?.message;
            const validacoes = resposta?.errors && typeof resposta.errors === 'object'
                ? Object.values(resposta.errors).flat().filter(item => typeof item === 'string').join(' ')
                : '';
            setErro((typeof mensagem === 'string' && mensagem) || validacoes || 'Não foi possível criar sua conta. Tente novamente.');
        }
        finally {
            setCarregando(false);
        }

    };


    return (
        <div
            className={styles.pagina} style={{ backgroundImage: `url(${imagemTelaLogin})` }}>

            <div className={styles.conteudo}>

                <div className={styles.marca}>
                    <h1>Best<span>Pick</span></h1>
                    <p>Escolhas melhores, resultados reais.</p>
                </div>

                <form className={styles.formulario} onSubmit={handleCadastrar} aria-labelledby="titulo-cadastro">

                    <h2 id="titulo-cadastro">Crie sua conta</h2>

                    <p className={styles.eyebrow}>Preencha seus dados para continuar</p>


                    {erro && <p className={styles.mensagemErro} role="alert">{erro}</p>}

                    <div className={styles.form}>

                        <div className={styles.campo}>

                            <input
                                minLength={2}
                                maxLength={50}
                                id="nome"
                                type="text"
                                placeholder="Nome"
                                aria-label="Nome"
                                className={styles.input}
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                autoComplete="name"
                                required
                            />

                        </div>

                        <div className={styles.campo}>

                            <input
                                maxLength={50}
                                id="email"
                                type="email"
                                placeholder="E-mail"
                                aria-label="E-mail"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                required
                            />

                        </div>

                        <div className={styles.campo}>

                            <input
                                minLength={6}
                                maxLength={40}
                                id="senha"
                                type={mostrarSenha ? "text" : "password"}
                                placeholder="Senha"
                                aria-label="Senha"
                                aria-describedby="politica-senha"
                                className={`${styles.input} ${styles.inputSenha}`}
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="button"
                                className={styles.botaoOlho}
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {mostrarSenha ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>

                        </div>

                        <p id="politica-senha" className={styles.ajudaSenha}>
                            Use de 6 a 40 caracteres. Números, símbolos e maiúsculas são opcionais.
                        </p>

                        <div className={styles.campo}>
                            <input
                                minLength={6}
                                maxLength={40}
                                id="confirmarSenha"
                                type={mostrarConfirmacao ? 'text' : 'password'}
                                placeholder="Confirme sua senha"
                                aria-label="Confirme sua senha"
                                className={`${styles.input} ${styles.inputSenha}`}
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="button"
                                className={styles.botaoOlho}
                                onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                                aria-label={mostrarConfirmacao ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'}
                            >
                                {mostrarConfirmacao ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className={styles.botaoEntrar}
                            disabled={carregando}
                        >
                            {carregando ? (
                                <div className={styles.entrando}>
                                    <span>Criando conta</span>
                                    <span className={styles.loaderBotao}></span>
                                </div>
                            ) : (
                                "Criar conta"
                            )}
                        </button>

                    </div>

                    <div className={styles.criarConta}>
                        <p>Já tem uma conta?</p>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                        >
                            Entrar
                        </button>
                    </div>

                </form>

                <p className={styles.rodape}>© 2026 BestPick. Todos os direitos reservados.</p>

            </div>

        </div>

    );
}
