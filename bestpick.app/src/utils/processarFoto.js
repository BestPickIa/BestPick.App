/**
 * Utilitário para processar, validar e redimensionar fotos no cliente
 * antes do upload, com suporte a JPEG, PNG e WebP
 * 
 * IMPORTANTE: Detecta formato REAL pela assinatura do arquivo,
 * não pela extensão. Normaliza extensão conforme conteúdo real.
 */

const LIMITES = {
    tamanhoMaximoBytes: 5 * 1024 * 1024, // 5 MB
    larguraMinima: 200,
    alturaMinima: 200,
    larguraMaxima: 5000,
    alturaMaxima: 5000,
    megapixelsMaximo: 16_000_000,
    larguraRedimensionamento: 2048,
};

// Formatos suportados com assinaturas reais
const FORMATOS_SUPORTADOS = {
    jpeg: { 
        mime: 'image/jpeg', 
        extensoes: ['.jpg', '.jpeg'],
        assinatura: (view) => view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF
    },
    png: { 
        mime: 'image/png', 
        extensoes: ['.png'],
        assinatura: (view) => view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47
    },
    webp: { 
        mime: 'image/webp', 
        extensoes: ['.webp'],
        assinatura: (view) => view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
                             view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
    },
};

/**
 * Valida e processa uma imagem selecionada
 * CORREÇÃO: Normaliza extensão conforme conteúdo real detectado
 * 
 * @param {File} arquivo - Arquivo de imagem do input
 * @returns {Promise<{arquivo: File, largura: number, altura: number, extensao: string}>}
 * @throws {Error} - Erro com mensagem amigável
 */
export async function processarFotoParaUpload(arquivo) {
    if (!arquivo) throw new Error('Nenhuma foto selecionada.');
    if (arquivo.size === 0) throw new Error('Selecione um arquivo não vazio.');
    if (arquivo.size > LIMITES.tamanhoMaximoBytes) {
        throw new Error(`A foto deve ter no máximo ${Math.round(LIMITES.tamanhoMaximoBytes / 1024 / 1024)} MB.`);
    }

    // CORREÇÃO: Detectar tipo MIME REAL pela assinatura, não pela extensão
    const { tipoMimeReal, formatoValido } = await detectarTipoMimeReal(arquivo);
    
    if (!formatoValido) {
        throw new Error('A foto deve ser JPEG, PNG ou WebP com conteúdo válido.');
    }

    // Decodificar imagem
    let img;
    try {
        img = await decodificarImagem(arquivo);
    } catch (erro) {
        throw new Error('Não foi possível abrir a imagem. Verifique se o arquivo é válido.');
    }

    const { largura, altura, orientacaoExif } = img;
    
    // Aplicar orientação EXIF
    const { larguraFinal, alturaFinal } = aplicarOrientacaoExif(largura, altura, orientacaoExif);

    // Validar dimensões
    if (larguraFinal < LIMITES.larguraMinima || alturaFinal < LIMITES.alturaMinima) {
        throw new Error(`A foto deve ter pelo menos ${LIMITES.larguraMinima}×${LIMITES.alturaMinima} pixels.`);
    }
    if (larguraFinal > LIMITES.larguraMaxima || alturaFinal > LIMITES.alturaMaxima) {
        throw new Error(`A foto não pode exceder ${LIMITES.larguraMaxima}×${LIMITES.alturaMaxima} pixels.`);
    }
    if (larguraFinal * alturaFinal > LIMITES.megapixelsMaximo) {
        throw new Error(`A foto não pode exceder ${LIMITES.megapixelsMaximo / 1_000_000} megapixels.`);
    }

    // CORREÇÃO: Gerar extensão correta baseada no formato real detectado
    let extensaoCorreta = obterExtensaoDoFormato(tipoMimeReal);
    let arquivoProcessado = arquivo;

    // Redimensionar se necessário
    if (larguraFinal > LIMITES.larguraRedimensionamento || alturaFinal > LIMITES.larguraRedimensionamento) {
        try {
            arquivoProcessado = await redimensionarImagem(
                arquivo,
                larguraFinal,
                alturaFinal,
                orientacaoExif,
                tipoMimeReal
            );
            // Manter a extensão correta após redimensionamento
            const nomeOriginal = arquivoProcessado.name;
            if (!nomeOriginal.endsWith(extensaoCorreta)) {
                const nomeNormalizado = nomeOriginal.substring(0, nomeOriginal.lastIndexOf('.')) + extensaoCorreta;
                arquivoProcessado = new File(
                    [arquivoProcessado],
                    nomeNormalizado,
                    { type: tipoMimeReal }
                );
            }
        } catch (erro) {
            console.warn('Redimensionamento no cliente falhou, tentando normalizar e enviar:', erro);
        }
    }

    // Se era WebP, converter para PNG
    if (tipoMimeReal === FORMATOS_SUPORTADOS.webp.mime) {
        try {
            arquivoProcessado = await converterWebPParaPng(arquivoProcessado);
            extensaoCorreta = '.png';
        } catch (erro) {
            throw new Error('Não foi possível converter a imagem WebP. Tente outro formato.');
        }
    } else if (!arquivoProcessado.name.endsWith(extensaoCorreta)) {
        // CORREÇÃO: Normalizar nome do arquivo para extensão correta
        const nomeNormalizado = arquivo.name.substring(0, arquivo.name.lastIndexOf('.')) + extensaoCorreta;
        arquivoProcessado = new File(
            [arquivoProcessado],
            nomeNormalizado,
            { type: tipoMimeReal }
        );
    }

    return {
        arquivo: arquivoProcessado,
        largura: larguraFinal,
        altura: alturaFinal,
        extensao: extensaoCorreta,
    };
}

