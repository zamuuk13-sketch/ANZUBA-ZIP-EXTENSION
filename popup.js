const FENCE=String.fromCharCode(96).repeat(3);
const prompt=[
"Você tem o ANZUBA ZIP disponível nesta conversa.",
"Quando eu pedir um projeto, crie o projeto completo e organize todos os arquivos e pastas.",
"Quando terminar, entregue o projeto ao ANZUBA exatamente assim:",
"ANZUBA_PROJECT",
"NAME: nome-do-projeto",
"FILE: caminho/arquivo.ext",
FENCE+"linguagem",
"conteúdo COMPLETO do arquivo",
FENCE,
"Repita FILE + bloco de código para todos os arquivos.",
"ANZUBA_END",
"Não omita arquivos e não substitua código por reticências."
].join("\n");
document.getElementById("copyPrompt").addEventListener("click",async()=>{
  await navigator.clipboard.writeText(prompt);
  const b=document.getElementById("copyPrompt");
  b.textContent="Copiado ✓";
  setTimeout(()=>b.textContent="Copiar instrução do ANZUBA",1600);
});