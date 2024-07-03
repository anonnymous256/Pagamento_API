# API para criar e verificar pagamentos via PIX usando o EfiPay.
**Observações:**

- As respostas e estruturas dos dados podem variar conforme a documentação e a implementação da SDK sdk-node-apis-efi.
- Certifique-se de que as variáveis de ambiente estão configuradas corretamente antes de iniciar o servidor.
- A implementação espera que o arquivo credentials.js contenha as credenciais necessárias para a API EfiPay.

## Stack utilizada

**Back-end:** Node, Express

## Documentação da API

#### Criar Cobrança PIX
##### Cria uma nova cobrança PIX e gera um QR Code para pagamento.

```http
  POST /criar-pix
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `transaction_amount` | `string` | **Obrigatório**. Valor da transação em formato string |

*Resposta de Sucesso:*

    "qrCodeResponse": {
        "qrcode": "string",
        "imagemQrcode": "string"
    },
    "txid": "string"

**qrCodeResponse.qrcode (string)**: Código QR gerado para o pagamento.

**qrCodeResponse.imagemQrcode (string)**: URL da imagem do código QR.

**txid (string)**: Identificador único da transação.

*Resposta de Erro:*

    "error": "Erro ao processar o pagamento",
    "details": "mensagem do erro"
### Verificar Pagamento PIX
Verifica o status de um pagamento PIX usando o txid.
```http
  GET /verificar-pagamento/:id
```

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `id`      | `string` | **Obrigatório**. Identificador único da transação (txid). |

*Resposta de Sucesso:*

    "resposta": {
        // Dados detalhados da cobrança
    }

Detalhes da cobrança, conforme retornado pela API EfiPay.

*Resposta de Erro:*

    "error": "Erro ao verificar o pagamento",
    "details": "mensagem do erro"


## Variáveis de Ambiente

Para rodar esse projeto, você vai precisar adicionar as seguintes variáveis de ambiente no seu .env

`PORT` Porta na qual o servidor irá escutar.

`EFI_PAY_CLIENT_ID` ID encontrado ao criar uma aplicação no EFIPAY

`EFI_PAY_CLIENT_SECRET` Chave de acesso encontrada ao criar uma aplicação no EFIPAY

`EFI_PAY_DEVELOPMENT` *true* para o modo Desenvolvimento e *false* para o modo de produção

`EFI_PAY_CERTIFICATE` Anexe o certificado baixado na EFIPAY em `./certs` e digite apenas o nome.

`CHAVE_PIX_EFI_PAY` Chave PIX utilizada para receber os pagamentos.



## Uso/Exemplos

Exemplo de Requisição para Criar Cobrança PIX
bash
```curl
curl -X POST http://localhost:3000/criar-pix \
-H 'Content-Type: application/json' \
-d '{"transaction_amount": "150.00"}'
```
Exemplo de Requisição para Verificar Pagamento PIX
bash
```curl
curl -X GET http://localhost:3000/verificar-pagamento/{txid}
```



## Funcionalidades internas

- generateTxid: Função que gera um txid único para a cobrança sem caracteres especiais e com comprimento entre 26 e 30 caracteres.

## Rodando localmente

Clone o projeto

```bash
  git clone https://github.com/vidalxv/efi-pay-nodejs
```

Entre no diretório do projeto

```bash
  cd efi-pay-nodejs
```

Instale as dependências

```bash
  npm install
```

Inicie o servidor

```bash
  node server.js
```

