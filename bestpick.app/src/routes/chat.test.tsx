import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from './chat';
import chatAPI from '../services/chatAPI';
import historicoAPI from '../services/historicoAPI';
import produtoAPI from '../services/produtoAPI';
import favoritoAPI from '../services/favoritoAPI';

jest.mock('../components/AppShell', () => ({ AppShell: ({ children }) => <main>{children}</main> }));
jest.mock('../contexts/UsuarioContext', () => ({ useUsuario: () => ({ usuario: { nome: 'Pessoa Teste' } }) }));
jest.mock('../services/chatAPI');
jest.mock('../services/historicoAPI');
jest.mock('../services/produtoAPI');
jest.mock('../services/favoritoAPI');

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
});

test('sugestão preenche sem enviar e envio usa API com estado de carregamento', async () => {
  let resolve;
  chatAPI.enviarMensagemAsync.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<ChatPage />);
  expect(screen.getByRole('heading', { name: 'Olá, Pessoa!' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Notebook para estudar' }));
  expect(screen.getByRole('textbox')).toHaveValue('Notebook para estudar');
  expect(chatAPI.enviarMensagemAsync).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(chatAPI.enviarMensagemAsync).toHaveBeenCalledWith('Notebook para estudar', null, null, null);
  expect(screen.getByRole('status')).toHaveTextContent('Pensando...');
  resolve({ mensagem: 'Qual é seu orçamento?', completo: false, produtos: [] });
  expect(await screen.findByText('Qual é seu orçamento?')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Nova busca' }));
  expect(screen.getByRole('heading', { name: 'Olá, Pessoa!' })).toBeInTheDocument();
});

test('resultado salva histórico e produto antes de favoritar pelo id persistido', async () => {
  chatAPI.enviarMensagemAsync.mockResolvedValue({ mensagem: 'Opção encontrada', completo: true, produto: 'Celular', valorCompra: 2000, motivoCompra: 'Jogar', produtos: [{ nome: 'Produto teste', preco: 1500, imgUrl: '/teste.png', beneficios: ['Vantagem teste'], url: 'https://example.invalid/produto' }] });
  historicoAPI.adicionarAsync.mockResolvedValue({ id: 10 });
  produtoAPI.adicionarAsync.mockResolvedValue({ id: 20 });
  favoritoAPI.adicionarAsync.mockResolvedValue({ id: 30 });
  favoritoAPI.removerAsync.mockResolvedValue(undefined);
  render(<ChatPage />);
  userEvent.type(screen.getByRole('textbox'), 'Celular');
  userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  const favorite = await screen.findByRole('button', { name: 'Adicionar aos favoritos' });
  expect(historicoAPI.adicionarAsync).toHaveBeenCalledWith('Celular', 2000, 'Jogar');
  expect(screen.getByRole('link', { name: 'Ver produto' })).toHaveAttribute('href', 'https://example.invalid/produto');
  userEvent.click(favorite);
  await waitFor(() => expect(favorite).toHaveAttribute('aria-pressed', 'true'));
  expect(favoritoAPI.adicionarAsync).toHaveBeenCalledWith(20);
  userEvent.click(favorite);
  await waitFor(() => expect(favorite).toHaveAttribute('aria-pressed', 'false'));
  expect(favoritoAPI.removerAsync).toHaveBeenCalledWith(30);
});

test('falha no envio informa o erro e libera nova tentativa', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  chatAPI.enviarMensagemAsync.mockRejectedValue(new Error('indisponível'));
  render(<ChatPage />);
  userEvent.type(screen.getByRole('textbox'), 'Celular');
  userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByText('Não foi possível enviar sua mensagem. Tente novamente.')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBeEnabled();
  log.mockRestore();
});

test('falha ao favoritar mantém coração desmarcado e permite tentar novamente', async () => {
  localStorage.setItem('bestpickChat_usuario', JSON.stringify({ mensagens: [{ tipo: 'bestpick', texto: 'Resultado salvo', produtos: [{ id: 20, nome: 'Produto teste', preco: 100, imgUrl: '/teste.png', url: 'https://example.invalid' }] }] }));
  favoritoAPI.adicionarAsync.mockRejectedValue(new Error('indisponível'));
  render(<ChatPage />);
  const favorite = screen.getByRole('button', { name: 'Adicionar aos favoritos' });
  userEvent.click(favorite);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar os favoritos. Tente novamente.');
  expect(favorite).toHaveAttribute('aria-pressed', 'false');
  expect(favorite).toBeEnabled();
});
