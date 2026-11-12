import { Heart } from 'lucide-react';

export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  features: string[];
  url: string;
};

export function ViewProductButton({ href }: { href: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-brand-primary px-3 py-2 text-center text-sm font-semibold text-brand-primary-foreground no-underline hover:bg-brand-primary/90">Ver produto</a>;
}

export function ProductCard({ product, favorite, onToggleFavorite, pending = false }: {
  product: Product;
  favorite: boolean;
  onToggleFavorite: () => void;
  pending?: boolean;
}) {
  const label = favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <img src={product.image} alt={product.name} loading="lazy" className="mx-auto h-40 w-full rounded-xl object-contain" />
      <h3 className="mt-3 mb-0 break-words text-base font-bold">{product.name}</h3>
      <p className="mt-2 mb-0 text-xl font-extrabold text-brand-primary">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {product.features.map((feature, index) => <li key={index}>{feature}</li>)}
      </ul>
      <div className="flex items-center gap-2">
        <ViewProductButton href={product.url} />
        <button type="button" aria-label={label} title={label} aria-pressed={favorite} disabled={pending} onClick={onToggleFavorite}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-primary disabled:opacity-50 ${favorite ? 'bg-brand-primary text-brand-primary-foreground' : 'text-brand-primary hover:bg-secondary'}`}>
          <Heart aria-hidden="true" className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  );
}
