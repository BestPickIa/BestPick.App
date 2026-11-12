export const periodos = [
    { id: '7', nome: '7 dias', descricao: 'Últimos 7 dias' },
    { id: '30', nome: '30 dias', descricao: 'Últimos 30 dias' },
    { id: 'sempre', nome: 'Sempre', descricao: 'Desde o início (por mês)' },
];

// DataBusca é gravada pelo backend com DateTime.Now, sem informação de fuso.
// Preserva o dia de calendário recebido, sem deslocar buscas entre dias.
function diaDaBusca(valor) {
    if (typeof valor !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(valor);
    if (!match) return null;
    const [, ano, mes, dia] = match.map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}
const chaveDia = data => `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
const chaveMes = data => `${data.getFullYear()}-${data.getMonth()}`;

export function agruparBuscas(historicos, periodo, agora = new Date()) {
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const datas = historicos.map(item => diaDaBusca(item.dataBusca));
    const datasInvalidas = datas.filter(data => !data || data > hoje).length;
    const validas = datas.filter(data => data && data <= hoje);
    if (periodo === 'sempre' && !validas.length) return { dados: [], datasInvalidas };
    const mensal = periodo === 'sempre';
    const inicio = mensal
        ? new Date(Math.min(...validas.map(data => data.getTime())))
        : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (Number(periodo) - 1));
    const inicioPeriodo = new Date(inicio);
    if (mensal) inicio.setDate(1);
    const chave = mensal ? chaveMes : chaveDia;
    const pontos = new Map();
    for (const data = new Date(inicio); data <= hoje; mensal ? data.setMonth(data.getMonth() + 1) : data.setDate(data.getDate() + 1)) {
        pontos.set(chave(data), {
            dia: data.toLocaleDateString('pt-BR', mensal ? { month: 'short', year: 'numeric' } : { day: '2-digit', month: '2-digit' }),
            buscas: 0,
        });
    }
    validas.forEach(data => { const ponto = pontos.get(chave(data)); if (ponto) ponto.buscas += 1; });
    return { dados: [...pontos.values()], datasInvalidas, inicio: inicioPeriodo, fim: hoje };
}
