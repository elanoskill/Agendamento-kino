const URL_BASE = "http://localhost:3000"
let pedidos = [];

// pega os pedidos e agrupa por codigo
const getPedidos = async () => {
    try {
        const response = await fetch(URL_BASE + "/pedido/listar_pedProd", {
            headers: {
                "Authorization": "Bearer " + localStorage.token
            }
        })

        if (response.status === 401 || response.status === 500) {
            localStorage.clear();
            window.location.href = "../login/login.html";
            return;
        }

        if (response.ok) {
            const res = await response.json()
            console.log('Dados do banco:', res)

            // AGRUPA OS PRODUTOS PELO CODIGO DO PEDIDO
            const pedidosAgrupados = {};

            res.forEach(item => {
                const cod = item.codigo;

                if (!pedidosAgrupados[cod]) {
                    pedidosAgrupados[cod] = {
                        id_ped: item.id_ped,
                        codigo: item.codigo,
                        data: item.data,
                        endereco: item.endereco,
                        estado: item.estado,
                        nomeP: item.nomeP,
                        tel: item.tel,
                        tempoMinutos: item.tempoMinutos || null,
                        inicioPrep: item.inicioPrep || null,
                        produtos: []
                    };
                }

                // CORRIGIDO: calcula subTotal se não vier do banco
                const qtd = Number(item.qtd?? item.quantidade?? 0);
                const preco = Number(item.preco?? 0);
                const subTotal = Number(item.subTotal?? item.subtotal?? preco * qtd);

                pedidosAgrupados[cod].produtos.push({
                    id_prod: item.id_prod,
                    nome: item.nome || item.nome_produto || 'Produto',
                    qtd: qtd,
                    preco: preco,
                    subTotal: subTotal
                });
            });

            pedidos = Object.values(pedidosAgrupados);

            console.log('Pedidos agrupados:', pedidos)
            renderizar();
            atualizarContadores();
        }
    } catch (e) {
        console.log('Erro ao buscar pedidos no servidor', e)
        toast('Erro ao carregar pedidos', 'err')
    }
}

let filtroAtual = '';
let idAceitar = null;
let idNegar = null;
let idDel = null;
let tempoSel = null;
const timers = {};

