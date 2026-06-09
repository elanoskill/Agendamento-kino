import express from 'express';
import *as servico from "../service/service_pedido.js"
//criar pedido
const controller = express.Router();
controller.post("/criar", async (req,res)=>{
if (!req.body.item.length){
return res.status(400).json({message: "Deve ter pelo menos um item no carrinho"})
}
if (!req.body.nome){
return res.status(400).json({message: "O cambo nome é obrigatório"})
}
const data = req.body;
try{
const novo = await servico.criarPedido(data)
return res.status(201).json(novo);
}catch(e){
console.log(e)
return res.status(500).json({message: "erro ao tentar fazer pedido"})
}});
//lista os pedidos
controller.get("/listar", async(req,res)=>{
try{
const lista = await servico.listarPedido();
return res.status(200).json(lista);

}catch(e){
console.log(e)
return res.status(500).json({message: "erro no servidor, tenta mais tarde"});
}
});

//lista os pedidos
controller.get("/listar_pedProd", async(req,res)=>{
try{
const lista = await servico.listaPedidoProduto();
return res.status(200).json(lista);

}catch(e){
console.log(e)
return res.status(500).json({message: "erro no servidor, tenta mais tarde"});
}
});


export default controller;