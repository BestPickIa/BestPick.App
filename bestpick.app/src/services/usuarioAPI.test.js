import usuarioAPI from './usuarioAPI';
import { HTTPClient } from './client';

jest.mock('./client', () => ({ HTTPClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

test('envia foto como multipart sem forçar o Content-Type JSON e lê como blob', async () => {
    const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    await usuarioAPI.enviarFotoAsync(arquivo);
    const [rota, form, config] = HTTPClient.post.mock.calls[0];
    expect(rota).toBe('/Usuario/foto');
    expect(form.get('arquivo')).toBe(arquivo);
    expect(config.headers['Content-Type']).toBeUndefined();
    const blob = new Blob(['foto']);
    HTTPClient.get.mockResolvedValue({ data: blob });
    const signal = new AbortController().signal;
    expect(await usuarioAPI.obterFotoAsync(7, signal)).toBe(blob);
    expect(HTTPClient.get).toHaveBeenCalledWith('/Usuario/foto/7', { responseType: 'blob', signal });
    await usuarioAPI.removerFotoAsync();
    expect(HTTPClient.delete).toHaveBeenCalledWith('/Usuario/foto');
});

test('usa os campos reais dos contratos de nome e senha', async () => {
    await usuarioAPI.atualizarAsync('Nome', 'teste@example.invalid');
    expect(HTTPClient.put).toHaveBeenCalledWith('/Usuario', { nome: 'Nome', email: 'teste@example.invalid' });
    await usuarioAPI.alterarSenhaAsync('atual123', 'nova123', 'nova123');
    expect(HTTPClient.put).toHaveBeenCalledWith('/Usuario/senha', { senhaAtual: 'atual123', senhaNova: 'nova123', confirmarSenha: 'nova123' });
});
