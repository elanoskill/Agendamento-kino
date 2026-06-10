const URL_BASE = "http://localhost:3000"
let pedidos = [];

// ━━ VARIAVEIS GLOBAIS ━━
let filtroAtual = '';
let idAceitar = null;
let idNegar = null;
let idDel = null;
let tempoSel = null;
const timers = {};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. FUNÇÕES DE API - BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const aceitarPedido = async ({ id_pedido, tempoMinutos, estado }) => {
  try {
    const userRaw = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token) {
      toast('Faça login primeiro', 'err');
      setTimeout(() => window.location.href = "../login/login.html", 1500);
      return false;
    }

    let user;
    try {
      user = JSON.parse(userRaw);
    } catch (e) {
      toast('Refaça o login', 'err');
      localStorage.clear();
      setTimeout(() => window.location.href = "../login/login.html", 1500);
      return false;
    }

    const userId = user?.id?? user?.id_usuario?? user?.user_id?? user?.userId;

    if (!userId) {
      console.error('User sem ID:', user);
      toast('Usuário sem ID. Refaça o login.', 'err');
      localStorage.clear();
      setTimeout(() => window.location.href = "../login/login.html", 1500);
      return false;
    }

    if (!id_pedido || isNaN(id_pedido)) {
      toast('ID do pedido inválido', 'err');
      return false;
    }

    const payload = {
      id_usuario: Number(userId),
      tempoMinutos: Number(tempoMinutos),
      estado: estado
    };

    const response = await fetch(`${URL_BASE}/pedido/aceitar_pedido/${id_pedido}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 401 || response.status === 403) {
      toast('Sessão expirada', 'err');
      localStorage.clear();
      setTimeout(() => window.location.href = "../login/login.html", 1500);
      return false;
    }

    if (response.ok) {
      await getPedidos();
      return true;
    } else {
      const errorData = await response.json();
      console.log("[ERRO API]:", errorData);
      toast(errorData.msg || 'Erro ao aceitar pedido', 'err');
      return false;
    }

  } catch (e) {
    console.log(":", e);
    toast('Erro de conexão', 'err');
    return false;
  }
}

const getPedidos = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "../login/login.html";
      return;
    }

    const response = await fetch(URL_BASE + "/pedido/listar_pedProd", {
      headers: {
        "Authorization": "Bearer " + token
      }
    })

    if (response.status === 401 || response.status === 500) {
      localStorage.clear();
      window.location.href = "../login/login.html";
      return;
    }

    if (response.ok) {
      const res = await response.json()
      console.log('[DEBUG] Dados do banco:', res)

      if (!res ||!res.length) {
        pedidos = [];
        renderizar();
        return;
      }

      const pedidosAgrupados = {};
      let pedidosSemId = 0;

      res.forEach((item, index) => {
        const idPed = parseInt(item.id_ped?? item.id?? item.pedido_id?? item.id_pedido);

        if (!idPed || isNaN(idPed)) {
          pedidosSemId++;
          console.warn(`[DEBUG] Item ${index} sem ID válido:`, item);
          return;
        }

        const cod = item.codigo;

        if (!pedidosAgrupados[cod]) {
          pedidosAgrupados[cod] = {
            id_ped: idPed,
            codigo: item.codigo,
            data: item.data,
            endereco: item.endereco,
            estado: item.estado,
            nomeP: item.nomeP || item.nome_cliente || item.cliente || 'Cliente',
            tel: item.tel || item.telefone || '',
            tempoMinutos: item.tempoMinutos || null,
            inicioPrep: item.inicioPrep || null,
            produtos: []
          };
        }

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

      if (pedidosSemId > 0) {
        toast(`${pedidosSemId} pedidos ignorados por falta de ID`, 'err');
      }

      pedidos = Object.values(pedidosAgrupados);
      console.log('[DEBUG] Pedidos agrupados:', pedidos)
      renderizar();
      atualizarContadores();
    }
  } catch (e) {
    console.log('Buscar pedidos:', e)
    toast('Erro ao carregar pedidos', 'err')
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. UTILITÁRIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

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

const LABEL = {
  pendente: '⏳ Pendente',
  preparando: '🔥 Preparando',
  feito: '✅ Feito',
  entrega_pendente: '🛵 Entrega Pendente',
  entregue: '📦 Entregue',
  negado: '❌ Negado',
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. RENDERIZAÇÃO E FILTROS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function atualizarContadores() {
  const estados = ['pendente', 'preparando', 'feito', 'entrega_pendente', 'entregue'];
  const nTodos = document.getElementById('n-todos');
  if (nTodos) nTodos.textContent = pedidos.length;

  estados.forEach(e => {
    const el = document.getElementById(`n-${e}`);
    if (el) el.textContent = pedidos.filter(p => normalizarEstado(p.estado) === e).length;
  });
}

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
  const v = document.getElementById('filtroEstado')?.value;
  if (v!== undefined) filtroRapido(v);
}

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

function cardHTML(p) {
  const id = parseInt(p.id_ped);

  if (!id || isNaN(id)) {
    console.error('[DEBUG] Pedido sem ID válido:', p);
    return '';
  }

  const codigo = p.codigo;
  const nome = p.nomeP;
  const endereco = p.endereco;
  const tel = p.tel;
  const data = p.data;
  const estadoNorm = normalizarEstado(p.estado);

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. TEMPORIZADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. AÇÕES DOS MODAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function abrirAceitar(id) {
  idAceitar = parseInt(id);
  console.log('[DEBUG] Abrindo aceitar com ID:', idAceitar);

  if (!idAceitar || isNaN(idAceitar)) {
    toast('Erro: Pedido sem ID válido', 'err');
    return;
  }

  tempoSel = null;
  const inputTempo = document.getElementById('tempoManual');
  const txtTempo = document.getElementById('textoTempoSel');

  if (inputTempo) inputTempo.value = '';
  if (txtTempo) txtTempo.textContent = 'Nenhum tempo seleccionado.';

  document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
  abrir('ovAceitar');
}

function selTempo(min, el) {
  tempoSel = parseInt(min);
  const inputTempo = document.getElementById('tempoManual');
  const txtTempo = document.getElementById('textoTempoSel');

  if (inputTempo) inputTempo.value = min;
  if (txtTempo) txtTempo.textContent = `Tempo seleccionado: ${min} minuto(s).`;

  document.querySelectorAll('.opc-tempo').forEach(o => o.classList.remove('sel'));
  if (el) el.classList.add('sel');
}

async function confirmarAceitar() {
  const inputTempo = document.getElementById('tempoManual');
  const min = tempoSel || parseInt(inputTempo?.value);

  if (!min || min < 1) {
    toast('Seleccione o tempo', 'err');
    return;
  }

  if (!idAceitar || isNaN(idAceitar)) {
    toast('ID do pedido não encontrado. Feche e abra o modal novamente.', 'err');
    fechar('ovAceitar');
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    toast('Faça login primeiro', 'err');
    setTimeout(() => window.location.href = "../login/login.html", 1500);
    return;
  }

  const btnConfirmar = document.querySelector('#ovAceitar.btn-prim');
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Processando...';
  }

  const sucesso = await aceitarPedido({
    id_pedido: idAceitar,
    tempoMinutos: min,
    estado: 'Preparando'
  });

  if (btnConfirmar) {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar';
  }

  if (sucesso) {
    fechar('ovAceitar');
    toast(`Pedido aceite! Tempo: ${min} min.`, 'ok');
    idAceitar = null;
  }
}

function abrirNegar(id) {
  idNegar = parseInt(id);
  const p = pedidos.find(x => x.id_ped === idNegar);
  if (!p) return toast('Pedido não encontrado', 'err');
  const txt = document.getElementById('txtNegar');
  if (txt) txt.textContent = `Negar o pedido de "${p.nomeP}" (${p.codigo})?`;
  abrir('ovNegar');
}

async function confirmarNegar() {
  const ped = pedidos.find(p => p.id_ped === idNegar);
  if (ped) ped.estado = 'Negado';
  fechar('ovNegar');
  renderizar();
  toast('Pedido negado.', 'inf');
  idNegar = null;
}

async function marcarEntregaPendente(id) {
  const ped = pedidos.find(p => p.id_ped === parseInt(id));
  if (ped) ped.estado = 'Entrega Pendente';
  renderizar();
  toast('Pedido enviado para entrega.', 'ok');
}

async function marcarEntregue(id) {
  const ped = pedidos.find(p => p.id_ped === parseInt(id));
  if (ped) ped.estado = 'Entregue';
  renderizar();
  toast('Entrega confirmada!', 'ok');
}

function abrirDel(id) {
  idDel = parseInt(id);
  const p = pedidos.find(x => x.id_ped === idDel);
  if (!p) return toast('Pedido não encontrado', 'err');
  const txt = document.getElementById('txtDel');
  if (txt) txt.textContent = `Eliminar pedido "${p.codigo}" de ${p.nomeP}? Esta acção não pode ser revertida.`;
  abrir('ovDel');
}

async function confirmarDel() {
  const idx = pedidos.findIndex(p => p.id_ped === idDel);
  if (timers[idDel]) clearInterval(timers[idDel]);
  if (idx!== -1) pedidos.splice(idx, 1);
  fechar('ovDel');
  renderizar();
  toast('Pedido eliminado.', 'ok');
  idDel = null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. MODAL E TOAST - BLINDADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function abrir(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`[ERRO] Modal #${id} não encontrado no HTML`);
    toast(`Erro: Modal ${id} não existe`, 'err');
    return;
  }
  el.classList.add('aberto');
}

function fechar(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`[ERRO] Modal #${id} não encontrado no HTML`);
    return;
  }
  el.classList.remove('aberto');
}

function fecharSeFundo(e, id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (e.target === el) fechar(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['ovAceitar', 'ovNegar', 'ovDel'].forEach(fechar);
});

let _tt;
function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  if (!el) {
    console.log('[TOAST]', msg);
    return;
  }
  el.textContent = msg;
  el.className = `toast v ${tipo}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('v'), 3200);
}

// INICIA
getPedidos();
setInterval(() => { getPedidos(); }, 30000);