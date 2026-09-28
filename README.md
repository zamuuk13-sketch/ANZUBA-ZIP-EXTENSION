# ANZUBA ZIP

Extensão Chrome/Chromium Manifest V3 para transformar respostas de IAs em projetos reais dentro de um único ZIP.

## Recursos
- Gemini, DeepSeek e ChatGPT.
- Detecta o protocolo explícito FILE/PROJECT.
- Detecta formatos comuns de blocos de código.
- Botão **📁 Baixar projeto** dentro da resposta.
- ZIP criado localmente, sem servidor externo.
- Nome do ZIP definido pela IA com PROJECT.

## Formato recomendado
PROJECT: meu-jogo
DESCRIPTION: Jogo em HTML

FILE: index.html
```html
<!doctype html>
...
```

FILE: src/game.js
```js
...
```

RUN: abra index.html no navegador.

## Instalação
1. Chrome/Chromium → chrome://extensions
2. Ative Modo do desenvolvedor.
3. Carregar sem compactação.
4. Selecione a pasta deste repositório.

## Nota
O navegador permite gerar e baixar o ZIP após o clique do usuário. A extensão não pode silenciosamente instalar/extrair arquivos arbitrários no computador sem as confirmações e APIs apropriadas do navegador/OS.