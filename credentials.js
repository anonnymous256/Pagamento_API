require('dotenv').config();

console.log('Caminho do certificado:', process.env.EFI_PAY_CERTIFICATE);

module.exports = {
    sandbox: process.env.EFI_PAY_DEVELOPMENT === 'true',
    client_id: process.env.EFI_PAY_CLIENT_ID,
    client_secret: process.env.EFI_PAY_CLIENT_SECRET,
    certificate: './certs/' + process.env.EFI_PAY_CERTIFICATE,
};
