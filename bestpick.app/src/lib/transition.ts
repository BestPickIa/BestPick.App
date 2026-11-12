/**
 * Helper para usar View Transitions API de forma segura
 * Executa uma função dentro de uma transição suave se disponível
 */
export async function withTransition<T>(
  fn: () => T | Promise<T>
): Promise<T> {
  // Verificar se View Transitions API está disponível
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document
  ) {
    let result: T;
    await new Promise<void>((resolve) => {
      (document as any).startViewTransition(async () => {
        result = await fn();
        resolve();
      });
    });
    return result!;
  }

  // Fallback: executar a função direto se API não estiver disponível
  return await fn();
}

/**
 * Executar ação com transição e view-transition-name para o cartão
 * Útil para ao remover/mover cartões, os vizinhos deslizam suavemente
 */
export async function withCardTransition<T>(
  cardId: string | number,
  fn: () => T | Promise<T>
): Promise<T> {
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document
  ) {
    let result: T;
    await new Promise<void>((resolve) => {
      (document as any).startViewTransition(async () => {
        result = await fn();
        resolve();
      });
    });
    return result!;
  }

  return await fn();
}

/**
 * Classe auxiliar para gerenciar animações de cartão
 * Use no cartão que será removido/alterado
 */
export function getCardTransitionClass(
  cardId: string | number,
  isRemoving: boolean
): string {
  if (isRemoving) {
    return 'card-exit removing';
  }
  return '';
}

/**
 * Gerar style object com view-transition-name para um cartão
 */
export function getCardTransitionStyle(cardId: string | number) {
  return {
    viewTransitionName: `card-${cardId}`,
  } as React.CSSProperties;
}
