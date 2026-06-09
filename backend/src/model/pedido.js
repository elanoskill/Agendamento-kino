import db from './../config/db.js';
// funcao com sql para criar pedido
export const criar_pedido = async(data)=>{
const {nome, telefone, endereco, cod} = data;
const [novo] = await db.query("insert into pedido(nomeP,tel,endereco,codigo) values (?,?,?,?)", [nome, telefone, endereco, cod]);
return novo.insertId;
}

// funcao com sql para buscar pedido id
export const buscarFPrdidoId = async(id)=>{
const [encontrado] = await db.query("select *from pedido where id_ped=?", [id]);
return encontrado[0];

}


// funcao com sql para eliminar pedido
export const deletarPedido = async (id)=>{
const pedido = await db.query("delete from pedido where id_ped=?", [id]);
return pedido;

}

// funcao com sql para buscar todos pedido
export const listarTodosPedido = async()=>{
const [lista] = await db.query("select  *from pedido");
return lista;
}

//buscar o pedido 
export const buscarPedido=async(data)=>{
  const {cod}=data;
  const[encontado]= await db.query("select p.nomeP,p.tel,p.endereco,p.data,p.codigo,p.estado,prod.nome, prod.preco,prod.qtd,(prod.preco*prod.qtd) as subTolal from pedido p inner join pedido_produto pedir on pedir.id_ped =p.id_ped inner join produto prod on prod.id_prod =pedir.id_prod where p.codigo=?",[cod]);
  return encontado|| null;
}


//todos pedidos com seu produtos
export const listarTodosPedidoProdutos=async()=>{
  const[encontado]= await db.query("select p.nomeP,p.tel,p.endereco,p.data,p.codigo,p.estado,prod.nome, prod.preco,prod.qtd,(prod.preco*prod.qtd) as subTolal from pedido p inner join pedido_produto pedir on pedir.id_ped =p.id_ped inner join produto prod on prod.id_prod =pedir.id_prod");
  return encontado|| null;
}

