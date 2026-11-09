import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import usuarioAPI from '../../services/usuarioAPI';
import chatAPI from '../../services/chatAPI';

jest.mock('../../services/usuarioAPI');
jest.mock('../../services/chatAPI');

const claim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';
const token = `e30.${btoa(JSON.stringify({ [`${claim}nameidentifier`]: '7', [`${claim}name`]: 'Nome antigo' }))}.teste`;
const historico = { mensagens: [{ tipo: 'usuario', texto: 'Mensagem antiga', produtos: [] }], produto: null,
    valorCompra: null, motivoCompra: null, buscaCompleta: false, favoritos: {} };

beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    localStorage.setItem('token', token);
    localStorage.setItem('bestpickChat_7', JSON.stringify(historico));
    window.history.replaceState({}, '', '/perfil');
    usuarioAPI.obterAsync.mockResolvedValue({ id: 7, nome: 'Conta teste', email: 'teste@example.invalid' });
    usuarioAPI.obterFotoAsync.mockRejectedValue({ response: { status: 404 } });
    URL.createObjectURL = jest.fn().mockReturnValue('blob:foto-teste');
    URL.revokeObjectURL = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
});

async function abrir() {
    const view = render(<App />);
    await screen.findByLabelText('Nome');
    await waitFor(() => expect(screen.queryByText('Carregando foto...')).not.toBeInTheDocument());
    return view;
}

test('perfil exige autenticação', () => {
    localStorage.removeItem('token');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
    expect(usuarioAPI.obterAsync).not.toHaveBeenCalled();
});

test('salva e cancela nome, preserva email e JWT e compartilha nome com chat', async () => {
    await abrir();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Descartado' } });
    userEvent.click(screen.getByRole('button', { name: 'Cancelar nome' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Conta teste');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome novo' } });
    userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await screen.findByText('Nome atualizado com sucesso.');
    expect(usuarioAPI.atualizarAsync).toHaveBeenCalledWith('Nome novo', 'teste@example.invalid');
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveTextContent('Nome novo');
    expect(localStorage.getItem('token')).toBe(token);
    userEvent.click(screen.getByRole('link', { name: 'Chat', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Olá, Nome novo!' })).toBeVisible();
    expect(screen.getByText('Mensagem antiga')).toBeVisible();
    expect(JSON.parse(localStorage.getItem('bestpickChat_7'))).toEqual(historico);
    expect(usuarioAPI.obterAsync).toHaveBeenCalledTimes(1);
});

test('valida confirmação e limpa senhas após sucesso sem persistir credenciais', async () => {
    await abrir();
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'atual123' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'nova123' } });
    fireEvent.change(screen.getByLabelText('Confirmação da nova senha'), { target: { value: 'outra123' } });
    userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('confirmação deve corresponder');
    expect(usuarioAPI.alterarSenhaAsync).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmação da nova senha'), { target: { value: 'nova123' } });
    userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await screen.findByText('Senha alterada com sucesso.');
    expect(usuarioAPI.alterarSenhaAsync).toHaveBeenCalledWith('atual123', 'nova123', 'nova123');
    for (const label of ['Senha atual', 'Nova senha', 'Confirmação da nova senha']) expect(screen.getByLabelText(label)).toHaveValue('');
    expect(JSON.stringify(localStorage)).not.toMatch(/atual123|nova123/);
});

test('upload, substituição e remoção atualizam avatares antigos e novos sem alterar histórico', async () => {
    const view = await abrir();
    URL.createObjectURL.mockReturnValueOnce('blob:previa1').mockReturnValueOnce('blob:foto1')
        .mockReturnValueOnce('blob:previa2').mockReturnValueOnce('blob:foto2');
    usuarioAPI.obterFotoAsync.mockResolvedValue(new Blob(['foto'], { type: 'image/jpeg' }));
    const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    userEvent.upload(screen.getByLabelText('Escolher foto'), arquivo);
    expect(await screen.findByAltText('Prévia da nova foto de perfil')).toHaveAttribute('src', 'blob:previa1');
    userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }));
    await screen.findByText('Foto salva com sucesso.');
    expect(usuarioAPI.enviarFotoAsync).toHaveBeenCalledWith(arquivo);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa1');
    userEvent.click(screen.getByRole('link', { name: 'Chat', exact: true }));
    expect(screen.getAllByAltText('Foto de Conta teste')).toHaveLength(2);
    chatAPI.enviarMensagemAsync.mockResolvedValue({ mensagem: 'Resposta', produtos: [], produto: null, valorCompra: null, motivoCompra: null });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Quero/), { target: { value: 'Mensagem nova' } });
    userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await screen.findByText('Resposta');
    expect(screen.getAllByAltText('Foto de Conta teste')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Avatar do BestPick' })).toBeVisible();
    const salvo = localStorage.getItem('bestpickChat_7');
    expect(salvo).not.toContain('blob:');
    expect(JSON.parse(salvo).mensagens[0]).toEqual(historico.mensagens[0]);
    userEvent.click(screen.getByRole('link', { name: 'Meu perfil' }));
    userEvent.upload(screen.getByLabelText('Escolher foto'), arquivo);
    userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }));
    await screen.findByText('Foto salva com sucesso.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto1');
    userEvent.click(screen.getByRole('link', { name: 'Chat', exact: true }));
    for (const avatar of screen.getAllByAltText('Foto de Conta teste')) expect(avatar).toHaveAttribute('src', 'blob:foto2');
    userEvent.click(screen.getByRole('link', { name: 'Meu perfil' }));
    userEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    await screen.findByText('Foto removida. Avatar padrão restaurado.');
    userEvent.click(screen.getByRole('link', { name: 'Chat', exact: true }));
    expect(screen.queryByAltText('Foto de Conta teste')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Avatar padrão do usuário' })).toHaveLength(3);
    expect(localStorage.getItem('bestpickChat_7')).toBe(salvo);
    expect(usuarioAPI.obterFotoAsync).toHaveBeenCalledTimes(3);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto2');
    view.unmount();
});

test('rejeita tipo e tamanho inválidos antes do upload e cancela prévia', async () => {
    await abrir();
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [new File(['x'], 'foto.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPEG ou PNG');
    const grande = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [grande] } });
    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled();
    expect(usuarioAPI.enviarFotoAsync).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    userEvent.click(screen.getByRole('button', { name: 'Cancelar foto' }));
    expect(screen.queryByAltText('Prévia da nova foto de perfil')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
});

test('falha inicial permite recarregar e falha ao salvar mantém nome anterior', async () => {
    usuarioAPI.obterAsync.mockRejectedValueOnce(new Error('offline'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seu perfil');
    userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByLabelText('Nome');
    usuarioAPI.atualizarAsync.mockRejectedValue({ response: { status: 409 } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Não salvo' } });
    userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('outra operação');
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveTextContent('Conta teste');
});

test('logout ignora resposta tardia e preserva histórico', async () => {
    let responder;
    usuarioAPI.obterFotoAsync.mockImplementation(() => new Promise(resolve => { responder = resolve; }));
    render(<App />);
    await screen.findByLabelText('Nome');
    userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await act(async () => responder(new Blob(['atrasada'])));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('bestpickChat_7')).toBe(JSON.stringify(historico));
});
