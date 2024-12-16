require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const EfiPay = require('sdk-node-apis-efi');
const options = require('./credentials');

const app = express();
const port = 3090;

console.log('Inicializando servidor...');
console.log('Client ID:', process.env.EFI_PAY_API_KEY);
console.log('Chave PIX:', process.env.CHAVE_PIX_EFI_PAY);

app.use(cors());
app.use(express.json());

// Token manual para testes
const manualToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjZXNzX3Rva2VuIiwiY2xpZW50SWQiOiJDbGllbnRfSWRfZTdjNTdhZGJlN2E0ZGJmZDlkZjc4YjUyMmZkMDkzMThmYTc2ZjZhMyIsImFjY291bnQiOjYzNjYyNCwiYWNjb3VudF9jb2RlIjoiYWEzMzIwYjY3NWM4Mzg1NmEzMGY2YzM0YTA0NzhmMTgiLCJzY29wZXMiOlsiY29iLnJlYWQiLCJjb2Iud3JpdGUiLCJjb2J2LnJlYWQiLCJjb2J2LndyaXRlIiwiZ24uYmFsYW5jZS5yZWFkIiwiZ24uaW5mcmFjdGlvbnMucmVhZCIsImduLmluZnJhY3Rpb25zLndyaXRlIiwiZ24ucGl4LmV2cC5yZWFkIiwiZ24ucGl4LmV2cC53cml0ZSIsImduLnBpeC5zZW5kLnJlYWQiLCJnbi5xcmNvZGVzLnBheSIsImduLnJlcG9ydHMucmVhZCIsImduLnJlcG9ydHMud3JpdGUiLCJnbi5zZXR0aW5ncy5yZWFkIiwiZ24uc2V0dGluZ3Mud3JpdGUiLCJnbi5zcGxpdC5yZWFkIiwiZ24uc3BsaXQud3JpdGUiLCJsb3RlY29idi5yZWFkIiwibG90ZWNvYnYud3JpdGUiLCJwYXlsb2FkbG9jYXRpb24ucmVhZCIsInBheWxvYWRsb2NhdGlvbi53cml0ZSIsInBpeC5yZWFkIiwicGl4LnNlbmQiLCJwaXgud3JpdGUiLCJ3ZWJob29rLnJlYWQiLCJ3ZWJob29rLndyaXRlIl0sImV4cGlyZXNJbiI6MzYwMCwiY29uZmlndXJhdGlvbiI6eyJ4NXQjUzI1NiI6InFXL3RoYWVSNGxTdFp5dVJGMDRmMktSakF5ckdJbU5NTklzd1NCMitoeXc9In0sImlhdCI6MTczNDM1NTY5MSwiZXhwIjoxNzM0MzU5MjkxfQ.47MaehcjghWX4Yx7Zu3SwTVCEWpULml_LlQkVOGuOZE"; // Substitua por um token válido

// Middleware para autenticação
const ensureAuthenticated = async (req, res, next) => {
    try {
        // Usando token manualmente
        req.accessToken = manualToken;
        console.log('Usando token manual:', req.accessToken);
        next();
    } catch (error) {
        console.error('Erro no middleware de autenticação:', error.message);
        res.status(500).json({ error: 'Erro ao autenticar' });
    }
};

// Função para gerar TXID
const generateTxid = () => {
    console.log('Gerando TXID...');
    let txid = uuidv4().replace(/-/g, '');
    if (txid.length > 30) {
        txid = txid.substring(0, 30);
    } else if (txid.length < 26) {
        txid += uuidv4().replace(/-/g, '').substring(0, 26 - txid.length);
    }
    console.log('TXID gerado:', txid);
    return txid;
};

// Rota para criar cobrança PIX
app.post('/criar-pix', ensureAuthenticated, async (req, res) => {
    console.log('Recebida requisição em /criar-pix...');
    try {
        const { transaction_amount } = req.body;

        if (!transaction_amount || isNaN(transaction_amount)) {
            console.error('Erro de validação: transaction_amount inválido:', transaction_amount);
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

        console.log('Inicializando SDK EfiPay...');
        const efipay = new EfiPay({
            ...options,
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
            },
        });

        console.log('Criando cobrança...');
        const immediateChargeResponse = await efipay.pixCreateCharge(params, body);

        if (!immediateChargeResponse || !immediateChargeResponse.loc || !immediateChargeResponse.loc.id) {
            console.error('Resposta inválida ao criar a cobrança:', immediateChargeResponse);
            throw new Error('Resposta inválida ao criar a cobrança');
        }

        console.log('Cobrança criada com sucesso. ID da localização:', immediateChargeResponse.loc.id);

        const paramID = {
            id: immediateChargeResponse.loc.id,
        };

        console.log('Gerando QR Code...');
        const qrCodeResponse = await efipay.pixGenerateQRCode(paramID);

        if (!qrCodeResponse) {
            console.error('Resposta inválida ao gerar o QR code:', qrCodeResponse);
            throw new Error('Resposta inválida ao gerar o QR code');
        }

        console.log("QR Code gerado com sucesso:", qrCodeResponse);

        res.json({ qrCodeResponse, txid: params.txid });
    } catch (error) {
        console.error("Erro ao processar o pagamento:", error.message);
        res.status(500).json({ error: 'Erro ao processar o pagamento', details: error.message });
    }
});

// Inicializando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
