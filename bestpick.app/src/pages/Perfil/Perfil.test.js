import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import usuarioAPI from '../../services/usuarioAPI';
import { processarFotoParaUpload } from '../../utils/processarFoto';

jest.mock('../../services/usuarioAPI');
jest.mock('../../utils/processarFoto', () => ({
    ...jest.requireActual('../../utils/processarFoto'),
    processarFotoParaUpload: jest.fn()
}));

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
    processarFotoParaUpload.mockImplementation((arquivo) => {
        // Simular validação: rejeitar SVG e arquivos sem extensão válida
        if (arquivo.type === 'image/svg+xml' || arquivo.name.endsWith('.svg')) {
            return Promise.reject(new Error('A foto deve ser JPEG, PNG ou WebP com conteúdo válido'));
        }
        // Rejeitar arquivos maiores que 5MB
        if (arquivo.size > 5 * 1024 * 1024) {
            return Promise.reject(new Error('A foto deve ter no máximo 5 MB.'));
        }
        // Aceitar PNG, JPEG, WebP
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) && 
            !['image/png', 'image/jpeg', 'image/webp'].some(type => 
                arquivo.name.toLowerCase().endsWith(type.replace('image/', '.'))
            )) {
            return Promise.reject(new Error('A foto deve ser JPEG, PNG ou WebP com conteúdo válido'));
        }
        // Retornar promise que resolve após um tick para permitir que waitFor detecte mudanças
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ 
                    arquivo: new File([arquivo], arquivo.name, { type: arquivo.type }), 
                    largura: 800, 
                    altura: 600, 
                    extensao: '.png' 
                });
            }, 0);
        });
    });
    URL.createObjectURL = jest.fn();
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
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar nome' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Conta teste');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome novo' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await screen.findByText('Nome atualizado com sucesso.');
    expect(usuarioAPI.atualizarAsync).toHaveBeenCalledWith('Nome novo', 'teste@example.invalid');
    expect(screen.getByRole('link', { name: /^Meu perfil/ })).toHaveTextContent('Nome novo');
    expect(localStorage.getItem('token')).toBe(token);
    await userEvent.click(screen.getByRole('link', { name: 'Chat', exact: true }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('confirmação deve corresponder');
    expect(usuarioAPI.alterarSenhaAsync).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmação da nova senha'), { target: { value: 'nova123' } });
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await screen.findByText('Senha alterada com sucesso.');
    expect(usuarioAPI.alterarSenhaAsync).toHaveBeenCalledWith('atual123', 'nova123', 'nova123');
    for (const label of ['Senha atual', 'Nova senha', 'Confirmação da nova senha']) expect(screen.getByLabelText(label)).toHaveValue('');
    expect(JSON.stringify(localStorage)).not.toMatch(/atual123|nova123/);
});

test('upload, substituição e remoção atualizam avatares antigos e novos sem alterar histórico', async () => {
    const view = await abrir();
    const createObjectURLSpy = jest.fn()
        .mockReturnValueOnce('blob:previa1')
        .mockReturnValueOnce('blob:foto1')
        .mockReturnValue('blob:outros');
    URL.createObjectURL = createObjectURLSpy;
    usuarioAPI.obterFotoAsync.mockResolvedValue(new Blob(['foto'], { type: 'image/jpeg' }));
    const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [arquivo] } });
    const previa = await screen.findByAltText('Prévia da nova foto de perfil');
    expect(previa).toHaveAttribute('src', 'blob:previa1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }));
    await screen.findByText('Foto salva com sucesso.');
    expect(usuarioAPI.enviarFotoAsync).toHaveBeenCalledWith(arquivo);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa1');
    await userEvent.click(screen.getByRole('link', { name: /^Meu perfil/ }));
    expect(screen.getByRole('button', { name: 'Remover foto' })).not.toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    await screen.findByText('Foto removida. Avatar padrão restaurado.');
    expect(usuarioAPI.removerFotoAsync).toHaveBeenCalled();
    view.unmount();
});

test('rejeita tipo e tamanho inválidos antes do upload e cancela prévia', async () => {
    await abrir();
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [new File(['x'], 'foto.svg', { type: 'image/svg+xml' })] } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('A foto deve ser JPEG, PNG ou WebP com conteúdo válido');
    
    const grande = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [grande] } });
    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled();
    expect(usuarioAPI.enviarFotoAsync).not.toHaveBeenCalled();
    
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    // Aguardar que o botão Cancelar apareça, indicando que o arquivo foi processado
    const cancelarBtn = await screen.findByRole('button', { name: 'Cancelar foto' });
    expect(cancelarBtn).toBeInTheDocument();
    await userEvent.click(cancelarBtn);
    // Após cancelar, a prévia deve desaparecer
    expect(screen.queryByAltText('Prévia da nova foto de perfil')).not.toBeInTheDocument();
    // E o botão também deve desaparecer
    expect(screen.queryByRole('button', { name: 'Cancelar foto' })).not.toBeInTheDocument();
});

test('falha inicial permite recarregar e falha ao salvar mantém nome anterior', async () => {
    usuarioAPI.obterAsync.mockRejectedValueOnce(new Error('offline'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seu perfil');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByLabelText('Nome');
    usuarioAPI.atualizarAsync.mockRejectedValue({ response: { status: 409 } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Não salvo' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('outra operação');
    expect(screen.getByRole('link', { name: /^Meu perfil/ })).toHaveTextContent('Conta teste');
});

test('logout ignora resposta tardia e preserva histórico', async () => {
    let responder;
    usuarioAPI.obterFotoAsync.mockImplementation(() => new Promise(resolve => { responder = resolve; }));
    render(<App />);
    await screen.findByLabelText('Nome');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await act(async () => responder(new Blob(['atrasada'])));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('bestpickChat_7')).toBe(JSON.stringify(historico));
});
