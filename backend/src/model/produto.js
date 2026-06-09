import db from "../config/db.js";

//função listar produtos pela db
export const listarProdutos = async() => {
    return await db.query("SELECT * FROM produto");
};

//função procurar produto pela db
export const buscarProdutoId = async id => {
    return await db.query("SELECT * FROM produto WHERE id_prod = ?", [id]);
};

//função criar produto pela db
export const cadastrarProduto = async data => {
    const { nome, img, preco, descricao, requerQtd,id_user, id_cat } = data;
    console.log(JSON.stringify(data));
    return await db.query(
        "INSERT INTO produto (nome, img, preco, descricao, requerQtd, id_user, id_cat) VALUES (?, ?, ?, ?, ?, ?,?)",
        [nome, img, preco, descricao, requerQtd,id_user, id_cat]
    );
};

//função atualizar produto pela db
export const atualizarProduto = async(id, nome, img, preco, descricao, requerQtd, id_cat) => {
    return await db.query(
            "UPDATE produto SET nome=?, img=?, preco=?, descricao=?, qtd=?, id_cat=? WHERE id_prod=?",
            [nome, img, preco, descricao, requerQtd, id_cat, id]
        );
};

//função deletar produto pela db
export const eliminarProduto = id => {
    return db.query("DELETE FROM produto WHERE id_prod=?", [id]);
};
