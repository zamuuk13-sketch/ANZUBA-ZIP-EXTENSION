# ANZUBA ZIP

Extensão simples para Gemini e DeepSeek.

Fluxo: o usuário pede um projeto para a IA → a IA cria e organiza todos os arquivos e pastas → a IA entrega o projeto ao ANZUBA → aparece o botão 📁 Baixar projeto → o navegador baixa um único ZIP.

A IA entrega o projeto usando ANZUBA_PROJECT, NAME, FILE e ANZUBA_END. A extensão não é uma IDE e não cria o projeto por conta própria: ela somente transforma a estrutura pronta da IA em ZIP.

## Instalação

1. Abra chrome://extensions.
2. Ative Modo do desenvolvedor.
3. Clique em Carregar sem compactação.
4. Selecione a pasta do repositório.

## Sites

- Gemini
- DeepSeek

O ZIP é montado localmente no navegador, sem servidor ou API externa.