import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRouter } from '../../test/renderRouter';
import { Dashboard } from './Dashboard';
import dashboardAPI from '../../services/dashboardAPI';
import historicoAPI from '../../services/historicoAPI';

jest.mock('../../services/dashboardAPI', () => ({ obterAsync: jest.fn() }));
jest.mock('../../services/historicoAPI', () => ({ listarAsync: jest.fn() }));
jest.mock('../../contexts/UsuarioContext', () => ({ useUsuario: () => ({ usuario: { nome: 'Pessoa Teste' } }) }));
jest.mock('recharts', () => {
    const actual = jest.requireActual('recharts');
    return { ...actual, ResponsiveContainer: ({ children }) => <actual.ResponsiveContainer width={500} height={240}>{children}</actual.ResponsiveContainer> };
});
beforeEach(() => { jest.clearAllMocks(); historicoAPI.listarAsync.mockResolvedValue([]); });
async function abrir() { return renderRouter({ '/': Dashboard }); }

test('mostra totais reais, nome e destinos corretos; alterna períodos pelo teclado', async () => {
    dashboardAPI.obterAsync.mockResolvedValue({ totalBuscas: 12, totalFavoritados: 4, totalAdquiridos: 2 });
    await abrir();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(await screen.findByRole('link', { name: 'Buscas realizadas 12' })).toHaveAttribute('href', '/historico');
    expect(screen.getByRole('heading', { name: /Olá, Pessoa/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova busca' })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: 'Favoritados 4' })).toHaveAttribute('href', '/favoritos');
    expect(screen.getByRole('link', { name: 'Adquiridos 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '18 registros: Buscas: 12, Favoritados: 4, Adquiridos: 2' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma busca registrada neste período.')).toBeInTheDocument();
    const semanal = screen.getByRole('tab', { name: '7 dias' });
    semanal.focus();
    userEvent.keyboard('{arrowright}');
    expect(screen.getByRole('tab', { name: '30 dias' })).toHaveFocus();
    expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
    userEvent.keyboard('{end}');
    expect(screen.getByRole('tab', { name: 'Sempre' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Desde o início (por mês)')).toBeInTheDocument();
});

test('falha no histórico não fabrica uma série vazia nem esconde totais disponíveis', async () => {
    dashboardAPI.obterAsync.mockResolvedValue({ totalBuscas: 3, totalFavoritados: 1, totalAdquiridos: 0 });
    historicoAPI.listarAsync.mockRejectedValueOnce(new Error('indisponível'));
    await abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico');
    expect(screen.getByRole('img', { name: '4 registros: Buscas: 3, Favoritados: 1, Adquiridos: 0' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma busca registrada neste período.')).not.toBeInTheDocument();
});

test('mostra erro sem inventar totais e permite tentar novamente com conta vazia', async () => {
    dashboardAPI.obterAsync.mockRejectedValueOnce(new Error('indisponível')).mockResolvedValueOnce({ totalBuscas: 0, totalFavoritados: 0, totalAdquiridos: 0 });
    await abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByRole('link', { name: 'Buscas realizadas 0' })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: 'Buscas realizadas 0' })).toBeInTheDocument();
    await waitFor(() => expect(dashboardAPI.obterAsync).toHaveBeenCalledTimes(2));
});

test('Sempre apresenta total em barra quando há apenas um mês, sem pontos artificiais', async () => {
    const agora = new Date();
    const dataBusca = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01T12:00:00`;
    historicoAPI.listarAsync.mockResolvedValue([{ dataBusca }, { dataBusca }, { dataBusca }]);
    dashboardAPI.obterAsync.mockResolvedValue({ totalBuscas: 3, totalFavoritados: 0, totalAdquiridos: 0 });
    await abrir();
    await screen.findByRole('link', { name: 'Buscas realizadas 3' });
    userEvent.click(screen.getByRole('tab', { name: 'Sempre' }));
    expect(screen.getByText('Há apenas um mês no período: a barra mostra o total de buscas desse mês.')).toBeInTheDocument();
    expect(screen.getByText(/^De .* até /)).toBeInTheDocument();
    userEvent.click(screen.getByRole('tab', { name: '30 dias' }));
    expect(screen.queryByText('Há apenas um mês no período: a barra mostra o total de buscas desse mês.')).not.toBeInTheDocument();
});
