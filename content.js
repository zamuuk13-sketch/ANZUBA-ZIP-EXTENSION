(function(){
"use strict";
var hosts=["gemini.google.com","deepseek.com","chat.deepseek.com"];
if(hosts.indexOf(location.hostname.toLowerCase())===-1)return;

var F=String.fromCharCode(96).repeat(3);
var filesByPath={};
var projectName="anzuba-project";
var panel=null;
var timer=0;var finishTimer=0;

function safeName(v){
 v=String(v||"anzuba-project").replace(/[^a-zA-Z0-9À-ÿ._ -]/g,"-").replace(/\s+/g,"-");
 return v.slice(0,80)||"anzuba-project";
}
function cleanPath(v){
 return String(v||"").replace(/^[*#\s]+|[*#\s]+$/g,"").replace(/^["']|["']$/g,"").trim().replace(/\\/g,"/");
}
function validPath(v){
 v=cleanPath(v);
 return v.length>0&&v.length<240&&v.charAt(0)!=="/"&&v.indexOf("..")===-1&&!/[<>:"|?*]/.test(v);
}
function addFile(path,body){
 path=cleanPath(path);
 if(!validPath(path))return;
 filesByPath[path]={path:path,content:String(body||"").replace(/\r\n/g,"\n").replace(/\n$/,"")};
}
function inferName(text){
 var m=String(text||"").match(/(?:^|\n)\s*(?:NAME|PROJECT|PROJETO)\s*:\s*([^\n]+)/i);
 if(m)projectName=safeName(m[1]);
 else{
  m=String(text||"").match(/(?:^|\n)\s*#{1,3}\s+([^\n]+)/);
  if(m)projectName=safeName(m[1]);
 }
}
function parseProtocol(text){
 var m=String(text||"").match(/ANZUBA_PROJECT[\s\S]*?ANZUBA_END/i);
 if(!m)return false;
 inferName(m[0]);
 var p=m[0].split(F);
 for(var i=1;i<p.length;i+=2){
  var lines=p[i-1].split("\n").map(function(x){return x.trim();}).filter(Boolean).reverse();
  var line=lines.find(function(x){return /^(FILE|ARQUIVO)\s*:/i.test(x);});
  if(!line)continue;
  var body=p[i],n=body.indexOf("\n");
  if(n>=0)body=body.slice(n+1);
  addFile(line.replace(/^(FILE|ARQUIVO)\s*:\s*/i,""),body);
 }
 return true;
}
function parsePre(pre){
 var code=pre.querySelector("code")||pre;
 var body=code.innerText||code.textContent||"";
 if(!body.trim())return;
 var candidates=[];
 var e=pre.previousElementSibling;
 for(var i=0;e&&i<6;i++,e=e.previousElementSibling){
  var t=(e.innerText||e.textContent||"").trim();
  if(t)candidates.push(t.split("\n").pop().trim());
 }
 if(pre.parentElement){
  var pt=pre.parentElement.innerText||"";
  candidates=candidates.concat(pt.split("\n").slice(0,12).reverse().map(function(x){return x.trim();}));
 }
 var path="";
 for(var j=0;j<candidates.length;j++){
  var c=candidates[j];
  if(/^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=]/i.test(c)){
   path=c.replace(/^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=]\s*/i,"");break;
  }
  if(/\.(py|js|ts|tsx|jsx|html?|css|json|lua|cpp|c|h|hpp|cs|java|kt|rs|go|php|gd|bat|cmd|ps1|sh|md|txt|xml|yml|yaml|toml|ini|sql|vue|svelte)$/i.test(cleanPath(c))&&!/[{}();<>]/.test(c)){
   path=c;break;
  }
 }
 if(path)addFile(path,body);
}
function parseText(text){
 inferName(text);
 parseProtocol(text);
 var parts=String(text||"").split(F);
 for(var i=1;i<parts.length;i+=2){
  var lines=parts[i-1].split("\n").map(function(x){return x.trim();}).filter(Boolean).reverse();
  var line=lines.find(function(x){return /^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=\-]/i.test(x);});
  if(!line)line=lines.find(function(x){return /\.(py|js|ts|tsx|jsx|html?|css|json|lua|cpp|c|h|hpp|cs|java|kt|rs|go|php|gd|bat|cmd|ps1|sh|md|txt|xml|yml|yaml|toml|ini|sql|vue|svelte)$/i.test(cleanPath(x));});
  if(line){
   var body=parts[i],n=body.indexOf("\n");if(n>=0)body=body.slice(n+1);
   addFile(line.replace(/^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=\-]\s*/i,""),body);
  }
 }
}
function createPanel(){
 if(panel)return;
 panel=document.createElement("div");
 panel.id="anzuba-status";
 panel.innerHTML='<div class="anzuba-status-title">ANZUBA</div><div class="anzuba-status-text">Conectado ao site da IA</div>';
 document.body.appendChild(panel);
}
function showLoading(){createPanel();var b=panel.querySelector(".anzuba-download");if(b)b.remove();var i=panel.querySelector(".anzuba-info");if(i)i.remove();if(!panel.querySelector(".anzuba-loading")){var l=document.createElement("div");l.className="anzuba-loading";l.innerHTML="<span></span><span></span><span></span>";panel.appendChild(l);}}\nfunction scheduleFinish(){if(!Object.keys(filesByPath).length)return;showLoading();clearTimeout(finishTimer);finishTimer=setTimeout(function(){showDownload();},2200);}\nfunction showDownload(){
 createPanel();
 var old=panel.querySelector(".anzuba-download");
 if(old)old.remove();
 var arr=Object.keys(filesByPath).map(function(k){return filesByPath[k];});
 if(!arr.length)return;
 var b=document.createElement("button");
 b.className="anzuba-download";
 b.innerHTML='<img src="'+chrome.runtime.getURL("icons/folder.svg")+'" alt="">Baixar projeto';
 var info=document.createElement("div");
 info.className="anzuba-info";
 info.textContent=arr.length+" arquivo"+(arr.length===1?"":"s")+" • "+safeName(projectName)+".zip";
 b.onclick=function(){downloadZip(arr);};
 panel.appendChild(b);panel.appendChild(info);
}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function crc(bytes){
 var c=4294967295;
 for(var i=0;i<bytes.length;i++){c^=bytes[i];for(var k=0;k<8;k++)c=(c>>>1)^(3988292384&-(c&1));}
 return (c^4294967295)>>>0;
}
function zip(list){
 var enc=new TextEncoder(),local=[],central=[],offset=0;
 list.forEach(function(f){
  var n=enc.encode(f.path),d=enc.encode(f.content),r=crc(d);
  var h=new Uint8Array(30+n.length+d.length),p=0;
  h.set(u32(67324752),p);p+=4;h.set(u16(20),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u16(0),p);p+=2;h.set(u32(r),p);p+=4;h.set(u32(d.length),p);p+=4;h.set(u32(d.length),p);p+=4;h.set(u16(n.length),p);p+=2;h.set(u16(0),p);p+=2;h.set(n,p);p+=n.length;h.set(d,p);
  local.push(h);
  var c=new Uint8Array(46+n.length);p=0;
  c.set(u32(33639248),p);p+=4;c.set(u16(20),p);p+=2;c.set(u16(20),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u32(r),p);p+=4;c.set(u32(d.length),p);p+=4;c.set(u32(d.length),p);p+=4;c.set(u16(n.length),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u16(0),p);p+=2;c.set(u32(0),p);p+=4;c.set(u32(offset),p);p+=4;c.set(n,p);
  central.push(c);offset+=h.length;
 });
 var size=central.reduce(function(a,b){return a+b.length;},0),end=new Uint8Array(22),p=0;
 end.set(u32(101010256),p);p+=4;end.set(u16(0),p);p+=2;end.set(u16(0),p);p+=2;end.set(u16(list.length),p);p+=2;end.set(u16(list.length),p);p+=2;end.set(u32(size),p);p+=4;end.set(u32(offset),p);p+=4;end.set(u16(0),p);
 return new Blob(local.concat(central,[end]),{type:"application/zip"});
}
function downloadZip(list){
 var url=URL.createObjectURL(zip(list)),a=document.createElement("a");
 a.href=url;a.download=safeName(projectName)+".zip";document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(url);},60000);
}
function scan(){
 createPanel();
 var texts=document.querySelectorAll("article,[data-message-author-role='assistant'],main");
 texts.forEach(function(root){
  var t=root.innerText||"";
  if(t)parseText(t);
 });
 document.querySelectorAll("pre").forEach(parsePre);
 showDownload();
}
window.addEventListener("message",function(e){
 var d=e.data;
 if(!d||d.source!=="ANZUBA_AI"||d.type!=="PROJECT"||!Array.isArray(d.files))return;
 if(d.project)projectName=safeName(d.project);
 d.files.forEach(function(f){if(f&&validPath(f.path))addFile(f.path,f.content);});
 showDownload();
});
createPanel();
window.dispatchEvent(new CustomEvent("ANZUBA_READY",{detail:{version:"4.0.0",host:location.hostname}}));
new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(scan,250);}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(scan,700);
setInterval(scan,2500);
})();