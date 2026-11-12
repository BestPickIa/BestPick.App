import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { createFileRoute, type AnyRoute } from '@tanstack/react-router';
import { Camera, CheckCircle2, AlertCircle, KeyRound, UserRound } from 'lucide-react';
import { AppShell, Avatar, PageHeader } from '../components/AppShell';
import { actions, useApp } from '../lib/store';

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/perfil': { id: '/perfil'; path: '/perfil'; fullPath: '/perfil'; preLoaderRoute: AnyRoute; parentRoute: AnyRoute };
  }
}

const inputCls = 'w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
const primaryBtn = 'inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50';
const outlineBtn = 'inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50';
type Msg = { ok: boolean; text: string } | null;

export const Route = createFileRoute('/perfil')({
  component: Perfil,
  head: () => ({ meta: [
    { title: 'Meu perfil — BestPick' },
    { name: 'description', content: 'Gerencie seus dados, sua foto e sua senha no BestPick.' },
    { property: 'og:title', content: 'Meu perfil — BestPick' },
    { property: 'og:description', content: 'Gerencie seus dados, sua foto e sua senha no BestPick.' },
  ] }),
});

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const Icon = msg.ok ? CheckCircle2 : AlertCircle;
  return <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 flex items-center gap-2 text-sm font-medium ${msg.ok ? 'text-primary' : 'text-destructive'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{msg.text}</p>;
}

function Section({ icon, title, children, className = '' }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return <section className={`card-surface p-5 sm:p-6 animate-rise ${className}`}>
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{icon}</span>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    {children}
  </section>;
}

function PhotoCard() {
  const { avatar } = useApp();
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const saved = useRef<string | null>(null);
  useEffect(() => () => {
    // Saved URLs belong to the store until replacement/removal/reset.
    if (preview && preview !== saved.current) URL.revokeObjectURL(preview);
  }, [preview]);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    setMsg(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ ok: false, text: 'Use uma imagem JPEG, PNG ou WebP.' });
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return <Section icon={<Camera aria-hidden="true" className="h-5 w-5" />} title="Foto de perfil">
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      {preview ? <img src={preview} alt="Pré-visualização da nova foto" className="h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-accent" /> : <Avatar size="lg" />}
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-sm text-muted-foreground">{preview ? 'Pré-visualização da nova foto.' : avatar ? 'Esta é sua foto atual.' : 'Você está usando o avatar padrão.'}</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-secondary focus-within:outline-2 focus-within:outline-primary">
          <Camera aria-hidden="true" className="h-4 w-4" />Escolher foto
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
        </label>
      </div>
    </div>
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">JPEG, PNG ou WebP. A foto será redimensionada automaticamente se necessário. Mínimo 200×200 px, máximo 5000×5000 px, até 16 megapixels.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" className={primaryBtn} disabled={!preview} onClick={() => {
        if (!preview) return;
        saved.current = preview;
        actions.setAvatar(preview);
        setPreview(null);
        setMsg({ ok: true, text: 'Foto atualizada.' });
      }}>Salvar foto</button>
      <button type="button" className="inline-flex items-center justify-center rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50" disabled={!avatar && !preview} onClick={() => {
        setPreview(null);
        actions.setAvatar(null);
        setMsg({ ok: true, text: 'Foto removida.' });
      }}>Remover foto</button>
    </div>
    <Notice msg={msg} />
  </Section>;
}

function AccountCard() {
  const { name, email } = useApp();
  const [value, setValue] = useState(name);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => setValue(name), [name]);
  const dirty = value.trim() !== name;
  function submit(event: FormEvent) {
    event.preventDefault();
    const nome = value.trim();
    if (nome.length < 2) { setMsg({ ok: false, text: 'O nome precisa ter pelo menos 2 letras.' }); return; }
    actions.setName(nome);
    setMsg({ ok: true, text: 'Nome atualizado.' });
  }
  return <Section icon={<UserRound aria-hidden="true" className="h-5 w-5" />} title="Dados da conta">
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="nome" className="mb-1.5 block text-sm font-medium">Nome</label><input id="nome" className={inputCls} value={value} maxLength={80} onChange={event => { setValue(event.target.value); setMsg(null); }} /></div>
      <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium">E-mail</label><input id="email" className={inputCls} value={email} disabled aria-describedby="email-ajuda" /><p id="email-ajuda" className="mt-1.5 text-xs text-muted-foreground">O e-mail não pode ser alterado nesta etapa.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={primaryBtn} type="submit" disabled={!dirty}>Salvar nome</button>
        <button className={outlineBtn} type="button" disabled={!dirty} onClick={() => { setValue(name); setMsg(null); }}>Cancelar</button>
      </div>
    </form>
    <Notice msg={msg} />
  </Section>;
}

function PasswordCard({ className }: { className?: string }) {
  const [values, setValues] = useState({ atual: '', nova: '', confirma: '' });
  const [msg, setMsg] = useState<Msg>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const { atual, nova, confirma } = values;
    const text = !atual ? 'Informe sua senha atual.'
      : nova.length < 6 || nova.length > 40 ? 'A nova senha deve ter de 6 a 40 caracteres.'
      : nova === atual ? 'A nova senha deve ser diferente da atual.'
      : nova !== confirma ? 'A confirmação não confere com a nova senha.' : null;
    if (text) { setMsg({ ok: false, text }); return; }
    setValues({ atual: '', nova: '', confirma: '' });
    setMsg({ ok: true, text: 'Senha alterada com sucesso.' });
  }
  return <Section icon={<KeyRound aria-hidden="true" className="h-5 w-5" />} title="Alterar senha" className={className}>
    <p className="-mt-2 mb-5 text-sm text-muted-foreground">Use de 6 a 40 caracteres. A nova senha deve ser diferente da atual.</p>
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
      {([['atual', 'Senha atual'], ['nova', 'Nova senha'], ['confirma', 'Confirmação da nova senha']] as const).map(([id, label]) => <div key={id}>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
        <input id={id} type="password" maxLength={40} autoComplete={id === 'atual' ? 'current-password' : 'new-password'} className={inputCls} value={values[id]} onChange={event => { setValues({ ...values, [id]: event.target.value }); setMsg(null); }} />
      </div>)}
      <div className="md:col-span-3"><button type="submit" className={primaryBtn}>Alterar senha</button><Notice msg={msg} /></div>
    </form>
  </Section>;
}

export function Perfil() {
  return <AppShell title="Meu perfil">
    <div data-profile-page>
      <PageHeader eyebrow="Conta" title="Seu perfil" subtitle="Gerencie seus dados, sua foto e sua senha." />
      <div className="grid gap-5 lg:grid-cols-2"><PhotoCard /><AccountCard /><PasswordCard className="lg:col-span-2" /></div>
    </div>
  </AppShell>;
}
