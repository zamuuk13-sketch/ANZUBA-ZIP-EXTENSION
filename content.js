(()=>{"use strict";if(!/^(gemini\.google\.com|deepseek\.com|chat\.deepseek\.com)$/i.test(location.hostname))return;const F=String.fromCharCode(96).repeat(3);function name(s){return(s||"anzuba-project").replace(/[^a-zA-Z0-9À-ÿ._ -]/g,"-").replace(/\s+/g,"-").slice(0,80)||"anzuba-project"}function parse(t){
  const marker=t.match(/ANZUBA_PROJECT[\\s\\S]*?ANZUBA_END/i);
  const s=marker?marker[0]:t;
  let project="anzuba-project";
  const nm=s.match(/(?:^|\\n)\\s*(?:NAME|PROJECT)\\s*:\\s*([^\\n]+)/i);
  if(nm)project=name(nm[1]);
  const fs=[],seen=new Set();
  const parts=s.split(F);
  for(let i=1;i<parts.length;i+=2){
    const lines=parts[i-1].split("\\n").map(x=>x.trim()).filter(Boolean).reverse();
    const line=lines.find(x=>/^FILE\\s*:/i.test(x));
    if(!line)continue;
    const path=line.replace(/^FILE\\s*:\\s*/i,"").replace(/\\\\/g,"/").trim();
    if(!validPath(path))continue;
    let content=parts[i];const nl=content.indexOf("\\n");if(nl>=0)content=content.slice(nl+1);
    if(!seen.has(path)){fs.push({path,content:content.replace(/\\n$/,"")});seen.add(path);}
  }
  if(!fs.length){
    const chunks=t.split(F);
    for(let i=1;i<chunks.length;i+=2){
      const before=chunks[i-1].split("\\n").map(x=>x.trim()).filter(Boolean).reverse();
      let line=before.find(x=>/^(?:FILE|Arquivo|File)\\s*[:\\-]/i.test(x));
      if(!line)line=before.find(x=>/^[\\w .\\/-]+\\.(py|js|ts|tsx|jsx|html?|css|json|lua|cpp|h|hpp|cs|java|kt|rs|go|php|gd|bat|ps1|md|txt|xml|yml|yaml)$/i.test(x));
      if(!line)continue;
      const path=line.replace(/^(?:FILE|Arquivo|File)\\s*[:\\-]\\s*/i,"").replace(/^[`*#]+|[`*#:]+$/g,"").trim();
      if(!validPath(path)||seen.has(path))continue;
      let content=chunks[i];const nl=content.indexOf("\\n");if(nl>=0)content=content.slice(nl+1);
      fs.push({path,content:content.replace(/\\n$/,"")});seen.add(path);
    }
  }
  if(!fs.length)return null;
  if(!nm){const title=t.match(/(?:^|\\n)\\s*#\\s+([^\\n]+)/);if(title)project=name(title[1]);}
  return {project,files:fs};
}
function validPath(path){return !!path&&path.length<220&&!path.startsWith("/")&&!path.includes("..")&&/^[^<>:"|?*]+$/.test(path)}
function crc(x){let c=4294967295;for(let i=0;i<x.length;i++){c^=x[i];for(let k=0;k<8;k++)c=c>>>1^(3988292384&-(c&1))}return(c^4294967295)>>>0}function u16(n){return new Uint8Array([n&255,n>>>8&255])}function u32(n){return new Uint8Array([n&255,n>>>8&255,n>>>16&255,n>>>24&255])}function zip(fs){const e=new TextEncoder(),l=[],c=[];let o=0;for(const f of fs){const n=e.encode(f.path),d=e.encode(f.content),r=crc(d),h=new Uint8Array(30+n.length+d.length);let p=0;h.set(u32(67324752),p);p+=4;h.set(u16(20),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u32(r),p);p+=4;h.set(u32(d.length),p);p+=4;h.set(u32(d.length),p);p+=4;h.set(u16(n.length),p);p+=2;h.set(u16(0),p);p+=2;h.set(n,p);p+=n.length;h.set(d,p);l.push(h);const v=new Uint8Array(46+n.length);p=0;v.set(u32(33639248),p);p+=4;v.set(u16(20),p);p+=2;v.set(u16(20),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u32(r),p);p+=4;v.set(u32(d.length),p);p+=4;v.set(u32(d.length),p);p+=4;v.set(u16(n.length),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u16(0),p);p+=2;v.set(u32(0),p);p+=4;v.set(u32(o),p);p+=4;v.set(n,p);c.push(v);o+=h.length}const cs=c.reduce((a,v)=>a+v.length,0),eoc=new Uint8Array(22);let p=0;eoc.set(u32(101010256),p);p+=4;eoc.set(u16(0),p);p+=2;eoc.set(u16(0),p);p+=2;eoc.set(u16(fs.length),p);p+=2;eoc.set(u16(fs.length),p);p+=2;eoc.set(u32(cs),p);p+=4;eoc.set(u32(o),p);p+=4;eoc.set(u16(0),p);return new Blob([...l,...c,eoc],{type:"application/zip"})}const seen=new WeakSet();function scan(){document.querySelectorAll('[data-message-author-role="assistant"],article,.markdown,.prose').forEach(r=>{if(seen.has(r))return;const d=parse(r.innerText||"");if(!d)return;seen.add(r);const w=document.createElement("div");w.className="anzuba-download-wrap";const b=document.createElement("button");b.className="anzuba-download";b.innerHTML='<img src="'+chrome.runtime.getURL("icons/folder.svg")+'" alt=""><span>Baixar projeto</span>';const i=document.createElement("span");i.className="anzuba-info";i.textContent=d.files.length+" arquivos • "+d.project+".zip";b.onclick=()=>{const u=URL.createObjectURL(zip(d)),a=document.createElement("a");a.href=u;a.download=name(d.project)+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)};w.append(b,i);r.appendChild(w)})}new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});setTimeout(scan,1000);setInterval(scan,2000)})();