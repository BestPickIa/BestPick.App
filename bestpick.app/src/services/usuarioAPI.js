import { HTTPClient } from "./client";

const usuarioAPI = {

    async obterAsync(signal) {
        return (await HTTPClient.get('/Usuario', { signal })).data;
    },

    async atualizarAsync(nome, email) {
        await HTTPClient.put('/Usuario', { nome, email });
    },

    async alterarSenhaAsync(senhaAtual, senhaNova, confirmarSenha) {
        await HTTPClient.put('/Usuario/senha', { senhaAtual, senhaNova, confirmarSenha });
    },

    async obterFotoAsync(id, signal) {
        return (await HTTPClient.get(`/Usuario/foto/${id}`, { responseType: 'blob', signal })).data;
    },

    async enviarFotoAsync(arquivo) {
        const dados = new FormData();
        dados.append('arquivo', arquivo);
        await HTTPClient.post('/Usuario/foto', dados, { headers: { 'Content-Type': undefined } });
    },

    async removerFotoAsync() {
        await HTTPClient.delete('/Usuario/foto');
    },

    async loginAsync(email, senha) {
        const login = {
            Email: email,
            Senha: senha,
        };

        const response = await HTTPClient.post(`/Usuario/login`, login);

        return response.data;
    },

    async criarAsync(nome, email, senha, confirmarSenha) {
        const usuarioCriar = {
            Nome: nome,
            Email: email,
            Senha: senha,
            confirmarSenha,
        };

        const response = await HTTPClient.post(`/Usuario`, usuarioCriar);

        return response.data;
    },

}

export default usuarioAPI;
