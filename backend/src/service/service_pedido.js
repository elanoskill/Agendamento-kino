import *as model from "../model/pedido.js";
import *as serviceProduto from "../service/service_produto.js";
import {pedido_produto} from '../service/servicePedido_produto.js'
export const criarPedido = async (data) => {
const {nome, telefone, endereco, item} = data
const produtos = await serviceProduto.listarProdutos();
//verificar se tem produtos ou comidaas disponiveis
if (produtos.length <= 0){
throw new Error('Sem comidas para fazer pedido')
}
//percorrendo o array produtos e inserir no movo arrya
const novo = [];
for (const it of produtos){
for (const itemP of item){
if (it.id_prod == itemP.id_prod && it.preco == itemP.preco ){
novo.push(itemP)
}
}
}
//criar pedido
const cod = Math.random().toString(36).substring(2, 8).toUpperCase();
const pedido = await model.criar_pedido({nome, telefone, endereco, cod})
const id_ped=pedido;
//pegando produtos do namco
const listaProdutos = await serviceProduto.listarProdutos();
//atualizar a wuantidade de produto no webkitCancelAnimationFrame
for (const prod of listaProdutos){
for (const p of novo){
if(p.id_prod==prod.id_prod){
if (p.qtd<=prod.qtd/* && prod.preco == p.preco*/){
serviceProduto.atualizarProduto(
prod.id_prod,
prod.nome,
prod.img,
prod.preco,
prod.descricao,
(prod.qtd-p.qtd))
}else{
  throw new Error("Pordutos esgotado")
}}}}
//envia chavas para tabela muito
novo.forEach((e)=>{
  const data={
    id_ped,
    id_prod:e.id_prod,
    qtd:e.qtd
  }
   pedido_produto(data);
  
})
return cod;
}

export const listarPedido=async()=>{
  const listaPedido = await model.listarTodosPedido();
  return listaPedido;
}
export const listaPedidoProduto =async()=>{
  const lista = await model.listarTodosPedidoProdutos()
  return lista
}