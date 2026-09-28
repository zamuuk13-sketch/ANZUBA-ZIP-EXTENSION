(() => {
  "use strict";
  if (!/^(gemini\.google\.com|deepseek\.com|chat\.deepseek\.com|www\.deepseek\.com)$/i.test(location.hostname)) return;

  const FENCE = String.fromCharCode(96).repeat(3);
  const seen = new WeakSet();

  function cleanName(s) {
    return (s || "anzuba-project").replace(/[^a-zA-Z0-9À-ÿ._ -]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "anzuba-project";
  }

  function pathName(s) {
    let p = (s || "").trim().replace(/^[ "' ]+|[ "' ]+$/g, "").replace(/\\/g, "/");
    p = p.replace(/^\.\/?/, "");
    if (!p || p.includes("..") || p.length > 220 || p.startsWith("/")) return null;
    return p;
  }

  function parse(text) {
    const anzuba = text.match(/ANZUBA_PROJECT\\s*([\\s\\S]*?)ANZUBA_END/i);
    const section = anzuba ? anzuba[0] : text;
    const nameMatch = section.match(/(?:^|\\n)\\s*(?:NAME|PROJECT)\\s*:\\s*([^\\n]+)/i);
    const projectMatch = section.match(/(?:^|\\n)\\s*PROJECT\\s*:\\s*([^\\n]+)/i);
    const files = [];
    const protocol = new RegExp("(?:^|\\\\n)\\\\s*FILE\\\\s*:\\\\s*([^\\\\n]+)\\\\n\\\\s*" + FENCE + "[^\\\\n]*\\\\n([\\s\\S]*?)\\\\n\\\\s*" + FENCE, "gi");
    let m;
    while ((m = protocol.exec(section))) {
      const p = pathName(m[1]);
      if (p) files.push({path:p, content:m[2]});
    }
    const xml = /<(?:file|FILE)\\s+(?:path|name)=[\"']([^\"']+)[\"'][^>]*>([\\s\\S]*?)<\\\\/(?:file|FILE)>/g;
    while ((m = xml.exec(section))) {
      const p = pathName(m[1]);
      if (p) files.push({path:p, content:m[2].trim()});
    }
    const unique = new Map();
    files.forEach(f => { if (f.path) unique.set(f.path, f); });
    if (!unique.size) return null;
    if (anzuba && !/ANZUBA_END/i.test(section)) return null;
    let project = cleanName(nameMatch ? nameMatch[1] : (projectMatch ? projectMatch[1] : "anzuba-project"));
    return {project, files:[...unique.values()]};
  }

  function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
  function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
  function crc32(bytes){
    let c=0xffffffff;
    for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1))}
    return (c^0xffffffff)>>>0;
  }

  function zip(files){
    const enc=new TextEncoder(), localParts=[], centralParts=[];
    let offset=0;
    for(const file of files){
      const name=enc.encode(file.path), body=enc.encode(file.content), crc=crc32(body);
      const local=new Uint8Array(30+name.length+body.length); let p=0;
      local.set(u32(0x04034b50),p);p+=4;local.set(u16(20),p);p+=2;local.set(u16(0),p);p+=2;
      local.set(u16(0),p);p+=2;local.set(u16(0),p);p+=2;local.set(u16(0),p);p+=2;
      local.set(u32(crc),p);p+=4;local.set(u32(body.length),p);p+=4;local.set(u32(body.length),p);p+=4;
      local.set(u16(name.length),p);p+=2;local.set(u16(0),p);p+=2;local.set(name,p);p+=name.length;local.set(body,p);
      localParts.push(local);

      const cd=new Uint8Array(46+name.length);p=0;
      cd.set(u32(0x02014b50),p);p+=4;cd.set(u16(20),p);p+=2;cd.set(u16(20),p);p+=2;
      cd.set(u16(0),p);p+=2;cd.set(u16(0),p);p+=2;cd.set(u16(0),p);p+=2;cd.set(u16(0),p);p+=2;
      cd.set(u32(crc),p);p+=4;cd.set(u32(body.length),p);p+=4;cd.set(u32(body.length),p);p+=4;
      cd.set(u16(name.length),p);p+=2;cd.set(u16(0),p);p+=2;cd.set(u16(0),p);p+=2;cd.set(u16(0),p);p+=2;
      cd.set(u16(0),p);p+=2;cd.set(u32(0),p);p+=4;cd.set(u32(offset),p);p+=4;cd.set(name,p);
      centralParts.push(cd);offset+=local.length;
    }
    const centralSize=centralParts.reduce((n,x)=>n+x.length,0), end=new Uint8Array(22);let p=0;
    end.set(u32(0x06054b50),p);p+=4;end.set(u16(0),p);p+=2;end.set(u16(0),p);p+=2;
    end.set(u16(files.length),p);p+=2;end.set(u16(files.length),p);p+=2;end.set(u32(centralSize),p);p+=4;
    end.set(u32(offset),p);p+=4;end.set(u16(0),p);
    return new Blob([...localParts,...centralParts,end],{type:"application/zip"});
  }

  function addButton(root,data){
    if(seen.has(root))return;seen.add(root);
    const wrap=document.createElement("div");wrap.className="anzuba-download-wrap";
    const button=document.createElement("button");button.className="anzuba-download";button.type="button";
    button.innerHTML='<img src="'+chrome.runtime.getURL("icons/folder.svg")+'" alt=""> <span>Baixar projeto</span>';
    const info=document.createElement("span");info.className="anzuba-info";
    info.textContent=data.files.length+" arquivo"+(data.files.length===1?"":"s")+" • "+data.project+".zip";
    button.addEventListener("click",()=>{
      if(button.dataset.busy==="1")return;
      button.dataset.busy="1";button.querySelector("span").textContent="Montando ZIP…";
      try{
        const url=URL.createObjectURL(zip(data.files)),a=document.createElement("a");
        a.href=url;a.download=cleanName(data.project)+".zip";document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);button.querySelector("span").textContent="Projeto baixado ✓";
        setTimeout(()=>button.querySelector("span").textContent="Baixar projeto",2000);
      }catch(e){console.error("[ANZUBA ZIP]",e);button.querySelector("span").textContent="Erro ao criar ZIP";setTimeout(()=>button.querySelector("span").textContent="Baixar projeto",2000)}
      finally{button.dataset.busy="0"}
    });
    wrap.append(button,info);
    const pre=root.querySelector("pre");
    if(pre&&pre.parentElement)pre.parentElement.insertAdjacentElement("afterend",wrap);else root.appendChild(wrap);
  }

  function scan(){
    const selectors=['[data-message-author-role="assistant"]',"main article","article",".markdown",".prose",'[class*="message"]','[class*="response"]'];
    const roots=new Set();selectors.forEach(s=>document.querySelectorAll(s).forEach(el=>roots.add(el)));
    roots.forEach(root=>{
      const text=root.innerText||root.textContent||"";
      if(text.length<60||text.indexOf(FENCE)===-1)return;
      if(!/(?:PROJECT\s*:|FILE\s*:|Arquivo\s*:|<file\s|\.(?:html?|css|js|json|lua|py|cpp|gd)\b)/i.test(text))return;
      const data=parse(text);if(data.files.length)addButton(root,data);
    });
  }

  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(scan,1000);setInterval(scan,2500);
})();