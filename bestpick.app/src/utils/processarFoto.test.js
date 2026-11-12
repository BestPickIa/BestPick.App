/**
 * Testes para processarFoto.js
 * Valida validação de imagens
 * 
 * NOTA: Testes de redimensionamento e processamento real são executados
 * em ambiente de navegador real. Aqui testamos apenas validações básicas.
 */
import { processarFotoParaUpload } from './processarFoto';

/**
 * Criar arquivo PNG inválido (sem assinatura válida)
 */
function criarArquivoInvalido() {
    const blob = new Blob(['conteúdo inválido'], { type: 'image/png' });
    return new File([blob], 'invalido.png', { type: 'image/png' });
}

test('rejeita arquivo vazio', async () => {
    const blob = new Blob([], { type: 'image/jpeg' });
    const arquivo = new File([blob], 'vazio.jpg', { type: 'image/jpeg' });
    await expect(processarFotoParaUpload(arquivo)).rejects.toThrow('Selecione um arquivo não vazio');
});

test('rejeita arquivo com tipo inválido (SVG)', async () => {
    const blob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
    const arquivo = new File([blob], 'imagem.svg', { type: 'image/svg+xml' });
    await expect(processarFotoParaUpload(arquivo)).rejects.toThrow('A foto deve ser JPEG, PNG ou WebP com conteúdo válido');
});

test('rejeita arquivo sem assinatura válida', async () => {
    const arquivo = criarArquivoInvalido();
    await expect(processarFotoParaUpload(arquivo)).rejects.toThrow('A foto deve ser JPEG, PNG ou WebP com conteúdo válido');
});
