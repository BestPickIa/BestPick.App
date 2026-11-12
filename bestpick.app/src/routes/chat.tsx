import { useRef } from 'react';
import { createFileRoute, type AnyRoute } from '@tanstack/react-router';
import { RotateCcw, SendHorizontal, Sparkles } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ProductCard } from '../components/ProductCard';
import { useChat } from '../hooks/useChat';

// The existing application assembles its route tree manually in App.js.
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/chat': { id: '/chat'; path: '/chat'; fullPath: '/chat'; preLoaderRoute: AnyRoute; parentRoute: AnyRoute };
  }
}

const description = 'Encontre o produto ideal com as recomendações do assistente de compras BestPick.';
export const Route = createFileRoute('/chat')({
  component: ChatPage,
  head: () => ({ meta: [
    { title: 'Chat — BestPick' },
    { name: 'description', content: description },
    { property: 'og:title', content: 'Chat — BestPick' },
    { property: 'og:description', content: description },
  ] }),
});

const suggestions = ['Celular para trabalho até R$ 2.000', 'Notebook para estudar', 'Fone com cancelamento de ruído'];
type ApiProduct = { id: number; nome: string; preco: number; imgUrl: string; beneficios?: string[]; url: string };
type Message = { tipo: string; texto: string; produtos?: ApiProduct[] };

export function ChatPage() {
  const chat = useChat();
  const input = useRef<HTMLInputElement>(null);
  return (
    <AppShell title="Chat" fullBleed>
      <div className="dot-grid flex h-[calc(100dvh-65px)] min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 pt-8 pb-4 sm:px-6">
            {chat.mensagens.length === 0 ? (
              <div className="my-auto animate-rise text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-hero text-brand-primary-foreground shadow-lift"><Sparkles aria-hidden="true" className="h-7 w-7" /></div>
                <h1 className="mt-4 mb-0 text-3xl font-extrabold sm:text-4xl">Olá, {chat.nomeUsuario.trim().split(/\s+/)[0]}!</h1>
                <p className="mx-auto mt-2 mb-0 max-w-md text-muted-foreground">Me conte o produto que você procura. Quanto mais detalhes, melhor a recomendação.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestions.map(text => <button key={text} type="button" onClick={() => { chat.setMensagem(text); input.current?.focus(); }} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium shadow-soft hover:border-brand-primary hover:text-brand-primary">{text}</button>)}
                </div>
              </div>
            ) : chat.mensagens.map((message: Message, index: number) => message.tipo === 'usuario' ? (
              <p key={index} className="m-0 max-w-[80%] animate-rise self-end rounded-2xl rounded-br-md bg-brand-primary px-4 py-2.5 text-sm break-words whitespace-pre-wrap text-brand-primary-foreground shadow-soft">{message.texto}</p>
            ) : (
              <div key={index} className="flex min-w-0 animate-rise items-start gap-3">
                <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">BP</span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <p className="m-0 self-start rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-sm break-words whitespace-pre-wrap shadow-soft">{message.texto}</p>
                  {message.produtos?.map(product => <ProductCard key={product.id} product={{ id: product.id, name: product.nome, price: product.preco, image: product.imgUrl, features: product.beneficios || [], url: product.url }} favorite={!!chat.favoritos[product.id]} pending={chat.favoritando} onToggleFavorite={() => { void chat.handleFavoritar(product); }} />)}
                </div>
              </div>
            ))}
            {chat.carregando && <p role="status" className="m-0 text-sm text-muted-foreground">Pensando...</p>}
            {chat.erroFavorito && <p role="alert" className="m-0 text-sm text-muted-foreground">{chat.erroFavorito}</p>}
            {chat.mensagens.length > 0 && <button type="button" disabled={chat.aguardandoNovaBusca || chat.carregando} onClick={() => { chat.handleNovaBusca(); input.current?.focus(); }} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-brand-primary bg-card px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-secondary disabled:opacity-50"><RotateCcw aria-hidden="true" className="h-4 w-4" />{chat.aguardandoNovaBusca ? 'Aguarde para iniciar uma nova busca...' : 'Nova busca'}</button>}
            <div ref={chat.finalMensagensRef} />
          </div>
        </div>
        <div className="shrink-0 border-t border-border bg-background/90 px-4 pt-3 pb-4 backdrop-blur sm:px-6">
          <form onSubmit={chat.handleEnviar} className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-input bg-card p-2 shadow-soft focus-within:border-brand-primary">
            <input ref={input} aria-label="Descreva o produto que procura" value={chat.mensagem} onChange={event => chat.setMensagem(event.target.value)} disabled={chat.carregando || chat.buscaCompleta} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" placeholder="Ex: Quero um celular para trabalho de até 2000 reais..." />
            <button type="submit" aria-label="Enviar" disabled={chat.carregando || chat.buscaCompleta || !chat.mensagem.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90 disabled:opacity-50"><SendHorizontal aria-hidden="true" className="h-5 w-5" /></button>
          </form>
          <p className="mt-2 mb-0 text-center text-[11px] text-muted-foreground">O BestPick pode cometer erros. Confira os detalhes antes de comprar.</p>
        </div>
      </div>
    </AppShell>
  );
}
