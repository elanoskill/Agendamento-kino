const BASE_URL = "http://localhost:3000/produto";
const BASE_URL_CAT = "http://localhost:3000/index/categoria";

let categorias = [];
let produtos = [];
let fCatSelected = "";
let editCatSelected = "";
let editingId = null;
let deletingId = null;

let mainImgData = "";
let editImgData = "";
const navBar = document.querySelector(".nav");
const MENU_URL = "../../util/menu_admin.html";

/*  notificações  */
function toast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

function fmtPrice(v) { return `${Number(v).toFixed(2)}Kz`; }

/* ── RENDER DROPDOWN ── */
function buildCatOptions(ulEl, boxEl, labelEl, selectedRef, onSelect) {
  ulEl.innerHTML = "";
  categorias.forEach(cat => {
    const li = document.createElement("li");
    li.textContent = cat.nome;
    li.addEventListener("click", () => {
      onSelect(cat.id_cat);
      labelEl.textContent = cat.nome;
      boxEl.classList.remove("open");
      ulEl.classList.remove("visible");
    });
    ulEl.appendChild(li);
  });
  const addLi = document.createElement("li");
  addLi.textContent = "+ add categoria";
  addLi.className = "add-cat";
  addLi.addEventListener("click", () => {
    ulEl.classList.remove("visible");
    boxEl.classList.remove("open");
    openCatModal();
  });
  ulEl.appendChild(addLi);
}

function setupSelect(boxEl, ulEl, labelEl, getSelected, setSelected) {
  boxEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = ulEl.classList.contains("visible");
    closeAllDropdowns();
    if (!isOpen) {
      buildCatOptions(ulEl, boxEl, labelEl, getSelected(), setSelected);
      ulEl.classList.add("visible");
      boxEl.classList.add("open");
    }
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("visible"));
  document.querySelectorAll(".sel-box").forEach(b => b.classList.remove("open"));
  document.querySelectorAll(".ctx-menu").forEach(m => m.classList.remove("visible"));
}
document.addEventListener("click", closeAllDropdowns);

/* ── MAIN FORM SELECT ── */
const fCatBox = document.getElementById("fCatBox");
const fCatDrop = document.getElementById("fCatDropdown");
const fCatLbl = document.getElementById("fCatLabel");
setupSelect(fCatBox, fCatDrop, fCatLbl, () => fCatSelected, v => fCatSelected = v);

/* ── selecionar categoria (editar) ── */
const editCatBox = document.getElementById("editCatBox");
const editCatDrop = document.getElementById("editCatDropdown");
const editCatLbl = document.getElementById("editCatLabel");
setupSelect(editCatBox, editCatDrop, editCatLbl, () => editCatSelected, v => editCatSelected = v);

/* ── inserir imagem ── */
document.getElementById("mainImgInput").addEventListener("change", function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    mainImgData = e.target.result;
    const preview = document.getElementById("mainImgPreview");
    const placeholder = document.getElementById("mainImgPlaceholder");
    preview.src = mainImgData;
    preview.style.display = "block";
    placeholder.style.display = "none";
  };
  reader.readAsDataURL(file);
});


// buscar cat

async function carregarCategorias() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL_CAT}/buscar`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  categorias = data;
}


// --- OPERAÇÕES DO CRUD ---

//verificar se foi feito o login para cadastrar

async function verifLogin() {
  const token = localStorage.getItem("token");

  //se não foi feito fito fogin reencaminha para tela de login 
  if (!token) {
    window.location.href = "/Agendamento-kino/frontend/src/views/login/login.html"
    return;
  }
  await carregarCategorias();
  await carregarProdutos();
}

//adicionar produto
document.getElementById("btnAdd").addEventListener("click", async () => {


  const nome = document.getElementById("fNome").value.trim();
  const descricao = document.getElementById("fDesc").value.trim();
  const preco = parseFloat(document.getElementById("fPreco").value);
  const requerQtd = Number(document.getElementById("frequerQtd").value);
  const categoria = fCatSelected;

  if (!nome) {
    toast("Informe o nome", "error");
    return;
  }

  if (!categoria) {
    toast("Selecione a categoria", "error");
    return;
  }

  if (isNaN(preco)) {
    toast("Preço inválido", "error");
    return;
  }

  try {

    const token = localStorage.getItem("token");

    const res = await fetch(`${BASE_URL}/cadastrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        nome,
        descricao: descricao || "",
        preco,
        img: mainImgData,
        requerQtd,
        id_cat: categoria
      })
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.message || "Erro ao cadastrar", "error");
      return;
    }

    toast("Produto cadastrado!");

    limparFormulario();

    carregarProdutos();

  } catch (e) {

    console.log(e);

    toast("Erro no servidor", "error");
  }
});

//limpar inputs depois de add o produto

function limparFormulario() {

  document.getElementById("fNome").value = "";
  document.getElementById("fDesc").value = "";
  document.getElementById("fPreco").value = "";
  document.getElementById("frequerQtd").value = "";

  fCatSelected = "";

  fCatLbl.textContent = "selecionar";

  mainImgData = "";

  document.getElementById("mainImgPreview").style.display = "none";
  document.getElementById("mainImgPlaceholder").style.display = "flex";
}

