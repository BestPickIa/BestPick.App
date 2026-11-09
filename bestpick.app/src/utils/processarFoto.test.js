/**
 * Testes para processarFoto.js
 * Valida fluxo completo de upload e processamento de imagens
 */

import { processarFotoParaUpload } from './processarFoto';

/**
 * Função auxiliar para criar um File JPEG com assinatura real
 * mas extensão .png (simula o bug do usuário)
 */
function criarJPEGComExtensaoPNG() {
    // Assinatura JPEG: FF D8 FF E0 (inicío de arquivo JPEG real)
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const jpegData = new Uint8Array(27648); // ~27KB de dados
    jpegData.set(jpegHeader, 0); // Colocar assinatura no começo
    
    const blob = new Blob([jpegData], { type: 'image/jpeg' });
    return new File([blob], 'images.png', { type: 'image/png' }); // Nome .png mas MIME jpeg
}

/**
 * Função auxiliar para criar uma imagem PNG real via Canvas
 */
function criarPNGValido(largura = 800, altura = 600) {
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, largura, altura);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`PNG: ${largura}x${altura}`, 20, 50);
    
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            resolve(new File([blob], 'test.png', { type: 'image/png' }));
        }, 'image/png');
    });
}

/**
 * Teste 1: JPEG com extensão .png deve ser ACEITO
 */
export async function testeJPEGComExtensaoPNG() {
    console.log('\n=== TESTE 1: JPEG com extensão .png ===');
    
    try {
        const arquivo = criarJPEGComExtensaoPNG();
        console.log('Arquivo criado:', {
            nome: arquivo.name,
            tamanho: arquivo.size,
            tipoArquivo: arquivo.type
        });
        
        const resultado = await processarFotoParaUpload(arquivo);
        
        console.log('✅ SUCESSO - Arquivo processado:', {
            nome: resultado.arquivo.name,
            tamanho: resultado.arquivo.size,
            tipo: resultado.arquivo.type,
            largura: resultado.largura,
            altura: resultado.altura,
            extensao: resultado.extensao
        });
        
        // Validações
        if (resultado.arquivo.type !== 'image/jpeg') {
            throw new Error(`Tipo esperado: image/jpeg, obtido: ${resultado.arquivo.type}`);
        }
        if (!resultado.arquivo.name.endsWith('.jpg') && !resultado.arquivo.name.endsWith('.jpeg')) {
            throw new Error(`Extensão esperada: .jpg ou .jpeg, obtida: ${resultado.extensao}`);
        }
        
        return { sucesso: true, resultado };
    } catch (erro) {
        console.error('❌ FALHA:', erro.message);
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Teste 2: PNG válido deve ser ACEITO
 */
export async function testePNGValido() {
    console.log('\n=== TESTE 2: PNG válido (800x600) ===');
    
    try {
        const arquivo = await criarPNGValido(800, 600);
        console.log('Arquivo criado:', {
            nome: arquivo.name,
            tamanho: arquivo.size,
            tipoArquivo: arquivo.type
        });
        
        const resultado = await processarFotoParaUpload(arquivo);
        
        console.log('✅ SUCESSO - Arquivo processado:', {
            nome: resultado.arquivo.name,
            tamanho: resultado.arquivo.size,
            tipo: resultado.arquivo.type,
            largura: resultado.largura,
            altura: resultado.altura,
            extensao: resultado.extensao
        });
        
        if (resultado.arquivo.type !== 'image/png') {
            throw new Error(`Tipo esperado: image/png, obtido: ${resultado.arquivo.type}`);
        }
        
        return { sucesso: true, resultado };
    } catch (erro) {
        console.error('❌ FALHA:', erro.message);
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Teste 3: Arquivo muito pequeno deve ser REJEITADO
 */
export async function testeArquivoMuitoPequeno() {
    console.log('\n=== TESTE 3: Arquivo muito pequeno (100x100) ===');
    
    try {
        const arquivo = await criarPNGValido(100, 100);
        const resultado = await processarFotoParaUpload(arquivo);
        
        console.error('❌ FALHA - Arquivo pequeno deveria ser rejeitado:', resultado);
        return { sucesso: false, erro: 'Arquivo deveria ter sido rejeitado' };
    } catch (erro) {
        console.log('✅ SUCESSO - Arquivo corretamente rejeitado:', erro.message);
        if (erro.message.includes('200×200')) {
            return { sucesso: true, erro: erro.message };
        } else {
            return { sucesso: false, erro: `Mensagem de erro inesperada: ${erro.message}` };
        }
    }
}

/**
 * Teste 4: Arquivo vazio deve ser REJEITADO
 */
export async function testeArquivoVazio() {
    console.log('\n=== TESTE 4: Arquivo vazio ===');
    
    try {
        const blob = new Blob([], { type: 'image/jpeg' });
        const arquivo = new File([blob], 'vazio.jpg', { type: 'image/jpeg' });
        const resultado = await processarFotoParaUpload(arquivo);
        
        console.error('❌ FALHA - Arquivo vazio deveria ser rejeitado:', resultado);
        return { sucesso: false, erro: 'Arquivo vazio deveria ter sido rejeitado' };
    } catch (erro) {
        console.log('✅ SUCESSO - Arquivo vazio corretamente rejeitado:', erro.message);
        return { sucesso: true, erro: erro.message };
    }
}

/**
 * Executar todos os testes
 */
export async function executarTodosTestes() {
    console.log('🧪 INICIANDO SUITE DE TESTES DE PROCESSAMENTO DE FOTOS');
    console.log('='.repeat(60));
    
    const testes = [
        { nome: 'JPEG com extensão .png', funcao: testeJPEGComExtensaoPNG },
        { nome: 'PNG válido', funcao: testePNGValido },
        { nome: 'Arquivo muito pequeno', funcao: testeArquivoMuitoPequeno },
        { nome: 'Arquivo vazio', funcao: testeArquivoVazio }
    ];
    
    const resultados = [];
    
    for (const teste of testes) {
        try {
            const resultado = await teste.funcao();
            resultados.push({
                teste: teste.nome,
                ...resultado
            });
        } catch (erro) {
            resultados.push({
                teste: teste.nome,
                sucesso: false,
                erro: erro.message
            });
        }
    }
    
    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    
    const sucessos = resultados.filter(r => r.sucesso).length;
    const total = resultados.length;
    
    resultados.forEach(r => {
        const status = r.sucesso ? '✅' : '❌';
        console.log(`${status} ${r.teste}`);
        if (!r.sucesso) {
            console.log(`   Erro: ${r.erro}`);
        }
    });
    
    console.log('='.repeat(60));
    console.log(`📈 RESULTADO: ${sucessos}/${total} testes passaram`);
    console.log('='.repeat(60) + '\n');
    
    return resultados;
}

// Exportar para execução em navegador
if (typeof window !== 'undefined') {
    window.testesFoto = {
        testeJPEGComExtensaoPNG,
        testePNGValido,
        testeArquivoMuitoPequeno,
        testeArquivoVazio,
        executarTodosTestes
    };
}
