require('dotenv').config();


module.exports = {
    sandbox: process.env.EFI_PAY_DEVELOPMENT === 'true',
    client_id: process.env.EFI_PAY_CLIENT_ID,
    client_secret: process.env.EFI_PAY_CLIENT_SECRET,
    certificate: './certs/homologacao-636624-Restaurante_Yanes_Homo.p12'
}
