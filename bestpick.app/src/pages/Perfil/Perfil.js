import { AppShell } from '../../components/AppShell';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { Avatar } from '../../components/Avatar/Avatar';
import { useUsuario } from '../../contexts/UsuarioContext';
import usuarioAPI from '../../services/usuarioAPI';
import { processarFotoParaUpload, gerarUrlPrevia, revogarUrlPrevia } from '../../utils/processarFoto';
import style from './Perfil.module.css';

function mensagemErro(error) {
    const status = error.response?.status;
    if (status === 409) return 'Os dados foram alterados em outra operação. Recarregue o perfil antes de tentar novamente.';
    if (status === 413) return 'A foto deve ter no máximo 5 MB.';
    if (status === 401) return 'Não foi possível validar sua sessão ou senha atual. Entre novamente.';
    if (status === 400 || status === 415) return 'Dados inválidos. Confira os campos e os requisitos informados.';
    return 'Não foi possível concluir a operação. Tente novamente.';
}

export function Perfil() {
    const { usuario, carregando, erro, foto, erroFoto, carregandoFoto, recarregar, recarregarFoto,
        salvarNome, enviarFoto, removerFoto } = useUsuario();
    const [nome, setNome] = useState('');
    const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmacao: '' });
    const [arquivo, setArquivo] = useState(null);
    const [previa, setPrevia] = useState(null);
    const [ocupado, setOcupado] = useState('');
    const [feedback, setFeedback] = useState(null);
    const arquivoInput = useRef(null);

    useEffect(() => { setNome(usuario?.nome || ''); }, [usuario?.nome]);
    useEffect(() => {
        if (!arquivo) { 
            setPrevia(null); 
            return; 
        }
        const url = gerarUrlPrevia(arquivo);
        setPrevia(url);
        return () => revogarUrlPrevia(url);
    }, [arquivo]);

    function cancelarFoto() {
        setArquivo(null);
        if (arquivoInput.current) arquivoInput.current.value = '';
    }

    async function executar(operacao, acao, sucesso) {
        setOcupado(operacao);
        setFeedback(null);
        try {
            await acao();
            setFeedback({ tipo: 'success', texto: sucesso });
        } catch (error) {
            setFeedback({ tipo: 'danger', texto: mensagemErro(error) });
        } finally { setOcupado(''); }
    }

    function selecionarFoto(event) {
        const selecionado = event.target.files?.[0];
        setFeedback(null);
        setArquivo(null);
        if (!selecionado) return;

        // Processar e validar foto
        processarFotoParaUpload(selecionado)
            .then(resultado => {
                setArquivo(resultado.arquivo);
                setFeedback({
                    tipo: 'info',
                    texto: `Foto validada: ${resultado.largura}×${resultado.altura}px. Clique "Salvar foto" para enviar.`
                });
            })
            .catch(erro => {
                setFeedback({ tipo: 'danger', texto: erro.message });
                event.target.value = '';
            });
    }

    function alterarSenha(event) {
        event.preventDefault();
        if ([senhas.atual, senhas.nova].some(senha => senha.length < 6 || senha.length > 40) ||
            !senhas.confirmacao || senhas.confirmacao !== senhas.nova) {
            setFeedback({ tipo: 'danger', texto: 'As senhas devem ter de 6 a 40 caracteres e a confirmação deve corresponder à nova senha.' });
            return;
        }
        if (senhas.atual === senhas.nova) {
            setFeedback({ tipo: 'danger', texto: 'A nova senha deve ser diferente da senha atual.' });
            return;
        }
        executar('senha', async () => {
            await usuarioAPI.alterarSenhaAsync(senhas.atual, senhas.nova, senhas.confirmacao);
            setSenhas({ atual: '', nova: '', confirmacao: '' });
        }, 'Senha alterada com sucesso.');
    }

    const bloqueado = Boolean(ocupado);
    return <AppShell title="Meu perfil">
        <main className={style.pagina}>
            <h1>Seu perfil</h1>
            <p>Gerencie seus dados, sua foto e sua senha.</p>
            {carregando && <p role="status"><Spinner as="span" size="sm" /> Carregando perfil...</p>}
            {erro && <Alert variant="danger" role="alert">{erro} <Button variant="outline-dark" onClick={recarregar}>Tentar novamente</Button></Alert>}
            {feedback && <Alert variant={feedback.tipo} role={feedback.tipo === 'danger' ? 'alert' : 'status'}>{feedback.texto}</Alert>}
            {!carregando && !erro && usuario && <div className={style.grade}>
                <section className={style.cartao} aria-labelledby="titulo-foto">
                    <h2 id="titulo-foto">Foto de perfil</h2>
                    <div className={style.foto}>
                        {previa ? <img src={previa} alt="Prévia da nova foto de perfil" /> : <Avatar tamanho={112} />}
                    </div>
                    {!foto && !previa && <p>Você está usando o avatar padrão.</p>}
                    {carregandoFoto && <p role="status">Carregando foto...</p>}
                    {erroFoto && <Alert variant="warning" role="alert">{erroFoto} <Button variant="outline-dark" disabled={bloqueado} onClick={recarregarFoto}>Recarregar foto</Button></Alert>}
                    <Form.Group controlId="foto-perfil">
                        <Form.Label>Escolher foto</Form.Label>
                        <Form.Control ref={arquivoInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={selecionarFoto} disabled={bloqueado || carregandoFoto} aria-describedby="requisitos-foto" />
                        <Form.Text id="requisitos-foto">JPEG, PNG ou WebP. A foto será redimensionada automaticamente se necessário. Mínimo 200×200 px, máximo 5000×5000 px, até 16 megapixels.</Form.Text>
                    </Form.Group>
                    <div className={style.acoes}>
                        <Button disabled={!arquivo || bloqueado || carregandoFoto} onClick={() => executar('foto', async () => { await enviarFoto(arquivo); cancelarFoto(); }, 'Foto salva com sucesso.')}>
                            {ocupado === 'foto' ? 'Salvando foto...' : 'Salvar foto'}
                        </Button>
                        {arquivo && <Button variant="outline-secondary" disabled={bloqueado} onClick={cancelarFoto}>Cancelar foto</Button>}
                        <Button variant="outline-danger" disabled={(!foto && !erroFoto) || bloqueado || carregandoFoto} onClick={() => executar('remover', async () => { await removerFoto(); cancelarFoto(); }, 'Foto removida. Avatar padrão restaurado.')}>
                            {ocupado === 'remover' ? 'Removendo...' : 'Remover foto'}
                        </Button>
                    </div>
                </section>
                <section className={style.cartao} aria-labelledby="titulo-dados">
                    <h2 id="titulo-dados">Dados da conta</h2>
                    <Form onSubmit={event => { event.preventDefault(); executar('nome', () => salvarNome(nome), 'Nome atualizado com sucesso.'); }}>
                        <Form.Group controlId="nome-perfil" className="mb-3">
                            <Form.Label>Nome</Form.Label>
                            <Form.Control value={nome} onChange={event => setNome(event.target.value)} required maxLength={150} autoComplete="name" disabled={bloqueado} />
                        </Form.Group>
                        <Form.Group controlId="email-perfil">
                            <Form.Label>E-mail</Form.Label>
                            <Form.Control value={usuario.email || ''} readOnly type="email" aria-describedby="email-ajuda" />
                            <Form.Text id="email-ajuda">O e-mail não pode ser alterado nesta etapa.</Form.Text>
                        </Form.Group>
                        <div className={style.acoes}>
                            <Button type="submit" disabled={bloqueado || nome === usuario.nome}>{ocupado === 'nome' ? 'Salvando...' : 'Salvar nome'}</Button>
                            <Button variant="outline-secondary" type="button" disabled={bloqueado} onClick={() => setNome(usuario.nome || '')}>Cancelar nome</Button>
                        </div>
                    </Form>
                </section>
                <section className={`${style.cartao} ${style.senha}`} aria-labelledby="titulo-senha">
                    <h2 id="titulo-senha">Alterar senha</h2>
                    <p id="senha-ajuda">Use de 6 a 40 caracteres. A nova senha deve ser diferente da atual.</p>
                    <Form onSubmit={alterarSenha}>
                        {[
                            ['atual', 'Senha atual', 'current-password'],
                            ['nova', 'Nova senha', 'new-password'],
                            ['confirmacao', 'Confirmação da nova senha', 'new-password']
                        ].map(([campo, label, autocomplete]) => <Form.Group key={campo} controlId={`senha-${campo}`} className="mb-3">
                            <Form.Label>{label}</Form.Label>
                            <Form.Control type="password" autoComplete={autocomplete} required minLength={6} maxLength={40} value={senhas[campo]} disabled={bloqueado}
                                aria-describedby="senha-ajuda" onChange={event => setSenhas({ ...senhas, [campo]: event.target.value })} />
                        </Form.Group>)}
                        <Button type="submit" disabled={bloqueado}>{ocupado === 'senha' ? 'Alterando senha...' : 'Alterar senha'}</Button>
                    </Form>
                </section>
            </div>}
        </main>
    </AppShell>;
}
