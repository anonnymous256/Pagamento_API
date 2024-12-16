require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const EfiPay = require('sdk-node-apis-efi');
const options = require('./credentials');
const qs = require('qs');

const app = express();
const port = 3090;


console.log('Client ID:', process.env.EFI_PAY_API_KEY);
console.log('Client Secret:', process.env.EFI_PAY_API_SECRET);
console.log('Chave PIX:', process.env.CHAVE_PIX_EFI_PAY);
console.log('Certificado:', process.env.EFI_PAY_CERTIFICATE);
console.log('Modo de Desenvolvimento:', process.env.EFI_PAY_DEVELOPMENT);

app.use(cors());
app.use(express.json());

let accessToken = null;
let tokenExpiration = null;

const authenticate = async () => {
    try {
        const response = await axios.post('https://cobrancas-h.api.efipay.com.br/v1/authorize',
            qs.stringify({
                grant_type: 'client_credentials',
                client_id: process.env.EFI_PAY_API_KEY,
                client_secret: process.env.EFI_PAY_API_SECRET,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );

        accessToken = response.data.access_token;
        tokenExpiration = Date.now() + response.data.expires_in * 1000;
        console.log('Token obtido com sucesso:', accessToken);
    } catch (error) {
        console.error('Erro ao autenticar:', error.response?.data || error.message);
        throw new Error('Erro ao autenticar na API.');
    }
};

const ensureAuthenticated = async (req, res, next) => {
    if (!accessToken || Date.now() >= tokenExpiration) {
        await authenticate();
    }
    req.accessToken = accessToken;
    next();
};

const generateTxid = () => {
    let txid = uuidv4().replace(/-/g, '');
    if (txid.length > 30) {
        txid = txid.substring(0, 30);
    } else if (txid.length < 26) {
        txid += uuidv4().replace(/-/g, '').substring(0, 26 - txid.length);
    }
    return txid;
};

app.post('/criar-pix', ensureAuthenticated, async (req, res) => {
    try {
        const { transaction_amount } = req.body;

        if (!transaction_amount || isNaN(transaction_amount)) {
            return res.status(400).json({ error: 'transaction_amount é obrigatório e deve ser um número.' });
        }

        console.log(`Valor da transação recebido: ${transaction_amount}`);

        const body = {
            calendario: {
                expiracao: 3600,
            },
            valor: {
                original: transaction_amount,
            },
            chave: process.env.CHAVE_PIX_EFI_PAY,
        };

        let params = {
            txid: generateTxid(),
        };

        console.log("Parâmetros para criação da cobrança:", params);
        console.log("Corpo da requisição:", body);

        const efipay = new EfiPay({
            ...options,
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
            },
        });

        const immediateChargeResponse = await efipay.pixCreateCharge(params, body);

        if (!immediateChargeResponse || !immediateChargeResponse.loc || !immediateChargeResponse.loc.id) {
            console.error('Resposta inválida ao criar a cobrança:', immediateChargeResponse);
            throw new Error('Resposta inválida ao criar a cobrança');
        }

        const paramID = {
            id: immediateChargeResponse.loc.id,
        };

        const qrCodeResponse = await efipay.pixGenerateQRCode(paramID);

        if (!qrCodeResponse) {
            console.error('Resposta inválida ao gerar o QR code:', qrCodeResponse);
            throw new Error('Resposta inválida ao gerar o QR code');
        }

        console.log("Resposta da geração do QR code:", qrCodeResponse);

        res.json({ qrCodeResponse, txid: params.txid });
    } catch (error) {
        console.error("Erro ao processar o pagamento:", error);
        res.status(500).json({ error: 'Erro ao processar o pagamento', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
