import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HTTPClient } from '../../services/client';
import { Cadastro } from './Cadastro';

jest.mock('../../services/client', () => ({ HTTPClient: { post: jest.fn() } }));

beforeEach(() => {
    jest.clearAllMocks();
    HTTPClient.post.mockResolvedValue({ data: { id: 1 } });
});

function prepararCadastro(senha, confirmacao = senha) {
    render(
        <MemoryRouter initialEntries={['/cadastro']}>
            <Routes>
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/" element={<h1>Login</h1>} />
            </Routes>
        </MemoryRouter>
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pessoa Teste' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), { target: { value: 'cadastro@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Senha', { exact: true }), { target: { value: senha } });
    fireEvent.change(screen.getByLabelText('Confirme sua senha'), { target: { value: confirmacao } });
}

function enviarFormulario() {
    // Exercita também a proteção JavaScript quando a validação nativa é contornada.
    fireEvent.submit(screen.getByRole('form', { name: 'Crie sua conta' }));
}

test.each([5, 41])('rejeita senha de %i caracteres antes de chamar a API', (tamanho) => {
    prepararCadastro('a'.repeat(tamanho));
    enviarFormulario();
    expect(screen.getByRole('alert')).toHaveTextContent('A senha deve ter entre 6 e 40 caracteres.');
    expect(HTTPClient.post).not.toHaveBeenCalled();
});

test.each([6, 40])('envia senha de %i caracteres e confirmação, depois retorna ao login', async (tamanho) => {
    const senha = 'a'.repeat(tamanho);
    prepararCadastro(senha);
    userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(HTTPClient.post).toHaveBeenCalledWith('/Usuario', {
        Nome: 'Pessoa Teste',
        Email: 'cadastro@example.invalid',
        Senha: senha,
        confirmarSenha: senha,
    });
    expect(screen.getByRole('button', { name: 'Criando conta' })).toBeDisabled();
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
});

test.each([
    ['', 'Confirme sua senha.'],
    ['diferente', 'As senhas não coincidem.'],
])('rejeita confirmação ausente ou divergente (%s)', (confirmacao, mensagem) => {
    prepararCadastro('abcdef', confirmacao);
    enviarFormulario();
    expect(screen.getByRole('alert')).toHaveTextContent(mensagem);
    expect(HTTPClient.post).not.toHaveBeenCalled();
});

test('campos de senha têm limites, preenchimento automático e visibilidade independente', () => {
    prepararCadastro('abcdef');
    const senha = screen.getByLabelText('Senha', { exact: true });
    const confirmacao = screen.getByLabelText('Confirme sua senha');
    for (const campo of [senha, confirmacao]) {
        expect(campo).toBeRequired();
        expect(campo).toHaveAttribute('minLength', '6');
        expect(campo).toHaveAttribute('maxLength', '40');
        expect(campo).toHaveAttribute('autoComplete', 'new-password');
        expect(campo).toHaveAttribute('type', 'password');
    }
    expect(senha).toHaveAccessibleDescription(/6 a 40 caracteres/);
    userEvent.click(screen.getByRole('button', { name: 'Mostrar confirmação da senha' }));
    expect(confirmacao).toHaveAttribute('type', 'text');
    expect(senha).toHaveAttribute('type', 'password');
});

test.each([
    ['E-mail já cadastrado.', 'E-mail já cadastrado.'],
    [{ message: 'E-mail já cadastrado.' }, 'E-mail já cadastrado.'],
    [{ errors: { ConfirmarSenha: ['As senhas não coincidem.'] } }, 'As senhas não coincidem.'],
])('apresenta validações HTTP 400 sem renderizar objetos (%j)', async (data, mensagem) => {
    HTTPClient.post.mockRejectedValue({ response: { status: 400, data } });
    prepararCadastro('abcdef');
    userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
});

test.each([undefined, { status: 500, data: { message: 'Detalhes internos reservados' } }])(
    'exibe erro genérico para rede ou falha interna e não registra a requisição', async (response) => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            HTTPClient.post.mockRejectedValue({ response, config: { data: 'credencial-ficticia' } });
            prepararCadastro('abcdef');
            userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
            expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar sua conta. Tente novamente.');
            expect(log).not.toHaveBeenCalled();
        } finally {
            log.mockRestore();
        }
    }
);
