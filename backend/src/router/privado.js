import express from 'express';
import {auth} from '../middlewares/auth.js'
import controllerPrivado from '../controllers/controller_usuario.js';
import controllerProduto from '../controllers/controller_produto.js'
import listarReclamacao from "../controllers/controllerReclamacao.js";
import pedido from "../controllers/controllerPedido.js";
import funcionario from "../controllers/controllerFuncionario.js";
const router = express.Router();
router.use("/usuario",auth,controllerPrivado);
router.use("/produto", auth, controllerProduto);
router.use("/listar",auth,listarReclamacao);
router.use("/pedido",pedido);
router.use('/funcionario',auth,funcionario);
export default router;