/**
 * CORREÇÃO: Detectar o tipo MIME real do arquivo lendo a assinatura
 * Retorna {tipoMimeReal, formatoValido}
 */
async function detectarTipoMimeReal(arquivo) {
    const buffer = await lerPrimeirosBytes(arquivo, 32);
    const view = new Uint8Array(buffer);

    // Testar cada formato pela assinatura
    for (const config of Object.values(FORMATOS_SUPORTADOS)) {
        if (config.assinatura(view)) {
            return {
                tipoMimeReal: config.mime,
                formatoValido: true
            };
        }
    }

    // Se chegou aqui, não é um dos formatos suportados
    return {
        tipoMimeReal: arquivo.type || 'application/octet-stream',
        formatoValido: false
    };
}

/**
 * CORREÇÃO: Obter extensão correta baseada no MIME type real
 */
function obterExtensaoDoFormato(mimeType) {
    for (const config of Object.values(FORMATOS_SUPORTADOS)) {
        if (config.mime === mimeType) {
            return config.extensoes[0]; // Retorna extensão primária
        }
    }
    return '.jpg'; // Fallback
}

async function lerPrimeirosBytes(arquivo, quantidade) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = reject;
        leitor.readAsArrayBuffer(arquivo.slice(0, quantidade));
    });
}

/**
 * Decodificar imagem e extrair metadados
 */
async function decodificarImagem(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Extrair orientação EXIF se disponível (simplificado)
                let orientacao = 1; // Default
                if (arquivo.type === 'image/jpeg') {
                    // Aqui seria necessário usar uma biblioteca EXIF
                    // Por agora, usamos default
                }
                resolve({
                    largura: img.width,
                    altura: img.height,
                    orientacaoExif: orientacao,
                });
            };
            img.onerror = () => reject(new Error('Não foi possível decodificar a imagem.'));
            img.src = e.target.result;
        };
        leitor.onerror = reject;
        leitor.readAsDataURL(arquivo);
    });
}

/**
 * Aplicar orientação EXIF às dimensões
 */
function aplicarOrientacaoExif(largura, altura, orientacao) {
    // Orientações que giram a imagem: 5, 6, 7, 8
    const gira = [5, 6, 7, 8].includes(orientacao);
    return {
        larguraFinal: gira ? altura : largura,
        alturaFinal: gira ? largura : altura,
    };
}

/**
 * Redimensionar imagem mantendo proporção
 */
async function redimensionarImagem(arquivo, largura, altura, orientacao, tipoMime) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Calcular nova proporção
                    const maxLado = LIMITES.larguraRedimensionamento;
                    const escala = Math.min(1, maxLado / Math.max(largura, altura));
                    const novaLargura = Math.round(largura * escala);
                    const novaAltura = Math.round(altura * escala);

                    // Criar canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = novaLargura;
                    canvas.height = novaAltura;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Contexto canvas não suportado.');

                    // Desenhar com interpolação
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Aplicar transformação de orientação EXIF
                    ctx.translate(novaLargura / 2, novaAltura / 2);
                    switch (orientacao) {
                        case 2: ctx.scale(-1, 1); break;
                        case 3: ctx.rotate(Math.PI); break;
                        case 4: ctx.scale(1, -1); break;
                        case 5: ctx.scale(-1, 1); ctx.rotate(Math.PI / 2); break;
                        case 6: ctx.rotate(Math.PI / 2); break;
                        case 7: ctx.scale(1, -1); ctx.rotate(Math.PI / 2); break;
                        case 8: ctx.rotate(-Math.PI / 2); break;
                        default: break; // Sem transformação para orientação 1 (normal)
                    }
                    ctx.drawImage(img, -novaLargura / 2, -novaAltura / 2, novaLargura, novaAltura);

                    // Converter para blob com tipo MIME correto
                    const mimeDoCanva = tipoMime === 'image/webp' ? 'image/png' : tipoMime;
                    canvas.toBlob(
                        (blob) => {
                            const novoArquivo = new File([blob], arquivo.name, { type: mimeDoCanva });
                            resolve(novoArquivo);
                        },
                        mimeDoCanva,
                        0.85 // Qualidade
                    );
                } catch (erro) {
                    reject(erro);
                }
            };
            img.onerror = () => reject(new Error('Falha ao processar imagem.'));
            img.src = e.target.result;
        };
        leitor.onerror = reject;
        leitor.readAsDataURL(arquivo);
    });
}

/**
 * Converter WebP para PNG
 */
async function converterWebPParaPng(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(
                        (blob) => {
                            const novoNome = arquivo.name.replace(/\.\w+$/i, '.png');
                            const novoArquivo = new File([blob], novoNome, { type: 'image/png' });
                            resolve(novoArquivo);
                        },
                        'image/png'
                    );
                } catch (erro) {
                    reject(erro);
                }
            };
            img.onerror = () => reject(new Error('Não foi possível converter WebP.'));
            img.src = e.target.result;
        };
        leitor.onerror = reject;
        leitor.readAsDataURL(arquivo);
    });
}

/**
 * Gerar URL de prévia para exibição circular
 */
export function gerarUrlPrevia(arquivo) {
    if (!arquivo) return null;
    return URL.createObjectURL(arquivo);
}

/**
 * Revogar URL de prévia
 */
export function revogarUrlPrevia(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

