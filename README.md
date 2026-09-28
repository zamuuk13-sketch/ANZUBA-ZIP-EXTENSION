# ANZUBA ZIP v3

Ponte entre Gemini/DeepSeek e projetos em ZIP.

## Fluxo

IA cria o projeto -> ANZUBA reconhece os arquivos -> handoff oficial quando disponível -> arquivos são acumulados -> **📁 Baixar projeto** -> ZIP local.

## Três camadas combinadas

1. **Reconhecimento automático:** detecta nomes de arquivos e blocos de código na resposta renderizada.
2. **Handoff oficial:** a IA pode entregar `ANZUBA_PROJECT`, `NAME`, `FILE` e `ANZUBA_END`.
3. **Ponte ANZUBA:** a página aceita `postMessage` com `source: "ANZUBA_AI"` e `type: "PROJECT"`, preparando adaptadores específicos das IAs.

A extensão não executa o código e não é uma IDE. Ela coleta o que a IA entregou na página e monta o ZIP localmente.

## Instalação

1. Abra chrome://extensions.
2. Ative Modo do desenvolvedor.
3. Clique em Carregar sem compactação.
4. Selecione esta pasta.

## Sites

Gemini, DeepSeek e Chat DeepSeek.
