import{htmlElement as i,HTMLTable as l}from"./HTML.js";const p={t:16,i:6,h:"#CEF",o:"#FFC",l:"#CFC",p:32768,padding:"5px",appName:"WebHex.io"},e=[{name:"Uint8",size:1},{name:"Uint16",size:2},{name:"Uint32",size:4},{name:"BigUint64",size:8},{name:"Int8",size:1},{name:"Int16",size:2},{name:"Int32",size:4},{name:"BigInt64",size:8},{name:"Float32",size:4},{name:"Float64",size:8}],n="application/octet-stream";class s{table;u;m=e[0];g;C=!0;v={address:0,value:[...Array(p.t)].map((t,e)=>e+1),S:[...Array(p.t)].map((t,e)=>e+1+p.t)};V=new Map;A=new Map;F=new Set;L;D;U(){return this.g}I(t){if(t!=this.g){var e=this.L.slice(this.u,this.u+this.m.size),s="set"+this.m.name;this.D[s](this.u,t,this.C);for(let t=this.u;t<this.u+this.m.size;t++){const n=this.L[t];var i=e[t-this.u];n!=i&&(this.F.add(t),this.V.get(t).textContent=n.toString(16).padStart(2,"0"),this.A.get(t).textContent=31<n&&n<127?String.fromCharCode(n):".")}this.R()}}T(t){this.k(),this.m=e[t],this.R()}B(t){this.k(),this.u=t,this.R(),this.M?.(this.u)}O(t){this.C=t,this.R()}M;N;H(t){switch(t.key){case"ArrowLeft":0<this.u&&this.B(this.u-1),t.preventDefault();break;case"ArrowRight":this.u<this.L.length-1&&this.B(this.u+1),t.preventDefault();break;case"ArrowUp":this.u>=p.t&&this.B(this.u-p.t),t.preventDefault();break;case"ArrowDown":this.u<this.L.length-p.t&&this.B(this.u+p.t),t.preventDefault()}}k(){if(void 0!==this.u)for(let t=this.u;t<this.u+this.m.size;t++){var e=this.F.has(t);const s=this.V.get(t),i=this.A.get(t);s.style.backgroundColor=e?p.o:"transparent",i.style.backgroundColor=e?p.o:"transparent",i.style.fontWeight="normal"}}R(){var t="get"+this.m.name;this.g=this.D[t](this.u,this.C),this.N?.(this.g);for(let t=this.u;t<this.u+this.m.size;t++){var e=this.F.has(t);const s=this.V.get(t),i=this.A.get(t);s.style.backgroundColor=e?p.l:p.h,i.style.backgroundColor=e?p.l:p.h,i.style.fontWeight="bolder"}}constructor(t){this.D=new DataView(t),this.L=new Uint8Array(t);var s=Math.ceil(t.byteLength/p.t),t=1+p.t+p.t;this.table=new l({rows:s,columns:t});for(let e=0;e<s;e++){const i=e*p.t,n=this.table.j(e,this.v.address);n.textContent=i.toString().padStart(p.i,"0");for(let t=0;t<p.t;t++){const a=i+t;if(a>=this.L.length)break;const h=this.L[a],o=this.table.j(e,this.v.value[t]);o.textContent=h.toString(16).padStart(2,"0"),o.dataset.K=a.toString(),o.dataset.P="byteValue",this.V.set(a,o);const r=this.table.j(e,this.v.S[t]);r.textContent=31<h&&h<127?String.fromCharCode(h):".",r.dataset.K=a.toString(),r.dataset.P="byteAscii",this.A.set(a,r)}}this.table.j(0,0).style.paddingRight=p.padding;var e=Math.min(p.t,this.L.length);for(let t=3;t<e;t+=4)this.V.get(t).style.paddingRight=p.padding;this.table.element.onclick=t=>{var t=t.target;t.dataset.K&&(t=parseInt(t.dataset.K),console.log(t),this.B(t))}}get element(){return this.table.element}}class t{W;root;q;content;G;J=!1;fileName;constructor(t){this.root=i("div",{style:{whiteSpace:"pre",fontFamily:"monospace"},parent:t});t=i("div",{style:{backgroundColor:"#CCC",position:"fixed",left:"0px",top:"0px",padding:"0.5em",width:"100%",height:"2em"},parent:this.root,X:t=>{t.ondragover=t=>t.preventDefault(),t.ondrop=t=>this.Y(t)}});this.q={root:t,title:i("span",{textContent:p.appName+" - example data",style:{paddingRight:"1em"},parent:t}),open:i("button",{textContent:"Open",parent:t,X:t=>{t.onclick=()=>console.log("Open pressed.")}}),save:i("button",{textContent:"Save",parent:t,X:t=>{t.onclick=()=>this.saveData()}}),u:i("span",{textContent:"["+"".padStart(p.i,"-")+"]:",style:{paddingLeft:p.padding},parent:t}),g:i("input",{X:e=>{e.onkeydown=t=>{"Enter"==t.key&&(t=Number(e.value),Number.isNaN(t)||(this.I(t),this.G.I(t)))}},style:{paddingLeft:p.padding,paddingRight:p.padding},parent:t}),Z:i("select",{X:s=>{e.forEach((t,e)=>i("option",{X:t=>t.value=e.toString(),textContent:t.name,parent:s})),s.onchange=t=>this.G?.T(parseInt(s.value))},parent:t}),$:i("select",{X:s=>{["little endian","big endian"].forEach(e=>i("option",{X:t=>t.value=e,textContent:e,parent:s})),s.onchange=t=>this.G?.O("little endian"==s.value)},parent:t}),_:i("select",{X:s=>{["dec","hex"].forEach(e=>i("option",{X:t=>t.value=e,textContent:e,parent:s})),s.onchange=t=>{this.J="hex"==s.value;var e=this.G.U();this.I(e)}},parent:t})};i("div",{style:{height:t.clientHeight+"px"},parent:this.root});this.content=i("div",{parent:this.root,X:t=>t.tabIndex=-1})}Y(t){console.log("Dropped"),t.preventDefault(),console.log(t.dataTransfer.files);t=t.dataTransfer.files[0];console.log(t.name),this.fileName=t.name,this.q.title.textContent=p.appName+" - "+t.name;const e=new FileReader;e.onload=t=>{const e=t.target.result;this.setData(e.slice(0,p.p))},e.readAsArrayBuffer(t)}saveData(){var t=new Blob([this.W],{type:n});const e=URL.createObjectURL(t),s=i("a",{style:{display:"none"},parent:document.body,X:t=>{t.href=e,t.download=this.fileName??"example.bin",t.type=n}});s.click(),URL.revokeObjectURL(e),s.remove()}I=t=>{this.q.g.value=this.J?"0x"+t.toString(16):t.toString()};setData(t){this.W=t,this.G&&this.content.removeChild(this.G.element),this.G=new s(t),this.G.M=t=>{this.q.u.textContent="["+t.toString().padStart(p.i,"0")+"]:"},this.G.N=this.I,this.content.appendChild(this.G.element),this.content.onkeydown=t=>{console.log("Key down:",t.key),this.G.H(t)}}}export{s as DataTable,t as DataViewer};