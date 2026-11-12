import { AppShell } from '../../components/AppShell';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Heart, ShoppingBag, History, ArrowRight, MessageCircle } from 'lucide-react';
import { Area, Bar, ComposedChart, LabelList, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUsuario } from '../../contexts/UsuarioContext';
import dashboardAPI from '../../services/dashboardAPI';
import historicoAPI from '../../services/historicoAPI';
import { agruparBuscas, periodos } from './dadosAtividade';
import style from './Dashboard.module.css';

const series = [
    { chave: 'buscas', nome: 'Buscas', cor: 'var(--chart-1)' },
    { chave: 'favoritos', nome: 'Favoritados', cor: 'var(--chart-2)' },
    { chave: 'adquiridos', nome: 'Adquiridos', cor: 'var(--chart-3)' },
];

export function Dashboard() {
    const { usuario } = useUsuario();
    const [dashboard, setDashboard] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const [periodo, setPeriodo] = useState('7');
    const [historicos, setHistoricos] = useState([]);
    const [erroHistorico, setErroHistorico] = useState(false);
    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setErro(false);
        setErroHistorico(false);
        Promise.allSettled([dashboardAPI.obterAsync(), historicoAPI.listarAsync()]).then(([resumo, historico]) => {
            if (!ativo) return;
            if (resumo.status === 'fulfilled') setDashboard(resumo.value);
            else setErro(true);
            if (historico.status === 'fulfilled' && Array.isArray(historico.value)) setHistoricos(historico.value);
            else setErroHistorico(true);
            setCarregando(false);
        });
        return () => { ativo = false; };
    }, [tentativa]);
    const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0];
    const { dados, datasInvalidas, inicio, fim } = agruparBuscas(historicos, periodo);
    const mesUnico = periodo === 'sempre' && dados.length === 1;
    const totais = { buscas: dashboard?.totalBuscas ?? 0, favoritos: dashboard?.totalFavoritados ?? 0, adquiridos: dashboard?.totalAdquiridos ?? 0 };
    const distribuicao = series.map(serie => ({ ...serie, valor: totais[serie.chave] }));
    const total = distribuicao.reduce((soma, serie) => soma + serie.valor, 0);
    const cards = [
        { nome: 'Buscas realizadas', valor: dashboard?.totalBuscas ?? 0, Icone: Search, destino: '/historico' },
        { nome: 'Favoritados', valor: dashboard?.totalFavoritados ?? 0, Icone: Heart, destino: '/favoritos' },
        { nome: 'Adquiridos', valor: dashboard?.totalAdquiridos ?? 0, Icone: ShoppingBag, destino: '/favoritos' },
    ];
    function navegarAbas(event, indice) {
        const teclas = { ArrowRight: (indice + 1) % 3, ArrowLeft: (indice + 2) % 3, Home: 0, End: 2 };
        if (!(event.key in teclas)) return;
        event.preventDefault();
        const proximo = periodos[teclas[event.key]].id;
        setPeriodo(proximo);
        document.getElementById(`periodo-${proximo}`).focus();
    }
    return <AppShell title="Dashboard">
        <div className={style.dashboard}>
            <header className={style.cabecalho}>
                <p className={style.eyebrow}>Visão geral</p>
                <h1>Olá{primeiroNome ? `, ${primeiroNome}` : ''} <span aria-hidden="true">👋</span></h1>
                <p>Acompanhe sua atividade no BestPick.</p>
            </header>
            <section className={style.hero} aria-labelledby="titulo-busca">
                <div className={style.decoracao} aria-hidden="true" />
                <div><h2 id="titulo-busca">Encontre o produto ideal</h2><p>Conte o que você precisa e receba recomendações sob medida.</p></div>
                <Link to="/chat" className={style.novaBusca}><MessageCircle size={20} aria-hidden="true" />Nova busca</Link>
            </section>
            {erro ? <div role="alert" className={style.estado}>Não foi possível carregar sua atividade. <button onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div> :
                <div className={style.cards} aria-busy={carregando}>
                    {cards.map(({ nome, valor, Icone, destino }, indice) => <Link key={nome} to={destino} className={style.card + " animate-rise"} style={{ animationDelay: `${indice * 70}ms` }} aria-label={`${nome} ${carregando ? 'Carregando' : valor}`}>
                        <div className={style.cardTopo}><span className={style.icone}><Icone size={20} aria-hidden="true" /></span><strong>{carregando ? '—' : valor}</strong></div>
                        <span className={style.rotulo}>{nome}</span>
                    </Link>)}
                    {carregando && <span role="status" className={style.srOnly}>Carregando dashboard...</span>}
                </div>}
            <div className={style.inferior}>
                <section className={style.graficos} aria-labelledby="titulo-atividade">
                    <div className={style.graficoCabecalho}>
                        <div><h2 id="titulo-atividade">Distribuição da atividade</h2><p>{periodos.find(p => p.id === periodo).descricao}</p></div>
                        <div className={style.abas} role="tablist" aria-label="Período da atividade">
                            {periodos.map((item, indice) => <button key={item.id} id={`periodo-${item.id}`} role="tab" aria-selected={periodo === item.id} aria-controls="graficos-atividade" tabIndex={periodo === item.id ? 0 : -1} onKeyDown={event => navegarAbas(event, indice)} onClick={() => setPeriodo(item.id)}>{item.nome}</button>)}
                        </div>
                    </div>
                    {!carregando && !erroHistorico && inicio && <p className={style.exemplo}>De {inicio.toLocaleDateString('pt-BR')} até {fim.toLocaleDateString('pt-BR')}</p>}
                    <div id="graficos-atividade" role="tabpanel" aria-labelledby={`periodo-${periodo}`} tabIndex={0} className={style.graficoCorpo}>
                        <div>
                            <p className={style.exemplo}>Totais atuais · todos os períodos</p>
                            {carregando ? <p>Carregando totais...</p> : erro ? <p>Totais indisponíveis.</p> : <>
                            <div className={style.rosca} role="img" aria-label={`${total} registros: ${distribuicao.map(s => `${s.nome}: ${s.valor}`).join(', ')}`} onMouseDown={event => event.preventDefault()}>
                                <div inert aria-hidden="true" className={style.roscaVisual}>
                                    <ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer={false}><Pie rootTabIndex={-1} data={distribuicao} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={80} paddingAngle={4} cornerRadius={6} stroke="none" isAnimationActive={false}>{distribuicao.map(s => <Cell key={s.chave} fill={s.cor} />)}</Pie></PieChart></ResponsiveContainer>
                                </div>
                                <div className={style.centro}><strong>{total}</strong><span>registros</span></div>
                            </div>
                            <ul className={style.legenda}>{distribuicao.map(s => <li key={s.chave}><span className={style.bolinha} style={{ background: s.cor }} />{s.nome}<strong>{s.valor}</strong></li>)}</ul>
                            {total === 0 && <p className={style.exemplo}>Nenhuma atividade registrada.</p>}
                            </>}
                        </div>
                        <div className={style.area}>
                            {carregando ? <p>Carregando buscas...</p> : erroHistorico ? <div role="alert">Não foi possível carregar o histórico. <button onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></div> : !dados.some(ponto => ponto.buscas > 0) ? <p>Nenhuma busca registrada neste período.</p> :
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={dados} margin={{ top: 24, right: 6, bottom: 0, left: -26 }} accessibilityLayer>
                                    <defs>{[['buscas', '--chart-1'], ['favoritos', '--chart-3']].map(([id, cor]) => <linearGradient key={id} id={`dashboard-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`var(${cor})`} stopOpacity={0.25} /><stop offset="100%" stopColor={`var(${cor})`} stopOpacity={0} /></linearGradient>)}</defs>
                                    <CartesianGrid vertical={false} stroke="var(--bp-border)" strokeDasharray="4 4" />
                                    <XAxis dataKey="dia" interval="preserveStartEnd" axisLine={false} tickLine={false} tick={{ fill: 'var(--bp-muted)', fontSize: 11 }} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--bp-muted)', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)', borderRadius: 12, color: 'var(--bp-text)' }} />
                                    {mesUnico ? <Bar dataKey="buscas" name="Buscas" fill="var(--chart-1)" barSize={48} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                                        <LabelList dataKey="buscas" position="top" fill="var(--bp-text)" />
                                    </Bar> : <Area type="monotone" dataKey="buscas" name="Buscas" stroke="var(--chart-1)" strokeWidth={2} fill="url(#dashboard-buscas)" isAnimationActive={false} />}
                                </ComposedChart>
                            </ResponsiveContainer>}
                        </div>
                    </div>
                    {!carregando && !erroHistorico && mesUnico && <p className={style.exemplo}>Há apenas um mês no período: a barra mostra o total de buscas desse mês.</p>}
                    <p className={style.exemplo}>Evolução das buscas no período selecionado. Favoritos e adquiridos aparecem apenas nos totais, pois não possuem data registrada.</p>
                    {!carregando && !erroHistorico && datasInvalidas > 0 && <p className={style.exemplo}>Há buscas com datas inválidas ou futuras que não puderam ser incluídas na evolução.</p>}
                </section>
                <Link to="/historico" className={style.historico}>
                    <span className={style.iconeHistorico}><History size={24} aria-hidden="true" /></span>
                    <div><h2>Histórico de buscas</h2><p>Consulte os produtos que você já pesquisou e as recomendações recebidas.</p><span className={style.verHistorico}>Ver histórico <ArrowRight size={16} aria-hidden="true" /></span></div>
                </Link>
            </div>
        </div>
    </AppShell>;
}
