import { fireEvent, render, screen } from '@testing-library/react';
import { Perfil } from './perfil';
import { initials, resetApp } from '../lib/store';

jest.mock('../components/AppShell', () => {
  const actual = jest.requireActual('../components/AppShell');
  return { ...actual, AppShell: ({ children }) => <main>{children}</main> };
});

beforeEach(() => {
  URL.createObjectURL = jest.fn().mockReturnValue('blob:photo');
  URL.revokeObjectURL = jest.fn();
  resetApp();
});

test('nome valida, cancela e salva; email permanece desabilitado', () => {
  render(<Perfil />);
  const nome = screen.getByLabelText('Nome');
  const initial = nome.value;
  expect(screen.getByLabelText('E-mail')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvar nome' })).toBeDisabled();
  fireEvent.change(nome, { target: { value: 'A' } });
  fireEvent.click(screen.getByText('Salvar nome'));
  expect(screen.getByRole('alert')).toHaveTextContent('O nome precisa ter pelo menos 2 letras.');
  fireEvent.click(screen.getByText('Cancelar'));
  expect(nome).toHaveValue(initial);
  fireEvent.change(nome, { target: { value: '  Pessoa Teste  ' } });
  fireEvent.click(screen.getByText('Salvar nome'));
  expect(nome).toHaveValue('Pessoa Teste');
  expect(screen.getByRole('status')).toHaveTextContent('Nome atualizado.');
  expect(initials('Ana Maria Silva')).toBe('AS');
  expect(initials(' ')).toBe('?');
});

test('senha respeita a ordem de validação e limpa os campos no sucesso', () => {
  render(<Perfil />);
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
  const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('Informe sua senha atual.');
  change('Senha atual', 'antiga');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('A nova senha deve ter de 6 a 40 caracteres.');
  change('Nova senha', 'antiga');
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('A nova senha deve ser diferente da atual.');
  change('Nova senha', 'nova123');
  submit();
  expect(screen.getByRole('alert')).toHaveTextContent('A confirmação não confere com a nova senha.');
  change('Confirmação da nova senha', 'nova123');
  submit();
  expect(screen.getByRole('status')).toHaveTextContent('Senha alterada com sucesso.');
  for (const label of ['Senha atual', 'Nova senha', 'Confirmação da nova senha']) expect(screen.getByLabelText(label)).toHaveValue('');
});

test('foto salva sobrevive à desmontagem e é revogada ao remover', () => {
  const { unmount } = render(<Perfil />);
  const input = screen.getByLabelText('Escolher foto');
  fireEvent.change(input, { target: { files: [new File(['x'], 'foto.gif', { type: 'image/gif' })] } });
  expect(screen.getByRole('alert')).toHaveTextContent('Use uma imagem JPEG, PNG ou WebP.');
  fireEvent.change(input, { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByText('Salvar foto'));
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  unmount();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  render(<Perfil />);
  expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:photo');
  fireEvent.click(screen.getByText('Remover foto'));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('prévia não salva é revogada ao sair', () => {
  const { unmount } = render(<Perfil />);
  fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [new File(['x'], 'foto.webp', { type: 'image/webp' })] } });
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});
