require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const EfiPay = require('sdk-node-apis-efi');
const options = require('./credentials');

const app = express();
const port = 3090;

// Habilitando o CORS para todas as origens
app.use(cors());
app.use(express.json());

// Função para gerar um txid sem caracteres especiais e com comprimento entre 26 e 30 caracteres
const generateTxid = () => {
    let txid = uuidv4().replace(/-/g, '');
    if (txid.length > 30) {
        txid = txid.substring(0, 30);
    } else if (txid.length < 26) {
        txid += uuidv4().replace(/-/g, '').substring(0, 26 - txid.length);
    }
    return txid;
};

app.post('/criar-pix', async (req, res) => {
    try {
        const { transaction_amount } = req.body;

        // Verificar se o amount foi passado no corpo da requisição
        if (!transaction_amount) {
            return res.status(400).json({ error: 'transaction_amount é obrigatório.' });
        }

        console.log(`Valor da transação recebido: ${transaction_amount}`);

        // Corpo da requisição para a criação da cobrança
        const body = {
            calendario: {
                expiracao: 3600, // Tempo de expiração da cobrança (em segundos)
            },
            valor: {
                original: transaction_amount,
            },
            chave: process.env.CHAVE_PIX_EFI_PAY, // Chave Pix configurada no .env
        };

        let params = {
            txid: generateTxid(), // Gerando um txid único
        };

        console.log("Parâmetros para criação da cobrança:", params);
        console.log("Corpo da requisição:", body);

        const efipay = new EfiPay(options);

        // Tentativa de criar a cobrança via API
        const immediateChargeResponse = await efipay.pixCreateCharge(params, body);
        console.log("Resposta da criação de cobrança:", immediateChargeResponse);

        // Verificação da resposta da criação de cobrança
        if (!immediateChargeResponse || !immediateChargeResponse.loc || !immediateChargeResponse.loc.id) {
            console.error('Resposta inválida ao criar a cobrança:', immediateChargeResponse);
            throw new Error('Resposta inválida ao criar a cobrança');
        }

        const paramID = {
            id: immediateChargeResponse.loc.id,
        };

        // Tentativa de gerar o QR code
        const qrCodeResponse = await efipay.pixGenerateQRCode(paramID);
        console.log("Resposta da geração do QR code:", qrCodeResponse);

        // Verificação da resposta da geração do QR code
        if (!qrCodeResponse) {
            console.error('Resposta inválida ao gerar o QR code:', qrCodeResponse);
            throw new Error('Resposta inválida ao gerar o QR code');
        }

        // Enviar a resposta com os dados do QR code e txid
        res.json({ qrCodeResponse, txid: params.txid });
    } catch (error) {
        console.error("Erro ao processar o pagamento:", error);
        res.status(500).json({ error: 'Erro ao processar o pagamento', details: error.message });
    }
});

app.get('/verificar-pagamento/:id', async (req, res) => {
    const { id } = req.params;

    console.log(`Verificando pagamento para o txid: ${id}`);

    let params = {
        txid: id,
    };

    const efipay = new EfiPay(options);

    try {
        // Tentativa de verificar a cobrança com o ID fornecido
        const resposta = await efipay.pixDetailCharge(params);
        console.log("Resposta da verificação do pagamento:", resposta);
        
        // Enviar a resposta de verificação de pagamento
        res.status(200).json({ resposta });
    } catch (error) {
        console.error("Erro ao verificar o pagamento:", error);
        res.status(500).json({ error: 'Erro ao verificar o pagamento', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