/* ━━ UTILITÁRIOS ━━ */
const fmt = v => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v);
const hora = ms => {
    const d = new Date(ms);
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

const normalizarEstado = (estado) => {
    if (!estado) return 'pendente';
    const mapa = {
        'Pendente': 'pendente',
        'Preparando': 'preparando',
        'Feito': 'feito',
        'Entrega Pendente': 'entrega_pendente',
        'Entregue': 'entregue',
        'Negado': 'negado'
    };
    return mapa[estado] || estado.toLowerCase().replace(/\s/g, '_');
};

// CORRIGIDO: garante que soma número
const total = p => p.produtos.reduce((a, x) => a + Number(x.subTotal || 0), 0);

function tempoRestante(ped) {
    if (!ped.inicioPrep ||!ped.tempoMinutos) return null;
    const fim = new Date(ped.inicioPrep).getTime() + ped.tempoMinutos * 60000;
    const resto = fim - Date.now();
    if (resto <= 0) return '00:00';
    const m = Math.floor(resto / 60000);
    const s = Math.floor((resto % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ━━ LABELS DE ESTADO ━━ */
const LABEL = {
    pendente: '⏳ Pendente',
    preparando: '🔥 Preparando',
    feito: '✅ Feito',
    entrega_pendente: '🛵 Entrega Pendente',
    entregue: '📦 Entregue',
    negado: '❌ Negado',
};

/* ━━ ACTUALIZAR CONTADORES ━━ */
function atualizarContadores() {
    const estados = ['pendente', 'preparando', 'feito', 'entrega_pendente', 'entregue'];
    const nTodos = document.getElementById('n-todos');
    if (nTodos) nTodos.textContent = pedidos.length;

    estados.forEach(e => {
        const el = document.getElementById(`n-${e}`);
        if (el) el.textContent = pedidos.filter(p => normalizarEstado(p.estado) === e).length;
    });
}

/* ━━ FILTRO RÁPIDO ━━ */
function filtroRapido(estado) {
    filtroAtual = estado;
    const filtroEstado = document.getElementById('filtroEstado');
    if (filtroEstado) filtroEstado.value = estado;

    document.querySelectorAll('.card-resumo').forEach(c => c.classList.remove('ativo'));
    const alvo = estado? document.getElementById(`cr-${estado}`) : document.getElementById('cr-todos');
    if (alvo) alvo.classList.add('ativo');
    renderizar();
}

function sincronizarCard() {
    const v = document.getElementById('filtroEstado').value;
    filtroRapido(v);
}

/* ━━ RENDERIZAR ━━ */
function renderizar() {
    const termo = document.getElementById('busca')?.value.toLowerCase() || '';
    const estado = document.getElementById('filtroEstado')?.value || '';
    const ordem = document.getElementById('filtroOrdem')?.value || 'recente';

    let lista = pedidos.filter(p => {
        const estadoNorm = normalizarEstado(p.estado);
        const codigo = p.codigo || '';
        const nome = p.nomeP || '';

        const ok1 =!estado || estadoNorm === estado;
        const ok2 =!termo ||
                    String(codigo).toLowerCase().includes(termo) ||
                    String(nome).toLowerCase().includes(termo);
        return ok1 && ok2;
    });

    lista.sort((a, b) => {
        const dataA = new Date(a.data).getTime();
        const dataB = new Date(b.data).getTime();
        return ordem === 'recente'? dataB - dataA : dataA - dataB;
    });

    const cont = document.getElementById('listaPedidos');
    const vazio = document.getElementById('vazio');

    if (!lista.length) {
        if (cont) cont.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        return;
    }
    if (vazio) vazio.style.display = 'none';

    if (cont) {
        cont.innerHTML = lista.map(p => cardHTML(p)).join('');
        lista.filter(p => normalizarEstado(p.estado) === 'preparando').forEach(p => arrancarTimer(p.id_ped));
    }

    atualizarContadores();
    const ultima = document.getElementById('ultimaActual');
    if (ultima) ultima.textContent = 'Actualizado às ' + hora(Date.now());
}

/* ━━ GERAR HTML DO CARD - SEM EMOJI ━━ */
function cardHTML(p) {
    const id = p.id_ped;
    const codigo = p.codigo;
    const nome = p.nomeP;
    const endereco = p.endereco;
    const tel = p.tel;
    const data = p.data;
    const estadoNorm = normalizarEstado(p.estado);

    // REMOVIDO O 🍔
    const chips = p.produtos.map(pr =>
        `<div class="chip-prod">${pr.nome} ×${pr.qtd}</div>`
    ).join('');

    const timer = (estadoNorm === 'preparando')
   ? `<div class="cp-timer" id="timer-${id}">
             ⏱ A preparar — <span class="relogio" id="rel-${id}">${tempoRestante(p)?? '--:--'}</span>
           </div>` : '';

    let acoes = '';
    if (estadoNorm === 'pendente') {
        acoes = `<button class="btn-card bc-aceitar" onclick="abrirAceitar(${id})">✔ Aceitar</button>
                 <button class="btn-card bc-negar" onclick="abrirNegar(${id})">✘ Negar</button>
                 <button class="btn-card bc-del" onclick="abrirDel(${id})">🗑 Eliminar</button>`;
    } else if (estadoNorm === 'preparando') {
        acoes = `<button class="btn-card bc-del" onclick="abrirDel(${id})">🗑 Eliminar</button>`;
    } else if (estadoNorm === 'feito') {
        acoes = `<button class="btn-card bc-entregar" onclick="marcarEntregaPendente(${id})">🛵 Enviar para entrega</button>
                 <button class="btn-card bc-del" onclick="abrirDel(${id})">🗑 Eliminar</button>`;
    } else if (estadoNorm === 'entrega_pendente') {
        acoes = `<button class="btn-card bc-aceitar" onclick="marcarEntregue(${id})">📦 Confirmar entrega</button>
                 <button class="btn-card bc-del" onclick="abrirDel(${id})">🗑 Eliminar</button>`;
    } else {
        acoes = `<button class="btn-card bc-del" onclick="abrirDel(${id})">🗑 Eliminar</button>`;
    }

    return `
    <div class="card-pedido" id="card-${id}">
        <div class="cp-topo">
            <div>
                <div class="cp-cliente">${nome}</div>
                <div class="cp-meta">
                    <span class="cp-codigo">${codigo}</span>
                    ${endereco? `&nbsp;·&nbsp; ${endereco}` : ''}
                    ${tel? `&nbsp;·&nbsp; ${tel}` : ''}
                    &nbsp;·&nbsp; ${hora(data)}
                    ${p.tempoMinutos? `&nbsp;·&nbsp; Tempo: ${p.tempoMinutos} min` : ''}
                </div>
            </div>
            <span class="badge-estado ${estadoNorm}">${LABEL[estadoNorm]}</span>
        </div>

        <div class="cp-produtos">${chips}</div>
        ${timer}
        <div class="cp-total">Total: <span>${fmt(total(p))}</span></div>
        <div class="cp-acoes">${acoes}</div>
    </div>`;
}

/* ━━ TEMPORIZADOR ━━ */
function arrancarTimer(id) {
    if (timers[id]) return;
    timers[id] = setInterval(() => {
        const ped = pedidos.find(p => p.id_ped === id);
        if (!ped || normalizarEstado(ped.estado)!== 'preparando') {
            clearInterval(timers[id]);
            delete timers[id];
            return;
        }
        const tr = tempoRestante(ped);
        const el = document.getElementById(`rel-${id}`);
        if (el) el.textContent = tr;

        if (tr === '00:00') {
            clearInterval(timers[id]);
            delete timers[id];
            ped.estado = 'Feito';
            renderizar();
            toast(`Pedido ${ped.codigo} está FEITO!`, 'ok');
        }
    }, 1000);
}

/* ━━ AÇÕES ━━ */
function abrirAceitar(id) {
    idAceitar = id;
    tempoSel = null;
    document.getElementById('tempoManual').value = '';
    document.getElementById('textoTempoSel').textContent = 'Nenhum tempo seleccionado.';
    document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
    abrir('ovAceitar');
}

function selTempo(min, el) {
    tempoSel = min;
    document.getElementById('tempoManual').value = min;
    document.getElementById('textoTempoSel').textContent = `Tempo seleccionado: ${min} minuto(s).`;
    document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
}

async function confirmarAceitar() {
    const min = tempoSel || parseInt(document.getElementById('tempoManual').value);
    if (!min || min < 1) return toast('Seleccione o tempo', 'err');

    const ped = pedidos.find(p => p.id_ped === idAceitar);
    ped.estado = 'Preparando';
    ped.tempoMinutos = min;
    ped.inicioPrep = new Date().toISOString();

    fechar('ovAceitar');
    renderizar();
    toast(`Pedido aceite! Tempo: ${min} min.`, 'ok');
}

function abrirNegar(id) {
    idNegar = id;
    const p = pedidos.find(x => x.id_ped === id);
    document.getElementById('txtNegar').textContent = `Negar o pedido de "${p.nomeP}" (${p.codigo})?`;
    abrir('ovNegar');
}

async function confirmarNegar() {
    const ped = pedidos.find(p => p.id_ped === idNegar);
    ped.estado = 'Negado';
    fechar('ovNegar');
    renderizar();
    toast('Pedido negado.', 'inf');
}

async function marcarEntregaPendente(id) {
    const ped = pedidos.find(p => p.id_ped === id);
    ped.estado = 'Entrega Pendente';
    renderizar();
    toast('Pedido enviado para entrega.', 'ok');
}

async function marcarEntregue(id) {
    const ped = pedidos.find(p => p.id_ped === id);
    ped.estado = 'Entregue';
    renderizar();
    toast('Entrega confirmada!', 'ok');
}

function abrirDel(id) {
    idDel = id;
    const p = pedidos.find(x => x.id_ped === id);
    document.getElementById('txtDel').textContent = `Eliminar pedido "${p.codigo}" de ${p.nomeP}? Esta acção não pode ser revertida.`;
    abrir('ovDel');
}

async function confirmarDel() {
    const idx = pedidos.findIndex(p => p.id_ped === idDel);
    if (timers[idDel]) clearInterval(timers[idDel]);
    pedidos.splice(idx, 1);
    fechar('ovDel');
    renderizar();
    toast('Pedido eliminado.', 'ok');
}

function abrir(id) { document.getElementById(id).classList.add('aberto'); }
function fechar(id) { document.getElementById(id).classList.remove('aberto'); }
function fecharSeFundo(e, id) { if (e.target === document.getElementById(id)) fechar(id); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') ['ovAceitar','ovNegar','ovDel'].forEach(fechar); });

let _tt;
function toast(msg, tipo = 'ok') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast v ${tipo}`;
    clearTimeout(_tt);
    _tt = setTimeout(() => el.classList.remove('v'), 3200);
}

getPedidos();
setInterval(() => { getPedidos(); }, 30000);