//função carregar/listar produtos

async function carregarProdutos() {

  try {

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/listar`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    //verificando o status vindo da requisição
    if (res.status === 401 || res.status === 500) {
      //remivendo o token do localStorage
      localStorage.clear();
      window.location.href = "../login/login.html";
      return;
    }
    const data = await res.json();
    produtos = data;

    cssProd();

  } catch (e) {

    console.log(e);

    toast("Erro ao carregar produtos", "error");
  }
}


//cssProd
function cssProd() {
  const grid = document.getElementById("prodGrid");
  grid.innerHTML = "";

  if (produtos.length === 0) {
    grid.innerHTML = `<div class="empty">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
      <p>Nenhum produto cadastrado ainda.</p>
    </div>`;
    return;
  }

  produtos.forEach(p => {
    const card = document.createElement("div");
    card.className = "prod-card";
    card.dataset.id = p.id_prod;
    

    const imgSrc = p.img;

    card.innerHTML = `
      <img class="prod-img" alt="${p.nome} " src="${p.img}"/>
      
      <div class="prod-info">
        <div class="prod-name">${p.nome}</div>
        <div class="prod-desc">${p.descricao || "—"}</div>
        <div class="prod-price">${fmtPrice(p.preco)}</div>
        <div style="margin-top:6px;position:relative;">
          <div class="cat-badge" data-pid="${p.id_prod}">
            <span class="cat-badge-label">${p.categoria || "Mudar categoria"}</span>
            <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
            <ul class="dropdown cat-inline-drop" id="catDrop_${p.id_prod}"></ul>
          </div>
        </div>
      </div>
      <div style="position:relative;align-self:flex-start;">
        <button class="menu-btn" data-pid="${p.id_prod}">•••</button>
        <div class="ctx-menu" id="ctx_${p.id_prod}">
          <button class="edit-btn" data-pid="${p.id_prod}">Editar</button>
          <button class="danger del-btn" data-pid="${p.id_prod}">Excluir</button>
        </div>
      </div>
    `;
  

    //src depois do innerHTML
    const img = card.querySelector(".prod-img");
    img.onerror = function () {
      this.onerror = null;
      this.src = "https://placehold.co/72x72/FDE8D4/F47B20?text=img";
    };

    const imgValida = p.img && p.img.startsWith("data:image");
    img.src = imgValida ? p.img : "";

    grid.appendChild(card);

    // select cssProd
    const badge = card.querySelector(".cat-badge");
    const badgeDrop = card.querySelector(`#catDrop_${p.id_prod}`);
    badge.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = badgeDrop.classList.contains("visible");
      closeAllDropdowns();
      if (!isOpen) {
        badgeDrop.innerHTML = "";
        categorias.forEach(cat => {
          const li = document.createElement("li");
          li.textContent = cat.nome;
          li.addEventListener("click", async () => {
            badgeDrop.classList.remove("visible");

            try {
              const token = localStorage.getItem("token");
              const prod = produtos.find(x => x.id_prod == p.id_prod);

              const body = {
                nome: prod.nome,
                descricao: prod.descricao || "",
                preco: prod.preco,
                requerQtd: prod.requerQtd ?? 0,
                id_cat: cat.id_cat
              };

              const res = await fetch(`${BASE_URL}/atualizar/${p.id_prod}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
              });

              const data = await res.json();

              if (!res.ok) {
                toast(data.message || "Erro ao atualizar categoria", "error");
                return;
              }

              //atualiza localmente com nomes corretos
              prod.id_cat = cat.id_cat;
              prod.categoria = cat.nome;

              //atualiza o badge visualmente
              badge.querySelector(".cat-badge-label").textContent = cat.nome;

              toast("Categoria atualizada!");

            } catch (e) {
              console.log(e);
              toast("Erro no servidor", "error");
            }
          });
          badgeDrop.appendChild(li);
        });

        const addLi = document.createElement("li");
        addLi.textContent = "+ add categoria";
        addLi.className = "add-cat";
        addLi.addEventListener("click", () => { badgeDrop.classList.remove("visible"); openCatModal(); });
        badgeDrop.appendChild(addLi);
        badgeDrop.classList.add("visible");
      }
    });

    // menu
    const menuBtn = card.querySelector(".menu-btn");
    const ctxMenu = card.querySelector(`#ctx_${p.id_prod}`);
    menuBtn.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = ctxMenu.classList.contains("visible");
      closeAllDropdowns();
      if (!isOpen) ctxMenu.classList.add("visible");
    });

    card.querySelector(".edit-btn").addEventListener("click", e => { e.stopPropagation(); openEditModal(p.id_prod); });
    card.querySelector(".del-btn").addEventListener("click", e => { e.stopPropagation(); openDelModal(p.id_prod); });
  });
}

// editar produto modal
function openEditModal(id) {
  const p = produtos.find(x => x.id_prod === id);
  if (!p) return;
  editingId = id;
  editImgData = p.img || "";

  document.getElementById("editNome").value = p.nome;
  document.getElementById("editDesc").value = p.descricao;
  document.getElementById("editPreco").value = p.preco;
  document.getElementById("editRequerQtd").value = p.qtd ?? 0;
  editCatSelected = p.id_cat;
  editCatLbl.textContent = p.categoria || "selecionar categoria";

  const prev = document.getElementById("editImgPreview");
  if (p.img) { prev.src = p.img; prev.style.display = "block"; }
  else { prev.style.display = "none"; }

  document.getElementById("editImgUploadPreview").style.display = "none";
  document.getElementById("editImgPlaceholder").style.display = "flex";

  document.getElementById("editOverlay").classList.add("visible");
}
document.getElementById("editCancel").addEventListener("click", () => {
  document.getElementById("editOverlay").classList.remove("visible");
  editingId = null; editImgData = "";
  document.getElementById("editImgInput").value = "";
});



//atualizar 


document.getElementById("editSave").addEventListener("click", async () => {
  const nome = document.getElementById("editNome").value.trim();
  const descricao = document.getElementById("editDesc").value.trim();
  const preco = parseFloat(document.getElementById("editPreco").value);
  const requerQtd = Number(document.getElementById("editRequerQtd").value);
  const id_cat = editCatSelected;

  if (!nome) { toast("Informe o nome.", "error"); return; }
  if (!id_cat) { toast("Selecione a categoria.", "error"); return; }
  if (isNaN(preco) || preco < 0) { toast("Preço inválido.", "error"); return; }
  if (isNaN(requerQtd) || requerQtd < 0) { toast("Quantidade inválida", "error"); return; }

  try {
    const token = localStorage.getItem("token");

    const body = { nome, descricao: descricao || "", preco, requerQtd, id_cat };
    if (editImgData) body.img = editImgData;

    const res = await fetch(`${BASE_URL}/atualizar/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.message || "Erro ao atualizar produto", "error");
      return;
    }

    toast("Produto atualizado!");
    await carregarProdutos();

    document.getElementById("editOverlay").classList.remove("visible");
    editingId = null;
    editImgData = "";
    document.getElementById("editImgInput").value = "";

  } catch (e) {
    console.log(e);
    toast("Erro no servidor", "error");
  }

});

// editar produto modal - imagem upload
document.getElementById("editImgInput").addEventListener("change", function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    editImgData = e.target.result;
    const up = document.getElementById("editImgUploadPreview");
    up.src = editImgData; up.style.display = "block";
    document.getElementById("editImgPlaceholder").style.display = "none";
    document.getElementById("editImgPreview").style.display = "none";
  };
  reader.readAsDataURL(file);
});

// excluir produto modal
function openDelModal(id_prod) {
  deletingId = id_prod;
  document.getElementById("delOverlay").classList.add("visible");
}
document.getElementById("delCancel").addEventListener("click", () => {
  document.getElementById("delOverlay").classList.remove("visible");
  deletingId = null;
});


//excluir produto
document.getElementById("delConfirm").addEventListener("click", async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${BASE_URL}/eliminar/${deletingId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.message || "Erro ao eliminar produto", "error");
      return;
    }

    toast("Produto eliminado!", "error");

    // recarrega lista do servidor
    await carregarProdutos();

    document.getElementById("delOverlay").classList.remove("visible");
    deletingId = null;

  } catch (e) {
    console.log(e);
    toast("Erro no servidor", "error");
  }
});



//nova categoria modal 
function openCatModal() {
  document.getElementById("newCatName").value = "";
  document.getElementById("catOverlay").classList.add("visible");
}
document.getElementById("catCancel").addEventListener("click", () => {
  document.getElementById("catOverlay").classList.remove("visible");
});

document.getElementById("catSave").addEventListener("click",async () => {
  const name = document.getElementById("newCatName").value.trim();

  if(!name){ 
    toast("Informe o nome da categoria.", "error");
    return;
  }
  
  //verificar categoria já existe
  if (categorias.some(c => c.nome.toLowerCase() === name.toLowerCase())) { 
    toast("Categoria já existe.", "error"); 
    return; 
  }

  try{

    const token = localStorage.getItem("token");
    
    const res = await fetch(`${BASE_URL_CAT}/criar`,{
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },

      body: JSON.stringify({ nome: name })

    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.message || "Erro ao adicionar categoria", "error");
      return;
    }

    // recarregar categorias
    await carregarCategorias();

    toast(`Categoria "${name}" adicionada!`);
    document.getElementById("catOverlay").classList.remove("visible");

  }catch(e){
    console.log(e)
    toast("Erro no servidor", "error")
  }

});

/* ── fechar overlays ao clicar no fundo ── */
["editOverlay", "delOverlay", "catOverlay"].forEach(id => {
  document.getElementById(id).addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("visible");
  });
});

//funcao que import o menu admin na pasta uitl
const getMenuAdmin = async () => {
  try {
    const res = await fetch(MENU_URL);
    if (res.ok) {
      const re = await res.text();
      // menu.innerHTML = re;
      console.log(re)
      return;
    }
    console.log("nao carregado");
    return;
  } catch (e) {
    console.log("erro ao tentar pegar o menu");
    return;
  }
};

/* ── INIT ── */
verifLogin();