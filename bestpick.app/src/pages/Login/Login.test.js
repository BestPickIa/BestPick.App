import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HTTPClient } from '../../services/client';
import { Login } from './Login';

jest.mock('../../services/client', () => ({ HTTPClient: { post: jest.fn() } }));

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

function prepararLogin(senha) {
    render(
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>
        </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'login@example.invalid' } });
    userEvent.type(screen.getByPlaceholderText('Senha'), senha);
}

test('aceita senha de 40 caracteres, preserva token da resposta e navega para dashboard', async () => {
    const senha = 'a'.repeat(40);
    const token = 'token-ficticio-do-teste';
    HTTPClient.post.mockResolvedValue({ data: { token } });
    prepararLogin(senha);
    expect(screen.getByPlaceholderText('Senha')).toHaveValue(senha);
    userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(HTTPClient.post).toHaveBeenCalledWith('/Usuario/login', {
        Email: 'login@example.invalid',
        Senha: senha,
    });
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe(token);
});

test('login inválido mostra mensagem genérica, sem armazenar sessão ou registrar credenciais', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        HTTPClient.post.mockRejectedValue({ response: { status: 400 }, config: { data: 'credencial-ficticia' } });
        prepararLogin('abcdef');
        userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos');
        expect(localStorage.getItem('token')).toBeNull();
        expect(log).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    } finally {
        log.mockRestore();
    }
});
