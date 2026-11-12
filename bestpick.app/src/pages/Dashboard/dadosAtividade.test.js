import { agruparBuscas } from './dadosAtividade';
const hoje = new Date(2026, 10, 10, 12);
const registro = dataBusca => ({ dataBusca });

test('agrega somente buscas reais no intervalo inclusivo de sete dias', () => {
    const { dados } = agruparBuscas([
        registro('2026-11-03T23:59:59'), registro('2026-11-04T00:00:00'),
        registro('2026-11-10T01:00:00'), registro('2026-11-10T23:00:00'),
    ], '7', hoje);
    expect(dados).toHaveLength(7);
    expect(dados[0]).toEqual({ dia: '04/11', buscas: 1 });
    expect(dados[6]).toEqual({ dia: '10/11', buscas: 2 });
    expect(dados.reduce((total, dia) => total + dia.buscas, 0)).toBe(3);
    expect(dados[1]).toEqual({ dia: '05/11', buscas: 0 });
});

test('30 dias atravessa meses e sempre separa os anos sem inventar favoritos', () => {
    const historicos = [registro('2025-11-10T12:00:00'), registro('2026-10-12T12:00:00'), registro('2026-11-10T12:00:00')];
    const mensal = agruparBuscas(historicos, 'sempre', hoje).dados;
    expect(mensal).toHaveLength(13);
    expect(mensal[0].buscas).toBe(1);
    expect(mensal[12].buscas).toBe(1);
    expect(mensal[0].dia).not.toBe(mensal[12].dia);
    const dias = agruparBuscas(historicos, '30', hoje).dados;
    expect(dias).toHaveLength(30);
    expect(dias.reduce((total, dia) => total + dia.buscas, 0)).toBe(2);
    expect(dias[0]).not.toHaveProperty('favoritos');
});

test('conta vazia não gera atividade e datas inválidas não viram números inventados', () => {
    expect(agruparBuscas([], 'sempre', hoje).dados).toEqual([]);
    expect(agruparBuscas([], '7', hoje).dados.every(dia => dia.buscas === 0)).toBe(true);
    expect(agruparBuscas([registro('inválida'), registro('2026-02-31'), registro('2026-11-11')], '7', hoje).datasInvalidas).toBe(3);
});

test('sempre com um único mês preserva o total e informa início e fim reais', () => {
    const resultado = agruparBuscas([registro('2026-11-08T10:00:00'), registro('2026-11-10T12:00:00'), registro('2026-11-10T13:00:00')], 'sempre', hoje);
    expect(resultado.dados).toHaveLength(1);
    expect(resultado.dados[0].buscas).toBe(3);
    expect(resultado.inicio).toEqual(new Date(2026, 10, 8));
    expect(resultado.fim).toEqual(new Date(2026, 10, 10));
});
