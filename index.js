require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const EfiPay = require('sdk-node-apis-efi');
const options = require('./credentials');

const app = express();
const port = process.env.PORT || 3000;

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

        const efipay = new EfiPay(options);

        const immediateChargeResponse = await efipay.pixCreateCharge(params, body);
        if (!immediateChargeResponse || !immediateChargeResponse.loc || !immediateChargeResponse.loc.id) {
            throw new Error('Resposta inválida ao criar a cobrança');
        }

        const paramID = {
            id: immediateChargeResponse.loc.id,
        };

        const qrCodeResponse = await efipay.pixGenerateQRCode(paramID);
        if (!qrCodeResponse) {
            throw new Error('Resposta inválida ao gerar o QR code');
        }

        console.log(qrCodeResponse);
        res.json({ qrCodeResponse, txid: params.txid });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar o pagamento', details: error.message });
    }
});

app.get('/verificar-pagamento/:id', async (req, res) => {
    const { id } = req.params;

    let params = {
        txid: id,
    };

    const efipay = new EfiPay(options);

    try {
        const resposta = await efipay.pixDetailCharge(params);
        console.log(resposta);
        res.status(200).json({ resposta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar o pagamento', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});