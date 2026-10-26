/* Sentinel Earth — application. Tactical satellite globe + street-level layer. */
(function(){
"use strict";
var D=window.SE, T3=window.THREE;
var root=document.documentElement;
var lang='zh'; try{var s=localStorage.getItem('se-lang');if(s==='en'||s==='zh'||s==='bi')lang=s;}catch(e){}
// ---------- language pack (i18n.js): 'zh' 中文 · 'en' English · 'bi' 双语 ----------
var I18=window.SE_I18N||{ui:D.UI,s:{},pick:function(a,b,m){return m==='en'?b:a;}};
function LZ(){return lang!=='en';}                         // prefer Chinese data (中文 and 双语)
function I18P(a,b){return I18.pick(a,b,lang);}              // a 中文/English pair, chosen or joined by the mode
function I18T(k){var p=I18.s[k];return p?I18.pick(p[0],p[1],lang):k;}   // a string from the language pack
var LXC=typeof WeakMap!=='undefined'?new WeakMap():null;
function LX(o){if(!o)return o;if(lang!=='bi')return o[lang]||o.zh;var c=LXC&&LXC.get(o);if(c)return c;c=I18.pick(o.zh||{},o.en||{},'bi');if(LXC)LXC.set(o,c);return c;}
function T(k){var U=I18.ui||D.UI;return I18.pick(U.zh[k],U.en[k],lang);}
function cv(n){return getComputedStyle(root).getPropertyValue(n).trim();}
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
var D2R=Math.PI/180, R2D=180/Math.PI, R=100; // globe radius in world units
function ll2v(lat,lon,r){r=r||R;var phi=(90-lat)*D2R,th=(lon+180)*D2R;return new T3.Vector3(-r*Math.cos(th)*Math.sin(phi),r*Math.cos(phi),r*Math.sin(th)*Math.sin(phi));}
function v2ll(v){var n=v.clone().normalize();var lat=90-Math.acos(Math.max(-1,Math.min(1,n.y)))*R2D;var th=Math.atan2(n.z,-n.x);if(th<0)th+=2*Math.PI;return {lat:lat,lon:th*R2D-180};}
function hav(a,b,c,d){var p=D2R,dl=(c-a)*p,dn=(d-b)*p;var x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dn/2)*Math.sin(dn/2);return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function fmtLL(lat,lon){return Math.abs(lat).toFixed(2)+'°'+(lat>=0?'N':'S')+' '+Math.abs(lon).toFixed(2)+'°'+(lon>=0?'E':'W');}
function lvColor(i){return cv(D.LEVELS[i].c);}

// ---------- loading ----------
var loadTxt=document.getElementById('loadTxt'),loadBar=document.getElementById('loadBar');
function prog(p,t){loadBar.style.width=Math.round(p*100)+'%';if(t)loadTxt.textContent=t;}
function loadImg(u){return new Promise(function(res,rej){var i=new Image();i.crossOrigin='anonymous';i.onload=function(){res(i);};i.onerror=rej;i.src=u;});}
var SEV='20261025c';function loadJSON(u){return fetch(u+(u.indexOf('?')<0&&!/bundles/.test(u)?'?v='+SEV:'')).then(function(r){return r.json();});}

if(!T3){loadTxt.textContent='WebGL / three.js unavailable';return;}

// ---------- renderer / scene ----------
var canvas=document.getElementById('gl');
var renderer=new T3.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setClearColor(0x01030a,1);
renderer.autoClear=false;
renderer.debug.checkShaderErrors=/bench|selftest|debug/.test(location.hash);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T3.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
var scene=new T3.Scene(), streetScene=new T3.Scene();
streetScene.fog=new T3.Fog(0x050b16,1100,3200);streetScene.background=new T3.Color(0x050b16);
var HEMI=new T3.HemisphereLight(0x8fb2ff,0x0a1426,0.85);streetScene.add(HEMI);
var sSun=new T3.DirectionalLight(0xfff0dc,1.35); sSun.position.set(420,700,260); sSun.castShadow=true;
sSun.shadow.mapSize.set(2048,2048);var sc=sSun.shadow.camera;sc.left=-900;sc.right=900;sc.top=900;sc.bottom=-900;sc.near=50;sc.far=2400;sSun.shadow.bias=-0.0004;sSun.shadow.normalBias=0.6;
streetScene.add(sSun);streetScene.add(sSun.target);
var sSun2=new T3.DirectionalLight(0x6a9bff,0.4); sSun2.position.set(-300,240,-380); streetScene.add(sSun2);
var camera=new T3.PerspectiveCamera(40,1,0.1,5000);
var world=new T3.Group(); scene.add(world);
scene.add(new T3.AmbientLight(0x9ab0d8,0.5));
var sun=new T3.DirectionalLight(0xfff2e0,1.2); scene.add(sun);
var sunDir=new T3.Vector3(1,.3,.5).normalize();
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- globals ----------
var V=null, NODES=null, ctryCanvas=null, ctryCtx=null, ctryW=0, ctryH=0;
var globe=null, earthMat=null, atmo=null, vlayers={}, grat=null, nodePts=null;
var cityMarks=[], labelEls={}, ctryLabelEls=[];

function buildStars(){var n=3000,g=new T3.BufferGeometry(),p=new Float32Array(n*3),c=new Float32Array(n*3);
 for(var i=0;i<n;i++){var v=new T3.Vector3(gauss(),gauss(),gauss()).normalize().multiplyScalar(2000+Math.random()*1500);p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z;var t=Math.random();var cc=new T3.Color().setHSL(.58+t*.1,.3,.6+Math.random()*.4);c[i*3]=cc.r;c[i*3+1]=cc.g;c[i*3+2]=cc.b;}
 g.setAttribute('position',new T3.BufferAttribute(p,3));g.setAttribute('color',new T3.BufferAttribute(c,3));
 scene.add(STARS=new T3.Points(g,new T3.PointsMaterial({size:2.2,vertexColors:true,transparent:true,opacity:.8,depthWrite:false})));}
var STARS=null;
function gauss(){var u=1-Math.random(),v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function buildEarth(day,night,topo,water){
 var maxA=renderer.capabilities.getMaxAnisotropy();
 function tex(img){var t=new T3.Texture(img);t.colorSpace=T3.SRGBColorSpace;t.anisotropy=maxA;t.needsUpdate=true;return t;}
 function texL(img){var t=new T3.Texture(img);t.anisotropy=maxA;t.needsUpdate=true;return t;}
 earthMat=new T3.ShaderMaterial({uniforms:{
   dayMap:{value:tex(day)},nightMap:{value:tex(night)},bumpMap:{value:texL(topo)},specMap:{value:texL(water)},
   sunDir:{value:sunDir.clone()},camPos:{value:new T3.Vector3()},nightBoost:{value:1}},
  vertexShader:[
   'varying vec2 vUv;varying vec3 vN;varying vec3 vP;',
   'void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 wp=modelMatrix*vec4(position,1.0);vP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}'
  ].join('\n'),
  fragmentShader:[
   'uniform sampler2D dayMap,nightMap,bumpMap,specMap;uniform vec3 sunDir,camPos;uniform float nightBoost;',
   'varying vec2 vUv;varying vec3 vN;varying vec3 vP;',
   'void main(){vec3 n=normalize(vN);',
   // cheap bump from topo luminance gradient
   'vec2 tx=vec2(1.0/2048.0,1.0/1024.0);float h0=texture2D(bumpMap,vUv).r;float hx=texture2D(bumpMap,vUv+vec2(tx.x,0.0)).r;float hy=texture2D(bumpMap,vUv+vec2(0.0,tx.y)).r;',
   'vec3 bn=normalize(vec3((h0-hx)*2.2,(h0-hy)*2.2,1.0));n=normalize(n+ (bn.x*0.5)*cross(n,vec3(0.0,1.0,0.0)) + (bn.y*0.5)*cross(n,cross(n,vec3(0.0,1.0,0.0))));',
   'float d=dot(n,normalize(sunDir));float day=smoothstep(-0.12,0.22,d);',
   'vec3 dc=texture2D(dayMap,vUv).rgb;',
   'vec3 dayC=dc*(0.08+1.08*max(d,0.0));',
   'vec3 nl=texture2D(nightMap,vUv).rgb;vec3 nightC=nl*1.9*nightBoost+dc*0.03;',
   'vec3 vv=normalize(camPos-vP);vec3 hh=normalize(normalize(sunDir)+vv);',
   'float wmask=texture2D(specMap,vUv).r;float sp=pow(max(dot(n,hh),0.0),60.0)*wmask*0.6*day;',
   'float rim=pow(1.0-max(dot(normalize(vN),vv),0.0),3.0);',
   'float twi=smoothstep(-0.2,0.0,d)*(1.0-smoothstep(0.0,0.2,d));',
   'vec3 col=mix(nightC,dayC,day)+vec3(1.0,0.93,0.82)*sp+vec3(0.27,0.5,1.0)*rim*(0.12+0.5*day)+vec3(0.9,0.42,0.18)*twi*0.08;',
   'gl_FragColor=vec4(col,1.0);}'
  ].join('\n')});
 globe=new T3.Mesh(new T3.SphereGeometry(R,160,110),earthMat); world.add(globe);
 atmo=new T3.Mesh(new T3.SphereGeometry(R*1.085,96,64),new T3.ShaderMaterial({uniforms:{c:{value:new T3.Color(0x5f9dff)}},
  vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 c;varying vec3 vN;varying vec3 vV;void main(){float i=pow(clamp(-dot(vN,vV),0.0,1.0),1.9);gl_FragColor=vec4(c*i*2.4,1.0);}',
  side:T3.BackSide,blending:T3.AdditiveBlending,transparent:true,depthWrite:false}));
 scene.add(atmo);
}

function polylineGeom(lines,rr){var pos=[];for(var i=0;i<lines.length;i++){var l=lines[i];for(var j=0;j<l.length-2;j+=2){var a=ll2v(l[j+1],l[j],rr),b=ll2v(l[j+3],l[j+2],rr);pos.push(a.x,a.y,a.z,b.x,b.y,b.z);}}var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(pos),3));return g;}
function buildVectors(){
 vlayers.coast=new T3.LineSegments(polylineGeom(V.coast,R*1.001),new T3.LineBasicMaterial({color:0x4a6a9a,transparent:true,opacity:.55}));
 vlayers.admin1=new T3.LineSegments(polylineGeom(V.admin1,R*1.0012),new T3.LineBasicMaterial({color:0x5878b0,transparent:true,opacity:.28}));
 vlayers.rivers=new T3.LineSegments(polylineGeom(V.rivers,R*1.0012),new T3.LineBasicMaterial({color:0x3d7fc0,transparent:true,opacity:.4}));
 vlayers.lakes=new T3.LineSegments(polylineGeom(V.lakes,R*1.0012),new T3.LineBasicMaterial({color:0x3d7fc0,transparent:true,opacity:.45}));
 vlayers.borders=new T3.LineSegments(polylineGeom(V.borders,R*1.0016),new T3.LineBasicMaterial({color:0xffd24a,transparent:true,opacity:.7}));
 for(var k in vlayers)world.add(vlayers[k]);
}
function buildGraticule(){var pos=[];
 for(var lat=-75;lat<=75;lat+=15){for(var lon=-180;lon<360;lon+=4){var a=ll2v(lat,lon%360>180?lon-360:lon,R*1.0008),b=ll2v(lat,((lon+4)%360>180?(lon+4)-360:lon+4),R*1.0008);pos.push(a.x,a.y,a.z,b.x,b.y,b.z);}}
 for(var lo=-180;lo<180;lo+=15){for(var la=-88;la<88;la+=4){var a2=ll2v(la,lo,R*1.0008),b2=ll2v(la+4,lo,R*1.0008);pos.push(a2.x,a2.y,a2.z,b2.x,b2.y,b2.z);}}
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(pos),3));
 grat=new T3.LineSegments(g,new T3.LineBasicMaterial({color:0x4a6aa0,transparent:true,opacity:.16}));world.add(grat);
}
function slForNode(r){return r[10];} // precomputed sl
function buildNodes(){
 var rows=NODES.rows,n=rows.length,pos=new Float32Array(n*3),col=new Float32Array(n*3),sz=new Float32Array(n);
 for(var i=0;i<n;i++){var r=rows[i];var v=ll2v(r[5],r[6],R*1.004);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;var c=new T3.Color(lvColor(r[10]));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;sz[i]=r[7]>=5e6?2.6:r[7]>=1e6?1.8:1.2;}
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(pos,3));g.setAttribute('color',new T3.BufferAttribute(col,3));g.setAttribute('sz',new T3.BufferAttribute(sz,1));
 nodePts=new T3.Points(g,new T3.ShaderMaterial({uniforms:{camPos:{value:new T3.Vector3()}},transparent:true,depthWrite:false,blending:T3.AdditiveBlending,
  vertexShader:'attribute float sz;attribute vec3 color;varying vec3 vc;varying float vis;uniform vec3 camPos;void main(){vc=color;vec3 wn=normalize((modelMatrix*vec4(position,1.0)).xyz);vec3 cd=normalize(camPos);vis=step(-0.15,dot(wn,cd));vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=sz*(260.0/-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vc;varying float vis;void main(){if(vis<0.5)discard;vec2 d=gl_PointCoord-0.5;float r=length(d);if(r>0.5)discard;float a=smoothstep(0.5,0.1,r);gl_FragColor=vec4(vc,a);}'}));
 world.add(nodePts);
}
var CITIES=[],CITYBY={},ISO2CITY={};
function setCities(list){CITIES=list;CITYBY={};ISO2CITY={};list.forEach(function(c){CITYBY[c.id]=c;if(c.iso&&(!ISO2CITY[c.iso]||c.f))ISO2CITY[c.iso]=c;});}
// 1 = capitals, 2 = 2nd/3rd cities, 3 = the rest
function cityTier(c){var r=c.round||1;return r<=1?1:r<=3?2:3;}
// ---------- city layer ----------
// Overview = static, cheap: cities merged into one point cloud; when zoomed out they are pre-aggregated
// into clusters (computed once at load). Labels come from a fixed pool with screen-space collision
// avoidance, re-laid-out only when the camera actually moves (Mapbox/Cesium-style label budget).
var CL=[],ORDER=[],CLU=[],FEAT=[],cityPts=null,curLvl=-2;
var CLUSTER_LEVELS=[{minD:R*2.45,cell:14,next:R*2.1},{minD:R*1.85,cell:7,next:R*1.6}];
function clusterLevel(d){for(var i=0;i<CLUSTER_LEVELS.length;i++)if(d>=CLUSTER_LEVELS[i].minD)return i;return -1;}
function cityPointMaterial(){return new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,uniforms:{uPx:{value:Math.min(2,window.devicePixelRatio||1)}},
 vertexShader:'attribute float sz;attribute vec3 color;varying vec3 vC;uniform float uPx;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=sz*uPx*clamp(300.0/-mv.z,0.8,2.6);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'varying vec3 vC;void main(){vec2 q=gl_PointCoord-0.5;float r=length(q);if(r>0.5)discard;float core=smoothstep(0.22,0.0,r);float ring=smoothstep(0.08,0.0,abs(r-0.38));gl_FragColor=vec4(vC*(core*1.2+ring*0.7),core+ring*0.6);}'});}
function pointsFrom(P,C,S){var g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(P,3));g.setAttribute('color',new T3.Float32BufferAttribute(C,3));g.setAttribute('sz',new T3.Float32BufferAttribute(S,1));return new T3.Points(g,cityPointMaterial());}
function buildCityMarks(){
 var ring=new T3.RingGeometry(R*0.012,R*0.016,40),dot=new T3.SphereGeometry(R*0.006,12,10);
 var P=[],C=[],S=[];
 CITIES.forEach(function(c){var p=ll2v(c.lat,c.lon,R*1.004);var tier=c.f?0:cityTier(c);
  var rec={c:c,p:p,n:p.clone().normalize(),tier:tier,ring:null,ph:Math.random()*3,pri:tier*1e7-(c.n||0)};
  if(c.f){var g=new T3.Group();g.position.copy(p);g.lookAt(p.clone().multiplyScalar(2));
   g.add(new T3.Mesh(dot,new T3.MeshBasicMaterial({color:0x58e0c8,transparent:true,depthWrite:false})));
   rec.ring=new T3.Mesh(ring,new T3.MeshBasicMaterial({color:0x58e0c8,transparent:true,opacity:.8,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false}));g.add(rec.ring);world.add(g);}
  else{P.push(p.x,p.y,p.z);var col=new T3.Color(tier===1?0xc8f4ff:tier===2?0x8fdcff:0x5fb4e6);C.push(col.r,col.g,col.b);S.push(tier===1?7:tier===2?5.5:4.2);}
  CL.push(rec);});
 cityMarks=CL;FEAT=CL.filter(function(r){return !!r.ring;});
 ORDER=CL.slice().sort(function(a,b){return a.pri-b.pri;});
 if(P.length){cityPts=pointsFrom(P,C,S);world.add(cityPts);}
 // pre-aggregate clusters for each zoom level (done once; zero per-frame cost)
 CLU=CLUSTER_LEVELS.map(function(L){var cells={};
  CL.forEach(function(r){if(r.c.f)return;var la=Math.floor((r.c.lat+90)/L.cell);var latC=-90+(la+.5)*L.cell;var lw=L.cell/Math.max(.25,Math.cos(latC*D2R));var lo=Math.floor((r.c.lon+180)/lw);var k=la+':'+lo;
   var cl=cells[k]||(cells[k]={sum:new T3.Vector3(),count:0,top:null});cl.sum.add(r.n);cl.count++;if(!cl.top||r.pri<cl.top.pri)cl.top=r;});
  var list=Object.keys(cells).map(function(k){var cl=cells[k];var n=cl.sum.clone().normalize();var p=n.clone().multiplyScalar(R*1.006);var ll=v2ll(n);return {p:p,n:n,lat:ll.lat,lon:ll.lon,count:cl.count,top:cl.top};});
  list.sort(function(a,b){return b.count-a.count;});
  var P2=[],C2=[],S2=[];list.forEach(function(cl){P2.push(cl.p.x,cl.p.y,cl.p.z);var t=Math.min(1,Math.log(cl.count)/Math.log(60));var col=new T3.Color(0x5fb4e6).lerp(new T3.Color(0xd8f6ff),t);C2.push(col.r,col.g,col.b);S2.push(5+7*t);});
  var pts=pointsFrom(P2,C2,S2);pts.visible=false;world.add(pts);
  return {list:list,pts:pts};});
}

// ---------- country index sampling ----------
function initCtryIndex(img){ctryCanvas=document.createElement('canvas');ctryW=img.width;ctryH=img.height;ctryCanvas.width=ctryW;ctryCanvas.height=ctryH;ctryCtx=ctryCanvas.getContext('2d',{willReadFrequently:true});ctryCtx.drawImage(img,0,0);}
function countryAt(lat,lon){if(!ctryCtx)return null;var x=Math.floor((lon+180)/360*ctryW)%ctryW;if(x<0)x+=ctryW;var y=Math.min(ctryH-1,Math.max(0,Math.floor((90-lat)/180*ctryH)));var px=ctryCtx.getImageData(x,y,1,1).data;var id=px[0];return id>0&&V.countries[id-1]?V.countries[id-1]:null;}

// ---------- labels: fixed pool + collision avoidance ----------
var labelsEl=document.getElementById('labels');
var POOL=[],ASSIGNED=[],layoutDirty=true,lastLayout=0,layoutCam=new T3.Vector3(1e9,0,0);
function buildLabels(){
 labelsEl.innerHTML='';POOL=[];ASSIGNED=[];ctryLabelEls=[];
 for(var i=0;i<90;i++){var d=document.createElement('div');d.className='lab';d.style.opacity=0;d._on=false;labelsEl.appendChild(d);POOL.push(d);}
 var cs=V.countries.map(function(c,i){return {c:c,i:i};}).filter(function(o){return (o.c[5]||9)<=3;});
 cs.forEach(function(o){var d=document.createElement('div');d.className='lab ctry';d.textContent=LZ()&&o.c[1]?o.c[1]:o.c[0];d._p=ll2v(o.c[4],o.c[3],R*1.01);d._n=d._p.clone().normalize();labelsEl.appendChild(d);ctryLabelEls.push(d);});
 layoutDirty=true;
}
labelsEl.addEventListener('click',function(e){var el=e.target.closest('.lab');if(!el||!el._item)return;e.stopPropagation();var it=el._item;
 if(it.kind==='city')enterCity(it.rec.c.id);else{flyToLL(it.cl.lat,it.cl.lon,CLUSTER_LEVELS[it.lvl].next);invalidate(1500);}});
// warm the street data while the pointer hovers a label: the click then opens instantly
labelsEl.addEventListener('pointerover',function(e){var el=e.target.closest('.lab');if(el&&el._item&&el._item.kind==='city')prefetchCity(el._item.rec.c);});
var tmpV=new T3.Vector3(),SCR={x:0,y:0};
function facingOK(p,n,thr){var c=camera.position;var dx=c.x-p.x,dy=c.y-p.y,dz=c.z-p.z;var l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;return (dx*n.x+dy*n.y+dz*n.z)/l>thr;}
function toScreen(p,w,h){tmpV.copy(p).project(camera);if(tmpV.z>=1||tmpV.x<-1.05||tmpV.x>1.05||tmpV.y<-1.05||tmpV.y>1.05)return false;SCR.x=(tmpV.x*.5+.5)*w;SCR.y=(-tmpV.y*.5+.5)*h;return true;}
function layoutLabels(){
 var w=canvas.clientWidth,h=canvas.clientHeight,d=camera.position.length(),glob=mode==='globe';
 var lvl=CINE?-1:clusterLevel(d);
 if(lvl!==curLvl){curLvl=lvl;if(cityPts)cityPts.visible=lvl<0;CLU.forEach(function(L,i){L.pts.visible=i===lvl;});}
 var maxTier=d<R*1.55?3:d<R*1.8?2:d<R*2.15?1:0;
 var budget=w<700?36:90,used=0,grid={},CELL=96;ASSIGNED=[];
 function free(x0,y0,x1,y1){var gx0=Math.floor(x0/CELL),gx1=Math.floor(x1/CELL),gy0=Math.floor(y0/CELL),gy1=Math.floor(y1/CELL);
  for(var gx=gx0;gx<=gx1;gx++)for(var gy=gy0;gy<=gy1;gy++){var b=grid[gx+','+gy];if(b)for(var k=0;k<b.length;k++){var r=b[k];if(x0<r[2]&&x1>r[0]&&y0<r[3]&&y1>r[1])return false;}}
  var rr=[x0,y0,x1,y1];for(gx=gx0;gx<=gx1;gx++)for(gy=gy0;gy<=gy1;gy++){var key=gx+','+gy;(grid[key]||(grid[key]=[])).push(rr);}return true;}
 function place(item,text,cls,wd,dy){if(used>=budget)return;
  var x=SCR.x,y=SCR.y+dy;if(!free(x-wd/2-3,y-9,x+wd/2+3,y+9))return;
  var el=POOL[used++];if(el._t!==text){el.textContent=text;el._t=text;}if(el._cls!==cls){el.className=cls;el._cls=cls;}
  if(item.kind==='city'){var mk=item.rec.c.f?'#58e0c8':'#9fe8ff';if(el._mk!==mk){el.style.setProperty('--mk',mk);el._mk=mk;}el.style.fontSize=item.rec.c.f?'':'10px';}
  el._item=item;el._dy=dy;el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';if(!el._on){el.style.opacity=1;el._on=true;}
  ASSIGNED.push(el);}
 if(glob){
  var zh=LZ();function textW(s){return s.length*((LZ()?11:6.4))+18;}
  // featured cities first, always
  for(var i=0;i<ORDER.length&&ORDER[i].tier===0;i++){var r=ORDER[i];if(facingOK(r.p,r.n,.15)&&toScreen(r.p,w,h)){var t=cityName(r.c);place({kind:'city',rec:r,p:r.p,n:r.n,thr:.15},t,'lab cty',textW(t),-12);}}
  if(lvl>=0){var L=CLU[lvl].list;for(var j=0;j<L.length&&used<budget;j++){var cl=L[j];if(!facingOK(cl.p,cl.n,.25)||!toScreen(cl.p,w,h))continue;
    if(cl.count===1){if(cl.top.tier<=1){var t1=cityName(cl.top.c);place({kind:'city',rec:cl.top,p:cl.top.p,n:cl.top.n,thr:.25},t1,'lab cty',textW(t1),-12);}}
    else if(cl.count>=3){var t2=String(cl.count);place({kind:'clu',cl:cl,lvl:lvl,p:cl.p,n:cl.n,thr:.25},t2,'lab clu',t2.length*7+18,0);}}}
  else{for(var m=0;m<ORDER.length&&used<budget;m++){var o=ORDER[m];if(o.tier===0||o.tier>maxTier)continue;if(!facingOK(o.p,o.n,.3)||!toScreen(o.p,w,h))continue;var t3=cityName(o.c);place({kind:'city',rec:o,p:o.p,n:o.n,thr:.3},t3,'lab cty',textW(t3),-12);}}
 }
 for(var q=used;q<POOL.length;q++){var e2=POOL[q];if(e2._on){e2.style.opacity=0;e2._on=false;e2._item=null;}}
 var showC=glob&&d<R*2.6;
 ctryLabelEls.forEach(function(el){var vis=showC&&facingOK(el._p,el._n,.25)&&toScreen(el._p,w,h)&&free(SCR.x-40,SCR.y-7,SCR.x+40,SCR.y+7);el.style.opacity=vis?.8:0;if(vis)el.style.transform='translate('+SCR.x+'px,'+SCR.y+'px) translate(-50%,-50%)';});
}
// between layouts, only the ≤90 assigned labels follow the camera
function followLabels(){var w=canvas.clientWidth,h=canvas.clientHeight;
 for(var i=0;i<ASSIGNED.length;i++){var el=ASSIGNED[i],it=el._item;if(!it)continue;
  if(facingOK(it.p,it.n,it.thr)&&toScreen(it.p,w,h)){el.style.transform='translate('+SCR.x+'px,'+(SCR.y+el._dy)+'px) translate(-50%,-50%)';if(!el._on){el.style.opacity=1;el._on=true;}}
  else if(el._on){el.style.opacity=0;el._on=false;}}}
function updateLabels(force){var now=performance.now();var moved=layoutCam.distanceToSquared(camera.position)>1e-8;
 if(force||layoutDirty||(moved&&now-lastLayout>90)){layoutLabels();lastLayout=now;layoutCam.copy(camera.position);layoutDirty=false;}
 else if(moved){followLabels();}}

// ====================================================================
// CAMERA / ORBIT
// ====================================================================
var mode='globe';
var orb={th:2.2,ph:1.15,d:R*3}, want={th:2.2,ph:1.15,d:R*3};
var look=new T3.Vector3(), wantLook=new T3.Vector3();
var autoRot=!reduced, night=false, autoPause=0;
function camFromOrb(){var sp=Math.sin(orb.ph);camera.position.set(orb.d*sp*Math.sin(orb.th),orb.d*Math.cos(orb.ph),orb.d*sp*Math.cos(orb.th)).add(look);}
function dirAngles(v){var n=v.clone().normalize();return {ph:Math.acos(Math.max(-1,Math.min(1,n.y))),th:Math.atan2(n.x,n.z)};}
function wrapDiff(a,b){var d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function flyToLL(lat,lon,dist){invalidate(1200);CINE=false;var a=dirAngles(ll2v(lat,lon));want.th=orb.th+wrapDiff(orb.th,a.th);want.ph=Math.max(.12,Math.min(Math.PI-.12,a.ph));want.d=dist;wantLook.set(0,0,0);}
function resetGlobe(){CINE=false;want.d=R*3;want.ph=1.15;wantLook.set(0,0,0);autoRot=document.getElementById('tRot').getAttribute('aria-pressed')==='true';}

// ====================================================================
// LEVEL 2 — STREET LAYER
// ====================================================================
var L2={active:false,group:null,buildings:null,picks:null,city:null,district:null,cam:{az:0.9,el:0.62,d:900,tz:0},camWant:{az:0.9,el:0.62,d:900}};
function clearStreet(){midClear();farClear();U.uFocus.value=-1;if(L2.group){streetScene.remove(L2.group);disposeTree(L2.group);} L2.group=null;L2.picks=null;L2.live=null;L2.ground=null;L2.target=new T3.Vector3();L2.traffic=null;}
function disposeTree(g){g.traverse(function(o){if(o.isInstancedMesh&&o.dispose){var gg=o.geometry;o.geometry=new T3.BufferGeometry();o.dispose();o.geometry=gg;}if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose();if(o.material){var m=o.material;(Array.isArray(m)?m:[m]).forEach(function(x){if(!x.userData.keep)x.dispose();});}});}
function polyArea(c,o){var n=(c.length-o)/2,a=0;for(var i=0;i<n;i++){var j=(i+1)%n;a+=c[o+2*i]*c[o+2*j+1]-c[o+2*j]*c[o+2*i+1];}return a/2;}
function pip(x,y,c,o){var n=(c.length-o)/2,ins=false,j=n-1;for(var i=0;i<n;i++){var xi=c[o+2*i],yi=c[o+2*i+1],xj=c[o+2*j],yj=c[o+2*j+1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi))ins=!ins;j=i;}return ins;}

function buildShapeFill(poly,o,y,mat){var sh=new T3.Shape();for(var i=o;i<poly.length;i+=2){if(i===o)sh.moveTo(poly[i],poly[i+1]);else sh.lineTo(poly[i],poly[i+1]);}var g=new T3.ShapeGeometry(sh);g.rotateX(Math.PI/2);g.translate(0,y,0);var m=new T3.Mesh(g,mat);m.receiveShadow=true;return m;}

// ---- buildings: one merged mesh, vertex-coloured by category, procedural windows + ground AO in shader ----
var WIN={value:0.65};
function makeBuildingMaterial(){
 var m=new T3.MeshStandardMaterial({vertexColors:true,metalness:.18,roughness:.58,flatShading:true});
 m.onBeforeCompile=function(sh){
  sh.uniforms.uWin=WIN;sh.uniforms.uSm=U.uSm;sh.uniforms.uSonA=U.uSonA;sh.uniforms.uSonB=U.uSonB;sh.uniforms.uSmX=U.uSmX;sh.uniforms.uDsm=U.uDsm;sh.uniforms.uFocus=U.uFocus;sh.uniforms.uTimeB=U.uTime;sh.uniforms.uLit=U.uLit;sh.uniforms.uSkyRef=U.uSkyRef;sh.uniforms.uDayB=U.uDay;sh.uniforms.uRealB=U.uReal;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWN;attribute float bcat;varying float vCat;varying vec3 vCy;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;vWN=normalize(mat3(modelMatrix)*objectNormal);vCat=bcat;vCy=cyber;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWN;uniform vec4 uSm;uniform float uWin;uniform float uDsm;uniform float uLit;uniform vec3 uSkyRef;uniform float uDayB;uniform float uRealB;uniform float uFocus;uniform float uTimeB;uniform vec4 uSonA;uniform vec4 uSonB;uniform vec4 uSmX;varying float vCat;varying vec3 vCy;\nvec3 clrRamp(float dz){vec3 r=vec3(1.0,0.16,0.22),o=vec3(1.0,0.52,0.12),y=vec3(1.0,0.86,0.2),g=vec3(0.22,1.0,0.58);return dz<0.0?r:dz<30.0?mix(o,y,dz/30.0):dz<60.0?mix(y,g,(dz-30.0)/30.0):g;}\nvec3 sonRamp(float t){t=clamp(t,0.0,1.0);vec3 a=vec3(0.12,0.14,0.55),b=vec3(0.10,0.82,1.0),c=vec3(0.92,0.32,0.95),d=vec3(1.0,0.80,0.32);return t<0.34?mix(a,b,t/0.34):t<0.67?mix(b,c,(t-0.34)/0.33):mix(c,d,(t-0.67)/0.33);}')
   .replace('#include <color_fragment>',[
    '#include <color_fragment>',
    'if(uSm.w>0.5&&distance(vWPos.xz,uSm.xy)>uSm.z)discard;',
    'float wall=1.0-step(0.5,abs(vWN.y));',
    'float fl=fract(vWPos.y/3.6);float band=step(0.32,fl)*step(fl,0.80);',
    'float along=abs(vWN.x)>abs(vWN.z)?vWPos.z:vWPos.x;float cx=fract(along*0.34);float colm=step(0.16,cx)*step(cx,0.84);',
    'float glass=wall*band*colm*step(4.0,vWPos.y);',
    'diffuseColor.rgb*=mix(0.52,1.0,clamp(vWPos.y/28.0,0.0,1.0));',  // ground AO
    'diffuseColor.rgb*=1.0-glass*0.22;',
    'diffuseColor.rgb=mix(diffuseColor.rgb,uSkyRef*0.9,glass*0.42*uDayB*uRealB);',
    'if(uDsm>0.5){float hh=clamp(vWPos.y/150.0,0.0,1.0);vec3 c1=mix(vec3(0.08,0.25,0.75),vec3(0.1,0.85,0.75),smoothstep(0.0,0.27,hh));vec3 c2=mix(vec3(1.0,0.86,0.15),vec3(1.0,0.2,0.15),smoothstep(0.53,1.0,hh));diffuseColor.rgb=mix(c1,c2,smoothstep(0.2,0.55,hh));}'
   ].join('\n'))
   .replace('#include <emissivemap_fragment>',[
    '#include <emissivemap_fragment>',
    'float cid=floor(along*0.34)+floor(vWPos.y/3.6)*17.0;float rnd=fract(sin(cid*12.9898+floor(vWPos.x*0.01)*78.233)*43758.5453);',
    'float warm=step(0.3,fract(rnd*7.13));totalEmissiveRadiance+=glass*step(uLit,rnd)*uWin*mix(vec3(0.78,0.86,1.0),vec3(1.0,0.80,0.52),warm)*0.62*(1.0-uDsm);',
    'totalEmissiveRadiance+=diffuseColor.rgb*0.45*uDsm;',
    'if(uFocus>-0.5){float fon=1.0-step(0.5,abs(vCat-uFocus));diffuseColor.rgb=mix(diffuseColor.rgb*0.30+vec3(0.02),mix(diffuseColor.rgb,vCy,0.7),fon);totalEmissiveRadiance=mix(totalEmissiveRadiance*0.35,totalEmissiveRadiance+vCy*(0.30+0.10*sin(uTimeB*3.0)),fon);}',
    'if(uSonB.w>0.5){float dd=distance(vWPos.xz,uSonA.xy);float coreR=uSonA.z,pulse=uSonA.w,outer=uSonB.x,mo=uSonB.y,gf=uSonB.z;float vin=1.0-smoothstep(coreR*0.92,coreR*1.08,dd);float wv=pulse-dd;float rev=(wv<0.0||dd>outer*1.03)?0.0:smoothstep(0.0,outer*0.12+40.0,wv)*mix(0.18,1.0,exp(-wv/(outer*0.55)))*(1.0-smoothstep(outer*0.95,outer*1.03,dd));rev*=gf;float vis=max(vin,rev);float tt=mo<0.5?clamp(log(1.0+vWPos.y)/log(160.0),0.0,1.0):(mo<2.5?clamp(1.0-dd/(outer*1.6),0.0,1.0):0.6);vec3 col=mo>3.5?clrRamp(uSmX.x-vWPos.y):mo>2.5?vCy:mo>0.5&&mo<1.5?vec3(0.36,0.46,0.62):sonRamp(tt);diffuseColor.rgb=mix(diffuseColor.rgb*0.05,mix(diffuseColor.rgb,col,0.8),vis);totalEmissiveRadiance=mix(totalEmissiveRadiance*0.08,totalEmissiveRadiance+col*(0.3+0.3*vin),vis);if(uSmX.z>0.5&&vis>0.01){float wl=1.0-step(0.5,abs(vWN.y));float f2=fract(vWPos.y/3.6);float fline=wl*(1.0-smoothstep(0.0,0.07,min(f2,1.0-f2)))*step(2.0,vWPos.y);float fr=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.5);float sw=exp(-pow((fract(vWPos.y*0.012-uTimeB*0.22)-0.5)*16.0,2.0));totalEmissiveRadiance+=(col*(0.55*fline+0.65*fr)+vec3(0.55,0.9,1.0)*0.32*sw*wl)*vis;}float plf=exp(-pow((dd-pulse)/(18.0+outer*0.03),2.0))*step(coreR,dd)*step(dd,outer*1.03)*gf;totalEmissiveRadiance+=(col*0.6+vec3(0.5,0.9,1.0)*0.4)*plf;}'
   ].join('\n'));
 };
 return cyberMix(m);
}
var tick=function(){return new Promise(function(r){var ch=new MessageChannel();ch.port1.onmessage=function(){r();};ch.port2.postMessage(0);});};
// yield until after the next painted frame (falls back to a timer when the tab is hidden)
var frameTick=function(){return new Promise(function(r){var done=0;function f(){if(done)return;done=1;setTimeout(r,0);}try{requestAnimationFrame(f);}catch(e){}setTimeout(f,120);});};
function buildBudget(){return performance.now()-MV.still<400?5:9;}
function buildBuildings(builds,onProgress,smooth){
 var P=[],Nr=[],C=[],CY=[],BC=[],RL=[];var b=0;var rc=new T3.Color(),rtop=new T3.Color();
 return (function slice(){var t0=performance.now();
 for(var BUD=smooth?buildBudget():8;b<builds.length&&performance.now()-t0<BUD;b++){var x=builds[b];var cat=x[x.length-1];var h=Math.max(3,x[0]),mh=x[1]||0;if(mh>=h)mh=0;
  var pts=[];for(var i=2;i<x.length-1;i+=2)pts.push(new T3.Vector2(x[i],x[i+1]));
  if(pts.length>2&&pts[0].equals(pts[pts.length-1]))pts.pop();
  if(pts.length<3)continue;
  var tri;try{tri=T3.ShapeUtils.triangulateShape(pts,[]);}catch(e){continue;}
  var txb=txOf(x),base=new T3.Color(TAX[txb.m]?TAX[txb.m].col:'#8899aa'),mj=txb.m;
  var top=base.clone().lerp(new T3.Color(0xffffff),.18), wallC=base.clone();
  var yT=mh+h;realBuildingColor(cat,h,pts[0].x,pts[0].y,rc);rtop.copy(rc).lerp(TMPC.setHex(h>=45?0x5d6670:0x77797c),.55);
  for(var t=0;t<tri.length;t++){var a=pts[tri[t][0]],c2=pts[tri[t][1]],d2=pts[tri[t][2]];
   P.push(a.x,yT,a.y, d2.x,yT,d2.y, c2.x,yT,c2.y);for(var q0=0;q0<3;q0++){Nr.push(0,1,0);C.push(rtop.r,rtop.g,rtop.b);CY.push(top.r,top.g,top.b);BC.push(mj);}}
  var np=pts.length;var ccw=T3.ShapeUtils.area(pts)>0;
  for(var k=0;k<np;k++){var p0=pts[k],p1=pts[(k+1)%np];
   var nx=p1.y-p0.y,nz=-(p1.x-p0.x);if(!ccw){nx=-nx;nz=-nz;}var nl=Math.hypot(nx,nz)||1;nx/=nl;nz/=nl;
   // outward wall; winding chosen so front face points outward
   if(ccw){P.push(p0.x,mh,p0.y, p1.x,mh,p1.y, p1.x,yT,p1.y,  p0.x,mh,p0.y, p1.x,yT,p1.y, p0.x,yT,p0.y);}
   else   {P.push(p0.x,mh,p0.y, p1.x,yT,p1.y, p1.x,mh,p1.y,  p0.x,mh,p0.y, p0.x,yT,p0.y, p1.x,yT,p1.y);}
   for(var q=0;q<6;q++){Nr.push(nx,0,nz);C.push(rc.r,rc.g,rc.b);CY.push(wallC.r,wallC.g,wallC.b);BC.push(mj);}
   RL.push(p0.x,yT+0.25,p0.y,p1.x,yT+0.25,p1.y);}
 }
 if(b<builds.length){if(onProgress)onProgress(b/builds.length);return (smooth?frameTick():tick()).then(slice);}
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(P),3));g.setAttribute('normal',new T3.BufferAttribute(new Float32Array(Nr),3));g.setAttribute('color',new T3.BufferAttribute(new Float32Array(C),3));g.setAttribute('cyber',new T3.BufferAttribute(new Float32Array(CY),3));g.setAttribute('bcat',new T3.BufferAttribute(new Float32Array(BC),1));
 var mesh=new T3.Mesh(g,makeBuildingMaterial());mesh.userData.bld=1;mesh.castShadow=true;mesh.receiveShadow=true;mesh.material.side=T3.DoubleSide;
 var rg=new T3.BufferGeometry();rg.setAttribute('position',new T3.BufferAttribute(new Float32Array(RL),3));
 var roof=new T3.LineSegments(rg,envMats().roof);roof.userData.roof=1;
 return Promise.resolve({mesh:mesh,roof:roof});})();
}

// ---- roads: width-by-class ribbons + glow on majors + flowing data particles ----
var RW={0:22,1:18,2:15,3:12,4:10,5:7,6:4.5,7:3,8:2,9:3.2,10:2.6,11:2};
var RCOL={0:0x2f5f9e,1:0x2f5f9e,2:0x2b5590,3:0x274c80,4:0x23436f,5:0x1d3759,6:0x182d48,7:0x162a42,8:0x14263b,9:0x4a2f3a,10:0x223b5c,11:0x1a3050};
var ROADC=null;function roadCols(){if(ROADC)return ROADC;var o={c:{},r:{},w:RW},k,c=new T3.Color();for(k=0;k<12;k++){c.set(RCOL[k]!=null?RCOL[k]:0x1d3759);o.c[k]=[c.r,c.g,c.b];c.set(ROADREAL[k]!=null?ROADREAL[k]:0x5f6266);o.r[k]=[c.r,c.g,c.b];}c.set(0x1d3759);o.dc=[c.r,c.g,c.b];c.set(0x5f6266);o.dr=[c.r,c.g,c.b];ROADC=o;return o;}
// lanes of one road: real OSM lane count when known (code = total | fwd<<4 | bwd<<8), class default otherwise.
// two-way: n lanes per direction, each wc/n wide; one-way: n lanes across the full 2·wc. Width grows to fit ≥3.2 m lanes.
function rdLane(cl,oc,code,RWt){var tot=code&15,fw=(code>>4)&15,bw=(code>>8)&15,two=!oc,n;
 if(tot||fw||bw)n=two?Math.max(1,(fw||bw)?Math.max(fw,bw):Math.ceil(tot/2)):Math.max(1,tot||Math.max(fw,bw));else n=cl<=1?3:cl<=3?2:1;
 n=Math.min(two?4:6,n);var w=Math.max(RWt[cl]||5,(two?2*n:n)*3.2);return {n:n,two:two,wc:w/2};}
function roadArrays(rd,RC,ly,ow,dbg,ln){var P=[],C=[],CY=[],G=[],paths=[],BR=[],MA=[],MB=[],bz=bridgeProfile(rd,ly);
 var LNI=rd.map(function(r,i){return rdLane(r[0],ow?ow[i]:0,ln?ln[i]||0:0,RC.w);}),WD=rd.map(function(r,i){var v=r[0]<=6||r[0]===10;return v?LNI[i].wc*2:(RC.w[r[0]]||5);});
 function q4(a,b,c,d){BR.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],a[0],a[1],a[2],c[0],c[1],c[2],d[0],d[1],d[2]);}
 function pier(x,z,dx,dz,w,top){var hx=dx*.8,hz=dz*.8,px=-dz*w,pz=dx*w,y0=0,c=[[x-hx-px,z-hz-pz],[x+hx-px,z+hz-pz],[x+hx+px,z+hz+pz],[x-hx+px,z-hz+pz]];
  for(var i=0;i<4;i++){var a=c[i],b=c[(i+1)%4];q4([a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],top,b[1]],[a[0],top,a[1]]);}}
 // junction stations along every vehicle road: wherever another road reaches this road's carriageway (T or X), or the two
 // centrelines cross. Tile geometry rarely keeps the shared OSM node, so this is geometric, not topological.
 var PTS=rd.map(function(r){var a=[];for(var i=2;i<r.length;i+=2)a.push([r[i],r[i+1]]);return a;}),SG={},ST=rd.map(function(){return [];}),JS=rd.map(function(){return null;});
 function vehOK(r){return r[1]===0&&(r[0]<=6||r[0]===10);}
 rd.forEach(function(r,ri){if(!vehOK(r))return;var P=PTS[ri];for(var k=0;k+1<P.length;k++){var x0=Math.min(P[k][0],P[k+1][0])-14,x1=Math.max(P[k][0],P[k+1][0])+14,z0=Math.min(P[k][1],P[k+1][1])-14,z1=Math.max(P[k][1],P[k+1][1])+14;
   for(var a=Math.floor(x0/20);a<=Math.floor(x1/20);a++)for(var b=Math.floor(z0/20);b<=Math.floor(z1/20);b++)(SG[a+','+b]||(SG[a+','+b]=[])).push([ri,k]);}});
 rd.forEach(function(r,rb){if(!vehOK(r))return;var P=PTS[rb],cb=r[0];
  for(var j=0;j<P.length;j++){var v=P[j],q=P[j+1]||P[j-1],hx=q[0]-v[0],hz=q[1]-v[1],hl=Math.hypot(hx,hz)||1;hx/=hl;hz/=hl;var cell=SG[Math.floor(v[0]/20)+','+Math.floor(v[1]/20)];if(!cell)continue;var done={};
   for(var i=0;i<cell.length;i++){var o=cell[i],ra=o[0];if(ra===rb||done[ra])continue;var A=PTS[ra],a0=A[o[1]],a1=A[o[1]+1],dx=a1[0]-a0[0],dz=a1[1]-a0[1],l2=dx*dx+dz*dz;if(l2<.25)continue;
    var t=Math.max(0,Math.min(1,((v[0]-a0[0])*dx+(v[1]-a0[1])*dz)/l2)),px=a0[0]+dx*t,pz=a0[1]+dz*t,d=Math.hypot(px-v[0],pz-v[1]),ca=rd[ra][0],wa=WD[ra]/2;if(d>wa+4)continue;
    var l=Math.sqrt(l2),dot=Math.abs((dx*hx+dz*hz)/l);if(dot>.85)continue;done[ra]=1;
    ST[ra].push([o[1],t,px,pz,cb,WD[rb]/2]);ST[rb].push([j>0&&j===P.length-1?j-1:j,j>0&&j===P.length-1?1:0,v[0],v[1],ca,Math.max(.5,wa-d)]);}}
  for(var k=0;k+1<P.length;k++){var A1=P[k],B1=P[k+1],cs={};for(var ca2=Math.floor(Math.min(A1[0],B1[0])/20);ca2<=Math.floor(Math.max(A1[0],B1[0])/20);ca2++)for(var cb2=Math.floor(Math.min(A1[1],B1[1])/20);cb2<=Math.floor(Math.max(A1[1],B1[1])/20);cb2++){var cc=SG[ca2+','+cb2];if(cc)cc.forEach(function(e){if(e[0]>rb)cs[e[0]*65536+e[1]]=e;});}
   for(var key in cs){var o2=cs[key],Q2=PTS[o2[0]],A2=Q2[o2[1]],B2=Q2[o2[1]+1],rx=B1[0]-A1[0],rz=B1[1]-A1[1],sx=B2[0]-A2[0],sz=B2[1]-A2[1],den=rx*sz-rz*sx;if(Math.abs(den)<1e-6)continue;
    var t1=((A2[0]-A1[0])*sz-(A2[1]-A1[1])*sx)/den,t2=((A2[0]-A1[0])*rz-(A2[1]-A1[1])*rx)/den;if(t1<0||t1>1||t2<0||t2>1)continue;var ix=A1[0]+rx*t1,iz=A1[1]+rz*t1;
    ST[rb].push([k,t1,ix,iz,rd[o2[0]][0],WD[o2[0]]/2]);ST[o2[0]].push([o2[1],t2,ix,iz,cb,WD[rb]/2]);}}});
 // cluster stations along each road (within 7 m) and insert a vertex at each cluster
 var JV=rd.map(function(r,ri){var P=PTS[ri];if(!ST[ri].length)return null;var cum=[0];for(var i=1;i<P.length;i++)cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
  var sts=ST[ri].map(function(q){return {s:cum[q[0]]+q[1]*(cum[q[0]+1]-cum[q[0]]||0),c:q[4],h:q[5]};}).sort(function(a,b){return a.s-b.s;}),cl=[];
  sts.forEach(function(q){var L=cl[cl.length-1];if(L&&q.s-L.s1<7){L.s1=q.s;L.n++;L.sum+=q.s;L.mc=Math.min(L.mc,q.c);L.mh=Math.max(L.mh,q.h);}else cl.push({s0:q.s,s1:q.s,n:1,sum:q.s,mc:q.c,mh:q.h});});
  var own=r[0],NP=[],NJ=[],ci=0;function at(s){for(var k=0;k+1<P.length;k++){if(s<=cum[k+1]||k===P.length-2){var t=(s-cum[k])/((cum[k+1]-cum[k])||1);t=Math.max(0,Math.min(1,t));return [k,[P[k][0]+(P[k+1][0]-P[k][0])*t,P[k][1]+(P[k+1][1]-P[k][1])*t]];}}return [0,P[0]];}
  var ins=cl.map(function(c){var s=c.sum/c.n;return {s:s,j:{r:c.mh+Math.min(4,(c.s1-c.s0)/2),f:!(own>=1&&own<=5&&c.mc>=1&&c.mc<=5)?0:(own<=4&&c.mc<=4)?2:own<=4?3:1,mc:c.mc}};});
  JS[ri]=ins.map(function(q){var A=at(q.s);return [Math.round(q.s*10)/10,Math.round(A[1][0]*10)/10,Math.round(A[1][1]*10)/10,Math.round(q.j.r*10)/10,q.j.f,q.j.mc];});
  for(var k=0;k<P.length;k++){while(ci<ins.length&&ins[ci].s<cum[k]-.8){var A=at(ins[ci].s);NP.push(A[1]);NJ.push(ins[ci].j);ci++;}
   if(ci<ins.length&&Math.abs(ins[ci].s-cum[k])<=.8){NP.push(P[k]);NJ.push(ins[ci].j);ci++;}else{NP.push(P[k]);NJ.push(null);}}
  while(ci<ins.length){NP.push(P[P.length-1]);NJ[NJ.length-1]=ins[ci].j;ci++;}
  PTS[ri]=NP;return NJ;});
 rd.forEach(function(r,ri){var cl=r[0];if(r[1]===2)return;var w=WD[ri]/2,col=RC.c[cl]||RC.dc,rcol=RC.r[cl]||RC.dr,y=0.8+(cl<=4?0.18:0),B=bz[ri];
  var veh=cl<=6||cl===10,sw=(veh&&cl>=2&&cl<=5&&r[1]!==1)?3:0,wo=w+sw,oc=ow?(ow[ri]===1?1:ow[ri]===-1?2:0):0,lanes=LNI[ri].n;
  var info=lanes+8*oc+32*(sw?1:0)+64*(cl<=4?1:0);
  var pts=PTS[ri],i;
  var cum=[0];for(i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));var Lt=cum[cum.length-1];
  var hs=pts.map(function(_,i){return B?brH(cum[i],Lt,B):0;}),nextPier=14;
  var J=(veh&&!B&&JV[ri])?JV[ri]:pts.map(function(){return null;}),prev=[],next=[],lp=-1,ln=-1;
  for(i=0;i<pts.length;i++){if(J[i]){lp=i;if(dbg)dbg.push([ri,cl,i,pts[i][0],pts[i][1],J[i].r,J[i].f]);}prev.push(lp);}for(i=pts.length-1;i>=0;i--){if(J[i])ln=i;next[i]=ln;}
  for(var k=0;k<pts.length-1;k++){var a=pts[k],b=pts[k+1];var dx=b[0]-a[0],dz=b[1]-a[1];var L=Math.hypot(dx,dz);if(L<0.01)continue;var ux=-dz/L,uz=dx/L,nx=ux*w,nz=uz*w,ya=y+hs[k],yb=y+hs[k+1];
   function quad(u0,u1,yo,cr){var ax0=a[0]+ux*u0,az0=a[1]+uz*u0,ax1=a[0]+ux*u1,az1=a[1]+uz*u1,bx0=b[0]+ux*u0,bz0=b[1]+uz*u0,bx1=b[0]+ux*u1,bz1=b[1]+uz*u1;
    P.push(ax1,ya+yo,az1, ax0,ya+yo,az0, bx0,yb+yo,bz0,  ax1,ya+yo,az1, bx0,yb+yo,bz0, bx1,yb+yo,bz1);for(var q=0;q<6;q++){C.push(cr[0],cr[1],cr[2]);CY.push(col[0],col[1],col[2]);}return [u1,u0];}
   var strips=[quad(-w,w,0,rcol)];if(sw){strips.push(quad(w,wo,-0.05,rcol));strips.push(quad(-wo,-w,-0.05,rcol));}
   // marking frame: u across (+ = right of the digitised direction), dA/dB = distance to the junction behind / ahead
   var pj=prev[k],nj=next[k+1],jA=pj>=0?J[pj]:null,jB=nj>=0?J[nj]:null,dAa=pj>=0?cum[k]-cum[pj]:cum[k]+999,dAb=pj>=0?cum[k+1]-cum[pj]:cum[k+1]+999,dBa=nj>=0?cum[nj]-cum[k]:(Lt-cum[k])+999,dBb=nj>=0?cum[nj]-cum[k+1]:(Lt-cum[k+1])+999;
   var rA=jA?jA.r:0,rB=jB?jB.r:0,fl=(jA?jA.f:0)+4*(jB?jB.f:0),wm=veh&&cl<=5&&!(Lt<24&&J[0]&&J[J.length-1])?w:0;
   strips.forEach(function(U){[[U[0],dAa,dBa],[U[1],dAa,dBa],[U[1],dAb,dBb],[U[0],dAa,dBa],[U[1],dAb,dBb],[U[0],dAb,dBb]].forEach(function(v){MA.push(v[0],v[1],v[2],wm);MB.push(rA,rB,fl,info);});});
   if(cl<=3){G.push(a[0],ya+0.2,a[1],b[0],yb+0.2,b[1]);}
   if(B&&(hs[k]>.6||hs[k+1]>.6)){var ex=ux*(w+.3),ez=uz*(w+.3);
    [1,-1].forEach(function(sd){var A0=[a[0]+ex*sd,ya-1.25,a[1]+ez*sd],B0=[b[0]+ex*sd,yb-1.25,b[1]+ez*sd],A1=[a[0]+ex*sd,ya+.95,a[1]+ez*sd],B1=[b[0]+ex*sd,yb+.95,b[1]+ez*sd];q4(A0,B0,B1,A1);});// fascia + parapet
    q4([a[0]+ex,ya-1.25,a[1]+ez],[b[0]+ex,yb-1.25,b[1]+ez],[b[0]-ex,yb-1.25,b[1]-ez],[a[0]-ex,ya-1.25,a[1]-ez]);// soffit
    for(var s=nextPier;s<cum[k+1];s+=30){var t=(s-cum[k])/L,hh=hs[k]+(hs[k+1]-hs[k])*t;if(hh>3.2)pier(a[0]+dx*t,a[1]+dz*t,dx/L,dz/L,Math.max(1.2,w*.55),y+hh-1.25);nextPier=s+30;}}}
  if(cl<=5&&pts.length>1)paths.push({pts:pts,cl:cl,hs:B?hs:null});});
 return {P:new Float32Array(P),C:new Float32Array(C),CY:new Float32Array(CY),G:new Float32Array(G),BR:new Float32Array(BR),MA:new Float32Array(MA),MB:new Float32Array(MB),bz:bz,js:JS,paths:paths};}
function buildRoads(rd,ra,ly,ow){ra=ra||roadArrays(rd,roadCols(),ly,ow);var P=ra.P,C=ra.C,CY=ra.CY,G=ra.G,paths=ra.paths;
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(P,3));g.setAttribute('color',new T3.BufferAttribute(C,3));
 g.setAttribute('cyber',new T3.BufferAttribute(CY,3));if(ra.MA&&ra.MA.length){g.setAttribute('aMA',new T3.BufferAttribute(ra.MA,4));g.setAttribute('aMB',new T3.BufferAttribute(ra.MB,4));}var NN=new Float32Array(P.length);for(var ni=1;ni<NN.length;ni+=3)NN[ni]=1;g.setAttribute('normal',new T3.BufferAttribute(NN,3));var mesh=new T3.Mesh(g,envMats().road);mesh.receiveShadow=true;
 var gg=new T3.BufferGeometry();gg.setAttribute('position',new T3.BufferAttribute(G,3));
 var glow=new T3.LineSegments(gg,envMats().glow);
 mesh.userData.road=1;glow.userData.road=1;var br=null;
 if(ra.BR&&ra.BR.length){var bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.BufferAttribute(ra.BR,3));bg.computeVertexNormals();
  if(!MAT.bridge)MAT.bridge=new T3.MeshStandardMaterial({color:0xa3a7ab,roughness:.86,metalness:.05,side:T3.DoubleSide});br=new T3.Mesh(bg,MAT.bridge);br.castShadow=true;br.receiveShadow=true;br.userData.road=1;
}
 return {mesh:mesh,glow:glow,paths:paths,bz:ra.bz,js:ra.js,br:br};
}
function buildTraffic(paths,cap){
 // measure each path once
 var segs=[];paths.forEach(function(p){var acc=[0],tot=0;for(var i=1;i<p.pts.length;i++){tot+=Math.hypot(p.pts[i][0]-p.pts[i-1][0],p.pts[i][1]-p.pts[i-1][1]);acc.push(tot);}if(tot>40)segs.push({pts:p.pts,acc:acc,len:tot,cl:p.cl});});
 if(!segs.length)return null;
 var n=Math.min(cap||900,Math.max(Math.min(120,cap||120),segs.length*2));var pos=new Float32Array(n*3),col=new Float32Array(n*3);var cars=[];
 var weights=segs.map(function(s){return s.len*(s.cl<=2?3:s.cl<=4?2:1);});var wsum=weights.reduce(function(a,b){return a+b;},0);
 for(var i=0;i<n;i++){var r=Math.random()*wsum,j=0;while(r>weights[j]&&j<segs.length-1){r-=weights[j];j++;}var s=segs[j];
  var warm=Math.random()<.5;cars.push({s:s,u:Math.random()*s.len,v:(s.cl<=2?16:s.cl<=4?11:7)*(.7+Math.random()*.6)*(warm?1:-1)});
  var c=warm?new T3.Color(0xffd08a):new T3.Color(0x8fd8ff);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(pos,3));g.setAttribute('color',new T3.BufferAttribute(col,3));
 var pts=new T3.Points(g,envMats().traffic);
 return {pts:pts,cars:cars};
}
function stepTraffic(tr,dt){if(!tr)return;var pos=tr.pts.geometry.attributes.position.array;
 for(var i=0;i<tr.cars.length;i++){var c=tr.cars[i],s=c.s;c.u+=c.v*dt;if(c.u>s.len)c.u-=s.len;if(c.u<0)c.u+=s.len;
  var a=s.acc,k=1;while(k<a.length-1&&a[k]<c.u)k++;var t=(c.u-a[k-1])/((a[k]-a[k-1])||1);var p0=s.pts[k-1],p1=s.pts[k];
  pos[i*3]=p0[0]+(p1[0]-p0[0])*t;pos[i*3+1]=2.2;pos[i*3+2]=p0[1]+(p1[1]-p0[1])*t;}
 tr.pts.geometry.attributes.position.needsUpdate=true;}

// ---- hover / selection highlight of a single building ----
function buildingShell(x,color,op){var h=Math.max(3,x[0]),mh=x[1]||0;var pts=[];for(var i=2;i<x.length-1;i+=2)pts.push(new T3.Vector2(x[i],x[i+1]));if(pts.length>2&&pts[0].equals(pts[pts.length-1]))pts.pop();
 var shp=new T3.Shape(pts);var geo=new T3.ExtrudeGeometry(shp,{depth:h-mh+0.6,bevelEnabled:false});geo.rotateX(Math.PI/2);geo.scale(1,-1,1);geo.translate(0,mh-0.3,0);
 var grp=new T3.Group();
 grp.add(new T3.Mesh(geo,new T3.MeshBasicMaterial({color:color,transparent:true,opacity:op,depthWrite:false,side:T3.DoubleSide,blending:T3.AdditiveBlending})));
 grp.add(new T3.LineSegments(new T3.EdgesGeometry(geo,20),new T3.LineBasicMaterial({color:color,transparent:true,opacity:.95})));
 return grp;}
var hoverObj=null,selObj=null,hoverB=null;
function setHover(x){if(hoverB===x)return;hoverB=x;if(hoverObj){L2.group.remove(hoverObj);disposeTree(hoverObj);hoverObj=null;}if(x&&L2.group){hoverObj=buildingShell(x,0x9fe8ff,.10);L2.group.add(hoverObj);}}
function setSelected(x){lzrSet(x);if(selObj){L2.group.remove(selObj);disposeTree(selObj);selObj=null;}if(x&&L2.group){selObj=buildingShell(x,0xb06bff,.22);L2.group.add(selObj);}}

function buildStreet(data,onProgress){
 var g=new T3.Group();var half=data.half;
 // ground with radial falloff
 var ground=new T3.Mesh(new T3.CircleGeometry(Math.max(half*2.4,6000),96),envMats().ground);ground.rotation.x=-Math.PI/2;ground.position.y=-0.3;ground.receiveShadow=true;g.add(ground);
 var gl=[];for(var gx=-half;gx<=half;gx+=50){var major=(gx%250===0);(major?gl:gl).push(gx,0.05,-half,gx,0.05,half,-half,0.05,gx,half,0.05,gx);}
 var gg=new T3.BufferGeometry();gg.setAttribute('position',new T3.BufferAttribute(new Float32Array(gl),3));g.add(new T3.LineSegments(gg,MAT.grid));
 var frame=new T3.LineSegments(new T3.EdgesGeometry(new T3.PlaneGeometry(half*2,half*2).rotateX(-Math.PI/2)),MAT.frame);frame.position.y=0.1;g.add(frame);
 (data.w||[]).forEach(function(w){g.add(buildShapeFill(w,0,0.5,MAT.water));});
 (data.pk||[]).forEach(function(p){g.add(buildShapeFill(p,1,p[0]===1?0.32:0.2,p[0]===1?MAT.park:MAT.wood));});
 var roads=buildRoads(data.rd||[]);g.add(roads.mesh);g.add(roads.glow);if(roads.br)g.add(roads.br);
 return buildBuildings(data.b||[],onProgress).then(function(bld){g.add(bld.mesh);g.add(bld.roof);
 L2.traffic=buildTraffic(roads.paths);if(L2.traffic)g.add(L2.traffic.pts);
 L2.deco=decorate(g,data,9000);
 L2.district=buildDistrict(g,half);
 streetScene.add(g);L2.group=g;L2.picks=data.b;L2.half=half;hoverB=null;hoverObj=null;selObj=null;
 renderer.shadowMap.needsUpdate=true;
 // compile shaders off the critical path (KHR_parallel_shader_compile when available)
 return (renderer.compileAsync?renderer.compileAsync(streetScene,camera):Promise.resolve()).catch(function(){});});
}

function buildDistrict(g,half){
 var ox=0, oz=-(half+260); // north of the city core
 var pad=new T3.Mesh(new T3.CircleGeometry(230,56),new T3.MeshBasicMaterial({color:0x0a1326,transparent:true,opacity:.9}));pad.rotation.x=-Math.PI/2;pad.position.set(ox,0.1,oz);g.add(pad);
 var rim=new T3.Mesh(new T3.RingGeometry(228,232,80),new T3.MeshBasicMaterial({color:0x58e0c8,transparent:true,opacity:.5,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false}));rim.rotation.x=-Math.PI/2;rim.position.set(ox,0.15,oz);g.add(rim);
 var blds=D.DISTRICT.blds,picks=[];
 var n=blds.length;
 blds.forEach(function(bd,i){var ang=(i/n)*Math.PI*2 - Math.PI/2;var bx=ox+Math.cos(ang)*120, bz=oz+Math.sin(ang)*120;
  var w=46,dep=46,h=bd.h;
  var geo=new T3.BoxGeometry(w,h,dep);geo.translate(bx,h/2,bz);
  var col=new T3.Color(bd.col);
  var mesh=new T3.Mesh(geo,new T3.MeshStandardMaterial({color:col,emissive:col.clone().multiplyScalar(.18),metalness:.3,roughness:.4,transparent:true,opacity:.92}));
  mesh.userData.district=i;g.add(mesh);
  var eg=new T3.LineSegments(new T3.EdgesGeometry(geo),new T3.LineBasicMaterial({color:col.clone().lerp(new T3.Color(0xffffff),.5),transparent:true,opacity:.8}));g.add(eg);
  picks.push({i:i,x:bx,z:bz,w:w,d:dep,h:h});
 });
 return {ox:ox,oz:oz,picks:picks};
}

var fade=document.getElementById('fade'),fadeT=document.getElementById('fadeT');
// street data cache: keeps only the 3 most recently used bundles in memory (LRU)
var BUNDLES={},BUNDLE_LRU=[],BUNDLE_MAX=3;
function getBundle(name){
 var i=BUNDLE_LRU.indexOf(name);if(i>=0)BUNDLE_LRU.splice(i,1);BUNDLE_LRU.push(name);
 while(BUNDLE_LRU.length>BUNDLE_MAX){delete BUNDLES[BUNDLE_LRU.shift()];}
 if(!BUNDLES[name])BUNDLES[name]=loadJSON('data/bundles/'+name+'.json').catch(function(e){delete BUNDLES[name];throw e;});
 return BUNDLES[name];}
function zflipRing(a,o,e){var n=e-o,t=a.slice(o,e);for(var i=0;i<n;i+=2){a[o+i]=t[n-2-i];a[o+i+1]=-t[n-1-i];}}
function zflipCity(d){if(!d||d._zs)return d;d._zs=1;(d.b||[]).forEach(function(x){zflipRing(x,2,x.length-1);delete x._bb;});
 (d.rd||[]).forEach(function(r){for(var i=3;i<r.length;i+=2)r[i]=-r[i];});(d.w||[]).forEach(function(w){zflipRing(w,0,w.length);});(d.pk||[]).forEach(function(p){zflipRing(p,1,p.length);});return d;}
function loadStreetData(c){
 if(!c.bundle)return loadJSON('data/streets/'+c.id+'.json').then(zflipCity);
 return getBundle(c.bundle).then(function(b){var d=b[c.id];if(!d)throw new Error('missing '+c.id+' in '+c.bundle);return zflipCity(d);});
}
var prefetched={};
function prefetchCity(c){if(!c||prefetched[c.id])return;prefetched[c.id]=1;var go=function(){loadStreetData(c).catch(function(){prefetched[c.id]=0;});};
 if(window.requestIdleCallback)requestIdleCallback(go,{timeout:800});else setTimeout(go,50);}
function enterCity(id){
 var c=CITYBY[id];if(!c)return;stopPlay();
 fadeT.textContent=(I18T('loading_streets'))+cityName(c);fade.classList.add('on');
 autoRot=false;
 setTimeout(function(){envMats();envEnterCity(c);
  var job=LIVE?enterLive(c).then(function(){return {b:L2.picks||[],rd:{length:L2._rd||0}};})
   :loadStreetData(c).then(function(data){clearStreet();var base=fadeT.textContent;return buildStreet(data,function(f){fadeT.textContent=base+' · '+Math.round(f*100)+'%';}).then(function(){return data;});});
  job.then(function(data){
   L2.active=true;L2.city=c;mode='street';labelsEl.style.visibility='hidden';
   L2.cam={az:0.4,el:1.38,d:2600,tz:0};L2.camWant={az:0.9,el:0.62,d:950};L2.drone.t=0;L2.drone.blend=0;L2.drone.touch=performance.now()-DRONE.idle+2500;
   document.getElementById('globeHud').hidden=true;document.getElementById('l2hud').hidden=false;
   buildCatLegend();renderCityIntro(c,data);setCrumb();updateLiveHud();
   setTimeout(function(){fade.classList.remove('on');},180);
  }).catch(function(err){fade.classList.remove('on');alert('street load failed: '+err.message);});},480);
}
function exitCity(){if(DRV.on)drvEnd();document.querySelectorAll('.clTab').forEach(function(b){b.style.display='none';});if(DOCK.on){DOCK.on=false;document.body.classList.remove('dock');panel.style.top='';}TRV.on=false;skyLeaveCity();
 fade.classList.add('on');setTimeout(function(){var backLL=L2.live?localToLL(L2.target.x,L2.target.z):null;clearStreet();L2.active=false;mode='globe';ENV.on=false;var dh=document.getElementById('droneHud');if(dh)dh.classList.remove('on');var nvh=document.getElementById('navHud');if(nvh)nvh.classList.remove('on');labelsEl.style.visibility='';layoutDirty=true;invalidate(1500);
  document.getElementById('globeHud').hidden=false;document.getElementById('l2hud').hidden=true;
  var bk=backLL||L2.city;flyToLL(bk.lat,bk.lon,EXIT_D||R*2.4);EXIT_D=0;renderIntro();setCrumb();
  setTimeout(function(){fade.classList.remove('on');},180);},350);
}

// level-2 camera
function streetCamPos(){var el=L2.cam.el,az=L2.cam.az,d=L2.cam.d,tg=L2.target||(L2.target=new T3.Vector3());var y=Math.sin(el)*d,rr=Math.cos(el)*d;camera.position.set(tg.x+Math.cos(az)*rr,y,tg.z+Math.sin(az)*rr);camera.lookAt(tg.x,20,tg.z);
 if(L2.ground){L2.ground.position.x=tg.x;L2.ground.position.z=tg.z;}}

// ====================================================================
// PANEL
// ====================================================================
var panel=document.getElementById('panel'),pHead=document.getElementById('pHead'),pBody=document.getElementById('pBody');
var state={type:'intro'};
function ladderHTML(sl){var h='<div class="ladder">';for(var i=0;i<5;i++)h+='<div class="'+(i===sl?'on':'')+'" style="background:'+lvColor(i)+'">SL'+(i+1)+'</div>';return h+'</div><div class="cap">'+(I18T('level'))+' <b style="color:'+lvColor(sl)+'">SL'+(sl+1)+' · '+esc(LX(D.LEVELS[sl]).n)+'</b> — '+esc(LX(D.LEVELS[sl]).d)+'</div>';}
function triHTML(a,p,e){return '<div class="tri"><div class="blk a"><div class="t"><i></i>'+T('auth')+'</div><p>'+esc(a)+'</p></div><div class="blk p"><div class="t"><i></i>'+T('plain')+'</div><p>'+esc(p)+'</p></div><div class="blk e"><div class="t"><i></i>'+T('ex')+'</div><p>'+esc(e)+'</p></div></div>';}
function chipsHTML(list){return (list||[]).map(function(r){return '<span class="chip">'+esc(r)+'</span>';}).join('');}
function headHTML(eye,title,meta,closable){return '<div class="p-row"><span class="p-eye">'+esc(eye)+'</span></div><div class="p-row"><h2>'+esc(title)+'</h2>'+(closable?'<button class="x" id="pClose">✕</button>':'')+'</div>'+(meta?'<div class="p-meta">'+meta+'</div>':'');}
function wire(){var x=document.getElementById('pClose');if(x)x.onclick=function(){if(mode==='street')renderCityIntro(L2.city);else resetToIntro();};
 pBody.querySelectorAll('[data-city]').forEach(function(b){b.onclick=function(){enterCity(b.getAttribute('data-city'));};});
 pBody.querySelectorAll('[data-cat]').forEach(function(b){b.onclick=function(){if(mode==='street')setFocus(+b.getAttribute('data-cat'));else renderCategory(+b.getAttribute('data-cat'));};});
 pBody.querySelectorAll('[data-tx]').forEach(function(b){b.onclick=function(){if(mode==='street')setFocus(+b.getAttribute('data-tx'));else renderTax(+b.getAttribute('data-tx'));};});
 pBody.querySelectorAll('[data-dist]').forEach(function(b){b.onclick=function(){renderDistrict(+b.getAttribute('data-dist'));};});
 pBody.querySelectorAll('[data-back]').forEach(function(b){b.onclick=function(){var t=b.getAttribute('data-back');if(t==='globe')exitCity();else if(t==='city')renderCityIntro(L2.city);else resetToIntro();};});
}
var NETD={zh:{0:[['接入','光纤 / 同轴 / 5G 家庭宽带 → 光猫或调制解调器 → 家用路由器（NAT）'],['局域网','Wi-Fi WPA2/WPA3；访客网络把智能家居、摄像头和主力设备隔开'],['地址与 DNS','运营商 DHCP 下发 IPv4/IPv6，DNS 默认走运营商，可改用 DoH/DoT 加密解析'],['常见协议与端口','HTTPS 443、QUIC UDP 443、DNS 53 / DoT 853；智能设备连云多用 MQTT 8883'],['主要风险面','UPnP 自动开端口、路由器管理口暴露到公网、IoT 默认口令、固件长期不更新'],['监测能力','基本没有集中监测，靠路由器日志、DNS 过滤和设备自动更新']],1:[['接入','双运营商专线或 SD-WAN，4G/5G 做备份链路'],['边界','下一代防火墙 + IPS；远程办公用 VPN 或零信任（ZTNA）；邮件安全网关'],['网络分区','办公 VLAN、访客 Wi-Fi、服务器/DMZ、楼宇系统（门禁、电梯、空调 BMS）分开'],['准入与身份','802.1X 有线/无线准入；SSO + MFA；特权账号单独管理（PAM）'],['常见协议与端口','HTTPS 443、SAML/OIDC 单点登录、LDAPS 636；SMB 445 只在内网，RDP 3389 只经跳板机'],['监测能力','SIEM 汇总防火墙、终端 EDR 和身份日志；NDR 看内网东西向流量']],2:[['接入','门店宽带 + LTE 备份，SD-WAN 连回总部或云'],['网络分区','收银/收单网（PCI 持卡人数据环境）、门店办公、顾客 Wi-Fi、摄像头/NVR 各自独立'],['支付链路','P2PE 读卡器点对点加密 + 令牌化；到收单行全程 TLS 1.2 以上'],['门店物联网','电子价签、客流计数、摄像头——默认口令和过期固件是常见短板'],['常见协议与端口','HTTPS 443；支付报文 ISO 8583 走 TLS；摄像头 RTSP 554 只允许内网'],['监测能力','PCI DSS 要求日志保留至少一年、文件完整性监控、每季度外部漏洞扫描']],3:[['参考模型','Purdue 分层：L0 现场仪表 → L1 PLC → L2 SCADA/HMI → L3 生产运营 → 工业 DMZ → L4/5 企业网'],['IT/OT 边界','IT 和 OT 之间设工业 DMZ；数据尽量单向外送（单向网关/数据二极管）'],['工控协议与端口','Modbus/TCP 502、DNP3 20000、EtherNet/IP 44818、S7 102、OPC UA 4840——老协议大多没有认证'],['远程维护','厂商远程访问经跳板机并录像，按工单临时开通，用完关闭'],['现场无线','工业 Wi-Fi 或专网 5G；传感器常用 LoRaWAN'],['监测能力','被动式 OT 流量监测（不主动扫描 PLC），维护完整资产清单']],4:[['接入','行业专网（教育网、政务外网）或多租户商用宽带'],['网络分区','公众 Wi-Fi（门户认证）、员工网、楼宇系统、监控网分开'],['对外服务','网站、预约和缴费系统放在 DMZ，后端数据库只走内网'],['常见协议与端口','HTTPS 443、eduroam 802.1X、SIP 5060/5061（电话）、ONVIF（摄像头）'],['主要风险面','访客多、人员流动大：社会工程、尾随进门、公共终端被植入'],['监测能力','SOC 或托管安全服务集中收日志；公共终端定期还原']]},en:{0:[['Access','Fibre / cable / 5G home broadband → ONT or modem → home router (NAT)'],['LAN','Wi-Fi WPA2/WPA3; a guest SSID isolates smart-home kit and cameras from main devices'],['Addressing & DNS','ISP DHCP hands out IPv4/IPv6; DNS defaults to the ISP — DoH/DoT encrypts lookups'],['Protocols & ports','HTTPS 443, QUIC UDP 443, DNS 53 / DoT 853; IoT clouds often use MQTT 8883'],['Main exposure','UPnP opening ports, router admin exposed to the internet, IoT default passwords, stale firmware'],['Monitoring','Practically none centrally — router logs, DNS filtering and auto-updates']],1:[['Access','Dual-carrier leased lines or SD-WAN, with 4G/5G backup'],['Perimeter','Next-gen firewall + IPS; remote work via VPN or ZTNA; secure email gateway'],['Segmentation','Office VLAN, guest Wi-Fi, servers/DMZ and building systems (access control, lifts, HVAC BMS) kept apart'],['Admission & identity','802.1X wired/wireless NAC; SSO + MFA; privileged accounts under PAM'],['Protocols & ports','HTTPS 443, SAML/OIDC SSO, LDAPS 636; SMB 445 internal only, RDP 3389 only through a jump host'],['Monitoring','SIEM collects firewall, EDR and identity logs; NDR watches east-west traffic']],2:[['Access','Store broadband + LTE backup, SD-WAN back to HQ or cloud'],['Segmentation','POS/acquiring net (PCI cardholder data environment), store office, guest Wi-Fi and cameras/NVR all separate'],['Payment path','P2PE readers + tokenization; TLS 1.2+ end to end to the acquirer'],['Store IoT','Electronic shelf labels, footfall counters, cameras — default passwords and old firmware are the weak spot'],['Protocols & ports','HTTPS 443; ISO 8583 payment messages over TLS; camera RTSP 554 internal only'],['Monitoring','PCI DSS: logs kept ≥ 1 year, file-integrity monitoring, quarterly external scans']],3:[['Reference model','Purdue levels: L0 field devices → L1 PLC → L2 SCADA/HMI → L3 operations → industrial DMZ → L4/5 enterprise'],['IT/OT boundary','An industrial DMZ between IT and OT; push data out one way where possible (unidirectional gateway / data diode)'],['ICS protocols & ports','Modbus/TCP 502, DNP3 20000, EtherNet/IP 44818, S7 102, OPC UA 4840 — legacy ones mostly unauthenticated'],['Remote maintenance','Vendor access through a recorded jump host, opened per work order and closed afterwards'],['Field wireless','Industrial Wi-Fi or private 5G; sensors often on LoRaWAN'],['Monitoring','Passive OT traffic monitoring (never active-scan PLCs) and a complete asset inventory']],4:[['Access','Sector networks (education, government) or multi-tenant commercial broadband'],['Segmentation','Public Wi-Fi (captive portal), staff network, building systems and CCTV network kept apart'],['Public services','Website, booking and payment systems in a DMZ; back-end databases reachable only internally'],['Protocols & ports','HTTPS 443, eduroam 802.1X, SIP 5060/5061 (phones), ONVIF (cameras)'],['Main exposure','Many visitors and high turnover: social engineering, tailgating, tampered public terminals'],['Monitoring','A SOC or managed security service centralizes logs; public terminals reset regularly']]}};
function netDetailHTML(catId){var rows=LX(NETD)[catId]||[];var cols=['--sl1','--sl2','--sl3','--sl4','--sl5','--hud'];return '<div class="netd">'+rows.map(function(r,i){return '<div class="nr" style="--nc:var('+cols[i%cols.length]+')"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>';}).join('')+'</div><div class="envsrc">'+(I18T('typical_network_architecture_for'))+'</div>';}
function chainHTML(catId){var hops=D.CHAINS[catId];var h='<div class="chain">';hops.forEach(function(hp){var d=LX(hp);h+='<div class="hop"><div class="rail"><div class="dot'+(hp.risk?' risk':'')+'"></div><div class="ln"></div></div><div class="body"><div class="hn">'+(hp.risk?'<span style="color:var(--alert)">● '+T('riskHop')+'</span> · ':'')+'</div><div class="ht">'+esc(d.n)+'</div><div class="hr">'+esc(d.r)+'</div></div></div>';});return h+'</div>';}

function renderIntro(){resetToIntro();}
function resetToIntro(){
 state={type:'intro'};
 pHead.innerHTML=headHTML(T('introEye'),T('introT'),'',false);
 var lv='<div style="display:grid;gap:5px">'+D.LEVELS.map(function(L,i){return '<div style="display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:start;border:1px solid var(--line);border-radius:9px;padding:7px 9px"><span class="badge" style="background:'+lvColor(i)+'">SL'+(i+1)+'</span><div style="font-size:12.5px;color:var(--soft)">'+esc(LX(L).n)+' — '+esc(LX(L).d)+'</div></div>';}).join('')+'</div>';
 var cats='<div class="catgrid">'+D.CATS.map(function(c){return '<div class="catbtn" style="--cc:'+cv(c.cvar)+'"><div class="cn"><i></i>'+esc(LX(c).n)+'</div></div>';}).join('')+'</div>';
 pBody.innerHTML='<p class="ctrl" style="margin:0">'+esc(T('introP'))+'</p>'
  +'<div class="sec"><h3>'+T('how')+'</h3><ul class="notes">'+T('howList').map(function(s){return '<li class="ctrl">'+s+'</li>';}).join('')+'</ul></div>'
  +'<div class="sec"><h3>'+T('ladder')+'</h3>'+lv+'</div>'
  +'<div class="sec"><h3>'+T('cats')+'</h3>'+cats+'</div>'
  +'<div class="sec"><h3>'+esc(I18P('各国首都','Capitals'))+' · '+CITIES.filter(function(c){return c.cap;}).length+'</h3><input id="cSearch" type="search" placeholder="'+(I18T('search_a_country_or'))+'" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--line);background:var(--glass-2);color:var(--ink);font:inherit;font-size:13px"><div class="flychips" id="cList">'+flyList('')+'</div></div>';
 wire();pBody.scrollTop=0;
 var si=document.getElementById('cSearch');if(si)si.addEventListener('input',function(){document.getElementById('cList').innerHTML=flyList(si.value);wire();});
}
function cityName(c){return I18P(c.zh||c.en,c.en||c.zh);}
// fly-to list: with no search, one capital per country/region, grouped by continent; a search looks through every place
var CONT_NAME={'Asia':['亚洲','Asia'],'Europe':['欧洲','Europe'],'Africa':['非洲','Africa'],'North America':['北美洲','North America'],'South America':['南美洲','South America'],'Oceania':['大洋洲','Oceania'],'Other':['其他','Other']},
 CONT_ORDER=['Asia','Europe','Africa','North America','South America','Oceania','Other'],CONT_FIX={GF:'South America',GI:'Europe',GP:'North America',MQ:'North America',RE:'Africa',SJ:'Europe',YT:'Africa'};
function isoCont(iso){if(!isoCont.m){isoCont.m={};((V&&V.countries)||[]).forEach(function(c){isoCont.m[c[2]]=c[7];});}var c=CONT_FIX[iso]||isoCont.m[iso];return CONT_NAME[c]?c:'Other';}
function flyChip(c,cap){return '<button data-city="'+c.id+'"><i style="background:'+(cap?'#f2c14e':c.f?'#58e0c8':'#9fe8ff')+'"></i>'+esc(cityName(c))+' <span style="color:var(--faint)">'+esc(cap?I18P(c.czh||c.country||c.iso,c.country||c.czh||c.iso):(c.iso||''))+'</span></button>';}
function flyList(q){q=(q||'').trim().toLowerCase();
 if(!q){var caps=CITIES.filter(function(c){return c.cap;}),G={};caps.forEach(function(c){var k=isoCont(c.iso);(G[k]||(G[k]=[])).push(c);});
  var loc=LZ()?'zh':'en';return CONT_ORDER.filter(function(k){return G[k];}).map(function(k){var L=G[k].sort(function(a,b){return String(LZ()?a.czh||a.country:a.country||a.czh).localeCompare(String(LZ()?b.czh||b.country:b.country||b.czh),loc);});
   return '<div class="flyGrp" style="width:100%;margin:8px 0 2px;font-size:11px;letter-spacing:.06em;color:var(--faint)">'+esc(I18P(CONT_NAME[k][0],CONT_NAME[k][1]))+' · '+L.length+'</div>'+L.map(function(c){return flyChip(c,true);}).join('');}).join('');}
 var list=CITIES.filter(function(c){return (c.en+' '+(c.zh||'')+' '+(c.country||'')+' '+(c.czh||'')+' '+(c.iso||'')).toLowerCase().indexOf(q)>=0;}).sort(function(a,b){return (b.cap?1:0)-(a.cap?1:0);}).slice(0,60);
 if(!list.length)return '<span class="ctrl">'+(I18T('no_match'))+'</span>';
 return list.map(function(c){return flyChip(c,!!c.cap);}).join('');}
function regForPoint(lat,lon){var land=countryAt(lat,lon);if(!land)return {ocean:true,sl:D.OCEANREG.sl,reg:D.OCEANREG};
 var iso=land[2];var r=D.CTRYREG[iso];if(r)return {ocean:false,c:land,sl:r.sl,r:r};
 var cont=land[7];var cr=D.CONTREG[cont]||D.CONTREG['Asia'];return {ocean:false,c:land,sl:cr.sl,r:cr,generic:true};}
function renderCountry(lat,lon){
 var info=regForPoint(lat,lon);
 if(info.ocean){var O=D.OCEANREG;var nm=I18T('ocean');
  pHead.innerHTML=headHTML(T('ocean'),nm,'<span class="badge" style="background:'+lvColor(O.sl)+'">SL'+(O.sl+1)+'</span><span class="chip">'+fmtLL(lat,lon)+'</span>',true);
  pBody.innerHTML='<div class="sec"><h3>'+T('regime')+'</h3><div class="p-meta">'+chipsHTML(O.r)+'</div></div><div class="sec"><h3>'+T('ladder')+'</h3>'+ladderHTML(O.sl)+'</div><div class="blk a"><div class="t"><i></i>'+T('auth')+'</div><p>'+esc(I18P(O.z,O.e))+'</p></div>';
  wire();pBody.scrollTop=0;state={type:'country'};return;}
 var c=info.c,r=info.r,sl=info.sl;var nm=LZ()&&c[1]?c[1]:c[0];
 // nearest featured city
 var best=ISO2CITY[c[2]]||null,bd=best?hav(lat,lon,best.lat,best.lon):1e9;
 if(!best)CITIES.forEach(function(ct){var d=hav(lat,lon,ct.lat,ct.lon);if(d<bd){bd=d;best=ct;}});
 pHead.innerHTML=headHTML(T('country'),nm,'<span class="badge" style="background:'+lvColor(sl)+'">SL'+(sl+1)+' · '+esc(LX(D.LEVELS[sl]).n)+'</span><span class="chip">'+esc(c[0])+' · '+esc(c[2])+'</span>',true);
 pBody.innerHTML='<dl class="kv"><dt>'+T('coords')+'</dt><dd>'+fmtLL(lat,lon)+'</dd><dt>'+T('pop')+'</dt><dd>'+(c[8]?(c[8]/1e6).toFixed(1)+'M':'—')+'</dd></dl>'
  +'<div class="sec"><h3>'+T('regime')+'</h3><div class="p-meta">'+chipsHTML(r.r)+'</div></div>'
  +'<div class="sec"><h3>'+T('ladder')+'</h3>'+ladderHTML(sl)+'</div>'
  +'<div class="blk a"><div class="t"><i></i>'+T('auth')+'</div><p>'+esc(I18P(r.z,r.e))+'</p></div>'
  +(best?'<div class="sec"><h3>'+T('cityEye')+'</h3><div class="btns"><button class="btn pri" data-city="'+best.id+'">'+T('toCity')+' · '+esc(LX(best))+' · '+Math.round(bd).toLocaleString()+' '+T('km')+'</button></div></div>':'');
 wire();pBody.scrollTop=0;state={type:'country'};
}
function renderCityIntro(c,data){
 setCrumb();
 var counts=null;if(data){counts={};data.b.forEach(function(b){var k=b[b.length-1];counts[k]=(counts[k]||0)+1;});L2._counts=counts;L2._rd=data.rd.length;}else counts=L2._counts;
 pHead.innerHTML=headHTML(T('cityEye'),cityName(c)+(c.czh&&LZ()?' · '+c.czh:(c.country&&lang==='en'?' · '+c.country:'')),'<span class="chip">'+T('buildings')+' '+(L2.picks?L2.picks.length:'—')+'</span><span class="chip">'+T('roads')+' '+(L2._rd||'—')+'</span>',true);
 var txc=L2.picks?txCounts().n:{};var cats='<div class="catgrid">'+TAX.map(function(M,ti){var n=txc[ti]||0;return '<button class="catbtn" data-tx="'+ti+'" style="--cc:'+M.col+'"><div class="cn"><i></i>'+(ti+1)+' '+esc(I18P(M.zh,M.en))+'</div><div class="cd">'+n+' '+T('buildings')+'</div></button>';}).join('')+'</div>';
 pBody.innerHTML='<p class="ctrl" style="margin:0">'+(L2.live?(I18T('live_streets_openstreetmap_streamed'))+'</p><p style="display:none">':'')+(I18T('a_1_3_km'))+'</p>'
  +'<div class="sec envsec" id="envSec"></div>'
  +'<div class="sec"><h3>'+T('cats')+'</h3>'+cats+'</div>'
  +'<div class="sec"><h3>'+T('district')+'</h3><div class="warnote">'+esc(LX(D.DISTRICT).sub)+'</div><div class="btns"><button class="btn" data-dist="0">'+T('openDistrict')+' →</button></div></div>'
  +'<div class="btns"><button class="btn" data-back="globe">← '+T('back')+'</button></div>';
 wire();pBody.scrollTop=0;state={type:'cityIntro'};ENV.secHTML='';envUI(true);
}
function renderCategory(catId,b){
 var cat=D.CATS[catId],ape=LX(D.CATAPE[catId]),tx=b?txOf(b):null,TM=tx?TAX[tx.m]:null;
 pHead.innerHTML=headHTML(T('bEye'),TM?txSub(tx):LX(cat).n,'<span class="badge" style="background:'+lvColor(cat.sl)+'">SL'+(cat.sl+1)+'</span>'+(TM?'<span class="chip" style="color:'+TM.col+'">■ '+(tx.m+1)+' · '+esc(I18P(TM.zh,TM.en))+' → '+esc(txSub(tx))+'</span>':'<span class="chip" style="color:'+cv(cat.cvar)+'">'+esc(LX(cat).n)+'</span>'),true);
 var info='';
 if(b){var foot=Math.abs(polyArea(b.slice(2,b.length-1),0));var h=b[0];var est=h===5;var bf=buildingFacts(b),zh=LZ();
  var addr=bf.live?(bf.num||bf.street?esc((bf.num?bf.num+' ':'')+(bf.street?(zh&&bf.street.zh?bf.street.zh:bf.street.n):''))+(bf.num?'':' <span style="color:var(--faint)">'+(I18T('no_house_number_in'))+'</span>'):'<span style="color:var(--faint)">'+(I18T('not_in_osm'))+'</span>'):'<span style="color:var(--faint)">'+(I18T('not_in_the_offline'))+'</span>';
  var places=bf.places.length?bf.places.map(function(p){return esc(zh&&p.zh?p.zh:p.n)+' <span style="color:var(--faint)">'+esc(p.sc||p.cl)+'</span>';}).join('<br>'):'';
  var nm=bf.places.length?(zh&&bf.places[0].zh?bf.places[0].zh:bf.places[0].n):'',fl=Math.max(1,Math.round(h/3.4));
  if(nm)pHead.querySelector('h2,.ttl,h1')&&(pHead.querySelector('h2,.ttl,h1').textContent=nm);
  function tile(k,v,u){return '<div><em>'+k+'</em><b>'+v+'</b>'+(u?'<small>'+u+'</small>':'')+'</div>';}
  var nav=[['ov',I18T('overview')],['loc',I18T('location')],['cls',I18T('class')],['lzr',I18T('survey')],['ph',I18T('photos')],['mno',I18T('networks')],['sec',I18T('security')]];
  info='<nav class="bxnav">'+nav.map(function(n){return '<button data-go="'+n[0]+'">'+n[1]+'</button>';}).join('')+'</nav>'
   +'<div class="sec bxs" data-sec="ov"><h3>'+(I18T('overview'))+'</h3><div class="bxk">'
   +tile(I18T('height'),h.toFixed(h<20?1:0),'m'+(est?(I18T('default')):''))+tile(I18T('est_floors'),'≈ '+fl,'')+tile(I18T('footprint'),Math.round(foot).toLocaleString(),'m²')
   +tile(I18T('perimeter'),Math.round(bf.per).toLocaleString(),'m')+tile(I18T('est_volume'),'≈ '+Math.round(foot*h).toLocaleString(),'m³')+tile(I18T('coords'),'<span class="ll">'+bf.ll.lat.toFixed(5)+'°<br>'+bf.ll.lon.toFixed(5)+'°</span>','<a href="https://www.openstreetmap.org/#map=19/'+bf.ll.lat.toFixed(5)+'/'+bf.ll.lon.toFixed(5)+'" target="_blank" rel="noopener">OSM ↗</a>')+'</div></div>'
   +'<div class="sec bxs" data-sec="loc"><h3>'+(I18T('location_jurisdiction'))+'</h3><dl class="kv"><dt>'+(I18T('street'))+'</dt><dd>'+addr+'</dd>'
   +(bf.live?'<dt>'+(I18T('full_address'))+'</dt><dd id="fullAddr"></dd><dt>'+(I18T('jurisdiction'))+'</dt><dd id="jurisA"></dd>':'')+'</dl></div>'
   +'<div class="sec bxs" data-sec="cls"><h3>'+(I18T('building_class'))+'</h3><div class="bxcls" style="--tc:'+TM.col+'"><i></i><div><b>'+(tx.m+1)+' · '+esc(I18P(TM.zh,TM.en))+'</b><span>→ '+esc(txSub(tx))+'</span><em>'+(I18T('basis'))+esc(txWhy(tx.why))+'</em></div></div>'
   +(places?'<dl class="kv"><dt>'+(I18T('listed_inside'))+'</dt><dd>'+places+'</dd></dl>':'')+txSecHTML(tx.m)+'</div>';}
 pBody.innerHTML=info+(b?'<div class="sec bxs" data-sec="lzr" id="bxLaser"></div><div class="sec bxs" data-sec="ph" id="bxPhotos"></div><div class="sec bxs" data-sec="mno" id="bxNet"></div>':'')
  +(b?'<div class="sec bxs" data-sec="sec"><h3>'+(I18T('network_security_profile'))+esc(LX(cat).n)+'</h3><div class="blk"><p>'+esc(LX(cat).net)+'</p></div>'+triHTML(ape.a,ape.p,ape.e)+'<h4 class="bxh4">'+T('chain')+'</h4>'+chainHTML(catId)+'<h4 class="bxh4">'+(I18T('network_detail_by_layer'))+'</h4>'+netDetailHTML(catId)+'</div>'
   :'<div class="sec"><h3>'+T('net')+'</h3><div class="blk"><p>'+esc(LX(cat).net)+'</p></div></div><div class="sec">'+triHTML(ape.a,ape.p,ape.e)+'</div><div class="sec"><h3>'+T('chain')+'</h3>'+chainHTML(catId)+'</div><div class="sec"><h3>'+(I18T('network_detail_by_layer'))+'</h3>'+netDetailHTML(catId)+'</div>')
  +'<div class="btns"><button class="btn" data-back="city">← '+esc(cityName(L2.city))+'</button><button class="btn" data-back="globe">'+T('back')+'</button></div>';
 pBody.classList.toggle('bxmode',!!b);pBody.querySelectorAll('[data-go]').forEach(function(btn){btn.onclick=function(){var t=pBody.querySelector('[data-sec="'+btn.getAttribute('data-go')+'"]');if(t)pBody.scrollTo({top:t.offsetTop-44,behavior:'smooth'});};});
 wire();pBody.scrollTop=0;state={type:'cat',cat:catId,b:b};
 if(b){bxFill(b);var bf2=buildingFacts(b);if(bf2.live)fillFullAddr(bf2.ll.lat,bf2.ll.lon);}
}
function renderDistrict(idx){
 var bd=D.DISTRICT.blds[idx],d=LX(bd);
 pHead.innerHTML=headHTML(T('district')+' · '+(I18T('fictional')),d.n,'<span class="badge" style="background:'+lvColor(bd.sl)+'">SL'+(bd.sl+1)+'</span>',true);
 var tabs='<div class="flychips" style="margin-bottom:4px">'+D.DISTRICT.blds.map(function(b,i){return '<button data-dist="'+i+'"'+(i===idx?' style="border-color:var(--hud);color:var(--hud)"':'')+'><i style="background:#'+b.col.toString(16).padStart(6,'0')+'"></i>'+esc(LX(b).n)+'</button>';}).join('')+'</div>';
 pBody.innerHTML='<div class="warnote">'+esc(LX(D.DISTRICT).sub)+'</div>'+tabs
  +'<div class="sec"><h3>'+T('regime')+'</h3><div class="p-meta">'+chipsHTML(d.reg)+'</div></div>'
  +'<div class="sec"><h3>'+T('ladder')+'</h3>'+ladderHTML(bd.sl)+'</div>'
  +'<div class="sec">'+triHTML(d.a,d.p,d.e)+'</div>'
  +'<div class="btns"><button class="btn" data-back="city">← '+esc(cityName(L2.city))+'</button></div>';
 wire();pBody.scrollTop=0;state={type:'dist',dist:idx};
}
function setCrumb(){var cr=document.getElementById('crumb');
 if(mode==='globe'){cr.innerHTML='';return;}
 var parts=['<button data-cb="globe">'+(I18T('globe'))+'</button>','<span class="sep">/</span>','<b>'+esc(cityName(L2.city))+'</b>'];
 cr.innerHTML=parts.join(' ');cr.querySelectorAll('[data-cb]').forEach(function(b){b.onclick=exitCity;});}

function rerender(){if(state.type==='intro')resetToIntro();else if(state.type==='cityIntro')renderCityIntro(L2.city);else if(state.type==='cat')renderCategory(state.cat,state.b);else if(state.type==='tax')renderTax(state.m);else if(state.type==='dist')renderDistrict(state.dist);else if(state.type==='event'&&EVBY[state.id])renderEvent(EVBY[state.id]);else if(state.type==='cov')renderCoverage();else resetToIntro();}

// ---------- legends ----------
function buildLegend(){document.getElementById('legend').innerHTML=D.LEVELS.map(function(L,i){return '<span><i style="background:'+lvColor(i)+'"></i>SL'+(i+1)+' '+esc(LX(L).n)+'</span>';}).join('');}
function catCounts(){return txCounts().n;}
function buildCatLegend(){var n=catCounts();var el=document.getElementById('catLegend');el.innerHTML=txLegendHTML(n);
 el.querySelectorAll('.lgb').forEach(function(b){b.onclick=function(){var id=+b.dataset.tx;setFocus(U.uFocus.value===id?-1:id);};});}
function setFocus(id){U.uFocus.value=id;buildCatLegend();if(id>=0){if(panel.classList.contains('min'))setPanel(true);renderTax(id);}else if(L2.city)renderCityIntro(L2.city);}

// ====================================================================
// INTERACTION
// ====================================================================
var ray=new T3.Raycaster(),ndc=new T3.Vector2();var ptrs={},downAt=null,moved=0,lastPinch=0;
function setNdc(ev){var r=canvas.getBoundingClientRect();ndc.x=((ev.clientX-r.left)/r.width)*2-1;ndc.y=-((ev.clientY-r.top)/r.height)*2+1;}
canvas.addEventListener('pointerdown',function(ev){invalidate();if(mode==='street')droneTouch();canvas.setPointerCapture(ev.pointerId);ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};downAt={x:ev.clientX,y:ev.clientY,t:performance.now()};moved=0;canvas.classList.add('drag');});
canvas.addEventListener('pointermove',function(ev){
 if(ptrs[ev.pointerId]){var p=ptrs[ev.pointerId],dx=ev.clientX-p.x,dy=ev.clientY-p.y;p.x=ev.clientX;p.y=ev.clientY;moved+=Math.abs(dx)+Math.abs(dy);
  var ids=Object.keys(ptrs);
  if(ids.length===2){var a=ptrs[ids[0]],b=ptrs[ids[1]];var dist=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch){zoom(lastPinch/dist);}lastPinch=dist;return;}
  if(mode==='globe'){var k=SOL.view?.005:Math.min(.0065,.0045*(orb.d/(R*3)));want.th-=dx*k;want.ph=Math.max(.12,Math.min(Math.PI-.12,want.ph-dy*k));if(moved>6)autoPause=performance.now();}
  else if(!(ev.shiftKey||(ev.buttons&2)||ev.ctrlKey)){livePan(dx,dy);}
  else{L2.camWant.az-=dx*0.006;if(!SKYV.on)L2.camWant.el=Math.max(0.14,Math.min(1.45,L2.camWant.el+dy*0.006));}
 } else if(mode==='street'&&L2.group){var nowp=performance.now();if(nowp-(L2._hv||0)>70){L2._hv=nowp;setNdc(ev);var hb=(DRV.on&&DRV.view==='fp')?null:pickBuilding();setHover(hb);var tip=document.getElementById('tip');if(hb){var htx=txOf(hb),hM=TAX[htx.m];tip.style.display='block';tip.style.left=ev.clientX+'px';tip.style.top=ev.clientY+'px';tip.innerHTML='<i style="background:'+hM.col+'"></i>'+esc(I18P(hM.zh,hM.en))+' · '+esc(txSub(htx))+' · '+Math.round(hb[0])+' m';}else tip.style.display='none';}}
 else if(mode==='globe'){setNdc(ev);ray.setFromCamera(ndc,camera);var h=ray.intersectObject(globe,false);var ro=document.getElementById('readout');if(h.length){var ll=v2ll(h[0].point);var land=countryAt(ll.lat,ll.lon);ro.innerHTML='<span>'+fmtLL(ll.lat,ll.lon)+'</span>'+(land?'<span><b>'+esc(LZ()&&land[1]?land[1]:land[0])+'</b></span>':'<span>'+(I18T('ocean'))+'</span>');}}
});
function endPtr(ev){delete ptrs[ev.pointerId];if(Object.keys(ptrs).length<2)lastPinch=0;if(!Object.keys(ptrs).length)canvas.classList.remove('drag');}
canvas.addEventListener('pointerup',function(ev){invalidate(600);var tap=downAt&&moved<8&&(performance.now()-downAt.t)<600&&Object.keys(ptrs).length<=1;endPtr(ev);if(tap){setNdc(ev);handleClick();}});
canvas.addEventListener('pointercancel',endPtr);canvas.addEventListener('contextmenu',function(e){e.preventDefault();});
canvas.addEventListener('wheel',function(ev){ev.preventDefault();invalidate();if(mode==='street')droneTouch();zoom(Math.exp(ev.deltaY*.0012));},{passive:false});
function zoom(f){if(solZoom(f))return;if(mode==='globe'&&CINE){want.d=Math.max(R*.35,want.d*f);if(want.d>R*1.9)leaveCine();}else if(mode==='globe'){want.d=Math.max(R*1.04,Math.min(R*4.5,want.d*f));if(f<1&&want.d<R*1.09)worldDive();}else{var mx=SKYV.on?80000:2400;if(f>1&&L2.camWant.d>=mx*.98){WORLD.out+=f-1;if(WORLD.out>.55&&!WORLD.busy){WORLD.out=0;WORLD.busy=1;EXIT_D=R*1.18;exitCity();setTimeout(function(){WORLD.busy=0;},2500);}}else WORLD.out=0;L2.camWant.d=SKYV.on?Math.max(1500,Math.min(80000,L2.camWant.d*f)):Math.max(140,Math.min(2400,L2.camWant.d*f));}}
function pickBuilding(){ray.setFromCamera(ndc,camera);var hit=L2.group?ray.intersectObject(L2.group,true):[];var bx,bz;
 if(hit.length){bx=hit[0].point.x;bz=hit[0].point.z;}else{var gp=rayGround();if(!gp)return null;bx=gp.x;bz=gp.z;}
 var found=null,fh=-1;for(var k=0;k<L2.picks.length;k++){var pl=L2.picks[k];if(pl._bb&&(bx<pl._bb[0]||bx>pl._bb[2]||bz<pl._bb[1]||bz>pl._bb[3]))continue;if(pip(bx,bz,pl,2)&&pl[0]>fh){fh=pl[0];found=pl;}}return found;}
window.addEventListener('keydown',function(e){invalidate(800);if(e.key==='Escape'){if(mode==='street')exitCity();else resetGlobe();}});

var WORLD={out:0,busy:0},EXIT_D=0;
// enter the street level anywhere on land (not only at listed cities)
function enterAt(lat,lon){var c=nearestCity(lat,lon,LIVE?8:60);if(c&&!LIVE){enterCity(c.id);return;}
 if(!LIVE){toast(I18T('offline_mode_can_only'));return;}
 var nm=null,nd=40;if(NODES)NODES.rows.forEach(function(r){var d=hav(lat,lon,r[5],r[6]);if(d<nd){nd=d;nm=r;}});
 var id='pt_'+lat.toFixed(3)+'_'+lon.toFixed(3),ca=countryAt(lat,lon),z2=iso2zh(),iso=ca?ca[2]:(nm?nm[4]:'');
 if(!CITYBY[id])CITYBY[id]={id:id,en:nm?(nm[0]+(nd>3?' · '+fmtKm(nd):'')):fmtLL(lat,lon),zh:nm&&nm[1]?(nm[1]+(nd>3?' · '+fmtKm(nd):'')):'',iso:iso,czh:z2[iso]||'',country:ca?ca[0]||'':'',lat:lat,lon:lon,round:9};
 if(c&&hav(lat,lon,c.lat,c.lon)<2){enterCity(c.id);return;}enterCity(id);}
function worldDive(){if(WORLD.busy||mode!=='globe'||CINE)return;var ll=v2ll(camera.position);var ca=countryAt(ll.lat,ll.lon);if(!ca){var t=performance.now();if(t-(WORLD.tt||0)>5000){WORLD.tt=t;toast(I18T('over_water_centre_some'));}return;}
 WORLD.busy=1;setTimeout(function(){WORLD.busy=0;},3000);enterAt(ll.lat,ll.lon);}
canvas.addEventListener('dblclick',function(ev){if(mode!=='globe')return;setNdc(ev);ray.setFromCamera(ndc,camera);var h=ray.intersectObject(globe,false);if(!h.length)return;var ll=v2ll(h[0].point);if(!countryAt(ll.lat,ll.lon))return;ev.preventDefault();enterAt(ll.lat,ll.lon);});
function handleClick(){if(SOL.view){solPick();return;}
 ray.setFromCamera(ndc,camera);
 if(mode==='globe'){
  var h=ray.intersectObject(globe,false);if(!h.length)return;var pt=h[0].point;var ll=v2ll(pt);
  // nearest visible target within 28px: a cluster (fly in) or a city (open streets)
  var rect=canvas.getBoundingClientRect(),W=rect.width,H=rect.height,cx=(ndc.x*.5+.5)*W,cy=(-ndc.y*.5+.5)*H,best=null,bestPx=28;
  function test(p,n,thr,item){if(!facingOK(p,n,thr)||!toScreen(p,W,H))return;var dd=Math.hypot(SCR.x-cx,SCR.y-cy);if(dd<bestPx){bestPx=dd;best=item;}}
  var hitEv=nearestEvent(cx,cy,W,H,16);if(hitEv){openEvent(hitEv.id);return;}
  FEAT.forEach(function(r){test(r.p,r.n,.15,{city:r.c});});
  if(curLvl>=0)CLU[curLvl].list.forEach(function(cl){test(cl.p,cl.n,.2,cl.count===1?{city:cl.top.c}:{cl:cl});});
  else CL.forEach(function(r){if(!r.c.f)test(r.p,r.n,.2,{city:r.c});});
  if(!best&&LIVE&&NODES){var nb=null,nd=10;NODES.rows.forEach(function(r,i){var p=ll2v(r[5],r[6],R*1.004),n=p.clone().normalize();if(!facingOK(p,n,.2)||!toScreen(p,W,H))return;var dd=Math.hypot(SCR.x-cx,SCR.y-cy);if(dd<nd){nd=dd;nb=i;}});
   if(nb!==null){var r=NODES.rows[nb];var id='ne'+nb;if(!CITYBY[id])CITYBY[id]={id:id,en:r[0],zh:r[1]||'',country:r[3],czh:'',iso:r[4],lat:r[5],lon:r[6],round:9};enterCity(id);return;}}
  if(best&&best.city){enterCity(best.city.id);return;}
  if(best&&best.cl){flyToLL(best.cl.lat,best.cl.lon,CLUSTER_LEVELS[curLvl].next);invalidate(1500);return;}
  if(panel.classList.contains('min'))setPanel(true);
  renderCountry(ll.lat,ll.lon);
 } else {
  if(SKYV.on&&MEAS.on){measClick();return;}
  // prefer the actual surface the ray hits (building top/wall or district box); fall back to ground plane
  var hit=ray.intersectObject(L2.group,true);var bx,bz;
  if(hit.length){bx=hit[0].point.x;bz=hit[0].point.z;}else{var gp=rayGround();if(!gp)return;bx=gp.x;bz=gp.z;}
  if(L2.district){var dd=L2.district;for(var j=0;j<dd.picks.length;j++){var dp=dd.picks[j];if(Math.abs(bx-dp.x)<=dp.w/2+4&&Math.abs(bz-dp.z)<=dp.d/2+4){if(panel.classList.contains('min'))setPanel(true);renderDistrict(dp.i);return;}}}
  var found=null,fh=-1;
  for(var k=0;k<L2.picks.length;k++){var pl=L2.picks[k];if(pl._bb&&(bx<pl._bb[0]||bx>pl._bb[2]||bz<pl._bb[1]||bz>pl._bb[3]))continue;if(pip(bx,bz,pl,2)&&pl[0]>fh){fh=pl[0];found=pl;}}
  if(found){setSelected(found);if(panel.classList.contains('min'))setPanel(true);renderCategory(found[found.length-1],found);}
 }
}
var groundPlane=new T3.Plane(new T3.Vector3(0,1,0),0);
function rayGround(){ray.setFromCamera(ndc,camera);var pt=new T3.Vector3();if(ray.ray.intersectPlane(groundPlane,pt))return pt;return null;}

// ---------- controls ----------
var bZh=document.getElementById('bZh'),bEn=document.getElementById('bEn'),bBi=document.getElementById('bBi'),bPanel=document.getElementById('bPanel');
function applyOffset(){invalidate();layoutDirty=true;var w=window.innerWidth,h=window.innerHeight,open=!panel.classList.contains('min');if(open&&w>900){var pw=Math.min(408,w-32)+16;camera.setViewOffset(w,h,pw/2,0,w,h);}else camera.clearViewOffset();}
function setPanel(open){panel.classList.toggle('min',!open);bPanel.setAttribute('aria-pressed',open);applyOffset();}
bPanel.onclick=function(){setPanel(panel.classList.contains('min'));};
function applyLang(){var qb=document.getElementById('bQual');if(qb&&QUAL)qualLabel(qb);try{if(typeof catChips==='function')catChips();if(mode==='street'&&L2.active)updateLiveHud(L2.live?localToLL(L2.target.x,L2.target.z):undefined);lidUI();drvUI();DRV.hudAt=0;DRV.scrAt=0;DRV.alAt=0;NAV.radarAt=0;NAV.uiAt=0;if(typeof FAR!=='undefined'&&FAR.lab)FAR.lab.key=null;if(toastEl)toastEl.classList.remove('on');if(L2.drone)L2.drone.tmAt=0;if(typeof trvUI==='function')trvUI(true);if(DRV.on)drvAlong();if(typeof PERF!=='undefined'&&PERF&&PERF.at!=null)PERF.at=0;if(SOL.card&&SOL.card.style.display==='block')solInfo(SOL.cardId);SOL.barAt=0;solBarUI();for(var lk in SOL.labs)SOL.labs[lk]._h=null;}catch(e){}setTimeout(function(){var si=document.getElementById('srchIn');if(si)si.placeholder=I18T('search_an_address_street');if(typeof skyControls==='function'){skyControls();SKYV.evAt=0;SKYV.uiAt=0;}if(typeof renderEvFilter==='function'&&EV&&EV.length)renderEvFilter();},0);root.setAttribute('data-lang',lang);root.lang=(LZ()?'zh-CN':'en');
 bZh.setAttribute('aria-pressed',lang==='zh');bEn.setAttribute('aria-pressed',lang==='en');if(bBi)bBi.setAttribute('aria-pressed',lang==='bi');
 document.getElementById('hTitle').textContent=T('title');document.getElementById('hSub').textContent=T('sub');
 document.querySelectorAll('[data-k]').forEach(function(el){el.textContent=T(el.getAttribute('data-k'));});
 buildLegend();if(L2.active)buildCatLegend();if(V)buildLabels();if(EV.length)selectYear(tlYear,false);rerender();setCrumb();
 try{localStorage.setItem('se-lang',lang);}catch(e){}}
bZh.onclick=function(){lang='zh';applyLang();};bEn.onclick=function(){lang='en';applyLang();};if(bBi)bBi.onclick=function(){lang='bi';applyLang();};
var tRot=document.getElementById('tRot'),tNight=document.getElementById('tNight');
tRot.onclick=function(){invalidate();var on=tRot.getAttribute('aria-pressed')!=='true';tRot.setAttribute('aria-pressed',on);autoRot=on;};
tNight.onclick=function(){invalidate(2500);night=!night;tNight.setAttribute('aria-pressed',night);};
var tSol=document.getElementById('tSol');if(tSol)tSol.onclick=function(){solToggle();};
document.getElementById('tBorder').onclick=function(){invalidate();var b=this,on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);if(vlayers.borders)vlayers.borders.visible=on;if(vlayers.admin1)vlayers.admin1.visible=on;};
document.getElementById('tGrid').onclick=function(){invalidate();var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',on);if(grat)grat.visible=on;};
document.getElementById('tNodes').onclick=function(){invalidate();var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',on);if(nodePts)nodePts.visible=on;};
document.getElementById('bDrone').onclick=function(){L2.drone.on=!L2.drone.on;this.setAttribute('aria-pressed',L2.drone.on);droneTouch();L2.drone.touch=0;};
document.getElementById('tReset').onclick=function(){if(mode==='street')exitCity();else resetGlobe();};

// ---------- loop ----------
function resize(){invalidate();layoutDirty=true;var w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<700?52:40;camera.updateProjectionMatrix();applyOffset();}
window.addEventListener('resize',resize);
var rotAxis=new T3.Vector3(0,1,0),tmpQ=new T3.Quaternion(),sunTmp=new T3.Vector3(),camN2=new T3.Vector3();
var last=performance.now(),lastRaf=0;
function loop(now){requestAnimationFrame(loop);lastRaf=performance.now();frame(now);}
// ---- render on demand + adaptive resolution ----
// The globe is only redrawn while something changes (spin, drag, zoom easing, sun easing, a short window
// after any input). When idle, the GPU does nothing and the last frame stays on screen.
var renderUntil=0,wasIdle=false,RENDERS=0;
function invalidate(ms){renderUntil=Math.max(renderUntil||0,performance.now()+(ms||300));}
var PR_MAX=Math.min(window.devicePixelRatio||1,2),MIN_PR=1.0,pr=PR_MAX,ftAcc=0,ftN=0,ftT=0;
var MV={x:0,z:0,az:0,el:0,d:0,still:0,lastR:0};
function motionStill(now,dragging){var tg=L2.target||{x:0,z:0},c=L2.cam,w=L2.camWant;var m=dragging||Math.abs(tg.x-MV.x)+Math.abs(tg.z-MV.z)>.02||Math.abs(c.az-MV.az)+Math.abs(c.el-MV.el)>2e-4||Math.abs(c.d-MV.d)>.02||(w&&(Math.abs(w.az-c.az)+Math.abs(w.el-c.el)>2e-4||Math.abs(w.d-c.d)>.05));
 MV.x=tg.x;MV.z=tg.z;MV.az=c.az;MV.el=c.el;MV.d=c.d;if(m)MV.still=now;return now-MV.still;}
function adaptRes(dt,now){ // dynamic resolution: trade pixels for frame rate on weaker GPUs
 if(dt<=0||dt>.2)return;ftAcc+=dt;ftN++;if(now-ftT<1200||ftN<20)return;
 var avg=ftAcc/ftN*1000;ftAcc=0;ftN=0;ftT=now;var np=pr;if(now-(MV.prAt||0)<4000)return;
 if(avg>40&&pr>MIN_PR)np=Math.max(MIN_PR,pr-.4);else if(avg>22&&pr>MIN_PR)np=Math.max(MIN_PR,pr-.2);else if(avg<12&&pr<PR_MAX)np=Math.min(PR_MAX,pr+.2);
 if(Math.abs(np-pr)>.001){pr=np;MV.prAt=now;renderer.setPixelRatio(pr);resize();}}
// ==== SOLAR SYSTEM · 太阳系 ====
// Real positions for any date (Paul Schlyter's low-precision ephemeris, ~1–2′ for the Moon and planets):
//  · around the globe: the Sun in its true direction (so day/night on Earth is real), the Moon at its true distance and
//    phase, the planets where they really are in the sky;
//  · zoom far out (or press 太阳系视角): a heliocentric orrery with every planet at today's position on its orbit,
//    with a time machine (real time … one year per second). Distances and sizes in the orrery are compressed.
var SOL={on:false,view:false,t:Date.now(),live:true,speed:0,eph:null,at:-1,g:null,orr:null,save:null,focus:'earth',labs:{},card:null,bar:null,out:0};
var SOL_P=[// id, zh, en, radius km, orbital period d, colour, globe-sky brightness, axial pole (RA,Dec), rotation h
 ['mercury','水星','Mercury',2440,87.969,0xb9b1a6,.5,281.01,61.42,1407.6],
 ['venus','金星','Venus',6052,224.701,0xf1dfb2,1,272.76,67.16,-5832.5],
 ['earth','地球','Earth',6371,365.256,0x6fa8ff,0,0,90,23.934],
 ['mars','火星','Mars',3390,686.98,0xe0784a,.65,317.68,52.89,24.623],
 ['jupiter','木星','Jupiter',69911,4332.59,0xe8cfa8,.9,268.06,64.5,9.925],
 ['saturn','土星','Saturn',58232,10759.2,0xe9d7a4,.6,40.59,83.54,10.656],
 ['uranus','天王星','Uranus',25362,30688.5,0xa9e3ea,.25,257.31,-15.18,-17.24],
 ['neptune','海王星','Neptune',24622,60182,0x6f8fff,.18,299.36,43.46,16.11]];
function solEl(id,d){switch(id){// N, i, w, a, e, M (degrees, AU)
 case 'mercury':return [48.3313+3.24587e-5*d,7.0047+5e-8*d,29.1241+1.01444e-5*d,.387098,.205635+5.59e-10*d,168.6562+4.0923344368*d];
 case 'venus':return [76.6799+2.4659e-5*d,3.3946+2.75e-8*d,54.891+1.38374e-5*d,.72333,.006773-1.302e-9*d,48.0052+1.6021302244*d];
 case 'mars':return [49.5574+2.11081e-5*d,1.8497-1.78e-8*d,286.5016+2.92961e-5*d,1.523688,.093405+2.516e-9*d,18.6021+.5240207766*d];
 case 'jupiter':return [100.4542+2.76854e-5*d,1.303-1.557e-7*d,273.8777+1.64505e-5*d,5.20256,.048498+4.469e-9*d,19.895+.0830853001*d];
 case 'saturn':return [113.6634+2.3898e-5*d,2.4886-1.081e-7*d,339.3939+2.97661e-5*d,9.55475,.055546-9.499e-9*d,316.967+.0334442282*d];
 case 'uranus':return [74.0005+1.3978e-5*d,.7733+1.9e-8*d,96.6612+3.0565e-5*d,19.18171-1.55e-8*d,.047318+7.45e-9*d,142.5905+.011725806*d];
 case 'neptune':return [131.7806+3.0173e-5*d,1.77-2.55e-7*d,272.8461-6.027e-6*d,30.05826+3.313e-8*d,.008606+2.15e-9*d,260.2471+.005995147*d];
 case 'moon':return [125.1228-.0529538083*d,5.1454,318.0634+.1643573223*d,60.2666,.0549,115.3654+13.0649929509*d];}}
function solKep(el,Eo){var N=el[0]*D2R,i=el[1]*D2R,w=el[2]*D2R,a=el[3],e=el[4],M=((el[5]%360)+360)%360*D2R,E=Eo!=null?Eo:M+e*Math.sin(M)*(1+e*Math.cos(M));
 if(Eo==null)for(var k=0;k<6;k++)E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 var xv=a*(Math.cos(E)-e),yv=a*Math.sqrt(1-e*e)*Math.sin(E),v=Math.atan2(yv,xv),r=Math.hypot(xv,yv),u=v+w;
 return [r*(Math.cos(N)*Math.cos(u)-Math.sin(N)*Math.sin(u)*Math.cos(i)),r*(Math.sin(N)*Math.cos(u)+Math.cos(N)*Math.sin(u)*Math.cos(i)),r*Math.sin(u)*Math.sin(i),r];}
function solEph(ms){var d=ms/86400000+2440587.5-2451543.5,ecl=(23.4393-3.563e-7*d)*D2R,o={d:d,ecl:ecl,P:{}};
 // Sun (geocentric) — Earth is its mirror image
 var ws=282.9404+4.70935e-5*d,es=.016709-1.151e-9*d,Ms=((356.047+.9856002585*d)%360+360)%360,Mr=Ms*D2R,E=Mr+es*Math.sin(Mr)*(1+es*Math.cos(Mr)),xv=Math.cos(E)-es,yv=Math.sqrt(1-es*es)*Math.sin(E),rs=Math.hypot(xv,yv),ls=Math.atan2(yv,xv)+ws*D2R;
 o.sun=[rs*Math.cos(ls),rs*Math.sin(ls),0];o.P.earth=[-o.sun[0],-o.sun[1],0,rs];
 var Mj=(19.895+.0830853001*d)*D2R,Mst=(316.967+.0334442282*d)*D2R,Mu=(142.5905+.011725806*d)*D2R;
 SOL_P.forEach(function(p){if(p[0]==='earth')return;var h=solKep(solEl(p[0],d)),lon=Math.atan2(h[1],h[0]),lat=Math.atan2(h[2],Math.hypot(h[0],h[1])),r=h[3],dl=0,db=0;
  if(p[0]==='jupiter')dl=-.332*Math.sin(2*Mj-5*Mst-67.6*D2R)-.056*Math.sin(2*Mj-2*Mst+21*D2R)+.042*Math.sin(3*Mj-5*Mst+21*D2R)-.036*Math.sin(Mj-2*Mst)+.022*Math.cos(Mj-Mst)+.023*Math.sin(2*Mj-3*Mst+52*D2R)-.016*Math.sin(Mj-5*Mst-69*D2R);
  if(p[0]==='saturn'){dl=.812*Math.sin(2*Mj-5*Mst-67.6*D2R)-.229*Math.cos(2*Mj-4*Mst-2*D2R)+.119*Math.sin(Mj-2*Mst-3*D2R)+.046*Math.sin(2*Mj-6*Mst-69*D2R)+.014*Math.sin(Mj-3*Mst+32*D2R);db=-.02*Math.cos(2*Mj-4*Mst-2*D2R)+.018*Math.sin(2*Mj-6*Mst-49*D2R);}
  if(p[0]==='uranus')dl=.04*Math.sin(Mst-2*Mu+6*D2R)+.035*Math.sin(Mst-3*Mu+33*D2R)-.015*Math.sin(Mj-Mu+20*D2R);
  lon+=dl*D2R;lat+=db*D2R;o.P[p[0]]=[r*Math.cos(lon)*Math.cos(lat),r*Math.sin(lon)*Math.cos(lat),r*Math.sin(lat),r];});
 // Moon (geocentric, Earth radii) with the main perturbations
 var m=solKep(solEl('moon',d)),Mm=((115.3654+13.0649929509*d)%360)*D2R,Nm=(125.1228-.0529538083*d)*D2R,wm=(318.0634+.1643573223*d)*D2R,Lm=Mm+wm+Nm,Ls=Mr+ws*D2R,D=Lm-Ls,F=Lm-Nm;
 var ml=Math.atan2(m[1],m[0]),mb=Math.atan2(m[2],Math.hypot(m[0],m[1])),mr=m[3];
 ml+=(-1.274*Math.sin(Mm-2*D)+.658*Math.sin(2*D)-.186*Math.sin(Mr)-.059*Math.sin(2*Mm-2*D)-.057*Math.sin(Mm-2*D+Mr)+.053*Math.sin(Mm+2*D)+.046*Math.sin(2*D-Mr)+.041*Math.sin(Mm-Mr)-.035*Math.sin(D)-.031*Math.sin(Mm+Mr)-.015*Math.sin(2*F-2*D)+.011*Math.sin(Mm-4*D))*D2R;
 mb+=(-.173*Math.sin(F-2*D)-.055*Math.sin(Mm-F-2*D)-.046*Math.sin(Mm+F-2*D)+.033*Math.sin(F+2*D)+.017*Math.sin(2*Mm+F))*D2R;mr+=-.58*Math.cos(Mm-2*D)-.46*Math.cos(2*D);
 o.moon=[mr*Math.cos(ml)*Math.cos(mb),mr*Math.sin(ml)*Math.cos(mb),mr*Math.sin(mb),mr];
 o.gmst=((280.46061837+360.98564736629*(d-1.5))%360+360)%360;// d-1.5 = days from J2000.0
 return o;}
// geocentric ecliptic vector → direction in the globe's Earth-fixed frame (the same frame ll2v() uses)
function solFix(v,o,out){var x=v[0],y=v[1]*Math.cos(o.ecl)-v[2]*Math.sin(o.ecl),z=v[1]*Math.sin(o.ecl)+v[2]*Math.cos(o.ecl),ra=Math.atan2(y,x)*R2D,dec=Math.atan2(z,Math.hypot(x,y))*R2D;
 var p=ll2v(dec,ra-o.gmst,1);return out?out.copy(p):p;}
function solGeo(id,o){var p=o.P[id],e=o.P.earth;return [p[0]-e[0],p[1]-e[1],p[2]-e[2]];}
// ecliptic → three.js (ecliptic north up)
function solE3(v,out){return (out||new T3.Vector3()).set(v[0],v[2],-v[1]);}
function solPole(ra,dec,ecl){ra*=D2R;dec*=D2R;var x=Math.cos(ra)*Math.cos(dec),y=Math.sin(ra)*Math.cos(dec),z=Math.sin(dec);return solE3([x,y*Math.cos(ecl)+z*Math.sin(ecl),-y*Math.sin(ecl)+z*Math.cos(ecl)]).normalize();}
function solNow(){return SOL.live?Date.now():SOL.t;}
// ---- shaders ----
var SOL_NOISE='float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);'+
 'return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}'+
 'float fb3(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p*=2.03;a*=.5;}return v;}';
// kind: 0 rocky (grey), 1 Moon, 2 Venus clouds, 3 Mars, 4 banded gas giant, 5 ice giant
function solSurf(kind,col,c2){return new T3.ShaderMaterial({uniforms:{uSun:{value:new T3.Vector3()},uSunW:{value:new T3.Vector3()},uCol:{value:new T3.Color(col)},uCol2:{value:new T3.Color(c2==null?col:c2)},uKind:{value:kind},uAmb:{value:.045}},
 vertexShader:'varying vec3 vO;varying vec3 vN;varying vec3 vW;void main(){vO=normalize(position);vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:'uniform vec3 uSun,uSunW,uCol,uCol2;uniform float uKind,uAmb;varying vec3 vO;varying vec3 vN;varying vec3 vW;'+SOL_NOISE+
  'void main(){vec3 p=vO;vec3 c;float k=uKind;'+
  'if(k<.5){float n=fb3(p*6.);float cr=smoothstep(.62,.72,fb3(p*14.+3.));c=uCol*(.55+.6*n)-cr*.12;}'+
  'else if(k<1.5){float m=smoothstep(.48,.6,fb3(p*2.2+vec3(1.7,.3,.9)));float n=fb3(p*9.);float cr=smoothstep(.66,.74,fb3(p*22.+5.));c=mix(vec3(.72,.71,.69),vec3(.34,.34,.36),m)*(.8+.35*n)+cr*.08;}'+
  'else if(k<2.5){float n=fb3(p*3.+vec3(0.,p.y*4.,0.));c=mix(uCol*.85,uCol*1.08,n);}'+
  'else if(k<3.5){float n=fb3(p*4.);float dk=smoothstep(.5,.62,fb3(p*2.5+2.));c=mix(uCol,uCol*.55,dk)*(.75+.4*n);float cap=smoothstep(.86,.93,abs(p.y));c=mix(c,vec3(.95),cap);}'+
  'else if(k<4.5){float y=p.y+.08*fb3(p*4.)-.04;float b=sin(y*22.)*.5+.5;float b2=sin(y*9.+1.3)*.5+.5;c=mix(uCol2,uCol,b*.7+b2*.3)*(.85+.25*fb3(vec3(p.x*3.,y*30.,p.z*3.)));}'+
  'else{float y=p.y;float b=sin(y*7.)*.5+.5;c=mix(uCol*.9,uCol2,b*.25+.1*fb3(p*3.));}'+
  'vec3 L=normalize(uSunW-vW);if(dot(uSun,uSun)>.5)L=normalize(uSun);float d=max(dot(normalize(vN),L),0.);float lit=pow(d,.85);'+
  'gl_FragColor=vec4(c*(lit*1.15+uAmb),1.);}'});}
function solGlowTex(core){var c=document.createElement('canvas');c.width=c.height=256;var x=c.getContext('2d'),g=x.createRadialGradient(128,128,0,128,128,128);
 if(core){g.addColorStop(0,'rgba(255,255,250,1)');g.addColorStop(.2,'rgba(255,246,220,1)');g.addColorStop(.24,'rgba(255,220,150,.75)');g.addColorStop(.45,'rgba(255,170,70,.22)');g.addColorStop(1,'rgba(255,140,40,0)');}
 else{g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');}
 x.fillStyle=g;x.fillRect(0,0,256,256);var t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;return t;}
function solSunMat(){return new T3.ShaderMaterial({uniforms:{uT:{value:0}},vertexShader:'varying vec3 vO;varying vec3 vN;varying vec3 vV;void main(){vO=normalize(position);vN=normalize(normalMatrix*normal);vec4 m=modelViewMatrix*vec4(position,1.);vV=normalize(-m.xyz);gl_Position=projectionMatrix*m;}',
 fragmentShader:'uniform float uT;varying vec3 vO;varying vec3 vN;varying vec3 vV;'+SOL_NOISE+'void main(){float n=fb3(vO*9.+vec3(uT*.05,0.,uT*.03));float g=fb3(vO*28.-uT*.02);float mu=max(dot(normalize(vN),normalize(vV)),0.);'+
  'float limb=.35+.65*pow(mu,.55);vec3 c=mix(vec3(1.,.55,.16),vec3(1.,.93,.72),n*.75+g*.25)*limb*1.35;gl_FragColor=vec4(c,1.);}'});}
// ---- objects around the globe ----
function solBuildGlobe(){var g=new T3.Group();g.visible=false;scene.add(g);var G={g:g};
 G.sunCore=new T3.Sprite(new T3.SpriteMaterial({map:solGlowTex(true),blending:T3.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));G.sunCore.scale.setScalar(700);G.sunCore.renderOrder=-2;g.add(G.sunCore);
 G.sunHalo=new T3.Sprite(new T3.SpriteMaterial({map:solGlowTex(false),color:0xffd9a0,blending:T3.AdditiveBlending,depthWrite:false,transparent:true,opacity:.35}));G.sunHalo.scale.setScalar(5200);G.sunHalo.renderOrder=-3;g.add(G.sunHalo);
 G.moonMat=solSurf(1,0xbbbbbb);G.moon=new T3.Mesh(new T3.SphereGeometry(R*1737.4/6371,96,64),G.moonMat);g.add(G.moon);
 var ring=[];for(var i=0;i<=256;i++){var a=i/256*Math.PI*2;ring.push(Math.cos(a),0,Math.sin(a));}var rg=new T3.BufferGeometry();rg.setAttribute('position',new T3.Float32BufferAttribute(ring,3));
 G.moonOrbit=new T3.Line(rg,new T3.LineBasicMaterial({color:0x8fb4ff,transparent:true,opacity:.22,depthWrite:false}));g.add(G.moonOrbit);
 G.pl={};var dot=solGlowTex(false);SOL_P.forEach(function(p){if(p[0]==='earth')return;var s=new T3.Sprite(new T3.SpriteMaterial({map:dot,color:p[5],blending:T3.AdditiveBlending,depthWrite:false,transparent:true,sizeAttenuation:false}));var k=.012+p[6]*.016;s.scale.set(k,k,1);g.add(s);G.pl[p[0]]=s;});
 SOL.g=G;}
function solUpdate(now){var t=solNow();if(SOL.eph&&Math.abs(t-SOL.at)<(SOL.live?20000:1))return false;SOL.at=t;var o=SOL.eph=solEph(t),G=SOL.g;if(!G)return true;
 var sd=solFix(o.sun,o);SOL.sunDir=sd.clone();G.sunCore.position.copy(sd).multiplyScalar(30000);G.sunHalo.position.copy(G.sunCore.position);
 var md=solFix(o.moon,o);G.moon.position.copy(md).multiplyScalar(o.moon[3]*R);G.moon.lookAt(0,0,0);G.moonMat.uniforms.uSun.value.copy(sd);
 // the Moon's orbit plane: through the Earth, containing the Moon and its velocity (sample a day later)
 var o2=solEph(t+86400000),md2=solFix(o2.moon,o2),nrm=new T3.Vector3().crossVectors(md,md2).normalize();G.moonOrbit.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),nrm);G.moonOrbit.scale.setScalar(o.moon[3]*R);
 SOL_P.forEach(function(p){if(p[0]==='earth')return;var v=solGeo(p[0],o);G.pl[p[0]].position.copy(solFix(v,o)).multiplyScalar(29000);});
 return true;}
// ---- labels (both views) ----
function solLab(id,html,onclick){var L=SOL.labs[id];if(!L){L=document.createElement('div');L.className='solLab';L.style.cssText='position:fixed;left:0;top:0;z-index:6;pointer-events:auto;cursor:pointer;font:600 11px/1.25 var(--mono,monospace);color:#e8f1ff;text-shadow:0 0 6px #000,0 0 2px #000;white-space:nowrap;transform:translate(10px,-50%);';document.body.appendChild(L);SOL.labs[id]=L;L.onclick=function(e){e.stopPropagation();if(L._on)L._on();};}
 if(L._h!==html){L.innerHTML=html;L._h=html;}L._on=onclick;return L;}
function solPlace(L,v,cam,show){if(!show){L.style.display='none';return;}var p=v.clone().project(cam);if(p.z>1||p.z<-1||Math.abs(p.x)>1.05||Math.abs(p.y)>1.05){L.style.display='none';return;}
 var rc=canvas.getBoundingClientRect();L.style.display='block';L.style.left=(rc.left+(p.x+1)/2*rc.width)+'px';L.style.top=(rc.top+(1-p.y)/2*rc.height)+'px';}
function solHideLabs(){for(var k in SOL.labs)SOL.labs[k].style.display='none';}
function solFmtKm(km){var zh=km>=1e8?(km/1e8).toFixed(2)+' 亿 km':km>=1e4?(km/1e4).toFixed(km>=1e6?0:1)+' 万 km':Math.round(km)+' km',en=km>=1e6?(km/1e6).toFixed(km>=1e8?0:1)+' million km':Math.round(km).toLocaleString('en')+' km';return I18P(zh,en);}
function solGlobeLabels(){var G=SOL.g,o=SOL.eph;if(!G||!o)return;SOL._labsOn=true;var far=orb.d>R*6;
 var mk=o.moon[3]*6371,ill=(1-G.moon.position.clone().normalize().dot(SOL.sunDir))/2;
 solPlace(solLab('moon','☾ '+esc(I18P('月球','Moon'))+' <span style="opacity:.7">'+solFmtKm(mk)+' · '+Math.round(ill*100)+'%</span>',function(){solInfo('moon');}),G.moon.position,camera,true);
 solPlace(solLab('sun','☉ '+esc(I18P('太阳','Sun')),function(){solInfo('sun');}),G.sunCore.position,camera,true);
 SOL_P.forEach(function(p){if(p[0]==='earth')return;solPlace(solLab(p[0],'· '+esc(I18P(p[1],p[2])),function(){solInfo(p[0]);}),G.pl[p[0]].position,camera,true);});
 G.moonOrbit.material.opacity=Math.min(.35,Math.max(0,(orb.d-R*6)/(R*30)));}
// ---- heliocentric orrery ----
function solAU(r){return 40*Math.pow(Math.max(r,1e-6),.55);}
function solBuildOrr(){var sc=new T3.Scene(),O={scene:sc,bodies:{},orbits:{}};
 var st=new T3.BufferGeometry(),n=4000,pp=new Float32Array(n*3),cc=new Float32Array(n*3);for(var i=0;i<n;i++){var v=new T3.Vector3(gauss(),gauss(),gauss()).normalize().multiplyScalar(4000+Math.random()*2000);pp[i*3]=v.x;pp[i*3+1]=v.y;pp[i*3+2]=v.z;var col=new T3.Color().setHSL(.55+Math.random()*.15,.25,.55+Math.random()*.45);cc[i*3]=col.r;cc[i*3+1]=col.g;cc[i*3+2]=col.b;}
 st.setAttribute('position',new T3.BufferAttribute(pp,3));st.setAttribute('color',new T3.BufferAttribute(cc,3));sc.add(new T3.Points(st,new T3.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.85,depthWrite:false})));
 O.sunMat=solSunMat();O.sun=new T3.Mesh(new T3.SphereGeometry(9,64,48),O.sunMat);sc.add(O.sun);
 var gl=new T3.Sprite(new T3.SpriteMaterial({map:solGlowTex(true),blending:T3.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.setScalar(80);sc.add(gl);
 var gl2=new T3.Sprite(new T3.SpriteMaterial({map:solGlowTex(false),color:0xffc070,blending:T3.AdditiveBlending,depthWrite:false,transparent:true,opacity:.25}));gl2.scale.setScalar(260);sc.add(gl2);
 sc.add(new T3.AmbientLight(0xffffff,.02));
 var ecl=SOL.eph?SOL.eph.ecl:23.44*D2R,KIND={mercury:[0,0xa59e96],venus:[2,0xead9b0],mars:[3,0xc8643a],jupiter:[4,0xd9b98f,0xf4ead8],saturn:[4,0xe2cc94,0xf6ecd0],uranus:[5,0x9fdbe6,0xcff2f6],neptune:[5,0x4f74e8,0x8aa6ff]},
  RAD={mercury:.8,venus:1.4,earth:1.5,mars:1.05,jupiter:4.6,saturn:3.9,uranus:2.4,neptune:2.3};
 SOL_P.forEach(function(p){var id=p[0],grp=new T3.Group(),tilt=new T3.Group(),spin=new T3.Group(),mesh;grp.add(tilt);tilt.add(spin);sc.add(grp);
  if(id==='earth'){// the same Earth: day map, night lights, rotated by sidereal time
   var em=new T3.ShaderMaterial({uniforms:{dayMap:{value:earthMat?earthMat.uniforms.dayMap.value:null},nightMap:{value:earthMat?earthMat.uniforms.nightMap.value:null},uSunW:{value:new T3.Vector3()}},
    vertexShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*position);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform sampler2D dayMap,nightMap;uniform vec3 uSunW;varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vec3 L=normalize(uSunW-vW);float d=dot(normalize(vN),L);float day=smoothstep(-.1,.2,d);vec3 dc=texture2D(dayMap,vUv).rgb*(.15+1.05*max(d,0.));vec3 nc=texture2D(nightMap,vUv).rgb*1.6;gl_FragColor=vec4(mix(nc,dc,day),1.);\n#include <colorspace_fragment>\n}'});
   mesh=new T3.Mesh(globe?globe.geometry:new T3.SphereGeometry(R,64,48),em);mesh.scale.setScalar(RAD.earth/R);tilt.rotation.x=-ecl;O.earthMat=em;
   var atm=new T3.Mesh(new T3.SphereGeometry(RAD.earth*1.06,48,32),new T3.MeshBasicMaterial({color:0x6fa8ff,transparent:true,opacity:.12,side:T3.BackSide,depthWrite:false}));grp.add(atm);
   O.moonMat=solSurf(1,0xbbbbbb);O.moon=new T3.Mesh(new T3.SphereGeometry(.42,48,32),O.moonMat);sc.add(O.moon);
   var mr=[];for(var i=0;i<=128;i++){var a=i/128*Math.PI*2;mr.push(Math.cos(a)*3.4,0,Math.sin(a)*3.4);}var mg=new T3.BufferGeometry();mg.setAttribute('position',new T3.Float32BufferAttribute(mr,3));O.moonRing=new T3.Line(mg,new T3.LineBasicMaterial({color:0x9fb6ff,transparent:true,opacity:.3}));sc.add(O.moonRing);}
  else{var k=KIND[id];var m=solSurf(k[0],k[1],k[2]);mesh=new T3.Mesh(new T3.SphereGeometry(RAD[id],64,48),m);tilt.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),solPole(p[7],p[8],ecl));
   if(id==='saturn'){var rg=new T3.RingGeometry(RAD.saturn*1.24,RAD.saturn*2.27,160,1),pos=rg.attributes.position,uv=rg.attributes.uv;for(var j=0;j<pos.count;j++){var rr=Math.hypot(pos.getX(j),pos.getY(j));uv.setXY(j,(rr-RAD.saturn*1.24)/(RAD.saturn*1.03),0);}
    var rm=new T3.ShaderMaterial({transparent:true,side:T3.DoubleSide,depthWrite:false,uniforms:{uSunW:{value:new T3.Vector3()}},vertexShader:'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
     fragmentShader:'varying vec2 vUv;varying vec3 vW;float h(float x){return fract(sin(x*127.1)*43758.5);}void main(){float r=vUv.x;float b=.62+.3*sin(r*38.)*sin(r*11.+1.)+.12*h(floor(r*90.));float a=smoothstep(0.,.04,r)*(1.-smoothstep(.96,1.,r))*clamp(b,0.,1.);a*=1.-.85*smoothstep(.555,.575,r)*(1.-smoothstep(.6,.62,r));gl_FragColor=vec4(vec3(.93,.86,.7)*(.65+.35*b),a*.85);}'});
    var ring=new T3.Mesh(rg,rm);ring.rotation.x=-Math.PI/2;tilt.add(ring);O.ringMat=rm;}
   O[id+'Mat']=m;}
  spin.add(mesh);O.bodies[id]={grp:grp,tilt:tilt,spin:spin,mesh:mesh,r:RAD[id],p:p};
  // orbit line from the current elements
  if(id!=='earth'||true){var pts=[];for(var s=0;s<=360;s++){var el=id==='earth'?null:solEl(id,SOL.eph?SOL.eph.d:0),v;
    if(id==='earth'){var d0=SOL.eph?SOL.eph.d:0,ws=(282.9404+4.70935e-5*d0)*D2R,es=.016709,E=s/360*Math.PI*2,xv=Math.cos(E)-es,yv=Math.sqrt(1-es*es)*Math.sin(E),r=Math.hypot(xv,yv),l=Math.atan2(yv,xv)+ws+Math.PI;v=[r*Math.cos(l),r*Math.sin(l),0,r];}
    else v=solKep(el,s/360*Math.PI*2);var e3=solE3(v).normalize().multiplyScalar(solAU(v[3]));pts.push(e3.x,e3.y,e3.z);}
   var og=new T3.BufferGeometry();og.setAttribute('position',new T3.Float32BufferAttribute(pts,3));var ol=new T3.Line(og,new T3.LineBasicMaterial({color:p[5],transparent:true,opacity:id==='earth'?.55:.32}));sc.add(ol);O.orbits[id]=ol;}});
 SOL.orr=O;}
function solOrrUpdate(dt){var O=SOL.orr,o=SOL.eph;if(!O||!o)return;O.sunMat.uniforms.uT.value+=dt*(SOL.speed>0?4:1);
 SOL_P.forEach(function(p){var b=O.bodies[p[0]],v=o.P[p[0]];solE3(v,b.grp.position).normalize().multiplyScalar(solAU(v[3]));
  if(p[0]==='earth')b.spin.rotation.y=o.gmst*D2R;else b.spin.rotation.y=((o.d*24/p[9])%1)*Math.PI*2;
  var u=b.mesh.material.uniforms;if(u&&u.uSunW)u.uSunW.value.set(0,0,0);});
 if(O.ringMat)O.ringMat.uniforms.uSunW.value.set(0,0,0);
 var E=O.bodies.earth.grp.position,mv=solE3(o.moon).normalize();O.moon.position.copy(E).addScaledVector(mv,3.4);O.moon.lookAt(E);O.moonMat.uniforms.uSun.value.set(0,0,0);O.moonMat.uniforms.uSunW.value.set(0,0,0);
 var o2=solEph(solNow()+86400000),mv2=solE3(o2.moon).normalize(),nn=new T3.Vector3().crossVectors(mv,mv2).normalize();O.moonRing.position.copy(E);O.moonRing.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),nn);}
function solFocusPos(){var O=SOL.orr;if(!O)return new T3.Vector3();if(SOL.focus==='sun')return new T3.Vector3();var b=O.bodies[SOL.focus];return b?b.grp.position.clone():new T3.Vector3();}
function solOrrLabels(cam){var O=SOL.orr,o=SOL.eph;if(!O)return;solPlace(solLab('o_sun','☉ '+esc(I18P('太阳','Sun')),function(){solSetFocus('sun');}),new T3.Vector3(0,10,0),cam,true);
 SOL_P.forEach(function(p){var b=O.bodies[p[0]];var tag=p[0]==='earth'?' <span style="color:#7fe0c8">◀ '+esc(I18P('你在这里','you are here'))+'</span>':'';solPlace(solLab('o_'+p[0],esc(I18P(p[1],p[2]))+tag,function(){solSetFocus(p[0]);}),b.grp.position.clone().add(new T3.Vector3(0,b.r*1.3,0)),cam,true);});
 solPlace(solLab('o_moon','☾ '+esc(I18P('月球','Moon')),function(){solSetFocus('earth');solInfo('moon');}),O.moon.position,cam,orb.d<40);}
function solSetFocus(id,noInfo){SOL.focus=id;var b=SOL.orr&&SOL.orr.bodies[id],r=id==='sun'?9:b?b.r:2;want.d=Math.max(r*5,id==='sun'?160:r*9);solAim(id);if(!noInfo)solInfo(id);invalidate(2000);}
// look at a planet from its sunlit side (about 55° phase), slightly above the ecliptic
function solAim(id){var c;if(id==='sun'||!SOL.orr||!SOL.orr.bodies[id]){c=new T3.Vector3(.35,.55,1).normalize();}else{var P=SOL.orr.bodies[id].grp.position,s=P.clone().negate().setY(0).normalize();
  c=s.applyAxisAngle(new T3.Vector3(0,1,0),.95).setY(.42).normalize();}
 var th=Math.atan2(c.x,c.z),ph=Math.acos(Math.max(-1,Math.min(1,c.y)));want.th=orb.th+wrapDiff(orb.th,th);want.ph=Math.max(.12,Math.min(Math.PI-.12,ph));}
// ---- info card ----
function solInfo(id){var o=SOL.eph;if(!o)return;SOL.cardId=id;var c=SOL.card;if(!c){c=SOL.card=document.createElement('div');c.id='solCard';document.body.appendChild(c);}
 var p=null;SOL_P.forEach(function(q){if(q[0]===id)p=q;});var AU=149597870.7,h='';
 function row(a,b){return '<div class="sr"><span>'+a+'</span><b>'+b+'</b></div>';}
 if(id==='sun'){var de=o.P.earth[3];h='<h4>☉ '+esc(I18P('太阳','Sun'))+'</h4>'+row(esc(I18P('半径','Radius')),'696,000 km')+row(esc(I18P('离地球','From Earth')),de.toFixed(4)+' AU · '+solFmtKm(de*AU))+row(esc(I18P('光行时间','Light time')),(de*AU/299792.458/60).toFixed(1)+I18P(' 分钟',' min'));}
 else if(id==='moon'){var mk=o.moon[3]*6371;h='<h4>☾ '+esc(I18P('月球','Moon'))+'</h4>'+row(esc(I18P('半径','Radius')),'1,737 km')+row(esc(I18P('离地球','From Earth')),solFmtKm(mk))+row(esc(I18P('公转周期','Orbital period')),I18P('27.32 天','27.32 d'))+row(esc(I18P('光行时间','Light time')),(mk/299792.458).toFixed(2)+' s');}
 else if(p){var v=o.P[id],ge=id==='earth'?0:Math.hypot.apply(null,solGeo(id,o));h='<h4>'+esc(I18P(p[1],p[2]))+'</h4>'+row(esc(I18P('半径','Radius')),p[3].toLocaleString()+' km')+row(esc(I18P('离太阳','From the Sun')),v[3].toFixed(3)+' AU · '+solFmtKm(v[3]*AU))+
  (id==='earth'?'':row(esc(I18P('离地球','From Earth')),ge.toFixed(3)+' AU · '+solFmtKm(ge*AU))+row(esc(I18P('光行时间','Light time')),(ge*AU/299792.458/60).toFixed(1)+I18P(' 分钟',' min')))+
  row(esc(I18P('公转周期','Orbital period')),p[4]>800?(p[4]/365.256).toFixed(2)+I18P(' 年',' yr'):p[4].toFixed(1)+I18P(' 天',' d'))+row(esc(I18P('自转','Rotation')),Math.abs(p[9])>48?(Math.abs(p[9])/24).toFixed(1)+I18P(' 天',' d'):Math.abs(p[9]).toFixed(2)+' h'+(p[9]<0?I18P('（逆向）',' (retrograde)'):''));}
 c.innerHTML='<button class="x" title="close">×</button>'+h+'<div class="sn">'+esc(I18P('位置按所选日期实时计算（Schlyter 低精度星历，约 1–2 角分）。太阳系视角里的距离与大小经过压缩。','Positions computed for the chosen date (Schlyter low-precision ephemeris, ~1–2′). Distances and sizes in the solar-system view are compressed.'))+'</div>';
 c.style.display='block';c.querySelector('.x').onclick=function(){c.style.display='none';};}
// ---- time machine bar ----
function solBarUI(){var b=SOL.bar;if(!b){b=SOL.bar=document.createElement('div');b.id='solBar';document.body.appendChild(b);
  b.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;var s=t.getAttribute('data-sp');
   if(s==='live'){SOL.live=true;SOL.speed=0;}else if(s==='pause'){if(SOL.live){SOL.t=Date.now();SOL.live=false;}SOL.speed=0;}else if(s==='view'){if(SOL.view)solExit();else solEnter();}
   else{if(SOL.live){SOL.t=Date.now();SOL.live=false;}SOL.speed=+s;}SOL.at=-1;invalidate(1500);solBarUI();});}
 if((!SOL.on&&!SOL.view)||mode!=='globe'){b.style.display='none';return;}b.style.display='flex';var dt=new Date(solNow()),sp=SOL.live?'live':SOL.speed===0?'pause':String(SOL.speed);
 var btn=function(k,t){return '<button data-sp="'+k+'"'+(sp===k?' class="on"':'')+'>'+t+'</button>';};
 b.innerHTML='<b>'+dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0')+'</b>'+
  btn('live',esc(I18P('实时','Live')))+btn('pause','⏸')+btn('1',esc(I18P('1天/秒','1 d/s')))+btn('7',esc(I18P('1周/秒','1 wk/s')))+btn('30',esc(I18P('1月/秒','1 mo/s')))+btn('365',esc(I18P('1年/秒','1 yr/s')))+
  '<button data-sp="view" class="vw'+(SOL.view?' on':'')+'">'+esc(SOL.view?I18P('◀ 回到地球','◀ Back to Earth'):I18P('太阳系视角 ▶','Solar system view ▶'))+'</button>';}
// ---- enter / leave the orrery ----
function solEnter(){if(SOL.view)return;if(!SOL.on)solToggle(true);solUpdate(performance.now());if(!SOL.orr)solBuildOrr();SOL.save={d:R*3,ph:orb.ph,th:orb.th};SOL.view=true;SOL.focus='earth';
 autoRot=false;var tr=document.getElementById('tRot');if(tr)tr.setAttribute('aria-pressed','false');solOrrUpdate(0);orb.d=4;want.d=70;solAim('earth');wantLook.set(0,0,0);look.set(0,0,0);
 if(SOL.g)SOL.g.visible=false;labelsEl.style.visibility='hidden';solHideLabs();invalidate(3000);solBarUI();}
function solExit(){if(!SOL.view)return;SOL.view=false;var s=SOL.save||{};orb.d=R*60;want.d=R*3;want.ph=s.ph||1.15;wantLook.set(0,0,0);look.set(0,0,0);if(SOL.g)SOL.g.visible=SOL.on;labelsEl.style.visibility='';solHideLabs();
 camera.near=.1;camera.far=5000;camera.updateProjectionMatrix();invalidate(3000);solBarUI();}
function solToggle(on){SOL.on=on==null?!SOL.on:on;if(!SOL.g)solBuildGlobe();SOL.at=-1;var b=document.getElementById('tSol');if(b)b.setAttribute('aria-pressed',SOL.on);
 SOL.g.visible=SOL.on&&!SOL.view;if(STARS)STARS.scale.setScalar(SOL.on?12:1);if(!SOL.on){if(SOL.view)solExit();solHideLabs();if(SOL.card)SOL.card.style.display='none';want.d=Math.min(want.d,R*4.5);}
 invalidate(2500);solBarUI();}
// ---- per-frame: orrery view ----
function solFrame(dt,now){if(!SOL.live&&SOL.speed)SOL.t+=dt*SOL.speed*86400000;solUpdate(now);if(SOL.speed||SOL.live)solOrrUpdate(dt);
 var k=1-Math.pow(.0018,dt);orb.th+=(want.th-orb.th)*k;orb.ph+=(want.ph-orb.ph)*k;orb.d+=(want.d-orb.d)*k;var f=solFocusPos();look.lerp(f,1-Math.pow(.002,dt));
 camera.near=.05;camera.far=20000;camera.updateProjectionMatrix();camFromOrb();camera.lookAt(look);
 adaptRes(dt,now);renderer.clear();renderer.render(SOL.orr.scene,camera);RENDERS++;perfTick(now);solOrrLabels(camera);if(now-(SOL.barAt||0)>500){SOL.barAt=now;solBarUI();}}
function solZoom(f){if(SOL.view){want.d=Math.max(2.5,Math.min(1400,want.d*f));if(f<1&&SOL.focus==='earth'&&want.d<3.2){SOL.out+=1-f;if(SOL.out>.35){SOL.out=0;solExit();}}else SOL.out=0;return true;}
 if(SOL.on&&mode==='globe'&&!CINE){want.d=Math.max(R*1.04,Math.min(R*95,want.d*f));if(f>1&&want.d>=R*94){SOL.out+=f-1;if(SOL.out>.5){SOL.out=0;solEnter();}}else SOL.out=0;if(f<1&&want.d<R*1.09)worldDive();return true;}
 return false;}
function solPick(){var O=SOL.orr;if(!O)return;ray.setFromCamera(ndc,camera);var best=null,bd=1e9;for(var id in O.bodies){var b=O.bodies[id],h=ray.intersectObject(b.mesh,false);if(h.length&&h[0].distance<bd){bd=h[0].distance;best=id;}}
 if(!best){var hs=ray.intersectObject(O.sun,false);if(hs.length)best='sun';}if(best)solSetFocus(best);}

function frame(now){var dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 var dragging=Object.keys(ptrs).length>0;
 if(mode==='globe'&&SOL.view){solFrame(dt,now);}
 else if(mode==='globe'){
  var spinning=autoRot&&!dragging&&now-autoPause>2200;
  if(spinning)want.th+=dt*.05;
  var k=1-Math.pow(.0018,dt);orb.th+=(want.th-orb.th)*k;orb.ph+=(want.ph-orb.ph)*k;orb.d+=(want.d-orb.d)*k;look.lerp(wantLook,k);
  var settling=Math.abs(want.th-orb.th)+Math.abs(want.ph-orb.ph)+Math.abs(want.d-orb.d)/R>2e-5||look.distanceToSquared(wantLook)>1e-6;
  var nf=SOL.on?[.5,60000]:[.1,5000];if(camera.near!==nf[0]||camera.far!==nf[1]){camera.near=nf[0];camera.far=nf[1];camera.updateProjectionMatrix();}
  camFromOrb();camera.lookAt(look);
  if(SHAKE>1e-5){camera.position.x+=(Math.random()-.5)*SHAKE;camera.position.y+=(Math.random()-.5)*SHAKE;camera.position.z+=(Math.random()-.5)*SHAKE;SHAKE*=Math.pow(.02,dt);settling=true;}
  camN2.copy(camera.position).normalize();
  sunTmp.copy(camN2);tmpQ.setFromAxisAngle(rotAxis,night?Math.PI*.92:-.82);sunTmp.applyQuaternion(tmpQ);sunTmp.y+=.22;sunTmp.normalize();
  if(SOL.on){if(!SOL.live&&SOL.speed)SOL.t+=dt*SOL.speed*86400000;if(solUpdate(now))renderUntil=Math.max(renderUntil,now+80);if(SOL.sunDir)sunTmp.copy(SOL.sunDir);if(SOL.speed)renderUntil=Math.max(renderUntil,now+100);}
  var sunMoving=sunDir.distanceToSquared(sunTmp)>1e-7;sunDir.lerp(sunTmp,1-Math.pow(.02,dt)).normalize();
  if(updateStrikes(dt))renderUntil=Math.max(renderUntil,now+60);
  if(!(spinning||settling||sunMoving||dragging||now<renderUntil)){ // idle: no GPU work at all
   if(!wasIdle){wasIdle=true;updateLabels(true);}return;}
  if(wasIdle){wasIdle=false;last=now;dt=0;}
  adaptRes(dt,now);
  if(earthMat){earthMat.uniforms.sunDir.value.copy(sunDir);earthMat.uniforms.camPos.value.copy(camera.position);earthMat.uniforms.nightBoost.value=night?1.4:1;}
  if(nodePts)nodePts.material.uniforms.camPos.value.copy(camera.position);
  sun.position.copy(sunDir).multiplyScalar(1000);
  var t=now/1000;FEAT.forEach(function(o){var ph=((t*.6+o.ph)%1);var s=1+ph*2.2;o.ring.scale.set(s,s,1);o.ring.material.opacity=.8*(1-ph);});
  renderer.clear();renderer.render(scene,camera);RENDERS++;perfTick(now);
  updateLabels();winPlace();if(SOL.on){solGlobeLabels();if(now-(SOL.barAt||0)>500){SOL.barAt=now;solBarUI();}}
 } else {
  if(SOL._labsOn){SOL._labsOn=false;solHideLabs();if(SOL.bar)SOL.bar.style.display='none';}
  var stillMs=motionStill(now,dragging);
  if(stillMs>1500&&now-MV.lastR<32)return; // nothing moving: cap at ~30 fps so the GPU rests
  dt=Math.min(.05,Math.max(0,(now-(MV.lastR||now))/1000));MV.lastR=now;
  if(stillMs<350&&QUAL.m!=='hq')adaptRes(dt,now);else if(pr<PR_MAX){pr=PR_MAX;renderer.setPixelRatio(pr);resize();} // still = always native resolution
  var kk=1-Math.pow(.004,dt);
  L2.cam.az+=(L2.camWant.az-L2.cam.az)*kk;L2.cam.el+=(L2.camWant.el-L2.cam.el)*kk;L2.cam.d+=(L2.camWant.d-L2.cam.d)*kk;
  stepTraffic(L2.traffic,dt);
  droneStep(dt,now);
  var _t0=performance.now();drvStep(dt,now);var _t1=performance.now();lifeStep(dt,now);var _t2=performance.now();LIFE.ms=LIFE.ms*.9+(_t2-_t1)*.1;DRV.ms=(DRV.ms||0)*.9+(_t1-_t0)*.1;liveKeys(dt);travelStep(dt);if(L2.live){liveUpdate();lodStep(now);liveTraffic(dt);midUpdate(now);farUpdate(now);}farLabels(now);
  streetCamPos();drvCam(dt);envStep(dt,now);skyStep(dt,now);
  var dnf=DRV.on?drvNearFar():null,wn=dnf?dnf[0]:SKYV.on?Math.max(8,L2.cam.d*.04):Math.max(1,Math.min(12,L2.cam.d*.009)),wf=dnf?dnf[1]:SKYV.on?Math.max(60000,L2.cam.d*3):60000;if(Math.abs(camera.near-wn)>.25||camera.far!==wf){camera.near=wn;camera.far=wf;camera.updateProjectionMatrix();}
  renderer.clear();renderer.render(streetScene,camera);perfTick(now);
  navHudStep(dt,now);dockNav();clStep();winPlace();srchPinStep();dLayout(now);mmStep(now);lzrStep(now);smapStep(dt,now);lidStep(dt,now);
 }
}

// ====================================================================
// SECURITY-EVENT TIMELINE — verified historical incidents placed at the location of primary impact.
// Selecting a year strikes that year's events with lightning; markers of earlier years stay, fading with age.
// ====================================================================
var EV=[],EVBY={},EVY={},evPts=null,tlYear=2026,tlMinY=1971,tlMaxY=2026,STRIKES=[],tlTimer=null,glowTex=null;
var CATN={zh:{worm:'蠕虫',virus:'病毒',trojan:'木马',ransomware:'勒索软件',breach:'数据泄露',vuln:'漏洞',ddos:'DDoS',ics:'工控/关键设施',
 'supply-chain':'供应链',fraud:'金融欺诈',milestone:'里程碑',outage:'故障（非攻击）',espionage:'窃密/间谍',advisory:'通报/处罚',botnet:'僵尸网络',phishing:'钓鱼'},
 en:{worm:'Worm',virus:'Virus',trojan:'Trojan',ransomware:'Ransomware',breach:'Breach',vuln:'Vulnerability',ddos:'DDoS',ics:'ICS / critical infra',
 'supply-chain':'Supply chain',fraud:'Financial fraud',milestone:'Milestone',outage:'Outage (not an attack)',espionage:'Espionage',advisory:'Advisory / penalty',botnet:'Botnet',phishing:'Phishing'}};
function evTitle(e){return I18P(e.tz,e.te);}
function makeGlowTex(){var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');var gr=g.createRadialGradient(64,64,0,64,64,64);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.85)');gr.addColorStop(.45,'rgba(255,255,255,.25)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
 var t=new T3.CanvasTexture(c);return t;}
function buildEvents(data){
 EV=(data&&data.events)||[];EVBY={};EVY={};
 EV.forEach(function(e){EVBY[e.id]=e;if(evPass(e))(EVY[e.y]||(EVY[e.y]=[])).push(e);if(!e.g){e.P=ll2v(e.lat,e.lon,R*1.008);e.N=e.P.clone().normalize();}});
 if(!EV.length)return;
 tlMinY=Math.min.apply(null,EV.map(function(e){return e.y;}));tlMaxY=Math.max.apply(null,EV.map(function(e){return e.y;}));
 var loc=EV.filter(function(e){return !e.g;});var n=loc.length,P=new Float32Array(n*3),C=new Float32Array(n*3),A=new Float32Array(n),S=new Float32Array(n);
 loc.forEach(function(e,i){e.pi=i;P[i*3]=e.P.x;P[i*3+1]=e.P.y;P[i*3+2]=e.P.z;var c=new T3.Color(lvColor(e.sl));C[i*3]=c.r;C[i*3+1]=c.g;C[i*3+2]=c.b;S[i]=7+e.sl*2.2;});
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(P,3));g.setAttribute('color',new T3.BufferAttribute(C,3));g.setAttribute('alpha',new T3.BufferAttribute(A,1));g.setAttribute('sz',new T3.BufferAttribute(S,1));
 evPts=new T3.Points(g,new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,uniforms:{uPx:{value:Math.min(2,window.devicePixelRatio||1)},uT:{value:0}},
  vertexShader:'attribute float sz;attribute float alpha;attribute vec3 color;varying vec3 vC;varying float vA;uniform float uPx;void main(){vC=color;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=alpha>0.0?sz*uPx*clamp(300.0/-mv.z,0.8,2.4)*(0.75+0.35*alpha):0.0;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 q=gl_PointCoord-0.5;float r=length(q);if(r>0.5||vA<=0.0)discard;float core=smoothstep(0.16,0.0,r);float halo=smoothstep(0.5,0.12,r)*0.55;float ring=smoothstep(0.05,0.0,abs(r-0.34))*0.8;gl_FragColor=vec4(vC*(core*1.4+halo+ring),(core+halo*0.6+ring*0.7)*vA);}'}));
 evPts.renderOrder=3;world.add(evPts);
 glowTex=makeGlowTex();
 var rg=document.getElementById('tlRange');rg.min=tlMinY;rg.max=tlMaxY;document.getElementById('tlMin').textContent=tlMinY;document.getElementById('tlMax').textContent=tlMaxY;
 buildHist();
 rg.addEventListener('input',function(){stopPlay();selectYear(+rg.value,true);});
 document.getElementById('tlPlay').onclick=function(){if(tlTimer)stopPlay();else startPlay();};
 selectYear(tlMaxY,false);renderEvFilter();
}
function buildHist(){var h=document.getElementById('tlHist');var max=1;for(var y=tlMinY;y<=tlMaxY;y++)max=Math.max(max,(EVY[y]||[]).length);
 var html='';for(y=tlMinY;y<=tlMaxY;y++){var l=EVY[y]||[];var top=l.reduce(function(m,e){return Math.max(m,e.sl);},-1);
  html+='<i data-y="'+y+'" class="'+(l.length?'':'empty')+'" style="height:'+(l.length?Math.max(18,l.length/max*100):10)+'%;background:'+(top>=0?lvColor(top):'')+';color:'+(top>=0?lvColor(top):'transparent')+'" title="'+y+' · '+l.length+'"></i>';}
 h.innerHTML=html;h.onclick=function(ev){var b=ev.target.closest('i');if(b){stopPlay();selectYear(+b.dataset.y,true);}};}
function selectYear(y,strike){tlYear=y;var rg=document.getElementById('tlRange');if(+rg.value!==y)rg.value=y;
 document.getElementById('tlYear').textContent=y;
 var list=EVY[y]||[];var top=list.reduce(function(m,e){return Math.max(m,e.sl);},-1);
 document.getElementById('tlInfo').textContent=list.length?(I18P(list.length+' 起事件 · 最高 SL'+(top+1)+' · 点光点看详情',list.length+' events · max SL'+(top+1)+' · click a marker')):(I18T('no_recorded_major_event'));
 document.querySelectorAll('#tlHist i').forEach(function(b){b.classList.toggle('on',+b.dataset.y===y);});
 var g=document.getElementById('tlGlob');g.innerHTML=list.filter(function(e){return e.g;}).map(function(e){return '<button data-ev="'+e.id+'"><i style="background:'+lvColor(e.sl)+'"></i>'+(I18T('global'))+esc(evTitle(e))+'</button>';}).join('');
 g.onclick=function(ev){var b=ev.target.closest('button');if(b)openEvent(b.dataset.ev);};
 if(evPts){var A=evPts.geometry.attributes.alpha;EV.forEach(function(e){if(e.g)return;var age=y-e.y;A.array[e.pi]=(age<0||!evPass(e))?0:age===0?1:Math.max(.16,.62-age*.05);});A.needsUpdate=true;}
 if(strike){list.slice(0,8).forEach(function(e,i){setTimeout(function(){if(tlYear===y&&STRIKES.length<4)strikeEvent(e);},i*1100);});}
 invalidate(400);
}
function startPlay(){var b=document.getElementById('tlPlay');b.textContent='❚❚';autoRot=false;tRot.setAttribute('aria-pressed','false');
 var y=tlYear>=tlMaxY?tlMinY:tlYear+1;
 function step(){selectYear(y,true);var l=(EVY[y]||[]).filter(function(e){return !e.g;}).sort(function(a,b){return b.sl-a.sl;});if(l.length&&mode==='globe')cineView(l[0]);
  if(y>=tlMaxY){stopPlay();return;}y++;var cnt=(EVY[y-1]||[]).length;tlTimer=setTimeout(step,cnt?Math.max(5200,2600+cnt*900):420);}
 step();}
function stopPlay(){if(tlTimer){clearTimeout(tlTimer);tlTimer=null;}var b=document.getElementById('tlPlay');if(b)b.textContent='▶';}
// ---- lightning: cinematic, slowed, 4 phases (lock-on → charge → descent → aftermath) ----
class PolyCurve extends T3.Curve{constructor(pts){super();this.pts=pts;}getPoint(t,o){o=o||new T3.Vector3();var n=this.pts.length-1,f=t*n,i=Math.min(n-1,Math.floor(f));return o.copy(this.pts[i]).lerp(this.pts[i+1],f-i);}}
function boltPoints(a,b,segs,amp){var dir=b.clone().sub(a),len=dir.length();dir.normalize();var u=new T3.Vector3(0,1,0).cross(dir);if(u.lengthSq()<1e-6)u.set(1,0,0).cross(dir);u.normalize();var v=dir.clone().cross(u).normalize();
 var pts=[a.clone()];for(var i=1;i<segs;i++){var t=i/segs;var w=Math.sin(Math.PI*t)*amp*len*(.6+.8*Math.random());pts.push(a.clone().lerp(b,t).addScaledVector(u,(Math.random()*2-1)*w).addScaledVector(v,(Math.random()*2-1)*w));}pts.push(b.clone());return pts;}
var reticleTex=null;
function makeReticleTex(){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');g.translate(128,128);g.strokeStyle='#fff';g.fillStyle='#fff';
 g.lineWidth=3;g.beginPath();g.arc(0,0,118,0,Math.PI*2);g.stroke();g.lineWidth=1.5;g.setLineDash([10,8]);g.beginPath();g.arc(0,0,96,0,Math.PI*2);g.stroke();g.setLineDash([]);
 g.lineWidth=2;for(var i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.beginPath();g.moveTo(0,-126);g.lineTo(0,-102);g.stroke();g.beginPath();g.arc(0,0,70,-.5,.5);g.stroke();g.restore();}
 for(i=0;i<36;i++){g.save();g.rotate(i*Math.PI/18);g.fillRect(-1,-118,2,i%3?6:12);g.restore();}
 g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.stroke();g.fillRect(-1,-30,2,16);g.fillRect(-1,14,2,16);g.fillRect(-30,-1,16,2);g.fillRect(14,-1,16,2);
 var t=new T3.CanvasTexture(c);return t;}
var beamMat=function(col){return new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,side:T3.DoubleSide,uniforms:{uC:{value:col.clone()},uO:{value:0},uT:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:'uniform vec3 uC;uniform float uO;uniform float uT;varying vec2 vUv;void main(){float edge=pow(1.0-abs(vUv.x*2.0-1.0)*0.0,1.0);float fall=smoothstep(0.0,0.15,vUv.y)*(1.0-vUv.y*0.55);float scan=0.65+0.35*sin(vUv.y*60.0-uT*14.0);gl_FragColor=vec4(uC*scan,uO*fall*edge*0.55);}'});};
var SHAKE=0;
function surfaceBasis(n){var north=new T3.Vector3(0,1,0).addScaledVector(n,-n.y);if(north.lengthSq()<1e-4)north.set(1,0,0).addScaledVector(n,-n.x);north.normalize();var east=north.clone().cross(n).normalize();return {north:north,east:east};}
// cinematic camera: drop to a low oblique angle so the bolt is seen side-on, not end-on
function cineView(e){if(e.g||mode!=='globe')return;var n=e.N,B=surfaceBasis(n);var tilt=68*D2R;
 var dir=n.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(B.north,-Math.sin(tilt)).normalize();
 var a=dirAngles(dir);want.th=orb.th+wrapDiff(orb.th,a.th);want.ph=Math.max(.05,Math.min(Math.PI-.05,a.ph));
 wantLook.copy(n).multiplyScalar(R*1.26);want.d=R*1.55;autoRot=false;tRot.setAttribute('aria-pressed','false');CINE=true;invalidate(2500);}
var CINE=false;
function leaveCine(){if(!CINE)return;CINE=false;var dir=camera.position.clone().normalize();var a=dirAngles(dir);want.th=orb.th+wrapDiff(orb.th,a.th);want.ph=Math.max(.12,Math.min(Math.PI-.12,a.ph));wantLook.set(0,0,0);want.d=R*2.2;invalidate(1500);}
function strikeEvent(e){if(mode!=='globe')return;if(STRIKES.length>=5)return;var col=new T3.Color(lvColor(e.sl));var grp=new T3.Group();
 if(e.g){ // global event: a slow planetary shockwave
  var ring=new T3.Mesh(new T3.RingGeometry(R*1.0,R*1.03,160),new T3.MeshBasicMaterial({color:col,transparent:true,opacity:0,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false}));
  ring.lookAt(camera.position);grp.add(ring);
  var ring2=ring.clone();ring2.material=ring.material.clone();grp.add(ring2);
  var halo=new T3.Sprite(new T3.SpriteMaterial({map:glowTex,color:col,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(R*3.2);grp.add(halo);
  world.add(grp);STRIKES.push({g:grp,t:0,life:3.4,global:true,ring:ring,ring2:ring2,halo:halo,tag:makeTag(e,null)});invalidate(3600);return;}
 var n=e.N,H=R*(.42+.04*e.sl);
 var top=n.clone().multiplyScalar(R*1.004+H),bot=n.clone().multiplyScalar(R*1.004);
 // 1) lock-on reticle on the ground
 if(!reticleTex)reticleTex=makeReticleTex();
 var ret=new T3.Mesh(new T3.PlaneGeometry(R*.11,R*.11),new T3.MeshBasicMaterial({map:reticleTex,color:col,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}));
 ret.position.copy(n).multiplyScalar(R*1.006);ret.lookAt(n.clone().multiplyScalar(R*2));grp.add(ret);
 // 2) targeting beam from orbit
 var beamG=new T3.CylinderGeometry(R*.010,R*.004,H,24,1,true);beamG.translate(0,H/2,0);var beam=new T3.Mesh(beamG,beamMat(col));
 beam.position.copy(bot);beam.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),n);grp.add(beam);
 var orbS=new T3.Sprite(new T3.SpriteMaterial({map:glowTex,color:0xcfe6ff,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false}));orbS.position.copy(top);orbS.scale.setScalar(R*.02);grp.add(orbS);
 // 3) bolt (main + branches), revealed top→bottom
 var main=boltPoints(top,bot,14,.09);var bolts=[];
 function addBolt(pts,r,startF){var cv=new PolyCurve(pts);
  var core=new T3.Mesh(new T3.TubeGeometry(cv,pts.length*5,r,5,false),new T3.MeshBasicMaterial({color:0xf2fbff,transparent:true,opacity:1,blending:T3.AdditiveBlending,depthWrite:false}));
  var glow=new T3.Mesh(new T3.TubeGeometry(cv,pts.length*5,r*4,8,false),new T3.MeshBasicMaterial({color:col,transparent:true,opacity:.6,blending:T3.AdditiveBlending,depthWrite:false}));
  core.geometry.setDrawRange(0,0);glow.geometry.setDrawRange(0,0);grp.add(glow);grp.add(core);bolts.push({core:core,glow:glow,start:startF,n:core.geometry.index.count,ng:glow.geometry.index.count});}
 addBolt(main,R*.0028,0);
 var nb=1+(e.sl>=3?1:0);for(var k=0;k<nb;k++){var si=4+Math.floor(Math.random()*12);var s0=main[si];var B=surfaceBasis(n);
  var end=s0.clone().lerp(bot,.35+.3*Math.random()).addScaledVector(B.north,(Math.random()-.5)*R*.12).addScaledVector(B.east,(Math.random()-.5)*R*.12);addBolt(boltPoints(s0,end,9,.16),R*.0013,si/22);}
 // 4) impact: flash, shock rings, sparks
 var flash=new T3.Sprite(new T3.SpriteMaterial({map:glowTex,color:col,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false}));flash.position.copy(bot);flash.scale.setScalar(R*.02);grp.add(flash);
 var white=new T3.Sprite(new T3.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false}));white.position.copy(bot);white.scale.setScalar(R*.05);grp.add(white);
 var rings=[];for(var q=0;q<3;q++){var rr=new T3.Mesh(new T3.RingGeometry(R*.008,R*.0105,64),new T3.MeshBasicMaterial({color:q?col:0xffffff,transparent:true,opacity:0,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false}));
  rr.position.copy(n).multiplyScalar(R*1.0065);rr.lookAt(n.clone().multiplyScalar(R*2));grp.add(rr);rings.push(rr);}
 var NS=40,sp=new Float32Array(NS*3),vel=[],Bs=surfaceBasis(n);for(var j=0;j<NS;j++){var ang=Math.random()*Math.PI*2,sv=R*(.04+.12*Math.random());
  vel.push(Bs.north.clone().multiplyScalar(Math.cos(ang)*sv).addScaledVector(Bs.east,Math.sin(ang)*sv).addScaledVector(n,R*(.06+.16*Math.random())));sp[j*3]=bot.x;sp[j*3+1]=bot.y;sp[j*3+2]=bot.z;}
 var spG=new T3.BufferGeometry();spG.setAttribute('position',new T3.BufferAttribute(sp,3));
 var sparks=new T3.Points(spG,new T3.PointsMaterial({color:col.clone().lerp(new T3.Color(0xffffff),.5),size:R*.006,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));grp.add(sparks);
 world.add(grp);
 STRIKES.push({g:grp,t:0,life:4.2,e:e,n:n,bot:bot,top:top,ret:ret,beam:beam,orb:orbS,bolts:bolts,flash:flash,white:white,rings:rings,sparks:sparks,vel:vel,hit:false,tag:makeTag(e,bot.clone().addScaledVector(n,H*.55))});invalidate(4400);}
function makeTag(e,anchor){var d=document.createElement('div');d.className='strike-tag';d.style.setProperty('--c',lvColor(e.sl));
 d.innerHTML='<b>'+e.y+' · SL'+(e.sl+1)+'</b><span>'+esc(evTitle(e))+'</span><em>'+esc(e.g?(I18T('global_2')):(I18P(e.pz,e.pe)))+'</em>';
 d.onclick=function(){openEvent(e.id);};labelsEl.appendChild(d);return {el:d,anchor:anchor};}
function ease(x){return x<0?0:x>1?1:x*x*(3-2*x);}
function seg(u,a,b){return ease((u-a)/(b-a));}
function updateStrikes(dt){if(!STRIKES.length)return false;if(window.__strikeSlow)dt*=window.__strikeSlow;var W=canvas.clientWidth,Hh=canvas.clientHeight;
 for(var i=STRIKES.length-1;i>=0;i--){var s=STRIKES[i];s.t+=dt;var T=s.t;
  if(T>=s.life){world.remove(s.g);disposeTree(s.g);if(s.tag)s.tag.el.remove();STRIKES.splice(i,1);continue;}
  // floating holographic tag
  if(s.tag){var tg=s.tag.el,op=seg(T,.5,1.1)*(1-seg(T,s.life-.8,s.life));var ap=s.tag.anchor;
   if(ap){var mid=ap.clone();if(facingOK(mid,s.n,.05)&&toScreen(mid,W,Hh)){tg.style.transform='translate('+(SCR.x+14)+'px,'+(SCR.y-6)+'px)';tg.style.opacity=op;}else tg.style.opacity=0;}
   else{tg.style.transform='translate('+(W*.5-110)+'px,'+(Hh*.18)+'px)';tg.style.opacity=op;}}
  if(s.global){var u=T/s.life;var a1=seg(T,0,.5)*(1-seg(T,1.2,s.life));s.ring.scale.setScalar(1+seg(T,0,s.life)*.5);s.ring.material.opacity=.9*a1;
   s.ring2.scale.setScalar(1+seg(T,.5,s.life)*.35);s.ring2.material.opacity=.6*seg(T,.5,.9)*(1-seg(T,1.6,s.life));s.halo.material.opacity=.32*Math.sin(Math.PI*Math.min(1,u*1.4));continue;}
  // phase 1 · lock-on (0–0.8s)
  var lock=seg(T,0,.45)*(1-seg(T,3.2,4.0));s.ret.material.opacity=.95*lock;s.ret.rotation.z+=dt*(T<1.3?2.2:.6);var rs=1.6-.6*seg(T,0,.6);s.ret.scale.set(rs,rs,1);
  s.beam.material.uniforms.uO.value=seg(T,.15,.7)*(1-seg(T,1.35,1.9));s.beam.material.uniforms.uT.value=T;
  // phase 2 · charge (0.4–1.3s)
  var ch=seg(T,.35,1.3);s.orb.material.opacity=(.25+.7*ch)*(1-seg(T,1.45,2.0));s.orb.scale.setScalar(R*(.02+.09*ch)*(1+.12*Math.sin(T*40)));
  // phase 3 · descent (1.3–1.75s) — the bolt grows from the sky to the ground
  var grow=seg(T,1.3,1.75);var flick=T<1.75?1:T<2.6?(Math.random()<.78?1:.3):Math.max(0,1-(T-2.6)/1.1);
  s.bolts.forEach(function(b){var f=Math.max(0,Math.min(1,(grow-b.start)/(1-b.start||1)));var c3=Math.floor(b.n*f/3)*3,cg=Math.floor(b.ng*f/3)*3;
   b.core.geometry.setDrawRange(0,c3);b.glow.geometry.setDrawRange(0,cg);b.core.material.opacity=flick;b.glow.material.opacity=.6*flick;});
  // phase 4 · impact & aftermath (1.75s →)
  if(!s.hit&&T>=1.75){s.hit=true;SHAKE=Math.max(SHAKE,.0028*R*(1+s.e.sl*.25));}
  var im=T-1.75;
  if(im>=0){s.white.material.opacity=Math.max(0,1-im/.35);s.white.scale.setScalar(R*(.05+.25*seg(im,0,.3)));
   s.flash.material.opacity=Math.max(0,1-im/2.2);s.flash.scale.setScalar(R*(.03+.14*seg(im,0,.5)));
   s.rings.forEach(function(r,q){var t2=im-q*.22;var f=seg(t2,0,1.9);r.scale.setScalar(1+f*11);r.material.opacity=t2<0?0:.95*(1-f);});
   var P=s.sparks.geometry.attributes.position.array;s.sparks.material.opacity=Math.max(0,1-im/2.0);
   for(var j=0;j<s.vel.length;j++){var v=s.vel[j];P[j*3]+=v.x*dt;P[j*3+1]+=v.y*dt;P[j*3+2]+=v.z*dt;v.addScaledVector(s.n,-R*.18*dt);v.multiplyScalar(1-1.2*dt);}
   s.sparks.geometry.attributes.position.needsUpdate=true;}
 }
 return true;}
function nearestEvent(cx,cy,W,H,maxPx){if(!evPts)return null;var best=null,bd=maxPx;var A=evPts.geometry.attributes.alpha.array;
 EV.forEach(function(e){if(e.g||A[e.pi]<=0)return;if(!facingOK(e.P,e.N,.2)||!toScreen(e.P,W,H))return;var d=Math.hypot(SCR.x-cx,SCR.y-cy)-(A[e.pi]>=1?4:0);if(d<bd){bd=d;best=e;}});return best;}
function openEvent(id){var e=EVBY[id];if(!e)return;if(panel.classList.contains('min'))setPanel(true);renderEvent(e);if(mode==='globe'){if(!e.g)cineView(e);setTimeout(function(){strikeEvent(e);},e.g?0:700);}}
function renderEvent(e){
 var zh=LZ();var cat=(LX(CATN)||CATN.zh)[e.cat]||e.cat;
 var meta='<span class="badge" style="background:'+lvColor(e.sl)+'">SL'+(e.sl+1)+'</span><span class="chip">'+esc(e.d)+'</span><span class="chip">'+esc(cat)+'</span>'+(e.cve?'<span class="chip">'+esc(e.cve)+'</span>':'');
 pHead.innerHTML=headHTML((I18T('security_event'))+e.y,evTitle(e),meta,true);
 var body='<div class="sec"><h3>'+(I18T('where'))+'</h3><p>'+esc(e.g?(I18T('global_3'))+(I18P(e.pz,e.pe)):(I18P(e.pz,e.pe)))+'</p></div>';
 body+='<div class="sec">'+(I18P(triHTML(e.a,e.p,e.x),'<div class="tri"><div class="blk a"><div class="t"><i></i>'+T('auth')+'</div><p>'+esc(e.ae)+'</p></div></div>'))+'</div>';
 body+=orgChipsHTML(e);
 body+='<div class="sec"><h3>'+(I18T('sources'))+'</h3><div class="src">'+e.src.map(function(u){var h=u.replace(/^https?:\/\//,'').split('/')[0];return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(h)+'</a>';}).join('')+'</div></div>';
 var same=(EVY[e.y]||[]).filter(function(o){return o.id!==e.id;});
 if(same.length)body+='<div class="sec"><h3>'+(I18T('same_year'))+'</h3><div class="flychips">'+same.map(function(o){return '<button data-ev="'+o.id+'"><i style="background:'+lvColor(o.sl)+'"></i>'+esc(evTitle(o))+'</button>';}).join('')+'</div></div>';
 body+='<div class="warnote">'+(I18T('location_marks_primary_impact'))+'</div>';
 pBody.innerHTML=body;wire();pBody.scrollTop=0;state={type:'event',id:e.id};
 pBody.querySelectorAll('[data-ev]').forEach(function(b){b.onclick=function(){openEvent(b.dataset.ev);};});
 if(tlYear!==e.y)selectYear(e.y,false);
 
}

// ====================================================================
// LIVE STREETS — when the page may reach the tile server (deployed build), streets are streamed
// tile-by-tile around the camera target instead of read from pre-built bundles. Panning loads tiles
// ahead and frees tiles behind, so neighbouring towns join into one continuous map.
// ====================================================================
var LIVE=false,TILE_TPL=null,TZ=14,TN=Math.pow(2,TZ);
function probeLive(){if(/nolive/.test(location.hash))return Promise.resolve(false);
 var ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort();},(typeof LIVEP!=='undefined'&&LIVEP.tries)?9000:6500);
 return fetch('https://tiles.openfreemap.org/planet',ctl?{signal:ctl.signal}:{}).then(function(r){return r.ok?r.json():null;}).then(function(j){clearTimeout(to);
  if(j&&j.tiles&&j.tiles[0]){TILE_TPL=j.tiles[0];LIVE=true;root.classList.add('live');}return LIVE;}).catch(function(){clearTimeout(to);return false;});}
// ---- minimal protobuf / Mapbox Vector Tile decoder ----
function mvtFactory(){
 function vi(r){var v=0,s=1,b;do{b=r.b[r.p++];v+=(b&0x7f)*s;s*=128;}while(b>=0x80);return v;}
 function sk(r,t){if(t===0)vi(r);else if(t===1)r.p+=8;else if(t===2){var l=vi(r);r.p+=l;}else if(t===5)r.p+=4;}
 var td=new TextDecoder();
 function st(r){var l=vi(r);var s=td.decode(r.b.subarray(r.p,r.p+l));r.p+=l;return s;}
 function pk(r){var l=vi(r),e=r.p+l,o=[];while(r.p<e)o.push(vi(r));return o;}
 function val(r){var l=vi(r),e=r.p+l,v=null;while(r.p<e){var t=vi(r),f=t>>3,w=t&7;
  if(f===1)v=st(r);else if(f===2){v=new DataView(r.b.buffer,r.b.byteOffset+r.p,4).getFloat32(0,true);r.p+=4;}
  else if(f===3){v=new DataView(r.b.buffer,r.b.byteOffset+r.p,8).getFloat64(0,true);r.p+=8;}
  else if(f===4||f===5)v=vi(r);else if(f===6){var z=vi(r);v=(z>>>1)^-(z&1);}else if(f===7)v=!!vi(r);else sk(r,w);}return v;}
 function feat(r){var l=vi(r),e=r.p+l,F={tags:[],type:0,geom:[]};while(r.p<e){var t=vi(r),f=t>>3,w=t&7;if(f===2)F.tags=pk(r);else if(f===3)F.type=vi(r);else if(f===4)F.geom=pk(r);else sk(r,w);}return F;}
 function lay(r){var l=vi(r),e=r.p+l,L={name:'',ext:4096,keys:[],vals:[],feats:[]};while(r.p<e){var t=vi(r),f=t>>3,w=t&7;
  if(f===1)L.name=st(r);else if(f===2)L.feats.push(feat(r));else if(f===3)L.keys.push(st(r));else if(f===4)L.vals.push(val(r));else if(f===5)L.ext=vi(r);else sk(r,w);}return L;}
 function decode(buf){var r={b:buf,p:0},out={};while(r.p<buf.length){var t=vi(r),f=t>>3,w=t&7;if(f===3){var L=lay(r);out[L.name]=L;}else sk(r,w);}return out;}
 function props(L,F){var p={};for(var i=0;i<F.tags.length;i+=2)p[L.keys[F.tags[i]]]=L.vals[F.tags[i+1]];return p;}
 function rings(g){var rs=[],x=0,y=0,cur=null,i=0;while(i<g.length){var c=g[i++],id=c&7,n=c>>3;
  if(id===1||id===2){for(var k=0;k<n;k++){var dx=g[i++],dy=g[i++];x+=(dx>>>1)^-(dx&1);y+=(dy>>>1)^-(dy&1);if(id===1){cur=[];rs.push(cur);}cur.push(x,y);}}}return rs;}
 return {decode:decode,props:props,rings:rings};}
var MVT=mvtFactory();
var tlx=function(lon){return (lon+180)/360*TN;},tly=function(lat){var s=Math.sin(lat*D2R);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*TN;};
var tilon=function(X){return X/TN*360-180;},tilat=function(Y){var m=Math.PI-2*Math.PI*Y/TN;return R2D*Math.atan(0.5*(Math.exp(m)-Math.exp(-m)));};
var RCLS={motorway:0,trunk:1,primary:2,secondary:3,tertiary:4,minor:5,service:6,track:7,path:8,rail:9,transit:9,busway:10,raceway:10,pier:11,ferry:11};
var LUCLS={residential:0,neighbourhood:0,suburb:0,quarter:0,garages:0,commercial:1,office:1,retail:2,industrial:3,railway:3,dam:3,
 education:4,school:4,university:4,college:4,kindergarten:4,hospital:4,stadium:4,bus_station:4,fairground:4,zoo:4,theme_park:4,religious:4,library:4};
var POI_OK={fuel:1,charging_station:1,railway:1,bus:1,ferry_terminal:1,aerialway:1,shop:1,grocery:1,cafe:1,restaurant:1,fast_food:1,bar:1,beer:1,ice_cream:1,bakery:1,alcohol_shop:1,clothing_store:1,lodging:1,cinema:1,theatre:1,library:1,museum:1,art_gallery:1,attraction:1,books:1,music:1,furniture:1,hardware:1,jewelry:1,car:1,bicycle:1,laundry:1,hairdresser:1,fitness:1,stadium:1,park:1,garden:1,golf:1,swimming:1,sports:1,shoe:1,mobile_phone:1,electronics:1,gift:1,florist:1,toys:1,cosmetics:1,optician:1,pet:1,stationery:1,department_store:1,convenience:1,supermarket:1,marketplace:1,entertainment:1,office:1,coworking:1};
// decode one tile into the same arrays the bundle builders use (local metres around the city origin)
function tileToLocal(buf,tx,ty,lv,OV,SC){SC=SC||1;
 var Ls=buf.byteLength!==undefined?MVT.decode(buf):buf,B=[],RD=[],OW=[],AC=[],LY=[],W=[],PK=[],LU=[],HN=[],RN=[],PO=[],PT=[];
 function conv(L,r){var o=new Array(r.length);for(var i=0;i<r.length;i+=2){var X=(tx+r[i]/L.ext)*SC,Y=(ty+r[i+1]/L.ext)*SC;o[i]=Math.round((tilon(X)-lv.lon0)*lv.mLon);o[i+1]=Math.round((tilat(Y)-lv.lat0)*lv.mLat);}return o;}
 function convR(L,r){var o=conv(L,r);if(lv.mLat>0)return o;var n=o.length,q=new Array(n);for(var i=0;i<n;i+=2){q[i]=o[n-2-i];q[i+1]=o[n-1-i];}return q;}
 function inTile(L,r){var cx=0,cy=0,n=r.length/2;for(var i=0;i<r.length;i+=2){cx+=r[i];cy+=r[i+1];}cx/=n;cy/=n;return cx>=0&&cx<L.ext&&cy>=0&&cy<L.ext;}
 var L,F,p,rs,i,c;
 if((L=Ls.building))for(F of L.feats){p=MVT.props(L,F);if(p.hide_3d)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){if(!inTile(L,rs[i]))continue;c=convR(L,rs[i]);var a=polyArea(c,0);if(a>=0||a>-4)continue;
  var cx=0,cy=0;for(var k=0;k<c.length;k+=2){cx+=c[k];cy+=c[k+1];}cx/=c.length/2;cy/=c.length/2;
  B.push({h:Math.round((p.render_height||5)*10)/10,mh:Math.round((p.render_min_height||0)*10)/10,c:c,cx:cx,cy:cy,foot:-a});}}
 var ovt=false;if(OV&&(L=OV.building)){var B2=[];for(F of L.feats){if(F.type!==3)continue;p=MVT.props(L,F);if(p.is_underground===true||p.is_underground==='true')continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){if(!inTile(L,rs[i]))continue;c=convR(L,rs[i]);var a2=polyArea(c,0);if(a2>=0||a2>-4)continue;
   var qx=0,qy=0;for(var k3=0;k3<c.length;k3+=2){qx+=c[k3];qy+=c[k3+1];}qx/=c.length/2;qy/=c.length/2;B2.push({h:Math.round(ovtHeight(p,qx,qy)*10)/10,mh:Math.round((+p.min_height||0)*10)/10,c:c,cx:qx,cy:qy,foot:-a2,oc:p.class||'',os:p.subtype||''});}}
  if(B2.length>B.length*1.15){B=B2;ovt=true;}}
 if((L=Ls.transportation))for(F of L.feats){if(F.type!==2)continue;p=MVT.props(L,F);var k2=RCLS[p.class];if(k2===undefined)continue;var br=p.brunnel==='bridge'?1:p.brunnel==='tunnel'?2:0;
  rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=conv(L,rs[i]);if(c.length>=4){RD.push([k2,br].concat(c));LY.push(br===1?(+p.layer||1):0);OW.push(p.oneway===1||p.oneway==='1'?1:p.oneway===-1||p.oneway==='-1'?-1:0);AC.push(p.access==='no'||p.access==='private'?2:(p.service==='driveway'||p.service==='parking_aisle'||p.service==='drive-through'||p.service==='emergency_access')?1:0);}}}
 if((L=Ls.water))for(F of L.feats){if(F.type!==3)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=convR(L,rs[i]);if(polyArea(c,0)<-40)W.push(c);}}
 if((L=Ls.park))for(F of L.feats){if(F.type!==3)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=convR(L,rs[i]);if(polyArea(c,0)<-40)PK.push([1].concat(c));}}
 if((L=Ls.landcover))for(F of L.feats){if(F.type!==3)continue;p=MVT.props(L,F);if(p.class!=='grass'&&p.class!=='wood')continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=convR(L,rs[i]);if(polyArea(c,0)<-40)PK.push([2].concat(c));}}
 if((L=Ls.landuse))for(F of L.feats){if(F.type!==3)continue;p=MVT.props(L,F);var lk=LUCLS[p.class];if(lk===undefined)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=convR(L,rs[i]);if(polyArea(c,0)>=0)continue;
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(var q=0;q<c.length;q+=2){x0=Math.min(x0,c[q]);y0=Math.min(y0,c[q+1]);x1=Math.max(x1,c[q]);y1=Math.max(y1,c[q+1]);}LU.push({k:lk,raw:p.class,c:c,bb:[x0,y0,x1,y1],ar:-polyArea(c,0)});}}
 if((L=Ls.housenumber))for(F of L.feats){if(F.type!==1)continue;p=MVT.props(L,F);if(!p.housenumber)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){if(!inTile(L,rs[i]))continue;c=convR(L,rs[i]);HN.push(c[0],c[1],p.housenumber);}}
 if((L=Ls.transportation_name))for(F of L.feats){if(F.type!==2)continue;p=MVT.props(L,F);if(!p.name)continue;rs=MVT.rings(F.geom);for(i=0;i<rs.length;i++){c=convR(L,rs[i]);if(c.length>=4)RN.push({n:p.name,zh:p['name:zh']||'',c:c});}}
 if((L=Ls.poi))for(F of L.feats){if(F.type!==1)continue;p=MVT.props(L,F);rs=MVT.rings(F.geom);if(p.class!=='embassy'&&p.class!=='military'){for(i=0;i<rs.length;i++){c=convR(L,rs[i]);PT.push({x:c[0],z:c[1],n:p.name||'',cl:p.class,sc:p.subclass||''});}}if(!p.name||!POI_OK[p.class])continue;for(i=0;i<rs.length;i++){if(!inTile(L,rs[i]))continue;c=convR(L,rs[i]);PO.push({x:c[0],z:c[1],n:p.name,zh:p['name:zh']||'',cl:p.class,sc:p.subclass||''});}}
 LU.sort(function(a,b){return a.ar-b.ar;});
 var out=[];B.forEach(function(x){var zone=null,zraw=null;for(var j=0;j<LU.length;j++){var u=LU[j],bb=u.bb;if(bb[0]<=x.cx&&x.cx<=bb[2]&&bb[1]<=x.cy&&x.cy<=bb[3]&&pip(x.cx,x.cy,u.c,0)){zone=u.k;zraw=u.raw;break;}}
  var h=x.h,cat;if(h>=35||x.foot>900)cat=1;else if(zone>=1)cat=zone;else if(h>=18&&x.foot>300)cat=1;else if(zone===0)cat=0;else cat=h<12?0:4;
  var a0=1e9,b0=1e9,a1=-1e9,b1=-1e9;for(var m=0;m<x.c.length;m+=2){a0=Math.min(a0,x.c[m]);b0=Math.min(b0,x.c[m+1]);a1=Math.max(a1,x.c[m]);b1=Math.max(b1,x.c[m+1]);}
  var pin=[],pf={c:x.c};for(var q=0;q<PT.length;q++){var pt=PT[q];if(pt.x<a0||pt.x>a1||pt.z<b0||pt.z>b1)continue;if(pipFlat(pt.x,pt.z,x.c))pin.push(pt);}
  var tx=txClassify(x,zraw,pin,cat);if(tx.why!=='form')cat=txProfile(tx);var arr=[h,x.mh].concat(x.c,[cat]);arr._tx=tx;arr._bb=[a0,b0,a1,b1];out.push(arr);});
 return {b:out,rd:RD,ow:OW,ac:AC,ly:LY,w:W,pk:PK,hn:HN,rn:RN,po:PO,ovt:ovt,lu:LU};}


// ==== LOD + chunking for live tiles ====
// Each tile's buildings are split into 3×3 chunks (so the frustum culls ~2/3 of them behind/aside the camera) and every
// chunk gets a cheap box version. Per chunk, by distance from the camera: full detail (+roof lines, shadows, picking)
// → box LOD → nothing (the far layer carries the horizon). Hidden objects move to an unused layer so the renderer,
// the shadow pass and the hover raycaster all skip them.
var LODC={n:3,at:0,stats:{f:0,b:0,x:0}};
// quality mode: 'hq' = everything full detail at native resolution (like before), 'bal' = LOD + motion-adaptive resolution
var QUAL={m:'bal'};try{var qm=localStorage.getItem('se.qual');if(qm==='hq'||qm==='bal')QUAL.m=qm;}catch(_e){}
function setQual(m){QUAL.m=m;try{localStorage.setItem('se.qual',m);}catch(_e){}LODC.at=0;if(m==='hq'&&pr<PR_MAX){pr=PR_MAX;renderer.setPixelRatio(pr);resize();}var b=document.getElementById('bQual');if(b){b.setAttribute('aria-pressed',m==='hq');qualLabel(b);}invalidate(600);}
function qualLabel(b){var zh=LZ();b.querySelector('span').textContent=QUAL.m==='hq'?(I18T('quality_max')):(I18T('quality_balanced'));}
function buildLodBoxes(list){var P=[],N=[],C=[],CY=[],BC=[],rc=new T3.Color(),rt=new T3.Color(),W=new T3.Color(0xffffff);
 for(var i=0;i<list.length;i++){var x=list[i],bb=x._bb;if(!bb)continue;var ar=(bb[2]-bb[0])*(bb[3]-bb[1]),h=Math.max(3,x[0]),mh=x[1]||0;if(mh>=h)mh=0;if(ar<60&&h<9)continue;
  var cat=x[x.length-1],txb=txOf(x),base=new T3.Color(TAX[txb.m]?TAX[txb.m].col:'#8899aa'),mj=txb.m,top=base.clone().lerp(W,.18);realBuildingColor(cat,h,x[2],x[3],rc);rt.copy(rc).lerp(TMPC.setHex(h>=45?0x5d6670:0x77797c),.55);
  var a0=bb[0],b0=bb[1],a1=bb[2],b1=bb[3],y=mh+h;
  function quad(p,n,c1,c2){for(var q=0;q<6;q++){P.push(p[q*3],p[q*3+1],p[q*3+2]);N.push(n[0],n[1],n[2]);C.push(c1.r,c1.g,c1.b);CY.push(c2.r,c2.g,c2.b);BC.push(mj);}}
  quad([a0,y,b0, a1,y,b1, a1,y,b0, a0,y,b0, a0,y,b1, a1,y,b1],[0,1,0],rt,top);
  quad([a0,mh,b0, a1,mh,b0, a1,y,b0, a0,mh,b0, a1,y,b0, a0,y,b0],[0,0,-1],rc,base);
  quad([a1,mh,b1, a0,mh,b1, a0,y,b1, a1,mh,b1, a0,y,b1, a1,y,b1],[0,0,1],rc,base);
  quad([a0,mh,b1, a0,mh,b0, a0,y,b0, a0,mh,b1, a0,y,b0, a0,y,b1],[-1,0,0],rc,base);
  quad([a1,mh,b0, a1,mh,b1, a1,y,b1, a1,mh,b0, a1,y,b1, a1,y,b0],[1,0,0],rc,base);}
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(P),3));g.setAttribute('normal',new T3.BufferAttribute(new Float32Array(N),3));g.setAttribute('color',new T3.BufferAttribute(new Float32Array(C),3));g.setAttribute('cyber',new T3.BufferAttribute(new Float32Array(CY),3));g.setAttribute('bcat',new T3.BufferAttribute(new Float32Array(BC),1));
 var m=new T3.Mesh(g,makeBuildingMaterial());m.material.side=T3.DoubleSide;m.receiveShadow=true;m.castShadow=false;m.layers.set(5);m.userData.lod=1;return m;}
function buildBuildingsChunked(builds){var n=LODC.n,x0=1e9,z0=1e9,x1=-1e9,z1=-1e9,i,GF=new T3.Group(),GR=new T3.Group(),GB=new T3.Group(),chunks=[];
 for(i=0;i<builds.length;i++){var bb=builds[i]._bb;if(!bb)continue;x0=Math.min(x0,bb[0]);z0=Math.min(z0,bb[1]);x1=Math.max(x1,bb[2]);z1=Math.max(z1,bb[3]);}
 var cells=[];for(i=0;i<n*n;i++)cells.push([]);
 builds.forEach(function(b){var bb=b._bb,ix=0,iz=0;if(bb&&isFinite(x0)){ix=Math.min(n-1,Math.max(0,Math.floor(((bb[0]+bb[2])/2-x0)/(x1-x0+1e-6)*n)));iz=Math.min(n-1,Math.max(0,Math.floor(((bb[1]+bb[3])/2-z0)/(z1-z0+1e-6)*n)));}cells[iz*n+ix].push(b);});
 var p=Promise.resolve();cells.forEach(function(list){if(!list.length)return;p=p.then(function(){return buildBuildings(list,null,true).then(function(b){var box=buildLodBoxes(list);GF.add(b.mesh);GR.add(b.roof);GB.add(box);
  b.mesh.geometry.computeBoundingSphere();var bs=b.mesh.geometry.boundingSphere;chunks.push({f:b.mesh,r:b.roof,b:box,c:bs.center.clone(),rad:bs.radius,st:-1});return frameTick();});});});
 return p.then(function(){return {mesh:GF,roof:GR,lod:GB,chunks:chunks};});}
function drvBubble(){return DRV.on&&!DRV.fly&&DRV.alt<5&&QUAL.m!=='hq';}
function lodStep(now){if(!L2.live||now-LODC.at<200)return;LODC.at=now;camera.layers.enable(2);var cp=camera.position,h=Math.max(2,cp.y),hq=QUAL.m==='hq',bub=drvBubble(),dF=hq?1e9:bub?520:Math.max(950,h*2.8),dB=hq?1e9:bub?1700:Math.max(4200,h*7.5),S={f:0,b:0,x:0};
 for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(!T.chunks||!T.group)continue;var ox=T.group.position.x,oz=T.group.position.z;
  if(bub||T.group._bub){var tc=T._tc;if(!tc){var sx=0,sz=0;T.chunks.forEach(function(c){sx+=c.c.x;sz+=c.c.z;});tc=T._tc={x:sx/Math.max(1,T.chunks.length),z:sz/Math.max(1,T.chunks.length)};}var td=Math.hypot(tc.x+ox-DRV.pos.x,tc.z+oz-DRV.pos.z)-1750,vis=!bub||td<900;if(T.group.visible!==vis)T.group.visible=vis;T.group._bub=bub;}
  for(var i=0;i<T.chunks.length;i++){var c=T.chunks[i],d=Math.hypot(c.c.x+ox-cp.x,c.c.z+oz-cp.z)-c.rad,st=d<dF?0:d<dB?1:2;if(c.st===0&&d<dF+80)st=0;if(c.st===1&&st===2&&d<dB+150)st=1;
   if(st!==c.st){c.st=st;c.f.layers.set(st===0?0:5);c.r.layers.set(st===0?0:5);c.b.layers.set(st===1?2:5);}S[st===0?'f':st===1?'b':'x']++;}}
 LODC.stats=S;}
// ==== PERFORMANCE PIPELINE ====
// (a) tile worker: MVT decode + footprint classification + road geometry run off the main thread.
//     Built from the very same functions as the main-thread path (Function#toString), so both paths stay identical.
var TW={w:null,dead:false,id:0,cb:{}},TSTAT={mem:0,hit:0,net:0,pf:0,wk:0,main:0,fail:0};
function twMain(){var C={};self.onmessage=function(e){var m=e.data;try{
 if(m.op==='a'){var L0=MVT.decode(new Uint8Array(m.buf));C[m.id]=L0;self.postMessage({id:m.id,phase:'a',nb0:L0.building?countFootprints(L0.building):0});}
 else if(m.op==='b'){var L=C[m.id];delete C[m.id];if(!L)throw new Error('lost');var OV=m.ov?MVT.decode(new Uint8Array(m.ov)):null;
  var d=tileToLocal(L,m.tx,m.ty,m.lv,OV),tx=[],bb=[];for(var i=0;i<d.b.length;i++){tx.push(d.b[i]._tx);bb.push(d.b[i]._bb);}
  var ra=roadArrays(d.rd,RC,d.ly,d.ow);d.tx=tx;d.bb=bb;d.bz=ra.bz;d.js=ra.js;d.ra=ra;self.postMessage({id:m.id,phase:'b',d:d},[ra.P.buffer,ra.C.buffer,ra.CY.buffer,ra.G.buffer,ra.BR.buffer,ra.MA.buffer,ra.MB.buffer]);}
 else if(m.op==='r'){var r2=roadArrays(m.rd,RC,m.ly,m.ow,null,m.ln);self.postMessage({id:m.id,phase:'r',d:r2},[r2.P.buffer,r2.C.buffer,r2.CY.buffer,r2.G.buffer,r2.BR.buffer,r2.MA.buffer,r2.MB.buffer]);}
}catch(err){delete C[m.id];self.postMessage({id:m.id,err:String(err&&err.message||err)});}};}
function twBoot(){if(TW.w||TW.dead)return TW.w;try{if(!window.Worker||!window.Blob||!window.URL||/noworker/.test(location.hash+location.search))throw 0;
 var tb={RCLS:RCLS,LUCLS:LUCLS,POI_OK:POI_OK,TXPOI:TXPOI,TXOVT:TXOVT,TXLU:TXLU,TAX:TAX.map(function(t){return {p:t.p};}),RC:roadCols()};
 var src='"use strict";var D2R='+D2R+',R2D='+R2D+',TZ='+TZ+',TN='+TN+';\nvar MVT=('+mvtFactory+')();\nvar tlx='+tlx+',tly='+tly+',tilon='+tilon+',tilat='+tilat+';\n'+
  'var TB='+JSON.stringify(tb)+',RCLS=TB.RCLS,LUCLS=TB.LUCLS,POI_OK=TB.POI_OK,TXPOI=TB.TXPOI,TXOVT=TB.TXOVT,TXLU=TB.TXLU,TAX=TB.TAX,RC=TB.RC;\n'+
  [polyArea,pip,pipFlat,txReligion,txName,txClassify,txProfile,ovtHeight,countFootprints,tileToLocal,brH,bridgeProfile,rdLane,roadArrays,twMain].map(String).join('\n')+'\ntwMain();';
 var w=new Worker(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));
 w.onmessage=function(e){var m=e.data,cb=TW.cb[m.id];if(!cb)return;if(m.phase==='a'&&!m.err){cb.a(m);return;}delete TW.cb[m.id];if(m.err)cb.rej(new Error(m.err));else cb.res(m);};
 w.onerror=function(e){try{e.preventDefault();}catch(_){}TW.dead=true;TW.w=null;var cbs=TW.cb;TW.cb={};for(var k in cbs)cbs[k].rej(new Error('worker'));};
 TW.w=w;}catch(e){TW.dead=true;TW.w=null;}return TW.w;}
function ovtRaw(x,y){if(!OVT.ready)return Promise.resolve(null);return OVT.p.getZxy(14,x,y).then(function(t){return t&&t.data?t.data:null;}).catch(function(){return null;});}
function ovtRawFor(nb0,x,y){if(nb0>=OVT_MIN||!OVT.wait)return Promise.resolve(null);return OVT.wait.then(function(){return ovtRaw(x,y);});}
function tileDecodeMain(buf,T,lvp){TSTAT.main++;var L0=MVT.decode(new Uint8Array(buf)),nb0=L0.building?countFootprints(L0.building):0;return ovtFor(nb0,T.x,T.y).then(function(OV){return tileToLocal(L0,T.x,T.y,lvp,OV);});}
function tileDecode(buf,T,lv){var w=twBoot(),lvp={lat0:lv.lat0,lon0:lv.lon0,mLat:lv.mLat,mLon:lv.mLon};if(!w)return tileDecodeMain(buf,T,lvp);
 return new Promise(function(res,rej){var id=++TW.id;TW.cb[id]={rej:rej,
   a:function(m){ovtRawFor(m.nb0,T.x,T.y).then(function(ov){if(!TW.w){rej(new Error('worker'));return;}TW.w.postMessage({op:'b',id:id,ov:ov,tx:T.x,ty:T.y,lv:lvp});});},
   res:function(m){var d=m.d;for(var i=0;i<d.b.length;i++){d.b[i]._tx=d.tx[i];d.b[i]._bb=d.bb[i];}delete d.tx;delete d.bb;TSTAT.wk++;res(d);}};
  w.postMessage({op:'a',id:id,buf:buf},[buf]);})
 .catch(function(){return fetchTile(T.x,T.y).then(function(b2){return b2?tileDecodeMain(b2,T,lvp):null;});});}
// (b) tile cache: memory LRU (this session) + Cache Storage (survives reloads) in front of the network
var TCACHE={c:null,mem:new Map(),puts:0};
function tcOpen(){if(TCACHE.c)return TCACHE.c;try{TCACHE.c=(window.caches&&caches.open)?caches.open('se-tiles-v1').catch(function(){return null;}):Promise.resolve(null);}catch(e){TCACHE.c=Promise.resolve(null);}return TCACHE.c;}
function tcTrim(c){TCACHE.puts++;if(TCACHE.puts%120)return;c.keys().then(function(ks){if(ks.length>2600)ks.slice(0,ks.length-2200).forEach(function(r){c.delete(r);});}).catch(function(){});}
function fetchTile(x,y){var url=TILE_TPL.replace('{z}',TZ).replace('{x}',x).replace('{y}',y),m=TCACHE.mem.get(url);
 if(m){TSTAT.mem++;TCACHE.mem.delete(url);TCACHE.mem.set(url,m);return m.then(function(b){return b?b.slice(0):null;});}
 var p=tcOpen().then(function(c){return (c?c.match(url).catch(function(){return null;}):Promise.resolve(null)).then(function(r){if(r){TSTAT.hit++;return r.arrayBuffer();}
   return fetch(url).then(function(r2){if(!r2.ok)return null;TSTAT.net++;if(c){try{c.put(url,r2.clone()).then(function(){tcTrim(c);}).catch(function(){});}catch(e){}}return r2.arrayBuffer();});});})
  .catch(function(){return null;}).then(function(b){if(!b){TCACHE.mem.delete(url);TSTAT.fail++;}return b;});
 TCACHE.mem.set(url,p);while(TCACHE.mem.size>64)TCACHE.mem.delete(TCACHE.mem.keys().next().value);
 return p.then(function(b){return b?b.slice(0):null;});}
// (c) flight-path prefetch: tiles 0.5x and 1x a look-ahead distance (≈12 s of travel) ahead are fetched before you get there
var PF={x:null,z:null,t:0,vx:0,vz:0,inflight:0,done:{},n:0};
function livePrefetch(lv,now){var tg=L2.target;if(!tg)return;if(PF.x!==null){var dt=(now-PF.t)/1000;if(dt>.05&&dt<2){PF.vx=PF.vx*.6+(tg.x-PF.x)/dt*.4;PF.vz=PF.vz*.6+(tg.z-PF.z)/dt*.4;}}PF.x=tg.x;PF.z=tg.z;PF.t=now;
 var sp=Math.hypot(PF.vx,PF.vz);if(sp<4||!TILE_TPL)return;if(PF.n>600){PF.done={};PF.n=0;}var look=Math.max(400,Math.min(3000,sp*12)),ux=PF.vx/sp,uz=PF.vz/sp;
 [look*.5,look].forEach(function(dd){var ll=localToLL(tg.x+ux*dd,tg.z+uz*dd),cx=Math.floor(tlx(ll.lon)),cy=Math.floor(tly(ll.lat));
  for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++){var k=(cx+dx)+','+(cy+dy);if(lv.tiles[k]||PF.done[k]||PF.inflight>=4)continue;PF.done[k]=1;PF.n++;PF.inflight++;TSTAT.pf++;
   fetchTile(cx+dx,cy+dy).then(function(){PF.inflight--;},function(){PF.inflight--;});}});}
function segD2(px,pz,ax,az,bx,bz){var dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l)):0;var x=ax+t*dx-px,z=az+t*dz-pz;return x*x+z*z;}
function buildingFacts(b){var bb=b._bb;if(!bb){var a0=1e9,b0=1e9,a1=-1e9,b1=-1e9;for(var m=2;m<b.length-1;m+=2){a0=Math.min(a0,b[m]);b0=Math.min(b0,b[m+1]);a1=Math.max(a1,b[m]);b1=Math.max(b1,b[m+1]);}bb=[a0,b0,a1,b1];}
 var cx=(bb[0]+bb[2])/2,cz=(bb[1]+bb[3])/2,per=0,np=(b.length-3)/2;for(var i=0;i<np;i++){var j=(i+1)%np;per+=Math.hypot(b[2+2*j]-b[2+2*i],b[3+2*j]-b[3+2*i]);}
 var c=L2.city,lat0=L2.live?L2.live.lat0:c.lat,lon0=L2.live?L2.live.lon0:c.lon,ll=L2.live?localToLL(cx,cz):{lat:lat0-cz/110540,lon:lon0+cx/(111320*Math.cos(lat0*D2R))};
 var out={ll:ll,per:per,num:null,street:null,places:[],live:!!L2.live};if(!L2.live)return out;var bestH=1e9,bestS=6400,bestP=[];
 for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(T.state!=='ready'||!T.data)continue;var d=T.data;
  for(var h=0;h<d.hn.length;h+=3){var hx=d.hn[h],hz=d.hn[h+1];if(hx<bb[0]-25||hx>bb[2]+25||hz<bb[1]-25||hz>bb[3]+25)continue;var inside=pip(hx,hz,b,2),dd=inside?-1:Math.hypot(hx-cx,hz-cz);if(dd<bestH){bestH=dd;out.num=d.hn[h+2];}}
  d.rn.forEach(function(r){for(var q=0;q<r.c.length-2;q+=2){var e=segD2(cx,cz,r.c[q],r.c[q+1],r.c[q+2],r.c[q+3]);if(e<bestS){bestS=e;out.street=r;}}});
  d.po.forEach(function(po){if(po.x>=bb[0]-4&&po.x<=bb[2]+4&&po.z>=bb[1]-4&&po.z<=bb[3]+4&&(pip(po.x,po.z,b,2)||Math.hypot(po.x-cx,po.z-cz)<12))bestP.push(po);});}
 out.places=bestP.slice(0,6);return out;}
function newLiveState(c){var cl=Math.cos(c.lat*D2R);return {lat0:c.lat,lon0:c.lon,mLat:-110540,mLon:111320*cl,tiles:{},queue:[],busy:false,gen:(L2.live?L2.live.gen:0)+1,cx:null,cy:null,lastCheck:0,shadowAt:new T3.Vector3(1e9,0,0)};}
function localToLL(x,z){var lv=L2.live;return {lat:lv.lat0+z/lv.mLat,lon:lv.lon0+x/lv.mLon};}
function liveUpdate(force){var lv=L2.live;if(!lv)return;var now=performance.now();if(!force&&now-lv.lastCheck<220)return;lv.lastCheck=now;liveRetryPass(lv,now);livePrefetch(lv,now);
 var ll=localToLL(L2.target.x,L2.target.z);var cx=Math.floor(tlx(ll.lon)),cy=Math.floor(tly(ll.lat));
 if(!force&&cx===lv.cx&&cy===lv.cy)return;lv.cx=cx;lv.cy=cy;
 var RG=LIVEP.ring||1,want=[];for(var dx=-RG;dx<=RG;dx++)for(var dy=-RG;dy<=RG;dy++)want.push([cx+dx,cy+dy,dx*dx+dy*dy]);want.sort(function(a,b){return a[2]-b[2];});
 want.forEach(function(t){var k=t[0]+','+t[1];if(!lv.tiles[k]){var T={x:t[0],y:t[1],state:'queued'};lv.tiles[k]=T;
  T.fetch=fetchTile(t[0],t[1]);lv.queue.push(k);}});
 lv.queue.sort(function(a,b){var A=lv.tiles[a],B=lv.tiles[b];return ((A.x-cx)*(A.x-cx)+(A.y-cy)*(A.y-cy))-((B.x-cx)*(B.x-cx)+(B.y-cy)*(B.y-cy));});
 Object.keys(lv.tiles).forEach(function(k){var T=lv.tiles[k];if(Math.abs(T.x-cx)>RG+1||Math.abs(T.y-cy)>RG+1)unloadTile(k);});
 livePump();updateLiveHud(ll);}
function livePump(){var lv=L2.live;if(!lv||lv.busy)return;var k;while((k=lv.queue.shift())){if(lv.tiles[k]&&lv.tiles[k].state==='queued')break;}if(!k)return;
 var T=lv.tiles[k],gen=lv.gen;lv.busy=true;T.state='loading';function alive(){return L2.live&&L2.live.gen===gen&&lv.tiles[k];}
 T.fetch.then(function(buf){if(!alive())return null;if(!buf){tileFailed(T);return null;}
  return tileDecode(buf,T,lv).then(function(d){if(!alive())return null;if(!d){tileFailed(T);return null;}
  T.data=d;T.ovt=d.ovt;if(d.ovt)OVT.used++;var g=new T3.Group();
  return frameTick().then(function(){if(!alive())return null;
   d.w.forEach(function(w){g.add(buildShapeFill(w,0,0.5,MAT.water));});
   d.pk.forEach(function(p){g.add(buildShapeFill(p,1,p[0]===1?0.32:0.2,p[0]===1?MAT.park:MAT.wood));});
   var roads=buildRoads(d.rd,d.ra,d.ly,d.ow);delete d.ra;if(!d.bz)d.bz=roads.bz;if(!d.js)d.js=roads.js;g.add(roads.mesh);g.add(roads.glow);if(roads.br)g.add(roads.br);T.rd3=roads;
   return buildBuildingsChunked(d.b).then(function(bld){function drop(){disposeTree(g);disposeTree(bld.mesh);disposeTree(bld.roof);disposeTree(bld.lod);}if(!alive()){drop();return;}
    return frameTick().then(function(){if(!alive()){drop();return;}
     g.add(bld.mesh);g.add(bld.roof);g.add(bld.lod);T.bm=[bld.mesh,bld.roof,bld.lod];T.chunks=bld.chunks;LODC.at=0;T.traffic=buildTraffic(roads.paths,260);if(T.traffic)g.add(T.traffic.pts);T.deco=decorate(g,d,2200);
     T.group=g;T.state='ready';L2.group.add(g);rebuildPicks();renderer.shadowMap.needsUpdate=true;lanesWant(T);
     if(T.onReady)T.onReady();});});});});
 }).catch(function(err){T.state='empty';console.warn('tile',k,err);}).then(function(){lv.busy=false;if(T.onReady&&T.state!=='ready'){T.onReady();}livePump();updateLiveHud();});}
function unloadTile(k){var lv=L2.live,T=lv.tiles[k];if(!T)return;if(T.group){L2.group.remove(T.group);disposeTree(T.group);}delete lv.tiles[k];rebuildPicks();}
function rebuildPicks(){var lv=L2.live;if(!lv)return;var all=[],rd=0;Object.keys(lv.tiles).forEach(function(k){var T=lv.tiles[k];if(T.state==='ready'&&T.data){Array.prototype.push.apply(all,T.data.b);rd+=T.data.rd.length;}});L2.picks=all;L2._rd=rd;if(L2.active){buildCatLegend();if(state.type==='cityIntro'){var ch=pHead.querySelectorAll('.p-meta .chip');if(ch[0])ch[0].textContent=T('buildings')+' '+all.length;if(ch[1])ch[1].textContent=T('roads')+' '+rd;}}}
function liveTraffic(dt){var lv=L2.live;if(!lv)return;for(var k in lv.tiles){var T=lv.tiles[k];if(T.traffic)stepTraffic(T.traffic,dt);}}
var nearestCache=null;
function updateLiveHud(ll){var el=document.getElementById('liveInfo');if(!el)return;if(!L2.live){var zh0=LZ();el.innerHTML='<b style="color:var(--warn)">'+(zh0?'离线核心区':'OFFLINE CORE')+'</b> '+(LIVE?(zh0?'地图服务器现在已经连上。':'The map server is reachable now. ')+'<button class="golive" data-golive>'+(zh0?'⟳ 切换到实时街区':'⟳ Switch to live streets')+'</button>':(zh0?'暂时连不上地图服务器（网络慢或断开，或页面安全策略阻止），只能显示预先打包的 1.3 km 核心区，城市之间是断开的。后台每隔一会儿重试一次，连上后会提示你切换。':'The map server is not reachable right now (slow or no network, or a page security policy), so only the packed 1.3 km core is shown and cities are separate. Retrying in the background; you will be prompted once it connects.'))+'<span class="hint">'+(zh0?'拖动平移 · 右键或 Shift+拖动旋转 · WASD/方向键移动 · Q/E 转向':'drag to pan · right-drag or Shift+drag to rotate · WASD/arrows move · Q/E turn')+'</span>';return;}var lv=L2.live;ll=ll||localToLL(L2.target.x,L2.target.z);
 var ready=0,tot=0,rt=0,fl=0;for(var k in lv.tiles){tot++;var st=lv.tiles[k].state;if(st==='ready'||st==='empty')ready++;else if(st==='retry')rt++;else if(st==='failed')fl++;}
 // nearest named place (Natural Earth) to the current view
 var best=null,bd=1e9;if(NODES){var rows=NODES.rows;for(var i=0;i<rows.length;i++){var r=rows[i];var d=hav(ll.lat,ll.lon,r[5],r[6]);if(d<bd){bd=d;best=r;}}}
 var zh=LZ();var place=best?((zh&&best[1]?best[1]:best[0])+' · '+(bd<1?(I18T('here')):bd.toFixed(1)+' km')):'';
 el.innerHTML='<b>'+(I18T('live_streets'))+'</b> '+fmtLL(ll.lat,ll.lon)+' · '+(I18T('tiles'))+ready+'/'+tot+(rt?'<span class="rt"> · '+(I18T('retry'))+rt+'</span>':'')+(fl?'<span class="fl"> · '+(I18T('failed'))+fl+'</span>':'')+(function(){var o=0;for(var q in lv.tiles)if(lv.tiles[q].ovt)o++;return o?'<span class="ov"> · '+(I18T('overture_fill'))+o+'</span>':'';})()+(function(){var mc=midCount();return mc[1]?'<span class="ov"> · '+(I18T('far'))+mc[0]+'/'+mc[1]+'</span>':'';})()+' <button class="ringb" data-ring>'+(LIVEP.ring===2?'5×5':'3×3')+'</button>'+(place?' · '+(I18T('nearest'))+esc(place):'')+
  '<span class="hint">'+(I18T('drag_to_pan_right'))+'</span>';}
// keyboard movement in live street mode
var KEYS={};window.addEventListener('keydown',function(e){if(mode==='street'&&!/INPUT|TEXTAREA/.test((e.target||{}).tagName||'')){KEYS[e.key.toLowerCase()]=true;}});window.addEventListener('keyup',function(e){KEYS[e.key.toLowerCase()]=false;});
function liveKeys(dt){if(!L2.group)return;var sp=L2.cam.d*.9*dt,az=L2.cam.az;var fx=-Math.cos(az),fz=-Math.sin(az),rx=Math.sin(az),rz=-Math.cos(az);var mx=0,mz=0;
 if(KEYS.w||KEYS.arrowup){mx+=fx;mz+=fz;}if(KEYS.s||KEYS.arrowdown){mx-=fx;mz-=fz;}if(KEYS.d||KEYS.arrowright){mx+=rx;mz+=rz;}if(KEYS.a||KEYS.arrowleft){mx-=rx;mz-=rz;}
 if(KEYS.q)L2.camWant.az-=1.4*dt;if(KEYS.e)L2.camWant.az+=1.4*dt;
 if(mx||mz){L2.target.x+=mx*sp;L2.target.z+=mz*sp;clampTarget();}}
function clampTarget(){if(L2.live||!L2.target)return;var h=(L2.half||650)+300;L2.target.x=Math.max(-h,Math.min(h,L2.target.x));L2.target.z=Math.max(-h-560,Math.min(h,L2.target.z));}
function livePan(dx,dy){var az=L2.cam.az,s=L2.cam.d*.0016;var fx=-Math.cos(az),fz=-Math.sin(az),rx=Math.sin(az),rz=-Math.cos(az);
 L2.target.x+=(-rx*dx+fx*dy)*s;L2.target.z+=(-rz*dx+fz*dy)*s;clampTarget();}
// enter a place in live mode: build the centre tile first, stream the rest
function enterLive(c){TRV.on=false;
 var base=fadeT.textContent;clearStreet();
 L2.live=newLiveState(covCentre(c));L2.target=new T3.Vector3(0,0,0);
 var g=new T3.Group();
 var ground=new T3.Mesh(new T3.CircleGeometry(60000,128),envMats().ground);ground.rotation.x=-Math.PI/2;ground.position.y=-0.3;ground.receiveShadow=true;g.add(ground);L2.ground=ground;
 var frame=new T3.LineSegments(new T3.EdgesGeometry(new T3.PlaneGeometry(1300,1300).rotateX(-Math.PI/2)),MAT.frame);frame.position.y=0.1;g.add(frame);
 L2.district=buildDistrict(g,650);streetScene.add(g);L2.group=g;L2.picks=[];L2.half=650;hoverB=null;hoverObj=null;selObj=null;
 liveUpdate(true);
 var lv=L2.live,ck=lv.cx+','+lv.cy,T=lv.tiles[ck];
 return new Promise(function(res){var done=false;function fin(){if(!done){done=true;res();}}
  if(T)T.onReady=fin;setTimeout(fin,9000);
  var iv=setInterval(function(){if(done||!L2.live){clearInterval(iv);return;}var n=0,r=0;for(var k in lv.tiles){n++;if(lv.tiles[k].state==='ready')r++;}fadeT.textContent=base+' · '+(I18T('streaming'))+r+'/'+n;},200);})
  .then(function(){return (renderer.compileAsync?renderer.compileAsync(streetScene,camera):Promise.resolve()).catch(function(){});});}

// ====================================================================
// ENVIRONMENT — real sun & moon for the city's coordinates and time, physically-motivated sky, weather
// (live Open-Meteo when deployed, presets otherwise), seasonal vegetation, night lighting, and an
// environmental security-posture readout. Everything here is generic teaching material: it reasons
// about conditions (light, visibility, wind, precipitation…), never about specific real buildings.
// ====================================================================
var U={uSm:{value:new T3.Vector4(0,0,0,0)},uSonA:{value:new T3.Vector4()},uSonB:{value:new T3.Vector4()},uSmX:{value:new T3.Vector4()},uDsm:{value:0},uFocus:{value:-1},uReal:{value:1},uDay:{value:1},uNight:{value:0},uSnow:{value:0},uWet:{value:0},uTime:{value:0},uWind:{value:.3},uLit:{value:.58},uSkyRef:{value:new T3.Color(0x9fb8d6)},uFlash:{value:0}};
var ENV={on:false,lat:0,lon:0,tz:null,timeMode:'live',simMs:0,lapse:false,wxMode:'live',wxLive:null,wxAt:0,wxErr:false,style:1,
 sun:{el:45,az:180},moon:{el:-10,az:0,illum:0,waxing:true},lux:0,day:1,night:0,gold:0,lamps:0,
 cur:null,tgt:null,flash:0,nextBolt:0,lastShadow:0,shadowDir:new T3.Vector3(),uiAt:0,secHTML:'',season:null,riseSet:null};
var WXP={ // presets: cloud cover 0..1, rain/snow intensity 0..1, fog 0..1, visibility m, wind m/s, gust, thunder
 clear:{cloud:.06,rain:0,snow:0,fog:0,vis:30000,wind:2.5,gust:4,thunder:0,code:0},
 partly:{cloud:.42,rain:0,snow:0,fog:0,vis:25000,wind:4,gust:7,thunder:0,code:2},
 overcast:{cloud:.93,rain:0,snow:0,fog:.1,vis:14000,wind:5,gust:9,thunder:0,code:3},
 fog:{cloud:.75,rain:0,snow:0,fog:1,vis:220,wind:1,gust:2,thunder:0,code:45,hum:98},
 rain:{cloud:.96,rain:.7,snow:0,fog:.25,vis:3500,wind:7,gust:12,thunder:0,code:63,hum:92},
 storm:{cloud:1,rain:1,snow:0,fog:.35,vis:1500,wind:13,gust:23,thunder:1,code:95,hum:95},
 snow:{cloud:.96,rain:0,snow:.8,fog:.3,vis:1200,wind:4,gust:8,thunder:0,code:73,temp:-3,hum:88}};
var WXN={zh:{0:'晴',1:'晴间少云',2:'多云',3:'阴',45:'雾',48:'冻雾',51:'毛毛雨',53:'毛毛雨',55:'较强毛毛雨',56:'冻毛毛雨',57:'冻毛毛雨',61:'小雨',63:'中雨',65:'大雨',66:'冻雨',67:'强冻雨',71:'小雪',73:'中雪',75:'大雪',77:'雪粒',80:'阵雨',81:'较强阵雨',82:'强阵雨',85:'阵雪',86:'强阵雪',95:'雷暴',96:'雷暴伴冰雹',99:'强雷暴伴冰雹'},
 en:{0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Showers',81:'Heavy showers',82:'Violent showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm, hail',99:'Severe thunderstorm, hail'}};
function wxCopy(p,t){return {cloud:p.cloud,rain:p.rain,snow:p.snow,fog:p.fog,vis:p.vis,wind:p.wind,gust:p.gust,thunder:p.thunder,code:p.code,temp:p.temp!=null?p.temp:t!=null?t:15,hum:p.hum||55,wdir:p.wdir!=null?p.wdir:250,feels:p.feels};}
function wxFromLive(c){var code=c.weather_code|0,w={cloud:(c.cloud_cover!=null?c.cloud_cover:50)/100,rain:0,snow:0,fog:0,thunder:0,code:code,temp:c.temperature_2m,hum:c.relative_humidity_2m,wind:c.wind_speed_10m||0,gust:c.wind_gusts_10m||c.wind_speed_10m||0,wdir:c.wind_direction_10m||0,feels:c.apparent_temperature};
 var R={51:.18,53:.25,55:.35,56:.25,57:.35,61:.35,63:.65,65:1,66:.4,67:.8,80:.5,81:.75,82:1,95:.85,96:.9,99:1},S={71:.35,73:.65,75:1,77:.3,85:.5,86:.85};
 if(R[code])w.rain=R[code];if(S[code])w.snow=S[code];if(code>=95)w.thunder=1;if(code===45||code===48)w.fog=1;
 if(!w.rain&&c.precipitation>0)w.rain=Math.min(1,c.precipitation/6);
 w.vis=c.visibility!=null?Math.min(30000,c.visibility):(w.fog?250:w.snow?1500:w.rain?4000:20000);
 if(w.vis<1000)w.fog=Math.max(w.fog,1-w.vis/1000);else if(w.vis<5000)w.fog=Math.max(w.fog,.3*(1-w.vis/5000));
 return w;}

// ---- astronomy (low-precision, ~0.5° for the sun, ~1° for the moon: plenty for lighting) ----
function astro(ms,lat,lon){var n=ms/86400000+2440587.5-2451545.0,r=D2R;
 var L=(280.460+0.9856474*n)%360,g=((357.528+0.9856003*n)%360)*r,lam=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*r,eps=(23.439-0.0000004*n)*r;
 var gmst=((18.697374558+24.06570982441908*n)%24+24)%24,lst=gmst*15+lon;
 function hor(ra,dec){var ha=(lst-ra*R2D)*r,la=lat*r;var el=Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(ha));
  var az=Math.atan2(-Math.cos(dec)*Math.sin(ha),Math.sin(dec)*Math.cos(la)-Math.cos(dec)*Math.sin(la)*Math.cos(ha));return {el:el*R2D,az:((az*R2D)%360+360)%360};}
 var s=hor(Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam)),Math.asin(Math.sin(eps)*Math.sin(lam)));
 var Lm=(218.316+13.176396*n)*r,Mm=(134.963+13.064993*n)*r,F=(93.272+13.229350*n)*r;var lm=Lm+6.289*r*Math.sin(Mm),bm=5.128*r*Math.sin(F);
 var m=hor(Math.atan2(Math.sin(lm)*Math.cos(eps)-Math.tan(bm)*Math.sin(eps),Math.cos(lm)),Math.asin(Math.sin(bm)*Math.cos(eps)+Math.cos(bm)*Math.sin(eps)*Math.sin(lm)));
 var el=lm-lam;m.illum=(1-Math.cos(el))/2;m.waxing=Math.sin(el)>0;return {sun:s,moon:m};}
function riseSet(ms,lat,lon,off){ // local-day sunrise/sunset by scanning (10-min steps, refined)
 var day0=Math.floor((ms+off*1000)/86400000)*86400000-off*1000,prev=null,rise=null,set=null;
 for(var t=0;t<=1440;t+=10){var e=astro(day0+t*60000,lat,lon).sun.el+0.833;if(prev!==null){if(prev<0&&e>=0)rise=day0+(t-10*e/(e-prev))*60000;if(prev>=0&&e<0)set=day0+(t-10*e/(e-prev))*60000;}prev=e;}
 return {rise:rise,set:set};}
function utcOff(){return ENV.tz!=null?ENV.tz:Math.round(ENV.lon/15)*3600;}
function fmtHM(ms){if(ms==null)return '—';var d=new Date(ms+utcOff()*1000);return ('0'+d.getUTCHours()).slice(-2)+':'+('0'+d.getUTCMinutes()).slice(-2);}
function localHour(ms){var d=new Date(ms+utcOff()*1000);return d.getUTCHours()+d.getUTCMinutes()/60;}
function envNow(){return ENV.timeMode==='live'?Date.now():ENV.simMs;}
function seasonAt(ms,lat){ // 0 spring,1 summer,2 autumn,3 winter; f = progress in season; tropics stay green
 var d=new Date(ms),m=d.getUTCMonth()+d.getUTCDate()/31;if(lat<0)m=(m+6)%12;var tro=Math.abs(lat)<23.5;
 var s=m<2?3:m<5?0:m<8?1:m<11?2:3;var start=[2,5,8,11][s];var f=((m-start)+12)%12/3;return {s:tro?1:s,f:Math.min(1,f),tropic:tro};}

// ---- colour helpers (sRGB triplets for shaders written in display space) ----
function hx(h){return [((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255];}
function mixA(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function sstep(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}

// ---- shared materials (kept across tiles; never disposed) ----
function keep(m){m.userData.keep=true;return m;}
function cyberMix(m){var prev=m.onBeforeCompile;m.onBeforeCompile=function(sh){if(prev)prev(sh);sh.uniforms.uReal=U.uReal;sh.uniforms.uWet=U.uWet;sh.uniforms.uSnowR=U.uSnow;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 cyber;uniform float uReal;uniform float uWet;uniform float uSnowR;varying float vUpN;')
   .replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb=mix(cyber,vColor.rgb*(1.0-0.38*uWet*uReal),uReal);')
   .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvUpN=objectNormal.y;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uReal;uniform float uSnowR;varying float vUpN;')
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.90,0.92,0.95),uSnowR*uReal*step(0.5,vUpN)*0.85);');};
 return m;}
var RMK={side:{value:1},yel:{value:1}};
function roadMarks(m){var prev=m.onBeforeCompile;m.onBeforeCompile=function(sh){if(prev)prev(sh);sh.uniforms.uRmSide=RMK.side;sh.uniforms.uRmYel=RMK.yel;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aMA;attribute vec4 aMB;varying vec4 vMA;varying vec4 vMB;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMA=aMA;vMB=aMB;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vMA;varying vec4 vMB;uniform float uRmSide;uniform float uRmYel;\nfloat rmL(float d,float hw,float aa){return 1.0-smoothstep(hw,hw+aa,d);}')
   .replace('#include <color_fragment>','#include <color_fragment>\n'+[
   'if(vMA.w>0.5){',
   ' float ux=vMA.x,au=abs(ux),u=ux*uRmSide,wc=vMA.w,dA=vMA.y,dB=vMA.z,rA=vMB.x,rB=vMB.y,fl=vMB.z+0.01,flA=mod(fl,4.0),flB=floor(fl/4.0),inf=vMB.w+0.01;',
   ' float lanes=floor(mod(inf,8.0)),owc=floor(mod(inf/8.0,4.0)),sw=floor(mod(inf/32.0,2.0)),maj=floor(inf/64.0);',
   ' float aa=max(fwidth(ux),fwidth(dA))*1.2+0.01,fade=1.0-smoothstep(0.25,0.9,aa);',
   ' float cwA=flA>0.5?3.3:0.0,cwB=flB>0.5?3.3:0.0;bool boxA=dA<rA,boxB=dB<rB;bool clear=dA>rA+cwA&&dB>rB+cwB;',
   ' vec3 base=diffuseColor.rgb;vec3 col=base;',
   ' if(au>wc){ if(sw>0.5){ if(boxA||boxB)discard; float jn=step(0.92,fract(dA/1.6))*0.10;vec3 sc=vec3(0.60,0.60,0.58)*(0.95-jn);float curb=rmL(au-wc,0.22,aa);col=mix(sc,vec3(0.80,0.80,0.78),curb);} }',
   ' else {',
   '  float mW=0.0,mY=0.0;',
   '  if(clear){',
   '   if(maj>0.5)mW=max(mW,rmL(abs(au-(wc-0.4)),0.08,aa));',
   '   if(owc<0.5){',
   '    float cl=maj>0.5?rmL(abs(au-0.17),0.06,aa):rmL(au,0.07,aa)*step(fract(dA/9.0),0.45);',
   '    if(uRmYel>0.5)mY=max(mY,cl);else mW=max(mW,cl);',
   '    if(lanes>1.5){float lw=wc/lanes;for(int k=1;k<6;k++){if(float(k)>=lanes)break;mW=max(mW,rmL(abs(au-lw*float(k)),0.065,aa)*step(fract(dA/12.0),0.33));}}',
   '   } else if(lanes>1.5){float lw=2.0*wc/lanes;for(int k=1;k<6;k++){if(float(k)>=lanes)break;mW=max(mW,rmL(abs(ux+wc-lw*float(k)),0.065,aa)*step(fract(dA/12.0),0.33));}}',
   '  }',
   '  float fw=owc<0.5?step(0.0,u):(owc<1.5?1.0:0.0),bw=owc<0.5?step(u,0.0):(owc>1.5?1.0:0.0);',
   '  if(flB>0.5&&!boxB){float sl=rmL(abs(dB-(rB+cwB+0.55)),flB>1.5?0.25:0.16,aa)*fw;if(flB<1.5)sl*=step(0.45,fract(ux/0.9));mW=max(mW,sl);if(dB>rB+0.3&&dB<rB+3.3)mW=max(mW,step(0.5,fract(ux/1.1+0.25))*rmL(au,wc-0.2,aa));}',
   '  if(flA>0.5&&!boxA){float sl=rmL(abs(dA-(rA+cwA+0.55)),flA>1.5?0.25:0.16,aa)*bw;if(flA<1.5)sl*=step(0.45,fract(ux/0.9));mW=max(mW,sl);if(dA>rA+0.3&&dA<rA+3.3)mW=max(mW,step(0.5,fract(ux/1.1+0.25))*rmL(au,wc-0.2,aa));}',
   '  col=mix(col,vec3(0.90,0.91,0.92),clamp(mW,0.0,1.0)*0.92*fade);col=mix(col,vec3(0.93,0.72,0.16),clamp(mY,0.0,1.0)*0.92*fade);',
   ' }',
   ' diffuseColor.rgb=mix(base,col,uReal);',
   '}'].join('\n'));};
 return m;}
var MAT={};
function envMats(){if(MAT.road)return MAT;
 MAT.road=keep(roadMarks(cyberMix(new T3.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:T3.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}))));
 MAT.glow=keep(new T3.LineBasicMaterial({color:0x6fb6ff,transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}));
 MAT.roof=keep(new T3.LineBasicMaterial({color:0xbfe3ff,transparent:true,opacity:.32,depthWrite:false}));
 MAT.grid=keep(new T3.LineBasicMaterial({color:0x17345e,transparent:true,opacity:.35,depthWrite:false}));
 MAT.frame=keep(new T3.LineBasicMaterial({color:0x58e0c8,transparent:true,opacity:.4}));
 MAT.ground=keep(new T3.MeshStandardMaterial({color:0x0a1222,roughness:1,metalness:0}));
 MAT.water=keep(new T3.MeshStandardMaterial({color:0x0b2a4d,roughness:.18,metalness:.25,side:T3.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 MAT.park=keep(new T3.MeshStandardMaterial({color:0x123a26,roughness:1,metalness:0,side:T3.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 MAT.wood=keep(new T3.MeshStandardMaterial({color:0x16422a,roughness:1,metalness:0,side:T3.DoubleSide}));
 MAT.traffic=keep(new T3.PointsMaterial({size:5,vertexColors:true,transparent:true,opacity:.95,blending:T3.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
 // trees: wind sway + snow cap in the shader
 function treeMat(){var m=new T3.MeshStandardMaterial({roughness:.92,metalness:0,flatShading:true,vertexColors:true});m.onBeforeCompile=function(sh){sh.uniforms.uTime=U.uTime;sh.uniforms.uWind=U.uWind;sh.uniforms.uSnowT=U.uSnow;
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;uniform float uWind;varying float vUpT;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvUpT=objectNormal.y;\n#ifdef USE_INSTANCING\nvec3 ip=vec3(instanceMatrix[3]);float sw=sin(uTime*1.9+ip.x*0.071+ip.z*0.053)+0.5*sin(uTime*3.7+ip.z*0.11);transformed.x+=sw*uWind*0.06*(position.y+1.0);transformed.z+=sw*uWind*0.035*(position.y+1.0);\n#endif');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSnowT;varying float vUpT;')
    .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.92,0.94,0.97),uSnowT*smoothstep(0.15,0.7,vUpT)*0.9);');};return keep(m);}
 MAT.crown=treeMat();MAT.cone=treeMat();MAT.trunk=keep(new T3.MeshStandardMaterial({color:0x5a4634,roughness:1}));
 // street lamps: bright heads + additive light pools on the ground
 var lt=document.createElement('canvas');lt.width=lt.height=64;var g=lt.getContext('2d');var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
 var tex=new T3.CanvasTexture(lt);
 MAT.lampHead=keep(new T3.ShaderMaterial({transparent:true,depthWrite:false,blending:T3.AdditiveBlending,uniforms:{uOn:{value:0},uPx:{value:1},map:{value:tex},uFN:{value:1000},uFF:{value:3000}},
  vertexShader:'attribute vec3 color;varying vec3 vC;varying float vF;uniform float uPx,uFN,uFF;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);vF=1.0-0.88*smoothstep(uFN,uFF,-mv.z);gl_PointSize=clamp(2300.0/-mv.z,1.2,8.0)*uPx;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform sampler2D map;uniform float uOn;varying vec3 vC;varying float vF;void main(){float a=texture2D(map,gl_PointCoord).r*vF;gl_FragColor=vec4(vC*a*uOn*0.95,a*uOn);}'}));
 MAT.lampPool=keep(new T3.MeshBasicMaterial({map:tex,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,vertexColors:false}));
 MAT.lampPoolTex=tex;
 return MAT;}

// ---- realistic albedos by planning type (deterministic per building) ----
var REALPAL=[[0xd8cbb5,0xc9b79c,0xe3dccf,0xb98f74,0xcfc6b8,0xa9806a,0xe6e1d6,0xbfb3a0],
 [0x9fb0bf,0x8a9cad,0xb7c2cc,0x7f91a3,0xc4c8cc,0x6f8296,0xa9b4bb],
 [0xd6cdbf,0xc2b8a8,0xe0d8ca,0xbfae96,0xcab49a],
 [0xa7a9a6,0x9a9d9f,0xb5b2a8,0x8f9493,0xa39d90],
 [0xc9a58a,0xd5c2a5,0xb58c72,0xdcd2c0,0xc7b9a3]];
function hash2(x,y){var h=Math.sin(x*12.9898+y*78.233)*43758.5453;return h-Math.floor(h);}
function realBuildingColor(cat,h,cx,cz,out){var pal=REALPAL[cat]||REALPAL[0];var r=hash2(cx,cz);var c=pal[Math.floor(r*pal.length)%pal.length];if(h>=45&&r>.35)c=[0x7d8fa2,0x6a7d91,0x93a3b3,0x5e7287][Math.floor(r*40)%4];return out.setHex(c);}
var ROADREAL={0:0x4a4d52,1:0x4d5055,2:0x54575b,3:0x5a5d61,4:0x5f6266,5:0x64676a,6:0x6c6e70,7:0x8a8170,8:0x948a78,9:0x5a5048,10:0x575a5e,11:0x7a6a58};

// ---- sky dome ----
var SKY=null;
function buildSky(){var m=new T3.ShaderMaterial({side:T3.BackSide,depthWrite:false,depthTest:false,fog:false,uniforms:{uSun:{value:new T3.Vector3(0,1,0)},uMoon:{value:new T3.Vector3(0,-1,0)},uZen:{value:new T3.Vector3()},uHor:{value:new T3.Vector3()},uGlow:{value:new T3.Vector3()},
  uDay:U.uDay,uNight:U.uNight,uCloud:{value:.2},uFog:{value:0},uTime:U.uTime,uFlash:U.uFlash,uMoonI:{value:.5},uGold:{value:0},uWindV:{value:new T3.Vector2(.01,.004)},uRainDark:{value:0}},
 vertexShader:'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p;}',
 fragmentShader:['uniform vec3 uSun,uMoon,uZen,uHor,uGlow;uniform float uDay,uNight,uCloud,uFog,uTime,uFlash,uMoonI,uGold,uRainDark;uniform vec2 uWindV;varying vec3 vDir;',
  'float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}',
  'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}',
  'void main(){vec3 d=normalize(vDir);float y=d.y;',
  ' float t=pow(1.0-max(y,0.0),2.6);vec3 col=mix(uZen,uHor,t);',
  ' if(y<0.0)col=uHor*mix(1.0,0.72,min(1.0,-y*5.0));',
  ' float sd=max(dot(d,uSun),0.0);',
  ' col+=uGlow*pow(sd,6.0)*0.55*uGold+uGlow*pow(sd,32.0)*0.35;',
  ' float disc=smoothstep(0.99935,0.99965,sd)*step(-0.03,uSun.y);col=mix(col,vec3(1.0,0.96,0.86),disc*(1.0-uCloud*0.92));',
  ' if(uNight>0.01&&y>0.0){vec2 sp=d.xz/(y+0.35)*240.0;vec2 ip=floor(sp);float s=h1(ip);float st=step(0.9962,s)*smoothstep(0.45,0.0,length(fract(sp)-0.5))*(0.65+0.35*sin(uTime*2.3+s*61.0));col+=st*uNight*(1.0-uCloud)*vec3(0.85,0.9,1.0)*smoothstep(0.0,0.25,y);}',
  ' float md=dot(d,uMoon);float mdisc=smoothstep(0.99962,0.99985,md);col+=mdisc*vec3(0.96,0.95,0.86)*(0.2+0.8*uMoonI)*(1.0-uCloud*0.85)*(1.0-uDay*0.55)*step(-0.02,uMoon.y);',
  ' col+=vec3(0.55,0.65,0.85)*pow(max(md,0.0),220.0)*0.25*uMoonI*uNight*(1.0-uCloud*0.6);',
  ' if(y>0.0){vec2 cp=d.xz/(y+0.10)*1.5+uWindV*uTime;float c=fbm(cp)+0.25*fbm(cp*3.1-uWindV*uTime*2.0);float thr=0.98-uCloud*0.82;float cov=smoothstep(thr,thr+0.28,c)*smoothstep(0.0,0.14,y);',
  '  vec3 lit=mix(vec3(0.09,0.10,0.15),vec3(1.0,1.0,1.0),uDay)*mix(1.0,0.58,uCloud)*(1.0-0.35*uRainDark);lit+=uGlow*uGold*0.55*(0.4+0.6*pow(sd,2.0));lit+=uFlash*vec3(0.8,0.85,1.0);',
  '  float shade=mix(1.0,0.72,smoothstep(0.5,1.1,c));col=mix(col,lit*shade,min(1.0,cov*(0.75+0.25*uCloud)));}',
  ' col=mix(col,uHor,clamp(uFog*(1.0-max(y,0.0)*0.6),0.0,1.0));',
  ' col+=uFlash*vec3(0.30,0.33,0.40);gl_FragColor=vec4(col,1.0);}'].join('\n')});
 var s=new T3.Mesh(new T3.SphereGeometry(4000,40,20),m);s.frustumCulled=false;s.renderOrder=-10;SKY=s;streetScene.add(s);return s;}

// ---- precipitation: GPU-animated rain streaks and snow flakes in a box that follows the view ----
var PRECIP=null;
function buildPrecip(){var N=14000,BOX=1700,H=1000;
 var rp=new Float32Array(N*2*3),re=new Float32Array(N*2);for(var i=0;i<N;i++){var x=Math.random()*BOX,y=Math.random()*H,z=Math.random()*BOX;for(var k=0;k<2;k++){rp[(i*2+k)*3]=x;rp[(i*2+k)*3+1]=y;rp[(i*2+k)*3+2]=z;re[i*2+k]=k;}}
 var rg=new T3.BufferGeometry();rg.setAttribute('position',new T3.BufferAttribute(rp,3));rg.setAttribute('endp',new T3.BufferAttribute(re,1));
 var common='uniform float uTime,uFall;uniform vec3 uC;uniform vec2 uW;';
 var wrap='vec3 p=position;p.y=mod(p.y-uTime*uFall,'+H+'.0);p.xz=uC.xz+mod(p.xz-uC.xz+uW*uTime*0.0+'+(BOX/2)+'.0,'+BOX+'.0)-'+(BOX/2)+'.0;p.xz+=uW*(p.y/uFall);';
 var rain=new T3.LineSegments(rg,new T3.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:U.uTime,uFall:{value:260},uC:{value:new T3.Vector3()},uW:{value:new T3.Vector2()},uA:{value:0},uLen:{value:.06},uNightR:U.uNight,uFlashR:U.uFlash},
  vertexShader:common+'attribute float endp;uniform float uLen;varying float vE;void main(){'+wrap+'p+=endp*vec3(uW.x,uFall,uW.y)*uLen;vE=endp;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
  fragmentShader:'uniform float uA,uNightR,uFlashR;varying float vE;void main(){vec3 c=mix(vec3(0.72,0.78,0.88),vec3(0.55,0.6,0.75),uNightR)+uFlashR*0.6;gl_FragColor=vec4(c,uA*(0.25+0.75*vE));}'}));
 rain.frustumCulled=false;
 var NS=9000,sp=new Float32Array(NS*3),ss=new Float32Array(NS);for(var j=0;j<NS;j++){sp[j*3]=Math.random()*BOX;sp[j*3+1]=Math.random()*H;sp[j*3+2]=Math.random()*BOX;ss[j]=Math.random();}
 var sg=new T3.BufferGeometry();sg.setAttribute('position',new T3.BufferAttribute(sp,3));sg.setAttribute('seed',new T3.BufferAttribute(ss,1));
 var snow=new T3.Points(sg,new T3.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:U.uTime,uFall:{value:38},uC:{value:new T3.Vector3()},uW:{value:new T3.Vector2()},uA:{value:0},uPx:{value:1}},
  vertexShader:common+'attribute float seed;uniform float uPx;void main(){'+wrap+'p.x+=sin(uTime*0.9+seed*40.0)*6.0;p.z+=cos(uTime*0.7+seed*31.0)*6.0;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp((2600.0+seed*2600.0)/-mv.z,1.5,9.0)*uPx;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float uA;void main(){vec2 q=gl_PointCoord-0.5;float a=smoothstep(0.5,0.1,length(q));gl_FragColor=vec4(vec3(0.97),a*uA);}'}));
 snow.frustumCulled=false;
 var bolt=new T3.Line(new T3.BufferGeometry(),new T3.LineBasicMaterial({color:0xe6ecff,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,fog:false}));bolt.frustumCulled=false;
 streetScene.add(rain);streetScene.add(snow);streetScene.add(bolt);PRECIP={rain:rain,snow:snow,bolt:bolt,N:N,NS:NS,boltT:0};return PRECIP;}

// ---- ecology + night lighting: trees (parks, woods, street trees) and street lamps for one chunk ----
var TREEGEO=null;
function treeGeo(){if(TREEGEO)return TREEGEO;
 // merge non-indexed parts into one geometry with per-vertex colour (shade: darker inside/below, lighter sunlit tips)
 function merge(parts){var P=[],N=[],C=[];parts.forEach(function(g){g=g.index?g.toNonIndexed():g;g.computeVertexNormals();var p=g.attributes.position.array,n=g.attributes.normal.array,c=g.attributes.color?g.attributes.color.array:null;for(var i=0;i<p.length;i++){P.push(p[i]);N.push(n[i]);C.push(c?c[i]:1);}});
  var G=new T3.BufferGeometry();G.setAttribute('position',new T3.Float32BufferAttribute(P,3));G.setAttribute('normal',new T3.Float32BufferAttribute(N,3));G.setAttribute('color',new T3.Float32BufferAttribute(C,3));return G;}
 function shade(g,lo,hi,yl,yh,jit,rs){var p=g.attributes.position.array,c=new Float32Array(p.length),r=seededRand(rs);for(var i=0;i<p.length;i+=3){var t=Math.max(0,Math.min(1,(p[i+1]-yl)/(yh-yl))),v=lo+(hi-lo)*t+(r()-.5)*jit;c[i]=v*.97;c[i+1]=v;c[i+2]=v*.9;}g.setAttribute('color',new T3.BufferAttribute(c,3));return g;}
 function lump(r,x,y,z,seed,det){var g=new T3.IcosahedronGeometry(r,det).toNonIndexed(),p=g.attributes.position.array,rr=seededRand(seed),cache={};
  for(var i=0;i<p.length;i+=3){var k=Math.round(p[i]*500)+','+Math.round(p[i+1]*500)+','+Math.round(p[i+2]*500),f=cache[k];if(f==null)f=cache[k]=.78+rr()*.4;p[i]=p[i]*f+x;p[i+1]=p[i+1]*f*.92+y;p[i+2]=p[i+2]*f+z;}return g;}
 // broadleaf crown: 7 leafy lumps around a core, overall ~unit radius
 var L=[lump(.74,0,0,0,11,1)];[[.5,.36,.1,.1],[-.46,.3,.28,.08],[.05,.3,-.5,.1],[-.1,.62,-.05,.06]].forEach(function(o,i){L.push(lump(.4+o[3],o[0],o[1],o[2],31+i*7,0));});
 var cr=merge(L.map(function(g,i){return shade(g,.55,1.18,-.9,1,.22,77+i);}));
 // conifer: four drooping tiers, narrower towards the tip (unit height, base radius 1)
 var T=[];for(var i=0;i<3;i++){var h=.5-.06*i,r=1-.28*i,y0=.12+.26*i,c=new T3.ConeGeometry(r,h,8,1,true);c.translate(0,y0+h/2,0);var p=c.attributes.position.array;for(var k=0;k<p.length;k+=3){if(p[k+1]<y0+.01){var a=Math.atan2(p[k+2],p[k]);p[k+1]-=.03+.03*Math.sin(a*5);}}T.push(shade(c,.6,1.12,y0,y0+h,.18,91+i));}
 var tip=new T3.ConeGeometry(.12,.2,7);tip.translate(0,.98,0);T.push(shade(tip,1,1.1,.9,1.1,.1,5));var co=merge(T);
 var tr=new T3.CylinderGeometry(.11,.16,1,6);tr.translate(0,.5,0);
 TREEGEO={crown:cr,cone:co,trunk:tr};[cr,co,tr].forEach(function(g){g.userData.keep=true;});return TREEGEO;}
function seasonPalette(se){ // deciduous crown colours for the season at this latitude
 if(se.tropic)return {dec:[0x3f7d33,0x4a8a38,0x356f2c,0x5b9440],bare:0};
 if(se.s===0)return {dec:se.f<.35?[0x8fbf5a,0x9ccb68,0xd9a3bf,0x86b552]:[0x6fae47,0x7dbb52,0x5f9e3e],bare:0};
 if(se.s===1)return {dec:[0x3f7a2e,0x4d8a35,0x2f6a2a,0x467f33],bare:0};
 if(se.s===2){var g=[0x4f8a35,0x5f8f36],a=[0xc8762a,0xd9a332,0xa8452a,0xb8862e,0x8f5a2a];var out=[],k=Math.min(1,se.f*1.3);for(var i=0;i<10;i++)out.push(i/10<k?a[i%a.length]:g[i%g.length]);return {dec:out,bare:se.f>.85?.5:0};}
 return {dec:[0x6b5a48,0x75644f,0x5f5040],bare:1};}
function seededRand(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function decorate(g,d,cap){var M=envMats(),G=treeGeo(),se=ENV.season||seasonAt(envNow(),ENV.lat),pal=seasonPalette(se);cap=cap||5000;
 // occupancy grid of building footprints (8 m cells) so trees and lamps avoid buildings
 var occ=new Set(),CS=8;(d.b||[]).forEach(function(x){var bb=x._bb;if(!bb){var a0=1e9,b0=1e9,a1=-1e9,b1=-1e9;for(var m=2;m<x.length-1;m+=2){a0=Math.min(a0,x[m]);b0=Math.min(b0,x[m+1]);a1=Math.max(a1,x[m]);b1=Math.max(b1,x[m+1]);}bb=[a0,b0,a1,b1];}
  var i0=Math.floor(bb[0]/CS),i1=Math.floor(bb[2]/CS),j0=Math.floor(bb[1]/CS),j1=Math.floor(bb[3]/CS);if((i1-i0+1)*(j1-j0+1)>600)return;for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)occ.add(i*100003+j);});
 function free(x,z){return !occ.has(Math.floor(x/CS)*100003+Math.floor(z/CS));}
 var T=[];// x,z,h,r,type(0 decid,1 conifer)
 var pk=d.pk||[];for(var p=0;p<pk.length&&T.length<cap;p++){var poly=pk[p],cls=poly[0];var A=Math.abs(polyArea(poly,1));if(A<200)continue;
  var x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(var q=1;q<poly.length;q+=2){x0=Math.min(x0,poly[q]);z0=Math.min(z0,poly[q+1]);x1=Math.max(x1,poly[q]);z1=Math.max(z1,poly[q+1]);}
  var want=Math.min(cls===2?900:500,A/(cls===2?120:300)),rnd=seededRand(Math.round(poly[1]*7+poly[2]*13)),tries=want*3;
  for(var t=0;t<tries&&want>0&&T.length<cap;t++){var x=x0+rnd()*(x1-x0),z=z0+rnd()*(z1-z0);if(!pip(x,z,poly,1)||!free(x,z))continue;want--;
   var con=rnd()<(cls===2?.42:.2);T.push(x,z,(con?9:6)+rnd()*(con?9:7),2.2+rnd()*2.8,con?1:0);}}
 // street trees along secondary/tertiary/minor roads, lamps along all drivable roads
 var L=[],rd=d.rd||[],rnd2=seededRand(rd.length*31+7);
 for(var r=0;r<rd.length;r++){var a=rd[r],cl=a[0];if(a[1]===2||cl>6)continue;var w=(RW[cl]||5)/2;var stepL=cl<=2?34:cl<=4?38:46,stepT=17,accL=rnd2()*stepL,accT=rnd2()*stepT,side=1;
  for(var k=2;k<a.length-2;k+=2){var ax=a[k],az=a[k+1],bx=a[k+2],bz=a[k+3],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.5)continue;var nx=-dz/len,nz=dx/len;
   for(var s=accL;s<len;s+=stepL){var px=ax+dx*s/len+nx*(w+1.2)*side,pz=az+dz*s/len+nz*(w+1.2)*side;side=-side;if(a[1]!==1&&free(px,pz))L.push(px,pz,cl);}accL=(accL-len)%stepL;if(accL<0)accL+=stepL;
   if(cl>=3&&cl<=5&&a[1]!==1&&T.length<cap){for(var s2=accT;s2<len;s2+=stepT){if(rnd2()<.5)continue;var sd2=rnd2()<.5?1:-1;var tx=ax+dx*s2/len+nx*(w+3.2)*sd2,tz=az+dz*s2/len+nz*(w+3.2)*sd2;if(free(tx,tz)&&free(tx+2,tz)&&free(tx,tz+2))T.push(tx,tz,5+rnd2()*5,1.8+rnd2()*1.6,rnd2()<.12?1:0);}accT=(accT-len)%stepT;if(accT<0)accT+=stepT;}}}
 var n=T.length/5;if(n){var nd=0,nc=0;for(var i=0;i<n;i++){if(T[i*5+4])nc++;else nd++;}
  var crown=new T3.InstancedMesh(G.crown,M.crown,Math.max(1,nd)),cone=new T3.InstancedMesh(G.cone,M.cone,Math.max(1,nc)),trunk=new T3.InstancedMesh(G.trunk,M.trunk,n);
  var mm=new T3.Matrix4(),pos=new T3.Vector3(),sc=new T3.Vector3(),qq=new T3.Quaternion(),col=new T3.Color(),di=0,ci=0,rc=seededRand(n*17+3);
  for(var i=0;i<n;i++){var x=T[i*5],z=T[i*5+1],h=T[i*5+2],rr=T[i*5+3],ty=T[i*5+4];
   if(ty){pos.set(x,h*.18,z);sc.set(rr*.9,h*.9,rr*.9);mm.compose(pos,qq,sc);cone.setMatrixAt(ci,mm);col.setHex([0x2c5a35,0x335f3a,0x264e30][ci%3]);cone.setColorAt(ci++,col);
    pos.set(x,0,z);sc.set(rr*.5,h*.25,rr*.5);}
   else{var bare=pal.bare&&rc()<pal.bare;var crr=bare?rr*.6:rr;pos.set(x,h-crr*.9,z);sc.set(crr,crr*1.05,crr);mm.compose(pos,qq,sc);crown.setMatrixAt(di,mm);col.setHex(pal.dec[Math.floor(rc()*pal.dec.length)]);if(bare)col.setHex(0x6b5a48);crown.setColorAt(di++,col);
    pos.set(x,0,z);sc.set(rr*.7,h-crr*1.2,rr*.7);}
   mm.compose(pos,qq,sc);trunk.setMatrixAt(i,mm);}
  crown.count=nd;cone.count=nc;[crown,cone,trunk].forEach(function(o){o.castShadow=true;o.receiveShadow=false;if(o.instanceMatrix)o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.userData.keepGeo=true;g.add(o);});}
 var nl=L.length/3;if(nl){var lp=new Float32Array(nl*3),lc=new Float32Array(nl*3),pool=new T3.InstancedMesh(new T3.PlaneGeometry(1,1).rotateX(-Math.PI/2),M.lampPool,nl);var c2=new T3.Color(),rl=seededRand(nl*11+5),mm2=new T3.Matrix4();
  for(var j=0;j<nl;j++){var lx=L[j*3],lz=L[j*3+1],lcl=L[j*3+2];lp[j*3]=lx;lp[j*3+1]=8.5;lp[j*3+2]=lz;c2.setHex(lcl<=2||rl()<.4?0xe9f0ff:0xffb35c);lc[j*3]=c2.r;lc[j*3+1]=c2.g;lc[j*3+2]=c2.b;
   var ps=lcl<=2?30:22;mm2.makeScale(ps,1,ps);mm2.setPosition(lx,1.35,lz);pool.setMatrixAt(j,mm2);pool.setColorAt(j,c2);}
  var hg=new T3.BufferGeometry();hg.setAttribute('position',new T3.BufferAttribute(lp,3));hg.setAttribute('color',new T3.BufferAttribute(lc,3));
  var heads=new T3.Points(hg,M.lampHead);heads.frustumCulled=true;pool.renderOrder=2;g.add(pool);g.add(heads);}
 return {trees:n,lamps:nl};}

// ---- weather & time control ----
function envEnterCity(c){ENV.on=true;ENV.lat=c.lat;ENV.lon=c.lon;if(ENV.timeMode!=='live'&&!ENV.simMs)ENV.simMs=Date.now();ENV.season=seasonAt(envNow(),c.lat);ENV.riseSet=null;
 if(!SKY)buildSky();if(!PRECIP)buildPrecip();
 if(!ENV.cur){ENV.cur=wxCopy(WXP.partly);ENV.tgt=wxCopy(WXP.partly);}
 ENV.lastShadow=0;ENV.wxLL=null;fetchWeather(c.lat,c.lon);envUI(true);}
// live weather: fetched on entry, re-fetched every 10 min while you stay (Open-Meteo refreshes ~15 min),
// and again when you walk > 8 km away in live streets. Last good data stays on screen while refreshing.
function fetchWeather(lat,lon,force){var key=lat.toFixed(2)+','+lon.toFixed(2);
 if(!force&&ENV.wxKey===key&&Date.now()-ENV.wxAt<300000&&ENV.wxLive)return applyWxMode();
 if(ENV.wxBusy)return;var moved=!ENV.wxLL||hav(ENV.wxLL.lat,ENV.wxLL.lon,lat,lon)>8;
 if(moved&&!force){ENV.wxLive=null;ENV.tz=null;}ENV.wxKey=key;ENV.wxErr=false;ENV.wxBusy=true;ENV.wxTry=Date.now();applyWxMode();
 var u='https://api.open-meteo.com/v1/forecast?latitude='+lat.toFixed(3)+'&longitude='+lon.toFixed(3)+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&minutely_15=wind_speed_10m,wind_gusts_10m,wind_direction_10m&past_minutely_15=2&forecast_minutely_15=6&wind_speed_unit=ms&timezone=auto&forecast_days=1';
 var ctl=window.AbortController?new AbortController():null;var to=setTimeout(function(){if(ctl)ctl.abort();},8000);
 fetch(u,ctl?{signal:ctl.signal}:undefined).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(j){clearTimeout(to);ENV.wxBusy=false;if(ENV.wxKey!==key||!j||!j.current)throw new Error('no data');
  ENV.wxLive=wxFromLive(j.current);ENV.wxLive.time=j.current.time;WIND.m=wxM15(j);WIND.at=0;ENV.tz=j.utc_offset_seconds!=null?j.utc_offset_seconds:null;ENV.tzName=j.timezone_abbreviation||j.timezone||'';ENV.wxAt=Date.now();ENV.wxLL={lat:lat,lon:lon};ENV.riseSet=null;ENV.wxErr=false;applyWxMode();})
 .catch(function(){clearTimeout(to);ENV.wxBusy=false;if(ENV.wxKey===key){ENV.wxErr=true;applyWxMode();}});}
function wxWatch(){if(!ENV.on||ENV.wxMode!=='live'||ENV.wxBusy)return;var now=Date.now();
 var ll=L2.live&&L2.target?localToLL(L2.target.x,L2.target.z):{lat:ENV.lat,lon:ENV.lon};
 var far=ENV.wxLL&&hav(ENV.wxLL.lat,ENV.wxLL.lon,ll.lat,ll.lon)>8;
 windStep();if(far||(ENV.wxLive&&now-ENV.wxAt>300000)||(!ENV.wxLive&&now-(ENV.wxTry||0)>(ENV.wxErr?120000:600000)))fetchWeather(ll.lat,ll.lon,!far);}
function applyWxMode(){var m=ENV.wxMode;var live=ENV.wxLive;var t=live?live.temp:null;
 if(m==='live')ENV.tgt=live?Object.assign({},live):wxCopy(WXP.partly,t);else ENV.tgt=wxCopy(WXP[m]||WXP.clear,m==='snow'?Math.min(t!=null?t:-3,-1):t);
 if(live&&m!=='live'){ENV.tgt.wdir=live.wdir;if(m!=='snow'&&m!=='storm')ENV.tgt.hum=live.hum;}
 envUI(true);}
function setWxMode(m){ENV.wxMode=m;applyWxMode();if(m==='live'&&ENV.on&&!ENV.wxLive&&!ENV.wxErr)fetchWeather(ENV.lat,ENV.lon);}
function setHourLocal(h){var now=envNow(),off=utcOff()*1000;var day0=Math.floor((now+off)/86400000)*86400000-off;ENV.simMs=day0+h*3600000;ENV.timeMode='manual';ENV.lastShadow=0;envUI(true);}

function envStep(dt,now){if(!ENV.on||!SKY)return;var c=ENV.cur,t=ENV.tgt;U.uTime.value=now/1000;
 if(ENV.lapse){ENV.timeMode='manual';ENV.simMs+=dt*1440000;} // 1 day per minute
 // ease weather toward target (~4 s)
 var k=1-Math.pow(.32,dt);['cloud','rain','snow','fog','wind','gust','thunder','temp','hum'].forEach(function(f){if(t[f]!=null)c[f]+=(t[f]-c[f])*k;});
 c.vis+=(t.vis-c.vis)*k;c.code=t.code;c.wdir=t.wdir;c.feels=t.feels;
 var ms=envNow(),A=astro(ms,ENV.lat,ENV.lon);ENV.sun=A.sun;ENV.moon=A.moon;var e=A.sun.el;
 if(!ENV.riseSet||Math.abs(ms-ENV.riseSet.at)>3*3600000){ENV.riseSet=riseSet(ms,ENV.lat,ENV.lon,utcOff());ENV.riseSet.at=ms;}
 // illuminance estimate (lux) — sun, twilight, moon, starlight; attenuated by cloud and fog
 var att=(1-.72*c.cloud)*(1-.5*c.fog)*(1-.3*Math.max(c.rain,c.snow));var lux=e>0?120000*Math.pow(Math.sin(e*D2R),1.15)*att:e>-18?400*Math.pow(10,e*.36)*(1-.6*c.cloud):0;
 if(A.moon.el>0)lux+=.26*A.moon.illum*Math.sin(A.moon.el*D2R)*(1-.85*c.cloud);lux+=.002;ENV.lux=lux;
 var day=sstep(-6,6,e),night=1-sstep(-12,-2,e),gold=sstep(-5,2,e)*(1-sstep(4,20,e));ENV.day=day;ENV.night=night;ENV.gold=gold;
 var real=ENV.style;U.uReal.value+=(real-U.uReal.value)*Math.min(1,dt*4);var re=U.uReal.value;
 U.uDay.value=day;U.uNight.value=night;U.uSnow.value+=((c.snow>.15||(c.temp<0&&c.snow>.05)?Math.min(1,c.snow*1.2):0)-U.uSnow.value)*Math.min(1,dt*.15);
 U.uWet.value+=((c.rain>.1?Math.min(1,c.rain*1.4):0)-U.uWet.value)*Math.min(1,dt*.4);U.uWind.value=Math.min(2.2,c.wind/6+(c.gust-c.wind)/12*(.5+.5*Math.sin(now/900)));
 // street lamps follow a photocell: on below ~50 lux (dusk) — the norm for public lighting
 var lampOn=1-sstep(15,120,lux);ENV.lamps+=(lampOn-ENV.lamps)*Math.min(1,dt*1.5);
 // windows: fraction lit depends on local hour (evening peak, late-night trough)
 var lh=localHour(ms);var litFrac=lh<5?.12:lh<7?.22:lh<9?.3:lh<17?.18:lh<19?.42:lh<23?.55:.3;U.uLit.value=1-litFrac;WIN.value=(.08+1.15*Math.max(night,ENV.lamps*.8))*(re>.5?1:.7)+(1-re)*.4;
 // ---- sky colours (display-space) ----
 var zDay=mixA(hx(0x3d7fd6),hx(0x8d97a3),c.cloud*.95),hDay=mixA(hx(0xbad4ee),hx(0xb4bac1),c.cloud);
 var zTw=hx(0x1d2c5a),hTw=mixA(hx(0x6a5a7c),hx(0xe8925a),sstep(-6,1,e)*(1-c.cloud*.8)),zN=hx(0x020510),hN=mixA(hx(0x0c1426),hx(0x2a2116),.55*ENV.lamps*(1-c.fog*.3)); // city skyglow
 var tw=sstep(-12,0,e),dd=sstep(-1,10,e);var zen=mixA(mixA(zN,zTw,tw),zDay,dd),hor=mixA(mixA(hN,hTw,tw),hDay,dd);
 if(c.fog>.01){var fogC=mixA(mixA(hx(0x262c36),hx(0xb4bac2),sstep(-8,4,e)),hx(0x4a3f2e),night*ENV.lamps*.45);hor=mixA(hor,fogC,Math.min(1,c.fog));zen=mixA(zen,fogC,c.fog*.8);}
 if(c.rain>.01){var rc=mixA(hx(0x0c0f15),hx(0x7d858f),day);hor=mixA(hor,rc,c.rain*.5);zen=mixA(zen,rc,c.rain*.55);}
 var su=SKY.material.uniforms;su.uZen.value.set(zen[0],zen[1],zen[2]);su.uHor.value.set(hor[0],hor[1],hor[2]);var gl=mixA(hx(0xffb070),hx(0xfff2d8),sstep(2,25,e));su.uGlow.value.set(gl[0],gl[1],gl[2]);
 su.uCloud.value=c.cloud;su.uFog.value=Math.min(1,c.fog*.9);su.uGold.value=gold*(1-c.cloud*.7);su.uMoonI.value=A.moon.illum;su.uRainDark.value=Math.max(c.rain,c.snow*.5);
 var wr=(c.wdir||0)*D2R;su.uWindV.value.set(-Math.sin(wr)*c.wind*.0016,Math.cos(wr)*c.wind*.0016);
 var sv=dirFromAzEl(A.sun.az,A.sun.el),mv=dirFromAzEl(A.moon.az,A.moon.el);su.uSun.value.copy(sv);su.uMoon.value.copy(mv);
 SKY.position.copy(camera.position);
 // ---- lights ----
 var sunI=sstep(-1.5,7,e)*(1.2+2.1*sstep(5,40,e))*(1-.82*c.cloud)*(1-.6*c.fog);var moonI=A.moon.el>0?(.12+.5*A.moon.illum)*(1-.85*c.cloud)*sstep(0,8,A.moon.el)*(1-sstep(-4,1,e)):0;
 var useSun=sunI>=moonI,L=useSun?sv:mv;var lc=useSun?mixA(hx(0xff9a52),hx(0xfff4e2),sstep(1,30,e)):hx(0xa8bfff);
 var I=useSun?sunI:moonI;sSun.intensity=I*(.55+.45*re)+(1-re)*.9;sSun.color.setRGB(lc[0],lc[1],lc[2],T3.SRGBColorSpace);
 var tg=L2.target||new T3.Vector3();
 var hemiSky=mixA(mixA(hx(0x1e2c4c),hx(0x6c7aa0),tw),mixA(hx(0xc3dbff),hx(0xc9cdd3),c.cloud),dd),hemiGnd=mixA(hx(0x0c0e14),hx(0x6b6558),dd);
 var hI=(.34+.22*tw+1.0*dd+.25*c.cloud*dd)*(1+ENV.flash*2.5);if(c.snow>.1)hI*=1+.25*U.uSnow.value;
 HEMI.color.setRGB(hemiSky[0],hemiSky[1],hemiSky[2],T3.SRGBColorSpace);HEMI.groundColor.setRGB(hemiGnd[0],hemiGnd[1],hemiGnd[2],T3.SRGBColorSpace);
 HEMI.intensity=re*hI+(1-re)*.85;HEMI.color.lerp(CYBERHEMI,1-re);
 sSun2.intensity=re*(.12+.35*dd)*(1-.5*c.cloud)+(1-re)*.4;
 // shadow direction: refresh shadows when the light moved > 0.35° (or on lapse every 150 ms)
 if(L.y>0.02){var lp=L.clone().multiplyScalar(1500);var shBox=DRV.on&&!DRV.fly?480:900;if(sSun.shadow.camera.right!==shBox){var scm=sSun.shadow.camera;scm.left=scm.bottom=-shBox;scm.right=scm.top=shBox;scm.updateProjectionMatrix();ENV.lastShadow=0;}
 if(ENV.shadowDir.angleTo(L)>.006||!ENV.lastShadow||L2.live&&L2.live.shadowAt.distanceTo(tg)>(DRV.on?120:180)){if(now-ENV.lastShadow>(ENV.lapse?150:400)){ENV.shadowDir.copy(L);ENV.lastShadow=now;sSun.position.set(tg.x+lp.x,lp.y,tg.z+lp.z);sSun.target.position.set(tg.x,0,tg.z);sSun.target.updateMatrixWorld();sSun.castShadow=true;renderer.shadowMap.needsUpdate=true;if(L2.live)L2.live.shadowAt.copy(tg);}}}
 else if(sSun.castShadow&&I<.02){sSun.castShadow=false;}
 // ---- fog ----
 var camD=camera.position.distanceTo(tg),far=Math.min(45000,camD+1500+c.vis*1.1),near=Math.max(60,Math.min(far*.45,camD*(.85-.55*c.fog)));var fc=mixA(hor,hor,0);if(re<.5){far=Math.max(3200,camD*3+2600);near=Math.max(1100,camD*1.1);fc=hx(0x050b16);}
 if(SKYV.on){near=camD*2.2;far=camD*5;}
 if(drvBubble()){far=Math.min(far,2300);near=Math.min(near,850);}
 streetScene.fog.near+=(near-streetScene.fog.near)*k;streetScene.fog.far+=(far-streetScene.fog.far)*k;streetScene.fog.color.setRGB(fc[0],fc[1],fc[2],T3.SRGBColorSpace);
 SKY.visible=re>.02&&!SKYV.on;streetScene.background=re>.5?null:CYBERBG;
 // ---- materials ----
 var M=MAT;if(M.road){M.road.roughness=.9-.4*U.uWet.value*re;M.road.metalness=0;
  M.glow.opacity=.5*(1-re)+.16*re*ENV.lamps;M.roof.opacity=SKYV.on&&SKYV.bmode==='outline'?.9:.32*(1-re)+.05*re;M.grid.opacity=.35*(1-re);M.frame.opacity=.45*(1-re)+.18*re;
  var gC=new T3.Color(0x0a1222).lerp(TMPC.setHex(c.snow>.1?0xdfe4ea:0x6f7067).lerp(TMPC2.setHex(0xdfe4ea),U.uSnow.value*.9).multiplyScalar(1-.3*U.uWet.value),re);M.ground.color.copy(gC);
  var se=ENV.season||{s:1},grass=se.s===2?0x7f9149:se.s===3?0x7b8061:se.s===0?0x6e9f45:0x5a8a40;
  M.park.color.setHex(0x123a26).lerp(TMPC.setHex(grass).lerp(TMPC2.setHex(0xe6eaef),U.uSnow.value*.92),re);M.wood.color.setHex(0x16422a).lerp(TMPC.setHex(0x3f6a35).lerp(TMPC2.setHex(0xd7dde3),U.uSnow.value*.75),re);
  M.water.color.setHex(0x0b2a4d).lerp(TMPC.setHex(0x34607d).lerp(TMPC2.setHex(0x151c26),night*.6),re);M.water.roughness=.18+.4*c.rain;
  M.lampHead.uniforms.uOn.value=ENV.lamps*(re>.5?1:.25);M.lampHead.uniforms.uFN.value=streetScene.fog.near;M.lampHead.uniforms.uFF.value=streetScene.fog.far+400;M.lampHead.uniforms.uPx.value=renderer.getPixelRatio();M.lampPool.opacity=ENV.lamps*.62*re*(1+.6*c.fog+.4*U.uWet.value);
  M.traffic.opacity=.55+.45*Math.max(night,ENV.lamps)+(1-re)*.4;M.traffic.size=4+2.5*Math.max(night,ENV.lamps);}
 U.uSkyRef.value.setRGB(hor[0],hor[1],hor[2],T3.SRGBColorSpace);
 // ---- precipitation + lightning ----
 if(PRECIP){var ctr=new T3.Vector3().copy(tg).lerp(camera.position,.45);var pw=new T3.Vector2(-Math.sin(wr)*c.wind*2.2,-Math.cos(wr)*c.wind*2.2);
  var ru=PRECIP.rain.material.uniforms;ru.uC.value.copy(ctr);ru.uW.value.copy(pw);ru.uA.value=Math.min(.75,c.rain*.9)*re;PRECIP.rain.visible=c.rain>.02&&re>.3&&!SKYV.on;PRECIP.rain.geometry.setDrawRange(0,Math.floor(PRECIP.N*Math.min(1,c.rain+.15))*2);
  var nu=PRECIP.snow.material.uniforms;nu.uC.value.copy(ctr);nu.uW.value.copy(pw).multiplyScalar(.6);nu.uA.value=Math.min(.95,c.snow*1.2)*re;nu.uPx.value=renderer.getPixelRatio();PRECIP.snow.visible=c.snow>.02&&re>.3&&!SKYV.on;PRECIP.snow.geometry.setDrawRange(0,Math.floor(PRECIP.NS*Math.min(1,c.snow+.15)));
  if(c.thunder>.5&&re>.3){if(!ENV.nextBolt)ENV.nextBolt=now+2500+Math.random()*5000;if(now>ENV.nextBolt){ENV.nextBolt=now+4000+Math.random()*9000;ENV.flash=1;PRECIP.boltT=now;
    var ang=Math.random()*Math.PI*2,dist=900+Math.random()*1600,gx=tg.x+Math.cos(ang)*dist,gz=tg.z+Math.sin(ang)*dist;var pts=boltPoints(new T3.Vector3(gx+(Math.random()-.5)*300,1100,gz+(Math.random()-.5)*300),new T3.Vector3(gx,0,gz),26,60);
    PRECIP.bolt.geometry.dispose();PRECIP.bolt.geometry=new T3.BufferGeometry().setFromPoints(pts);}}
  var bt=(now-PRECIP.boltT)/1000;PRECIP.bolt.material.opacity=bt<.5?(bt<.08||(bt>.14&&bt<.22)?1:.25)*(1-bt*2):0;}
 if(ENV.flash>0){ENV.flash=Math.max(0,ENV.flash-dt*3.2);var fl=ENV.flash*ENV.flash*(.75+.25*Math.sin(now*.03));U.uFlash.value=fl*.8;}else U.uFlash.value=0;
 if(now-ENV.uiAt>1000){ENV.uiAt=now;wxWatch();envUI(false);}}
function dirFromAzEl(az,el){var a=az*D2R,e=el*D2R;return new T3.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),-Math.cos(a)*Math.cos(e)).normalize();} // x=east, y=up, z=south (local right-handed frame; north = -z)
var TMPC=new T3.Color(),TMPC2=new T3.Color(),CYBERHEMI=new T3.Color(0x8fb2ff),CYBERBG=new T3.Color(0x050b16);

// ---- environmental security posture (generic teaching reference; condition-based, never building-specific) ----
function envSecurity(){var c=ENV.cur,zh=LZ(),lux=ENV.lux,items=[];if(!c)return items;
 function add(k,lv,val,note){items.push({k:k,lv:lv,val:val,note:note});}
 var cctv=lux>=50?(I18T('colour_imaging')):lux>=1?(I18T('low_light_colour_mono')):(I18T('ir_night_mode_mono'));
 var lvI=lux>=1000?(ENV.gold>.3?1:0):lux>=50?1:lux>=1?2:3;
 add(I18T('illumination'),lvI,(lux>=1000?Math.round(lux/1000)+'k':lux>=10?Math.round(lux):lux.toFixed(lux<.1?3:1))+' lux · '+cctv,
  lvI===0?(I18T('ample_daylight_colour_cctv')):
  lvI===1&&lux>=1000?(I18T('low_sun_backlight_and')):
  lvI===1?(I18T('dusk_gloom_image_noise')):
  lvI===2?(I18T('lit_night_cameras_switch')):
  (I18T('below_1_lux_most')));
 var v=c.vis,lvV=v>=10000?0:v>=4000?1:v>=1000?2:v>=200?3:4;
 add(I18T('visibility'),lvV,(v>=1000?(v/1000).toFixed(v>=10000?0:1)+' km':Math.round(v)+' m'),
  lvV===0?(I18T('clear_line_of_sight')):
  lvV<=2?(I18T('haze_precipitation_shortens_effective')):
  (I18T('dense_fog_visible_light')));
 var w=c.wind,g=c.gust||w,lvW=g<8?0:g<11?1:g<15?2:g<20?3:4;
 add(I18T('wind'),lvW,w.toFixed(1)+' m/s'+(g>w+1?(I18T('gust'))+g.toFixed(0):'')+' · '+(I18T('drone_patrol'))+' '+(g<8?(I18T('ok')):g<12?(I18T('limited')):(I18T('grounded'))),
  lvW===0?(I18T('good_for_drone_patrol')):
  lvW<=2?(I18T('gusts_near_consumer_drone')):
  (I18T('strong_wind_drones_grounded')));
 var pr=Math.max(c.rain,c.snow),lvP=pr<.05?0:pr<.3?1:pr<.65?2:3,ptype=c.snow>c.rain?(I18T('snow')):(I18T('rain'));
 add(I18T('precipitation'),lvP,pr<.05?(I18T('none')):ptype+' '+Math.round(pr*100)+'%',
  lvP===0?(I18T('dry')):c.snow>c.rain?(I18T('snow_obscures_lenses_and')):
  (I18T('rain_raises_pir_microwave')));
 add(I18T('lightning'),c.thunder>.5?4:0,c.thunder>.5?(I18T('thunderstorm')):(I18T('none')),
  c.thunder>.5?(I18T('surges_can_kill_power')):(I18T('no_storm_risk')));
 var tp=c.temp!=null?c.temp:15,lvT=tp>=38||tp<=-10?3:tp>=33||tp<=0?2:tp>=28?1:0;
 add(I18T('temperature'),lvT,tp.toFixed(0)+' °C · '+(I18T('rh'))+Math.round(c.hum||0)+'%',
  tp>=28?(I18T('heat_data_room_cooling')):
  tp<=0?(I18T('cold_battery_capacity_drops')):(I18T('within_normal_equipment_range')));
 var lh=localHour(envNow()),lvH=lh<5?2:(lh>=7&&lh<9.5)||(lh>=17&&lh<19.5)?2:lh>=22?1:0;
 add(I18T('time_window'),lvH,fmtHM(envNow())+(I18T('local')),
  lh<5?(I18T('small_hours_thinnest_staffing')):
  lvH===2?(I18T('rush_hour_dense_crowds')):
  lh>=22?(I18T('night_shift_handover_gaps')):(I18T('regular_working_hours')));
 return items;}
function envSecHTML(){var it=envSecurity();if(!it.length)return '';var zh=LZ();var mx=0,sum=0;it.forEach(function(x){mx=Math.max(mx,x.lv);sum+=x.lv;});var overall=Math.min(4,Math.round(Math.max(mx*.7,sum/it.length*1.6)));
 var rs=ENV.riseSet||{},m=ENV.moon;var phaseN=I18P(m.illum<.05?'新月':m.illum>.95?'满月':m.waxing?(m.illum<.5?'蛾眉月':'盈凸月'):(m.illum<.5?'残月':'亏凸月'),m.illum<.05?'New moon':m.illum>.95?'Full moon':m.waxing?(m.illum<.5?'Waxing crescent':'Waxing gibbous'):(m.illum<.5?'Waning crescent':'Waning gibbous'));
 var src=ENV.wxMode!=='live'?(I18T('manual_weather_preset')):ENV.wxLive?(I18T('open_meteo_live'))+(ENV.wxLive.time||'').replace('T',' '):ENV.wxErr?(I18T('weather_service_unreachable_preset')):(I18T('fetching_live_weather'));
 var h='<h3>'+(I18T('environmental_security_posture'))+'</h3><div class="envsum"><div class="ladder sm">';for(var i=0;i<5;i++)h+='<div class="'+(i===overall?'on':'')+'" style="background:'+lvColor(i)+'"></div>';
 h+='</div><span>'+(I18T('overall'))+'<b style="color:'+lvColor(overall)+'">'+(I18P(['低','较低','中','高','严重'],['Low','Guarded','Elevated','High','Severe']))[overall]+'</b></span></div>';
 h+='<div class="envastro"><span>☀ '+(I18T('rise'))+fmtHM(rs.rise)+' · '+(I18T('set'))+fmtHM(rs.set)+' · '+(I18T('sun'))+ENV.sun.el.toFixed(1)+'°</span><span>☾ '+phaseN+' '+Math.round(m.illum*100)+'% · '+(I18T('moon'))+m.el.toFixed(0)+'°</span></div>';
 h+='<div class="envlist">'+it.map(function(x){return '<div class="envit"><i style="background:'+lvColor(x.lv)+'"></i><div><div class="et"><b>'+esc(x.k)+'</b><span>'+esc(x.val)+'</span></div><p>'+esc(x.note)+'</p></div></div>';}).join('')+'</div>';
 h+='<div class="envsrc">'+esc(src)+' · '+(I18T('sun_moon_computed_for'))+'</div>';
 return h;}
function envUI(force){if(!ENV.on||mode!=='street'&&!force)return;var zh=LZ(),c=ENV.cur||{};var ms=envNow();
 var ck=document.getElementById('envClock');if(ck){var d=new Date(ms+utcOff()*1000);ck.textContent=d.getUTCFullYear()+'-'+('0'+(d.getUTCMonth()+1)).slice(-2)+'-'+('0'+d.getUTCDate()).slice(-2)+' '+fmtHM(ms)+' '+(ENV.tz!=null?(ENV.tzName||('UTC'+(ENV.tz>=0?'+':'')+(ENV.tz/3600))):(I18T('solar')));}
 var wx=document.getElementById('envWx');if(wx&&ENV.tgt){var code=ENV.tgt.code;wx.textContent=(LX(WXN)[code]||LX(WXN)[Math.floor(code/10)*10]||'—')+' · '+(c.temp!=null?c.temp.toFixed(0):'—')+'°C · '+(I18T('wind_2'))+(c.wind!=null?c.wind.toFixed(1):'—')+' m/s';}
 var ws=document.getElementById('envWs');if(ws){var t;if(ENV.wxMode!=='live'){t=I18T('manual_weather_live_tracking');ws.className='ws man';}
  else if(ENV.wxLive){var ag=Math.max(0,Math.round((Date.now()-ENV.wxAt)/60000)),nx=Math.max(0,5-ag);t=(I18T('tracking_live_open_meteo'))+(I18T('updated'))+(ag?ag+(I18T('min_ago')):(I18T('just_now')))+(I18P(' · 约 '+nx+' 分钟后自动刷新',' · auto-refresh in ~'+nx+' min'))+(ENV.wxErr?(I18T('last_refresh_failed_keeping')):'');ws.className='ws live';var wl=windLine(zh);if(wl)t+='\n'+wl;}
  else if(ENV.wxBusy){t=I18T('fetching_local_conditions');ws.className='ws';}
  else{t=I18T('weather_service_unreachable_here');ws.className='ws off';}ws.textContent=t;}
 var hr=document.getElementById('eHour');if(hr&&document.activeElement!==hr)hr.value=localHour(ms).toFixed(2);
 var el=document.getElementById('eLive');if(el)el.setAttribute('aria-pressed',ENV.timeMode==='live');var lp=document.getElementById('eLapse');if(lp)lp.setAttribute('aria-pressed',!!ENV.lapse);
 document.querySelectorAll('#eWx button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.wx===ENV.wxMode);});
 var st=document.getElementById('eStyle');if(st)st.setAttribute('aria-pressed',ENV.style===1);
 var sec=document.getElementById('envSec');if(sec){var hh=envSecHTML();if(hh!==ENV.secHTML||force){ENV.secHTML=hh;sec.innerHTML=hh;}}}
function wireEnv(){var hr=document.getElementById('eHour');if(!hr)return;
 hr.addEventListener('input',function(){ENV.lapse=false;setHourLocal(+hr.value);});
 document.getElementById('eLive').onclick=function(){ENV.timeMode='live';ENV.lapse=false;ENV.lastShadow=0;envUI(true);};
 document.getElementById('eLapse').onclick=function(){if(!ENV.lapse&&ENV.timeMode==='live')ENV.simMs=Date.now();ENV.lapse=!ENV.lapse;if(ENV.lapse)ENV.timeMode='manual';envUI(true);};
 document.querySelectorAll('#eWx button').forEach(function(b){b.onclick=function(){setWxMode(b.dataset.wx);};});
 document.getElementById('eStyle').onclick=function(){ENV.style=ENV.style===1?0:1;ENV.secHTML='';envUI(true);};
 ['envBar'].forEach(function(id){var e=document.getElementById(id);if(e)['pointerdown','wheel'].forEach(function(t){e.addEventListener(t,function(ev){ev.stopPropagation();},{passive:true});});});}

// ====================================================================
// NAVIGATION HUD (street mode) — ① orientation mini-globe with real day/night and heading pointer,
// ② XYZ spatial gizmo + compass bezel, ③ "ahead" radar: nearby places / neighbouring countries in the
// direction of travel. All three are read-outs; they never change the camera.
// ====================================================================
var NAV={mg:null,uiAt:0,radarAt:0,ahead:[],border:null,lastNear:{},iso2zh:null,prevLL:null};
function viewLL(){var t=L2.target||{x:0,z:0};if(L2.live)return localToLL(t.x,t.z);var c=L2.city||{lat:0,lon:0};return {lat:c.lat-t.z/110540,lon:c.lon+t.x/(111320*Math.cos(c.lat*D2R))};}
function camHeading(){return ((Math.atan2(-Math.cos(L2.cam.az),Math.sin(L2.cam.az))*R2D)%360+360)%360;}
function bearingTo(a,b,c,d){var p=D2R,y=Math.sin((d-b)*p)*Math.cos(c*p),x=Math.cos(a*p)*Math.sin(c*p)-Math.sin(a*p)*Math.cos(c*p)*Math.cos((d-b)*p);return ((Math.atan2(y,x)*R2D)%360+360)%360;}
function subsolar(ms){var n=ms/86400000+2440587.5-2451545.0,r=D2R;var L=(280.460+0.9856474*n)%360,g=((357.528+0.9856003*n)%360)*r,lam=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*r,eps=(23.439-0.0000004*n)*r;
 var ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam))*R2D,dec=Math.asin(Math.sin(eps)*Math.sin(lam))*R2D,gmst=((18.697374558+24.06570982441908*n)%24+24)%24;var lon=((ra-gmst*15)%360+540)%360-180;return {lat:dec,lon:lon};}
function tangentBasis(lat,lon){var p=ll2v(lat,lon,1),e=ll2v(lat,lon+0.05,1).sub(p).normalize(),nn=ll2v(Math.min(89.9,lat+0.05),lon,1).sub(p).normalize();return {n:p.normalize(),e:e,north:nn};}

// ① mini globe: its own small renderer, sharing geometry/materials/textures with the main globe
function buildMiniGlobe(){if(NAV.mg||!globe)return NAV.mg;var cv=document.getElementById('mgCanvas');if(!cv)return null;
 var r=new T3.WebGLRenderer({canvas:cv,alpha:true,antialias:true});r.setClearColor(0x000000,0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 var s=new T3.Scene(),cam=new T3.PerspectiveCamera(26,1,10,5000);
 s.add(new T3.Mesh(globe.geometry,earthMat));if(atmo)s.add(new T3.Mesh(atmo.geometry,atmo.material));
 ['coast','borders'].forEach(function(k){if(vlayers[k])s.add(new T3.LineSegments(vlayers[k].geometry,vlayers[k].material));});
 if(grat)s.add(new T3.LineSegments(grat.geometry,new T3.LineBasicMaterial({color:0x6fa0ff,transparent:true,opacity:.22,depthWrite:false})));
 // you-are-here: glow + pulse ring + heading arrow + view fan + arc to the next place ahead
 var glow=new T3.Sprite(new T3.SpriteMaterial({map:(glowTex||(glowTex=makeGlowTex())),color:0x58e0c8,blending:T3.AdditiveBlending,depthWrite:false,transparent:true}));glow.scale.set(22,22,1);s.add(glow);
 var ring=new T3.Mesh(new T3.RingGeometry(.92,1,48),new T3.MeshBasicMaterial({color:0x58e0c8,transparent:true,opacity:.8,side:T3.DoubleSide,depthWrite:false,blending:T3.AdditiveBlending}));s.add(ring);
 var arrowG=new T3.BufferGeometry();arrowG.setAttribute('position',new T3.BufferAttribute(new Float32Array(9*3),3));
 var arrow=new T3.Mesh(arrowG,new T3.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.95,side:T3.DoubleSide,depthWrite:false}));arrow.frustumCulled=false;s.add(arrow);
 var fanN=24,fanG=new T3.BufferGeometry();fanG.setAttribute('position',new T3.BufferAttribute(new Float32Array(fanN*9),3));
 var fan=new T3.Mesh(fanG,new T3.MeshBasicMaterial({color:0x58e0c8,transparent:true,opacity:.22,side:T3.DoubleSide,depthWrite:false,blending:T3.AdditiveBlending}));fan.frustumCulled=false;s.add(fan);
 var arcG=new T3.BufferGeometry();arcG.setAttribute('position',new T3.BufferAttribute(new Float32Array(48*3),3));
 var arc=new T3.Line(arcG,new T3.LineDashedMaterial({color:0xff8a3d,dashSize:2.2,gapSize:1.6,transparent:true,opacity:.9,depthWrite:false}));arc.frustumCulled=false;s.add(arc);
 var tgt=new T3.Sprite(new T3.SpriteMaterial({map:(glowTex||(glowTex=makeGlowTex())),color:0xff8a3d,blending:T3.AdditiveBlending,depthWrite:false,transparent:true}));tgt.scale.set(8,8,1);s.add(tgt);
 NAV.mg={r:r,s:s,cam:cam,glow:glow,ring:ring,arrow:arrow,fan:fan,fanN:fanN,arc:arc,tgt:tgt,lat:null,lon:null,sz:0};return NAV.mg;}
function stepMiniGlobe(now,ll,hdg){var M=buildMiniGlobe();if(!M)return;if(now-(M.lr||0)<50)return;M.lr=now;var cv=M.r.domElement,w=cv.clientWidth|0;if(!w)return;if(M.sz!==w){M.sz=w;M.r.setSize(w,w,false);M.cam.aspect=1;M.cam.updateProjectionMatrix();}
 // camera eases toward "above you", north up
 if(M.lat===null){M.lat=ll.lat;M.lon=ll.lon;}M.lat+=(ll.lat-M.lat)*.08;M.lon+=wrapDiff(M.lon*D2R,ll.lon*D2R)*R2D*.08;
 var B=tangentBasis(M.lat,M.lon);M.cam.position.copy(B.n).multiplyScalar(R*4.6).addScaledVector(B.north,-R*.55);M.cam.up.copy(B.north);M.cam.lookAt(B.n.clone().multiplyScalar(R*.15));
 var P=tangentBasis(ll.lat,ll.lon),p0=P.n.clone().multiplyScalar(R*1.004);
 M.glow.position.copy(P.n).multiplyScalar(R*1.01);var pu=(now/1400)%1;M.ring.position.copy(p0);M.ring.lookAt(P.n.clone().multiplyScalar(R*3));var rs=3+pu*9;M.ring.scale.set(rs,rs,1);M.ring.material.opacity=.85*(1-pu);
 var h=hdg*D2R,dir=P.north.clone().multiplyScalar(Math.cos(h)).addScaledVector(P.e,Math.sin(h)),side=P.n.clone().cross(dir).normalize();
 var tip=p0.clone().addScaledVector(dir,R*.22),bl=p0.clone().addScaledVector(dir,R*.06).addScaledVector(side,R*.05),br=p0.clone().addScaledVector(dir,R*.06).addScaledVector(side,-R*.05),bc=p0.clone().addScaledVector(dir,R*.1);
 var ap=M.arrow.geometry.attributes.position.array;[tip,bl,bc,tip,bc,br,p0,bl,br].forEach(function(v,i){ap[i*3]=v.x;ap[i*3+1]=v.y;ap[i*3+2]=v.z;});M.arrow.geometry.attributes.position.needsUpdate=true;
 var fp=M.fan.geometry.attributes.position.array,half=32*D2R,rad=R*.34;for(var i=0;i<M.fanN;i++){var a0=h-half+2*half*i/M.fanN,a1=h-half+2*half*(i+1)/M.fanN;
  var d0=P.north.clone().multiplyScalar(Math.cos(a0)).addScaledVector(P.e,Math.sin(a0)),d1=P.north.clone().multiplyScalar(Math.cos(a1)).addScaledVector(P.e,Math.sin(a1));
  var q0=p0.clone().addScaledVector(d0,rad).normalize().multiplyScalar(R*1.003),q1=p0.clone().addScaledVector(d1,rad).normalize().multiplyScalar(R*1.003);
  [p0,q0,q1].forEach(function(v,k){fp[(i*3+k)*3]=v.x;fp[(i*3+k)*3+1]=v.y;fp[(i*3+k)*3+2]=v.z;});}
 M.fan.geometry.attributes.position.needsUpdate=true;
 var T=NAV.border||NAV.ahead[0];if(T){var a=P.n,b=ll2v(T.lat,T.lon,1).normalize(),om=Math.acos(Math.max(-1,Math.min(1,a.dot(b)))),sp=M.arc.geometry.attributes.position.array;
  for(var j=0;j<48;j++){var t=j/47,v=om<1e-4?a.clone():a.clone().multiplyScalar(Math.sin((1-t)*om)/Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(t*om)/Math.sin(om)));v.multiplyScalar(R*(1.006+.05*Math.sin(Math.PI*t)*Math.min(1,om*4)));sp[j*3]=v.x;sp[j*3+1]=v.y;sp[j*3+2]=v.z;}
  M.arc.geometry.attributes.position.needsUpdate=true;M.arc.computeLineDistances();M.arc.visible=true;M.tgt.visible=true;M.tgt.position.copy(b).multiplyScalar(R*1.01);}else{M.arc.visible=false;M.tgt.visible=false;}
 // real sun on the mini globe
 var ss=subsolar(envNow());var sd=ll2v(ss.lat,ss.lon,1).normalize();earthMat.uniforms.sunDir.value.copy(sd);earthMat.uniforms.camPos.value.copy(M.cam.position);earthMat.uniforms.nightBoost.value=1;
 M.r.render(M.s,M.cam);}

// ② XYZ gizmo (SVG). Local frame: X = east, Y = up, Z = north.
var AXES=[{v:[1,0,0],c:'#ff5470',l:'X',s:'E'},{v:[0,1,0],c:'#58e0c8',l:'Y',s:'UP'},{v:[0,0,1],c:'#6aa6ff',l:'Z',s:'S'}];
function buildGizmo(){var g=document.getElementById('gzSvg');if(!g||g.dataset.ok)return;g.dataset.ok=1;var NS='http://www.w3.org/2000/svg',h='';
 h+='<defs><filter id="gzGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
  +'<radialGradient id="gzBg"><stop offset="0" stop-color="rgba(88,224,200,.10)"/><stop offset="1" stop-color="rgba(4,10,22,0)"/></radialGradient></defs>';
 h+='<circle cx="80" cy="80" r="74" fill="url(#gzBg)" stroke="rgba(88,224,200,.35)" stroke-width="1"/><circle cx="80" cy="80" r="50" fill="none" stroke="rgba(120,160,230,.18)" stroke-dasharray="2 4"/>';
 h+='<g id="gzBezel">';for(var i=0;i<72;i++){var a=i*5*D2R,r1=74,r2=i%18===0?64:i%6===0?68:71;h+='<line x1="'+(80+Math.sin(a)*r1).toFixed(1)+'" y1="'+(80-Math.cos(a)*r1).toFixed(1)+'" x2="'+(80+Math.sin(a)*r2).toFixed(1)+'" y2="'+(80-Math.cos(a)*r2).toFixed(1)+'" stroke="rgba(150,200,255,'+(i%18===0?.9:.35)+')" stroke-width="'+(i%18===0?1.6:1)+'"/>';}
 ['N','E','S','W'].forEach(function(t,i){var a=i*90*D2R;h+='<text x="'+(80+Math.sin(a)*57).toFixed(1)+'" y="'+(80-Math.cos(a)*57+3.5).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+(i?'rgba(170,200,255,.75)':'#ff5470')+'" font-family="JetBrains Mono,monospace">'+t+'</text>';});
 h+='</g><path d="M80 2 L76 9 L84 9 Z" fill="#ffd24a" filter="url(#gzGlow)"/><g id="gzAxes" filter="url(#gzGlow)"></g><circle cx="80" cy="80" r="2.6" fill="#e8eefc"/>';
 g.innerHTML=h;}
function stepGizmo(hdg){buildGizmo();var ax=document.getElementById('gzAxes');if(!ax)return;camera.updateMatrixWorld();var mi=camera.matrixWorldInverse,items=[];
 AXES.forEach(function(A){var v=new T3.Vector3(A.v[0],A.v[1],A.v[2]).transformDirection(mi);items.push({A:A,x:v.x,y:-v.y,z:v.z});});
 items.sort(function(a,b){return a.z-b.z;});var h='',L=40;
 items.forEach(function(it){var x=80+it.x*L,y=80+it.y*L,nx=80-it.x*L,ny=80-it.y*L,op=(.55+.45*(it.z*.5+.5)).toFixed(2);
  h+='<line x1="80" y1="80" x2="'+nx.toFixed(1)+'" y2="'+ny.toFixed(1)+'" stroke="'+it.A.c+'" stroke-opacity=".25" stroke-width="1.2" stroke-dasharray="2 3"/>'
   +'<circle cx="'+nx.toFixed(1)+'" cy="'+ny.toFixed(1)+'" r="2.4" fill="none" stroke="'+it.A.c+'" stroke-opacity=".45"/>'
   +'<line x1="80" y1="80" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+it.A.c+'" stroke-opacity="'+op+'" stroke-width="2.4" stroke-linecap="round"/>'
   +'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="8.5" fill="rgba(4,10,22,.85)" stroke="'+it.A.c+'" stroke-opacity="'+op+'" stroke-width="1.4"/>'
   +'<text x="'+x.toFixed(1)+'" y="'+(y+3.3).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+it.A.c+'" fill-opacity="'+op+'" font-family="JetBrains Mono,monospace">'+it.A.l+'</text>';});
 ax.innerHTML=h;var bz=document.getElementById('gzBezel');if(bz)bz.setAttribute('transform','rotate('+(-hdg).toFixed(1)+' 80 80)');}

// ③ "ahead" radar: places within reach in the direction of travel + nearest neighbouring country ahead
function iso2zh(){if(NAV.iso2zh)return NAV.iso2zh;var f={},m={};CITIES.forEach(function(c){if(c.iso&&c.czh){var k=c.iso+'|'+c.czh;f[k]=(f[k]||0)+1+(c.cap?50:0);}});Object.keys(f).forEach(function(k){var p=k.split('|');if(!m[p[0]]||f[k]>f[p[0]+'|'+m[p[0]]])m[p[0]]=p[1];});return NAV.iso2zh=m;}
function computeAhead(ll,hdg){if(!NODES)return;var rows=NODES.rows,near=null,nd=1e9,cand=[],bc=null,bd=1e9;
 for(var i=0;i<rows.length;i++){var r=rows[i],d=hav(ll.lat,ll.lon,r[5],r[6]);if(d<nd){nd=d;near=r;}if(d>2600)continue;var b=bearingTo(ll.lat,ll.lon,r[5],r[6]),rel=((b-hdg+540)%360)-180;cand.push({r:r,d:d,b:b,rel:rel});}
 var iso=near?near[4]:null;NAV.here={r:near,d:nd,iso:iso};
 var ah=cand.filter(function(c){return c.d>0.8&&c.d<400&&Math.abs(c.rel)<=40&&c.r!==near;}).sort(function(a,b){return a.d-b.d;}).slice(0,4);
 cand.forEach(function(c){if(c.r[4]!==iso&&c.r[4]!=='-99'&&Math.abs(c.rel)<=55&&c.d<bd){bd=c.d;bc=c;}});
 NAV.ahead=ah.map(function(c){var k=c.r[0]+c.r[4],prev=NAV.lastNear[k];NAV.lastNear[k]=c.d;return {name:c.r[0],zh:c.r[1],ctry:c.r[3],iso:c.r[4],lat:c.r[5],lon:c.r[6],d:c.d,rel:c.rel,closing:prev!=null&&c.d<prev-0.02};});
 NAV.border=bc?{name:bc.r[3],iso:bc.r[4],lat:bc.r[5],lon:bc.r[6],d:bc.d,rel:bc.rel,via:bc.r[0]}:null;
 NAV.radar=cand.filter(function(c){return c.d<220;}).slice(0,160);}
function fmtKm(d){return d<1?Math.round(d*1000)+' m':d<10?d.toFixed(1)+' km':Math.round(d)+' km';}
function stepAhead(now,ll,hdg){var el=document.getElementById('aheadList'),rd=document.getElementById('rdDots');if(!el)return;var zh=LZ();
 if(now-NAV.radarAt>320){NAV.radarAt=now;computeAhead(ll,hdg);var z2=iso2zh();
  var h='';NAV.ahead.forEach(function(a,i){h+='<div data-i="'+i+'" class="ah'+(TRV.on&&TRV.dest&&TRV.dest.name===a.name?' going':'')+(i===0?' first':'')+(a.closing?' closing':'')+'"><i style="transform:rotate('+a.rel.toFixed(0)+'deg)">▲</i><span class="nm">'+esc(zh&&a.zh?a.zh:a.name)+'<em>'+esc((zh&&z2[a.iso]?z2[a.iso]:a.ctry)||'')+'</em></span><b>'+fmtKm(a.d)+'</b></div>';});
  if(!NAV.ahead.length)h='<div class="ah none">'+(I18T('no_listed_places_within'))+'</div>';
  var B=NAV.border;if(B)h+='<div data-i="b" class="ah border"><i style="transform:rotate('+B.rel.toFixed(0)+'deg)">▲</i><span class="nm">'+(I18T('border'))+esc(zh&&z2[B.iso]?z2[B.iso]:B.name)+'<em>'+esc(I18T('via'))+esc(B.via)+'</em></span><b>'+fmtKm(B.d)+'</b></div>';
  var here=NAV.here&&NAV.here.r?(zh&&NAV.here.r[1]?NAV.here.r[1]:NAV.here.r[0])+' · '+(zh&&z2[NAV.here.iso]?z2[NAV.here.iso]:NAV.here.r[3]):'';
  document.getElementById('aheadHere').textContent=(I18T('near'))+here;el.innerHTML=h;wireAhead();trvUI();
  // radar dots (heading-up, log range rings 10/50/200 km)
  var s='';function rr(d){return 52*Math.log(1+d/10)/Math.log(1+220/10);}(NAV.radar||[]).forEach(function(c){var r=rr(c.d),a=c.rel*D2R,x=60+Math.sin(a)*r,y=60-Math.cos(a)*r;var hot=NAV.ahead.length&&c.r[0]===NAV.ahead[0].name;var foreign=NAV.here&&c.r[4]!==NAV.here.iso;
   s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(hot?3.2:1.7)+'" fill="'+(hot?'#ffd24a':foreign?'#ff8a3d':'#58e0c8')+'" fill-opacity="'+(Math.abs(c.rel)<=40?1:.45)+'"/>';});rd.innerHTML=s;}
 var sw=document.getElementById('rdSweep');if(sw)sw.setAttribute('transform','rotate('+((now/12)%360).toFixed(1)+' 60 60)');}

function placeNavHud(){var nh=document.getElementById('navHud');if(!nh)return;var W=window.innerWidth,open=!panel.classList.contains('min'),pr=panel.getBoundingClientRect();
 var right=(open&&W>900)?(W-pr.left+14):16;var gz=document.getElementById('gizmo'),ah=document.getElementById('ahead'),mg=document.getElementById('miniGlobe');
 if(gz){gz.style.right=right+'px';}if(ah){ah.style.right=right+'px';}
 if(mg){if(W>=1150){mg.style.left=Math.max(410,Math.round(W*.22))+'px';mg.style.top='40px';}else{mg.style.left='16px';mg.style.top='150px';}}}
function navHudStep(dt,now){var nh=document.getElementById('navHud');if(!nh)return;var on=mode==='street'&&L2.active;nh.classList.toggle('on',on);if(!on)return;
 var ll=viewLL(),hdg=camHeading();if(now-NAV.uiAt>250){NAV.uiAt=now;placeNavHud();
  var t=L2.target||{x:0,z:0},alt=Math.round(Math.sin(L2.cam.el)*L2.cam.d);document.getElementById('gzRead').innerHTML='HDG <b>'+('00'+Math.round(hdg)).slice(-3)+'°</b> · PIT <b>−'+Math.round(L2.cam.el*R2D)+'°</b><br>E <b>'+(t.x>=0?'+':'')+(t.x/1000).toFixed(2)+'</b> N <b>'+(-t.z>=0?'+':'')+(-t.z/1000).toFixed(2)+'</b> km · ALT <b>'+alt+'</b> m';
  document.getElementById('mgRead').textContent=fmtLL(ll.lat,ll.lon);}
 stepGizmo(hdg);stepAhead(now,ll,hdg);stepMiniGlobe(now,ll,hdg);}

// ====================================================================
// CONNECTED TRAVEL + COVERAGE — (1) the live map keeps trying to reach the tile server and
// retries tiles that failed; (2) "travel" glides along the ground from city to city while tiles
// stream in under you, so neighbouring towns join into one map; (3) a coverage scanner grades every
// city's street data and finds the ones that still need work.
// ====================================================================
var LIVEP={tries:0,timer:null,ring:1};
try{LIVEP.ring=localStorage.getItem('se.ring')==='2'?2:1;}catch(e){}
function reprobe(){if(LIVE||/nolive/.test(location.hash))return;clearTimeout(LIVEP.timer);
 LIVEP.timer=setTimeout(function(){LIVEP.tries++;probeLive().then(function(ok){if(ok)onLiveUp();else reprobe();});},Math.min(60000,6000*Math.pow(1.6,LIVEP.tries)));}
function onLiveUp(){ovtInit();toast(I18T('map_server_reachable_live'));
 if(mode==='street'&&L2.active&&!L2.live)updateLiveHud();if(COV.panelOpen)renderCoverage();}
// fetchTile: see PERFORMANCE PIPELINE (cache + prefetch)
function liveRetryPass(lv,now){var n=0;for(var k in lv.tiles){var T=lv.tiles[k];if(T.state==='retry'&&now>=T.retryAt){T.state='queued';T.fetch=fetchTile(T.x,T.y);lv.queue.push(k);n++;}}if(n)livePump();}
function tileFailed(T){T.tries=(T.tries||0)+1;if(T.tries<6){T.state='retry';T.retryAt=performance.now()+1200*Math.pow(2,T.tries-1);}else T.state='failed';}
function setRing(r){LIVEP.ring=r;try{localStorage.setItem('se.ring',String(r));}catch(e){}if(L2.live)liveUpdate(true);}

var toastEl=null,toastT=0;
function toast(msg){if(!toastEl){toastEl=document.createElement('div');toastEl.id='seToast';document.body.appendChild(toastEl);}
 toastEl.textContent=msg;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on');},3200);}

// ---- travel: glide over the ground to a place, streaming tiles on the way ----
var TRV={on:false,speed:1};try{var _sp=+localStorage.getItem('se.trvSpeed');if(_sp>=0&&_sp<=2)TRV.speed=_sp;}catch(e){}
var TRV_SPEEDS=[{zh:'慢',en:'Slow',v:380,gate:40},{zh:'中',en:'Med',v:1600,gate:520},{zh:'快',en:'Fast',v:0,gate:1e9}];
function nearestCity(lat,lon,maxKm){var best=null,bd=maxKm||1e9;CITIES.forEach(function(c){var d=hav(lat,lon,c.lat,c.lon);if(d<bd){bd=d;best=c;}});return best;}
function azForBearing(bDeg){var b=bDeg*D2R,az=Math.atan2(Math.cos(b),-Math.sin(b));while(az-L2.cam.az>Math.PI)az-=2*Math.PI;while(az-L2.cam.az<-Math.PI)az+=2*Math.PI;return az;}
function travelTo(dest){if(!L2.active)return;
 if(!L2.live){var c=nearestCity(dest.lat,dest.lon,60);
  if(c){toast((I18T('offline_jumping_to'))+cityName(c));enterCity(c.id);}
  else toast(I18T('no_offline_core_here'));return;}
 var lv=L2.live,x=(dest.lon-lv.lon0)*lv.mLon,z=(dest.lat-lv.lat0)*lv.mLat,dx=x-L2.target.x,dz=z-L2.target.z,dist=Math.hypot(dx,dz);if(dist<30)return;
 var ll=viewLL();TRV.on=true;TRV.dest=dest;TRV.x=x;TRV.z=z;TRV.total=dist;TRV.v=0;TRV.t0=performance.now();
 L2.camWant.az=azForBearing(bearingTo(ll.lat,ll.lon,dest.lat,dest.lon));L2.camWant.el=0.5;L2.camWant.d=Math.min(2300,950+dist/120);if(SKYV.on){L2.camWant.el=SKYV.el;L2.camWant.d=Math.min(9000,Math.max(L2.camWant.d,3500+dist/60));}
 toast((I18T('travelling_to'))+(LZ()&&dest.zh?dest.zh:dest.name)+' · '+fmtKm(dist/1000));trvUI(true);}
function travelStop(arrived){if(!TRV.on)return;TRV.on=false;if(!SKYV.on){L2.camWant.d=Math.max(700,Math.min(L2.camWant.d,1100));L2.camWant.el=0.62;}trvUI(true);
 if(arrived)arriveAt(TRV.dest);}
function travelStep(dt){if(!L2.live){if(TRV.on)TRV.on=false;return;}
 if(L2.ground){L2.ground.position.x=L2.target.x;L2.ground.position.z=L2.target.z;}
 if(!TRV.on){// keep the local frame honest after long manual walks
  if(Math.hypot(L2.target.x,L2.target.z)>45000&&!(KEYS.w||KEYS.a||KEYS.s||KEYS.d||KEYS.arrowup||KEYS.arrowdown||KEYS.arrowleft||KEYS.arrowright)&&!dragging2())liveRebase(viewLL());
  return;}
 if(KEYS.escape||KEYS.w||KEYS.s||KEYS.a||KEYS.d||KEYS.arrowup||KEYS.arrowdown||KEYS.arrowleft||KEYS.arrowright){travelStop(false);return;}
 L2.drone.touch=performance.now();
 var dx=TRV.x-L2.target.x,dz=TRV.z-L2.target.z,rem=Math.hypot(dx,dz);
 var lv=L2.live,T=lv.tiles[lv.cx+','+lv.cy],ready=!T||T.state==='ready'||T.state==='empty'||T.state==='failed';
 var S=TRV_SPEEDS[TRV.speed],vmax=S.v||Math.max(1600,Math.min(14000,TRV.total/16));if(SKYV.on)vmax*=3.5;
 var want=vmax*Math.min(1,0.08+rem/(vmax*2.4));if(!ready)want=Math.min(want,S.gate*(SKYV.on?6:1));
 TRV.v+=(want-TRV.v)*Math.min(1,dt*(want<TRV.v?3:1.2));
 var st=Math.min(rem,TRV.v*dt);L2.target.x+=dx/rem*st;L2.target.z+=dz/rem*st;
 // keep facing the destination as the great-circle bearing drifts
 var ll=viewLL();L2.camWant.az=azForBearing(bearingTo(ll.lat,ll.lon,TRV.dest.lat,TRV.dest.lon));
 if(rem-st<4)travelStop(true);}
function dragging2(){return !!(L2.drag||L2.dragging);}
// re-centre the local metric frame on a new point (tiles reload from the browser cache)
function liveRebase(ll){var lv=L2.live;if(!lv)return;midClear();farClear();var ox=L2.target.x,oz=L2.target.z;
 Object.keys(lv.tiles).forEach(unloadTile);
 L2.group.children.forEach(function(ch){if(ch!==L2.ground){ch.position.x-=ox;ch.position.z-=oz;}});
 L2.live=newLiveState({lat:ll.lat,lon:ll.lon});L2.target.set(0,0,0);if(L2.ground){L2.ground.position.x=0;L2.ground.position.z=0;}
 ENV.lat=ll.lat;ENV.lon=ll.lon;ENV.riseSet=null;ENV.season=seasonAt(envNow(),ll.lat);liveUpdate(true);}
function arriveAt(dest){liveRebase({lat:dest.lat,lon:dest.lon});
 var c=nearestCity(dest.lat,dest.lon,25);
 if(!c){var z2=iso2zh();c={id:'pt_'+Math.round(dest.lat*1e3)+'_'+Math.round(dest.lon*1e3),en:dest.name,zh:dest.zh||'',iso:dest.iso||'',czh:z2[dest.iso]||'',country:dest.ctry||'',lat:dest.lat,lon:dest.lon};}
 L2.city=c;setCrumb();toast((I18T('arrived'))+cityName(c));
 setTimeout(function(){if(L2.active&&L2.city===c&&(state.type==='cityIntro'||state.type==='intro'))renderCityIntro(c,{b:L2.picks||[],rd:{length:L2._rd||0}});},2600);}
function trvUI(force){var box=document.getElementById('aheadTrv');if(!box){var ah=document.getElementById('ahead');if(!ah)return;box=document.createElement('div');box.id='aheadTrv';ah.appendChild(box);
  box.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-sp]');if(b){TRV.speed=+b.getAttribute('data-sp');try{localStorage.setItem('se.trvSpeed',String(TRV.speed));}catch(_){}trvUI(true);e.stopPropagation();return;}
   if(e.target.closest('[data-stop]')){travelStop(false);e.stopPropagation();}});}
 var zh=LZ(),sp='<span class="sp">'+TRV_SPEEDS.map(function(s,i){return '<button data-sp="'+i+'" class="'+(i===TRV.speed?'on':'')+'">'+(I18P(s.zh,s.en))+'</button>';}).join('')+'</span>';
 if(TRV.on&&TRV.dest&&isFinite(TRV.x)){var rem=Math.hypot(TRV.x-L2.target.x,TRV.z-L2.target.z)/1000;
  box.innerHTML='<div class="tr go"><span>▶ '+esc(zh&&TRV.dest.zh?TRV.dest.zh:TRV.dest.name)+'</span><b>'+fmtKm(rem)+'</b><em>'+Math.round(TRV.v*3.6)+' km/h</em>'+sp+'<button data-stop>■</button></div>';}
 else box.innerHTML=(typeof DRV!=='undefined'&&DRV.on)?'<div class="tr"><span>'+(DRV.fly?(I18T('click_a_place_to')):(I18T('click_a_place_to_2')))+'</span></div>':'<div class="tr"><span>'+(L2.live?(I18T('click_a_place_above')):(I18T('offline_click_a_place')))+'</span>'+(L2.live?sp:'')+'</div>';}
function wireAhead(){var el=document.getElementById('aheadList');if(!el||el._wired)return;el._wired=1;
 el.addEventListener('pointerdown',function(e){var r=e.target.closest('[data-i]');if(!r)return;e.stopPropagation();var i=r.getAttribute('data-i'),a=i==='b'?NAV.border:NAV.ahead[+i];if(!a)return;
  if(DRV.on){drvSetDest({lat:a.lat,lon:a.lon,n:i==='b'?a.via:(LZ()&&a.zh?a.zh:a.name)});return;}
  travelTo(i==='b'?{lat:a.lat,lon:a.lon,name:a.via,zh:'',iso:a.iso,ctry:a.name}:{lat:a.lat,lon:a.lon,name:a.name,zh:a.zh,iso:a.iso,ctry:a.ctry});});}

// ---- coverage: grade every city's street data, deep-scan the weak ones ----
var COV={on:false,pts:null,deep:{},re:{},job:null,filt:{g:{C:1,D:1},iso:''},panelOpen:false,dirty:0};
try{COV.deep=JSON.parse(localStorage.getItem('se.covDeep')||'{}')||{};COV.re=JSON.parse(localStorage.getItem('se.recentre')||'{}')||{};}catch(e){}
var GRADES={A:{zh:'完整',en:'Complete',c:'#3ee0a0'},B:{zh:'良好',en:'Good',c:'#58c8e0'},C:{zh:'稀疏',en:'Sparse',c:'#ffb340'},D:{zh:'缺失',en:'Missing',c:'#ff4d6a'},'?':{zh:'未知',en:'Unknown',c:'#8892a6'}};
function gradeOf(d){return d==null?'?':d>=900?'A':d>=240?'B':d>=30?'C':'D';}
function tileKm2(lat){var s=40075.016*Math.cos(lat*D2R)/TN;return s*s;}
function covCentre(c){var r=COV.re[c.id];return r?{lat:r.lat,lon:r.lon}:c.clat!=null?{lat:c.clat,lon:c.clon}:{lat:c.lat,lon:c.lon};}
function covInfo(c){var dp=COV.deep[c.id],off=(c.nd!=null||c.od!=null)?Math.max(c.nd||0,c.od||0):null,d=dp?Math.max(dp.cd,off||0):off,g=gradeOf(d),zh=LZ(),diag='',sug=null;
 if(dp&&dp.bd>=240&&dp.bd>=2*Math.max(dp.cd,30)&&dp.bk>0.7)sug={lat:dp.bl[0],lon:dp.bl[1],km:dp.bk,d:dp.bd};
 if(g==='C'||g==='D'||g==='?'){
  if(COV.re[c.id])diag=I18T('re_centred_applies_in');
  else if(sug)diag=(I18T('centre_is_off'))+fmtKm(sug.km)+(I18P(' 外有 '+sug.d+' 栋/km² 的街区，建议移过去',' away there are '+sug.d+' bldg/km² — move it there'));
  else if(dp&&dp.td<30&&dp.rd>=150)diag=I18T('roads_mapped_around_it');
  else if(dp&&dp.td<30)diag=I18T('few_roads_and_buildings');
  else if(dp)diag=I18T('some_data_around_thin');
  else if((c.r||0)>=60)diag=I18P('核心区道路 '+c.r+' 条但建筑少：可能缺建筑轮廓（建议深度扫描）',c.r+' roads in core but few buildings: footprints likely missing (deep-scan it)');
  else diag=I18T('few_roads_and_buildings_2');}
 return {g:g,d:d,off:off,dp:dp,diag:diag,sug:sug};}
function covSave(){try{localStorage.setItem('se.covDeep',JSON.stringify(COV.deep));localStorage.setItem('se.recentre',JSON.stringify(COV.re));}catch(e){}}
function buildCovPts(){if(COV.pts){world.remove(COV.pts);COV.pts.geometry.dispose();}
 var n=CITIES.length,pos=new Float32Array(n*3),col=new Float32Array(n*3),sz=new Float32Array(n);
 CITIES.forEach(function(c,i){var v=ll2v(c.lat,c.lon,R*1.006);pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;var g=covInfo(c).g,cl=new T3.Color(GRADES[g].c);col[i*3]=cl.r;col[i*3+1]=cl.g;col[i*3+2]=cl.b;sz[i]=g==='D'?3.0:g==='C'?2.3:1.6;});
 var geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.BufferAttribute(pos,3));geo.setAttribute('color',new T3.BufferAttribute(col,3));geo.setAttribute('sz',new T3.BufferAttribute(sz,1));
 COV.pts=new T3.Points(geo,new T3.ShaderMaterial({uniforms:{camPos:nodePts?nodePts.material.uniforms.camPos:{value:new T3.Vector3()}},transparent:true,depthWrite:false,
  vertexShader:'attribute float sz;attribute vec3 color;varying vec3 vc;varying float vis;uniform vec3 camPos;void main(){vc=color;vec3 wn=normalize((modelMatrix*vec4(position,1.0)).xyz);vis=step(-0.1,dot(wn,normalize(camPos)));vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=sz*(300.0/-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vc;varying float vis;void main(){if(vis<0.5)discard;vec2 d=gl_PointCoord-0.5;float r=length(d);if(r>0.5)discard;float a=smoothstep(0.5,0.32,r);float ring=smoothstep(0.5,0.44,r)-smoothstep(0.36,0.3,r);gl_FragColor=vec4(mix(vc,vec3(1.0),ring*0.35),a*0.95);}'}));
 COV.pts.visible=COV.on;COV.pts.renderOrder=3;world.add(COV.pts);invalidate(400);}
function setCovOn(on){COV.on=on;var b=document.getElementById('tCov');if(b)b.setAttribute('aria-pressed',on);if(on&&!COV.pts)buildCovPts();if(COV.pts)COV.pts.visible=on;
 if(nodePts){var tn=document.getElementById('tNodes');nodePts.visible=!on&&(!tn||tn.getAttribute('aria-pressed')==='true');}invalidate(600);if(on){if(panel.classList.contains('min'))panel.classList.remove('min');renderCoverage();}else if(state.type==='cov')resetToIntro();}
// deep scan: 3x3 z14 tiles around a city centre — counts footprints and roads, finds the densest tile
// exterior rings whose centroid falls inside the tile (MVT merges buildings into multipolygons)
function countFootprints(L){var n=0,E=L.ext;L.feats.forEach(function(F){if(F.type!==3)return;var p=MVT.props(L,F);if(p.hide_3d)return;MVT.rings(F.geom).forEach(function(r){var a=0,m=r.length,cx=0,cy=0;
  for(var q=0;q<m;q+=2){var x1=r[q],y1=r[q+1],x2=r[(q+2)%m],y2=r[(q+3)%m];a+=x1*y2-x2*y1;cx+=x1;cy+=y1;}cx/=m/2;cy/=m/2;if(a>8&&cx>=0&&cx<E&&cy>=0&&cy<E)n++;});});return n;}
function deepScan(c){var lat=c.lat,lon=c.lon,cx=Math.floor(tlx(lon)),cy=Math.floor(tly(lat)),jobs=[];
 for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++)(function(x,y){jobs.push(fetchTile(x,y).then(function(buf){if(!buf)return {x:x,y:y,fail:1};var nb=0,nr=0;
  try{var Ls=MVT.decode(new Uint8Array(buf));if(Ls.building)nb=countFootprints(Ls.building);if(Ls.transportation)Ls.transportation.feats.forEach(function(F){if(F.type===2)nr++;});}catch(e){return {x:x,y:y,fail:1};}
  return ovtFor(nb,x,y).then(function(OV){var no=OV&&OV.building?countFootprints(OV.building):0;return {x:x,y:y,b:Math.max(nb,no),osm:nb,ov:no,r:nr};});}));})(cx+dx,cy+dy);
 return Promise.all(jobs).then(function(rs){var a=tileKm2(lat),fails=0,tb=0,tr=0,best=null,cd=null;rs.forEach(function(t){if(t.fail){fails++;return;}tb+=t.b;tr+=t.r;var d=t.b/a;if(t.x===cx&&t.y===cy)cd=Math.round(d);if(!best||d>best.d)best={d:d,t:t};});
  if(fails>4)return null;var bl=best?[tilat(best.t.y+.5),tilon(best.t.x+.5)]:[lat,lon];
  return {cd:cd==null?0:cd,bd:best?Math.round(best.d):0,bl:[+bl[0].toFixed(4),+bl[1].toFixed(4)],bk:+hav(lat,lon,bl[0],bl[1]).toFixed(2),td:Math.round(tb/(a*(9-fails))),rd:tr,f:fails,at:Date.now()};});}
function covList(){var f=COV.filt,out=[];CITIES.forEach(function(c){var ci=covInfo(c);if(!f.g[ci.g])return;if(f.iso&&c.iso!==f.iso)return;out.push([c,ci]);});
 var ord={D:0,'?':1,C:2,B:3,A:4};out.sort(function(a,b){return (ord[a[1].g]-ord[b[1].g])||((a[1].d||0)-(b[1].d||0));});return out;}
function covStart(){if(!LIVE){toast(I18T('deep_scan_needs_the'));return;}if(COV.job)return;
 var list=covList().filter(function(x){return !COV.deep[x[0].id];}).map(function(x){return x[0];});if(!list.length){toast(I18T('everything_in_this_filter'));return;}
 var J=COV.job={list:list,i:0,done:0,run:0,paused:false,t0:Date.now(),total:list.length};covPump(J);renderCoverage();}
function covPump(J){if(COV.job!==J||J.paused)return;
 while(J.run<3&&J.i<J.list.length){(function(c){J.run++;J.i++;deepScan(c).then(function(r){if(r)COV.deep[c.id]=r;}).catch(function(){}).then(function(){J.run--;J.done++;COV.dirty++;
  if(J.done%12===0)covSave();if(J.done%30===0&&COV.pts)buildCovPts();if(COV.panelOpen)covProgress();
  if(J.done>=J.total){covSave();COV.job=null;if(COV.pts)buildCovPts();if(COV.panelOpen)renderCoverage();toast(I18T('deep_scan_finished'));}else covPump(J);});})(J.list[J.i]);}}
function covPause(){var J=COV.job;if(!J)return;J.paused=!J.paused;covSave();if(!J.paused){J.t0=Date.now();J.base=J.done;covPump(J);}renderCoverage();}
function covProgress(){var el=document.getElementById('covProg');if(!el||!COV.job)return;var J=COV.job,p=J.total?J.done/J.total:0,el2=(Date.now()-J.t0)/1000,dn=J.done-(J.base||0),eta=dn?el2/dn*(J.total-J.done):0;
 el.innerHTML='<div class="cbar"><i style="width:'+(p*100).toFixed(1)+'%"></i></div><span>'+(J.paused?(I18T('paused')):'')+J.done+' / '+J.total+(J.done&&!J.paused?' · '+(I18T('s'))+Math.ceil(eta/60)+(I18T('min_left')):'')+'</span>';
 if(COV.dirty>40){COV.dirty=0;var lst=document.getElementById('covRows');if(lst)lst.innerHTML=covRowsHTML();}}
function covRowsHTML(){var zh=LZ(),z2=iso2zh(),L=covList(),h='';L.slice(0,250).forEach(function(x){var c=x[0],ci=x[1],G=GRADES[ci.g];
  h+='<div class="crow"><span class="gb" style="--g:'+G.c+'">'+ci.g+'</span><div class="cm"><div class="cn">'+esc(cityName(c))+'<em>'+esc(I18P(c.czh||'',c.country||c.iso||''))+'</em></div><div class="cs">'+
  (I18T('core'))+(c.n!=null?c.n:'—')+(I18T('bldg'))+' · '+(c.nd!=null?c.nd:'—')+'/km²'+(c.od!=null?' · Overture '+c.od+'/km²':'')+(ci.dp?' · '+(I18T('around'))+ci.dp.td+'/km² · '+(I18T('roads'))+ci.dp.rd:'')+'</div>'+(ci.diag?'<div class="cd">'+esc(ci.diag)+'</div>':'')+'</div>'+
  '<div class="ca"><button data-go="'+c.id+'">'+(I18T('open'))+'</button>'+(ci.sug&&!COV.re[c.id]?'<button data-re="'+c.id+'">'+(I18T('re_centre'))+'</button>':'')+(COV.re[c.id]?'<button data-unre="'+c.id+'">'+(I18T('undo'))+'</button>':'')+(LIVE&&!COV.job?'<button data-scan="'+c.id+'">'+(I18T('scan'))+'</button>':'')+'</div></div>';});
 if(L.length>250)h+='<div class="cmore">'+(I18P('只列出前 250 座（共 '+L.length+'），导出报告看全部','Showing 250 of '+L.length+' — export the report for all'))+'</div>';
 if(!L.length)h='<div class="cmore">'+(I18T('no_cities_in_this'))+'</div>';return h;}
function renderCoverage(){COV.panelOpen=true;state={type:'cov'};var zh=LZ(),cnt={A:0,B:0,C:0,D:0,'?':0},byIso={},z2=iso2zh(),scanned=0;
 CITIES.forEach(function(c){var g=covInfo(c).g;cnt[g]++;if(COV.deep[c.id])scanned++;if(g==='C'||g==='D'){byIso[c.iso]=(byIso[c.iso]||0)+1;}});
 var meta=['A','B','C','D'].map(function(g){return '<span class="chip" style="color:'+GRADES[g].c+'">'+g+' '+cnt[g]+'</span>';}).join('');
 pHead.innerHTML=headHTML(I18T('data_coverage'),I18P('城市街区数据扫描 · '+CITIES.length+' 城','Street-data scan · '+CITIES.length+' cities'),meta,true);
 var gb=['A','B','C','D'].map(function(g){var G=GRADES[g];return '<button class="cg'+(COV.filt.g[g]?' on':'')+'" data-g="'+g+'" style="--g:'+G.c+'"><b>'+g+'</b><span>'+(I18P(G.zh,G.en))+'</span><em>'+cnt[g]+'</em></button>';}).join('');
 var isos=Object.keys(byIso).sort(function(a,b){return byIso[b]-byIso[a];});
 var sel='<select id="covIso"><option value="">'+(I18T('all_countries'))+'</option>'+isos.map(function(i){return '<option value="'+i+'"'+(COV.filt.iso===i?' selected':'')+'>'+esc((zh&&z2[i]?z2[i]:i)+' · '+byIso[i])+'</option>';}).join('')+'</select>';
 var nf=covList().filter(function(x){return !COV.deep[x[0].id];}).length,J=COV.job;
 pBody.innerHTML='<div class="cov">'+
  '<p class="ctrl" style="margin:0 0 8px">'+(I18T('grade_building_footprints_per'))+'</p>'+
  '<div class="cgs">'+gb+'</div><div class="crowc">'+sel+'<span class="cst">'+(I18T('deep_scanned'))+scanned+'</span></div>'+
  '<div class="cbtns">'+(J?'<button id="covPause">'+(J.paused?(I18T('resume')):(I18T('pause')))+'</button>':'<button id="covGo"'+(LIVE&&nf?'':' disabled')+'>'+(I18P('深度扫描筛选出的 '+nf+' 座','Deep-scan '+nf+' in filter'))+'</button>')+
  '<button id="covCsv">'+(I18T('export_csv'))+'</button><button id="covJson">JSON</button>'+(scanned?'<button id="covClr">'+(I18T('clear_scans'))+'</button>':'')+'</div>'+
  (LIVE?'':'<div class="cwarn">'+(I18T('map_server_not_reachable'))+'</div>')+
  (nf>400&&!J?'<div class="cwarn soft">'+(I18P('每座城读 9 个街区块，稀疏城市每块通常只有几十 KB；'+nf+' 座大约要下载 '+Math.round(nf*9*0.04)+'–'+Math.round(nf*9*0.12)+' MB，可以先选一个国家。','9 tiles per city; sparse tiles are usually tens of KB. '+nf+' cities ≈ '+Math.round(nf*9*0.04)+'–'+Math.round(nf*9*0.12)+' MB — you can pick one country first.'))+'</div>':'')+
  '<div id="covProg"></div><div id="covRows">'+covRowsHTML()+'</div></div>';
 covProgress();var x=document.getElementById('pClose');if(x)x.onclick=function(){setCovOn(false);};
 pBody.querySelectorAll('.cg').forEach(function(b){b.onclick=function(){var g=b.getAttribute('data-g');if(COV.filt.g[g])delete COV.filt.g[g];else COV.filt.g[g]=1;renderCoverage();};});
 document.getElementById('covIso').onchange=function(){COV.filt.iso=this.value;renderCoverage();};
 var go=document.getElementById('covGo');if(go)go.onclick=covStart;var pa=document.getElementById('covPause');if(pa)pa.onclick=covPause;
 document.getElementById('covCsv').onclick=function(){covExport('csv');};document.getElementById('covJson').onclick=function(){covExport('json');};
 var cl=document.getElementById('covClr');if(cl)cl.onclick=function(){COV.deep={};covSave();if(COV.pts)buildCovPts();renderCoverage();};
 document.getElementById('covRows').onclick=function(e){var b=e.target.closest('button');if(!b)return;var id;
  if((id=b.getAttribute('data-go'))){setCovOn(false);enterCity(id);}
  else if((id=b.getAttribute('data-re'))){var ci=covInfo(CITYBY[id]);if(ci.sug){COV.re[id]={lat:ci.sug.lat,lon:ci.sug.lon};covSave();toast(I18T('re_centred_live_entry'));renderCoverage();}}
  else if((id=b.getAttribute('data-unre'))){delete COV.re[id];covSave();renderCoverage();}
  else if((id=b.getAttribute('data-scan'))){b.disabled=true;b.textContent='…';deepScan(CITYBY[id]).then(function(r){if(r){COV.deep[id]=r;covSave();if(COV.pts)buildCovPts();}renderCoverage();});}};}
function covExport(fmt){var rows=CITIES.map(function(c){var ci=covInfo(c),dp=ci.dp||{};return {id:c.id,name:c.en,name_zh:c.zh||'',iso:c.iso,country:c.country||'',lat:c.lat,lon:c.lon,grade:ci.g,core_buildings:c.n,core_roads:c.r,core_density:c.nd,
  scan_centre_density:dp.cd,scan_around_density:dp.td,scan_roads:dp.rd,scan_best_density:dp.bd,suggest_lat:ci.sug?ci.sug.lat:'',suggest_lon:ci.sug?ci.sug.lon:'',suggest_km:ci.sug?ci.sug.km:'',recentred:COV.re[c.id]?1:0,diagnosis:ci.diag};});
 var ord={D:0,'?':1,C:2,B:3,A:4};rows.sort(function(a,b){return ord[a.grade]-ord[b.grade]||(a.core_density||0)-(b.core_density||0);});
 var txt,mime,name='sentinel-earth-coverage-'+new Date().toISOString().slice(0,10);
 if(fmt==='json'){txt=JSON.stringify({generated:new Date().toISOString(),grades:'A>=900 B>=240 C>=30 D<30 buildings/km2',cities:rows},null,1);mime='application/json';name+='.json';}
 else{var keys=Object.keys(rows[0]);txt='﻿'+keys.join(',')+'\n'+rows.map(function(r){return keys.map(function(k){var v=r[k];v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\n');mime='text/csv';name+='.csv';}
 try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:mime}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);}
 catch(e){toast(I18T('downloads_are_blocked_here'));}}
function wireCov(){var li=document.getElementById('liveInfo');if(li&&!li._w){li._w=1;li.addEventListener('click',function(e){
  if(e.target.closest('[data-golive]')&&L2.city&&CITYBY[L2.city.id]){enterCity(L2.city.id);}
  else if(e.target.closest('[data-ring]')){setRing(LIVEP.ring===2?1:2);updateLiveHud();toast(LIVEP.ring===2?(I18T('view_5_5_tiles')):(I18T('view_3_3_tiles')));}});}
 var b=document.getElementById('tCov');if(!b||b._w)return;b._w=1;b.onclick=function(){setCovOn(b.getAttribute('aria-pressed')!=='true');};}

// ====================================================================
// SKY EYE (天眼) — near-nadir satellite view of the street scene. Public satellite basemap imagery
// (Esri World Imagery, falling back to EOX Sentinel-2 cloudless) is streamed as tiles under the view,
// with a recon-style HUD: UTM/MGRS grid reference, GSD, sun geometry, sensor looks and a list of
// timeline events near the view centre. The imagery is a historical mosaic, not live tasking.
// ====================================================================
var SKYV={on:false,el:1.52,prev:null,sensor:'vis',bmode:'3d',roads:false,grid:true,tiles:{},lru:[],grp:null,gridGrp:null,
 src:0,fails:0,ok:0,lvRef:null,lastZ:0,uiAt:0,evAt:0,gridKey:'',loading:0};
// ---- UTM / MGRS (WGS84) ----
var UTMA=6378137,UTMF=1/298.257223563,UTMK=0.9996,UTME2=UTMF*(2-UTMF),UTMEP=UTME2/(1-UTME2);
function utmZone(lat,lon){var z=Math.floor((lon+180)/6)+1;if(lat>=56&&lat<64&&lon>=3&&lon<12)z=32;
 if(lat>=72&&lat<84){if(lon>=0&&lon<9)z=31;else if(lon>=9&&lon<21)z=33;else if(lon>=21&&lon<33)z=35;else if(lon>=33&&lon<42)z=37;}return z;}
function llToUtm(lat,lon,zone){zone=zone||utmZone(lat,lon);var l0=((zone-1)*6-180+3)*D2R,p=lat*D2R,l=lon*D2R,e2=UTME2,e4=e2*e2,e6=e4*e2;
 var sp=Math.sin(p),cp=Math.cos(p),tp=Math.tan(p),N=UTMA/Math.sqrt(1-e2*sp*sp),T=tp*tp,C=UTMEP*cp*cp,A=cp*(l-l0);
 var M=UTMA*((1-e2/4-3*e4/64-5*e6/256)*p-(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*p)+(15*e4/256+45*e6/1024)*Math.sin(4*p)-(35*e6/3072)*Math.sin(6*p));
 var E=UTMK*N*(A+(1-T+C)*A*A*A/6+(5-18*T+T*T+72*C-58*UTMEP)*Math.pow(A,5)/120)+500000;
 var Nn=UTMK*(M+N*tp*(A*A/2+(5-T+9*C+4*C*C)*Math.pow(A,4)/24+(61-58*T+T*T+600*C-330*UTMEP)*Math.pow(A,6)/720));if(lat<0)Nn+=1e7;
 return {E:E,N:Nn,zone:zone,south:lat<0};}
function utmToLl(E,Nn,zone,south){var e2=UTME2,e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2)),x=E-500000,y=south?Nn-1e7:Nn,l0=((zone-1)*6-180+3)*D2R;
 var mu=y/UTMK/(UTMA*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
 var p1=mu+(3*e1/2-27*Math.pow(e1,3)/32)*Math.sin(2*mu)+(21*e1*e1/16-55*Math.pow(e1,4)/32)*Math.sin(4*mu)+(151*Math.pow(e1,3)/96)*Math.sin(6*mu)+(1097*Math.pow(e1,4)/512)*Math.sin(8*mu);
 var s=Math.sin(p1),c=Math.cos(p1),t=Math.tan(p1),N1=UTMA/Math.sqrt(1-e2*s*s),T1=t*t,C1=UTMEP*c*c,R1=UTMA*(1-e2)/Math.pow(1-e2*s*s,1.5),D=x/(N1*UTMK);
 var lat=p1-(N1*t/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*UTMEP)*Math.pow(D,4)/24+(61+90*T1+298*C1+45*T1*T1-252*UTMEP-3*C1*C1)*Math.pow(D,6)/720);
 var lon=l0+(D-(1+2*T1+C1)*D*D*D/6+(5-2*C1+28*T1-3*C1*C1+8*UTMEP+24*T1*T1)*Math.pow(D,5)/120)/c;return {lat:lat*R2D,lon:lon*R2D};}
function mgrs(lat,lon){if(lat<-80||lat>84)return '—';var u=llToUtm(lat,lon),band='CDEFGHJKLMNPQRSTUVWXX'.charAt(Math.max(0,Math.min(20,Math.floor((lat+80)/8)))),set=u.zone%6||6;
 var cols=['ABCDEFGH','JKLMNPQR','STUVWXYZ'][(set-1)%3],col=cols.charAt(Math.floor(u.E/1e5)-1)||'?',rows='ABCDEFGHJKLMNPQRSTUV',
  row=rows.charAt((Math.floor(u.N/1e5)%20+(set%2===0?5:0))%20);
 function p5(v){v=Math.floor(v%1e5);return ('0000'+v).slice(-5);}return u.zone+band+' '+col+row+' '+p5(u.E)+' '+p5(u.N);}
// ---- local frame (live frame, or the city origin offline) ----
function skyFrame(){if(L2.live)return {lat0:L2.live.lat0,lon0:L2.live.lon0,mLat:L2.live.mLat,mLon:L2.live.mLon};var c=L2.city||{lat:0,lon:0};
 return {lat0:c.lat,lon0:c.lon,mLat:-110540,mLon:111320*Math.cos(c.lat*D2R)};}
function llToLocal(F,lat,lon){return {x:(lon-F.lon0)*F.mLon,z:(lat-F.lat0)*F.mLat};}
function zLon(X,z){return X/Math.pow(2,z)*360-180;}
function zLat(Y,z){var m=Math.PI-2*Math.PI*Y/Math.pow(2,z);return R2D*Math.atan(0.5*(Math.exp(m)-Math.exp(-m)));}
function zX(lon,z){return (lon+180)/360*Math.pow(2,z);}
function zY(lat,z){var s=Math.sin(lat*D2R);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*Math.pow(2,z);}
function skyMpp(){var h=Math.max(50,Math.sin(L2.cam.el)*L2.cam.d);return 2*h*Math.tan(camera.fov*D2R/2)/Math.max(1,canvas.clientHeight);}
function skyGeo(){if(!SKYV.geo){var g=new T3.PlaneGeometry(1,1);g.rotateX(Math.PI/2);SKYV.geo=g;}return SKYV.geo;}
// ---- imagery sources: public basemaps, NASA near-real-time daily imagery, night lights, Esri Wayback archive ----
var SKY_SRC={
 esri:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maxZ:18,
  zh:'Esri 高分辨率',en:'Esri high-res',dz:'历史晴空镶嵌 · 约 0.3–1 m',de:'historical cloud-free mosaic · ~0.3–1 m',attr:'Imagery © Esri, Maxar, Earthstar Geographics'},
 eox:{url:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',maxZ:15,
  zh:'Sentinel-2 无云',en:'Sentinel-2 cloudless',dz:'2016 年镶嵌 · 10 m',de:'2016 mosaic · 10 m',attr:'Sentinel-2 cloudless – s2maps.eu by EOX (Contains modified Copernicus Sentinel data 2016)'},
 modis:{url:'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',maxZ:9,daily:1,
  zh:'MODIS 每日',en:'MODIS daily',dz:'Terra 卫星 · 近实时 · 250 m · 含当天云层',de:'Terra · near-real-time · 250 m · shows that day\'s clouds',attr:'NASA EOSDIS GIBS · MODIS Terra Corrected Reflectance'},
 viirs:{url:'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',maxZ:9,daily:1,
  zh:'VIIRS 每日',en:'VIIRS daily',dz:'Suomi NPP · 近实时 · 375 m',de:'Suomi NPP · near-real-time · 375 m',attr:'NASA EOSDIS GIBS · Suomi NPP VIIRS Corrected Reflectance'},
 night:{url:'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',maxZ:8,
  zh:'夜间灯光',en:'Night lights',dz:'VIIRS Black Marble · 2016 合成 · 500 m',de:'VIIRS Black Marble · 2016 composite · 500 m',attr:'NASA Earth Observatory Black Marble · GIBS'},
 hist:{url:'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{rel}/{z}/{y}/{x}',maxZ:18,
  zh:'历史存档',en:'Wayback archive',dz:'Esri Wayback 历史版本',de:'Esri Wayback historical release',attr:'Esri World Imagery Wayback'}};
var SKY_SENS={vis:{zh:'可见光',en:'Visible'},pan:{zh:'全色',en:'Pan'},nv:{zh:'夜视',en:'Night vision'},ir:{zh:'伪彩热·模拟',en:'Thermal (sim.)'},
 veg:{zh:'植被指数 ExG',en:'Vegetation ExG'},sar:{zh:'SAR 雷达·模拟',en:'SAR (sim.)'},dsm:{zh:'高度 DSM',en:'Height DSM'}};
var WAYBACK={list:null,busy:false,err:false};
function waybackLoad(){if(WAYBACK.list||WAYBACK.busy)return;WAYBACK.busy=true;
 fetch('https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json').then(function(r){return r.json();}).then(function(j){
  var L=[];Object.keys(j).forEach(function(k){var t=j[k].itemTitle||'',m=t.match(/(\d{4}-\d{2}-\d{2})/);if(m)L.push({rel:k,date:m[1]});});L.sort(function(a,b){return a.date<b.date?-1:1;});
  WAYBACK.list=L;if(SKYV.histI==null)SKYV.histI=0;WAYBACK.busy=false;skyControls();}).catch(function(){WAYBACK.busy=false;WAYBACK.err=true;skyControls();});}
function gibsDate(){var d=new Date(Date.now()-86400000*(1+(SKYV.dayBack||0)));return d.toISOString().slice(0,10);}
var RAIN={meta:null,at:0};
function rainLoad(){var now=Date.now();if(RAIN.busy||(RAIN.meta&&now-RAIN.at<600000))return;RAIN.busy=true;
 fetch('https://api.rainviewer.com/public/weather-maps.json').then(function(r){return r.json();}).then(function(j){var p=j.radar&&j.radar.past;RAIN.meta={host:j.host,path:p&&p.length?p[p.length-1].path:null,time:p&&p.length?p[p.length-1].time:0};RAIN.at=Date.now();RAIN.busy=false;layClear(SKYV.L.rain);}).catch(function(){RAIN.busy=false;});}
var SPLIT={value:1e5};
function mkLayer(name,ord,y){return {name:name,tiles:{},grp:null,ord:ord,y:y,ok:0,fails:0,frac:1,need:0,z:0,sig:''};}
SKYV.base='esri';SKYV.L={base:mkLayer('base',-1,0.55),cmp:mkLayer('cmp',0,0.6),nl:mkLayer('nl',1,0.7),rain:mkLayer('rain',2,0.95)};SKYV.nightAuto=true;SKYV.cmp=false;SKYV.split=.5;SKYV.rain=false;SKYV.histI=null;SKYV.tab='ev';
function laySrc(L){if(L.name==='base'){var S=SKY_SRC[SKYV.base];if(SKYV.base==='hist'){var w=WAYBACK.list&&WAYBACK.list[SKYV.histI==null?0:SKYV.histI];return w?{url:S.url.replace('{rel}',w.rel),maxZ:18,sig:'hist'+w.rel}:null;}
  return {url:S.daily?S.url.replace('{date}',gibsDate()):S.url,maxZ:S.maxZ,sig:SKYV.base+(S.daily?gibsDate():'')};}
 if(L.name==='cmp'){if(!SKYV.cmp)return null;var w2=WAYBACK.list&&WAYBACK.list[SKYV.histI==null?0:SKYV.histI];return w2?{url:SKY_SRC.hist.url.replace('{rel}',w2.rel),maxZ:18,sig:'cmp'+w2.rel}:null;}
 if(L.name==='nl'){if(!SKYV.nightAuto||SKYV.base==='night'||(ENV.night||0)<0.12)return null;return {url:SKY_SRC.night.url,maxZ:8,sig:'nl'};}
 if(L.name==='rain'){if(!SKYV.rain||!RAIN.meta||!RAIN.meta.path)return null;return {url:RAIN.meta.host+RAIN.meta.path+'/256/{z}/{x}/{y}/2/1_1.png',maxZ:7,sig:'rain'+RAIN.meta.path};}}
var skyLoader=null;
function skyPlace(T,F,L){var a=llToLocal(F,zLat(T.y,T.z),zLon(T.x,T.z)),b=llToLocal(F,zLat(T.y+1,T.z),zLon(T.x+1,T.z));
 T.mesh.scale.set(b.x-a.x,1,a.z-b.z);T.mesh.position.set((a.x+b.x)/2,(L?L.y:0.55)+(T.z-15)*0.02,(a.z+b.z)/2);}
function layMat(L){var m=new T3.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:T3.DoubleSide,fog:false,toneMapped:false,depthWrite:L.name==='base',depthTest:L.name!=='rain',polygonOffset:true,polygonOffsetFactor:-1-L.ord,polygonOffsetUnits:-1-L.ord});
 if(L.name==='nl'){m.blending=T3.AdditiveBlending;m.depthWrite=false;}
 if(L.name==='cmp'){m.onBeforeCompile=function(sh){sh.uniforms.uSplit=SPLIT;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSplit;').replace('void main() {','void main() {\n if(gl_FragCoord.x>uSplit)discard;');};m.customProgramCacheKey=function(){return 'skycmp';};}
 return m;}
function layTile(L,src,z,x,y,F){var k=src.sig+'/'+z+'/'+x+'/'+y,T=L.tiles[k];if(T){T.used=performance.now();return T;}
 var mat=layMat(L);T={z:z,x:x,y:y,k:k,used:performance.now(),state:'loading',mesh:new T3.Mesh(skyGeo(),mat)};T.mesh.renderOrder=L.ord;T.mesh.userData.keepSky=1;skyPlace(T,F,L);L.grp.add(T.mesh);L.tiles[k]=T;
 if(!skyLoader){skyLoader=new T3.TextureLoader();skyLoader.setCrossOrigin('anonymous');}
 var url=src.url.replace('{z}',z).replace('{x}',x).replace('{y}',y);
 skyLoader.load(url,function(tex){if(!L.tiles[k]){tex.dispose();return;}tex.colorSpace=T3.SRGBColorSpace;tex.anisotropy=4;mat.map=tex;mat.needsUpdate=true;T.state='ready';T.born=performance.now();L.ok++;L.fails=0;},undefined,
  function(){T.state='error';L.fails++;if(L.name==='base'&&SKYV.base==='esri'&&!L.ok&&L.fails>=6){SKYV.base='eox';layClear(L);skyControls();}});
 return T;}
function layDrop(L,k){var T=L.tiles[k];if(!T)return;L.grp.remove(T.mesh);if(T.mesh.material.map)T.mesh.material.map.dispose();T.mesh.material.dispose();delete L.tiles[k];}
function layClear(L){Object.keys(L.tiles).forEach(function(k){layDrop(L,k);});L.ok=0;L.fails=0;}
function skyClear(){for(var n in SKYV.L)layClear(SKYV.L[n]);}
function skyEnsureGroups(){for(var n in SKYV.L){var L=SKYV.L[n];if(!L.grp){L.grp=new T3.Group();L.grp.name='sky_'+n;}if(L.grp.parent!==streetScene)streetScene.add(L.grp);}SKYV.grp=SKYV.L.base.grp;
 if(!SKYV.gridGrp){SKYV.gridGrp=new T3.Group();}if(SKYV.gridGrp.parent!==streetScene)streetScene.add(SKYV.gridGrp);}
function layStep(L,F,ll,mpp,cl,opMul,tint){var src=laySrc(L);L.grp.visible=SKYV.on&&!!src;if(!src){if(Object.keys(L.tiles).length)layClear(L);L.need=0;return;}
 if(src.sig!==L.sig){L.sig=src.sig;}
 var z=Math.max(3,Math.min(src.maxZ,Math.ceil(Math.log2(156543.034*cl/mpp))));
 var halfH=mpp*canvas.clientHeight/2,halfW=mpp*canvas.clientWidth/2,rad=Math.hypot(halfW,halfH)*1.08,need;
 for(;;){var tm=40075016.7*cl/Math.pow(2,z),n=Math.ceil(rad/tm);need=(2*n+1)*(2*n+1);if(need<=150||z<=3)break;z--;}
 L.z=z;var N2=Math.pow(2,z),cx=zX(ll.lon,z),cy=zY(ll.lat,z),tmx=40075016.7*cl/N2,r=Math.ceil(rad/tmx),want={},ready=0,tot=0;
 for(var dx=-r;dx<=r;dx++)for(var dy=-r;dy<=r;dy++){if(Math.hypot(dx,dy)>r+0.75)continue;var X=Math.floor(cx)+dx,Y=Math.floor(cy)+dy;if(Y<0||Y>=N2)continue;
  var T=layTile(L,src,z,((X%N2)+N2)%N2,Y,F);want[T.k]=1;tot++;if(T.state!=='loading')ready++;}
 var frac=tot?ready/tot:1,now=performance.now(),op=opMul==null?1:opMul;
 for(var k in L.tiles){var Tt=L.tiles[k],m=Tt.mesh.material;
  if(tint)m.color.copy(tint);
  if(want[k]){var a=Tt.state==='ready'?Math.min(1,(now-Tt.born)/350):0;m.opacity=a*op;m.transparent=a*op<1;Tt.mesh.visible=Tt.state==='ready';}
  else{Tt.mesh.visible=Tt.state==='ready'&&frac<0.92&&k.indexOf(src.sig+'/')===0&&Math.abs(Tt.z-z)<=3;if(Tt.mesh.visible){m.opacity=op;m.transparent=op<1;}}}
 var keys=Object.keys(L.tiles);if(keys.length>140){keys.filter(function(k){return !want[k];}).sort(function(a,b){return L.tiles[a].used-L.tiles[b].used;}).slice(0,keys.length-140).forEach(function(k){layDrop(L,k);});}
 L.frac=frac;L.need=tot;}
function skyTilesStep(){var F=skyFrame(),ll=viewLL();
 if(SKYV.lvRef!==L2.live||SKYV.cityRef!==L2.city){SKYV.lvRef=L2.live;SKYV.cityRef=L2.city;for(var n0 in SKYV.L){var L0=SKYV.L[n0];for(var k0 in L0.tiles)skyPlace(L0.tiles[k0],F,L0);}SKYV.gridKey='';}
 var mpp=skyMpp(),cl=Math.cos(ll.lat*D2R);
 if(SKYV.base==='hist'||SKYV.cmp)waybackLoad();if(SKYV.rain)rainLoad();
 var nf=SKYV.nightAuto&&SKYV.base!=='night'?(ENV.night||0):0;SKYV.nf=nf;if(!SKYV.tint)SKYV.tint=new T3.Color();SKYV.tint.setRGB(1-nf*0.88,1-nf*0.86,1-nf*0.78);
 layStep(SKYV.L.base,F,ll,mpp,cl,SKYV.sensor==='dsm'?0.35:1,SKYV.tint);layStep(SKYV.L.cmp,F,ll,mpp,cl,1,SKYV.tint);if(!SKYV.warm)SKYV.warm=new T3.Color(1.0,0.58,0.26);layStep(SKYV.L.nl,F,ll,mpp,cl,Math.min(1,nf)*0.26,SKYV.warm);layStep(SKYV.L.rain,F,ll,mpp,cl,0.7);
 SPLIT.value=SKYV.cmp?SKYV.split*canvas.clientWidth*renderer.getPixelRatio():1e5;
 SKYV.lastZ=SKYV.L.base.z;SKYV.frac=SKYV.L.base.frac;SKYV.need=SKYV.L.base.need;SKYV.tiles=SKYV.L.base.tiles;}

// ---- 1 km UTM grid on the ground ----
function skyGridStep(){var g=SKYV.gridGrp;g.visible=SKYV.on&&SKYV.grid;if(!g.visible){skyGridLabels(null);return;}
 var ll=viewLL(),u=llToUtm(ll.lat,ll.lon),mpp=skyMpp(),half=Math.hypot(canvas.clientWidth,canvas.clientHeight)*mpp/2*1.1,step=[1000,2000,5000,10000,20000,50000,100000].filter(function(v){return v>=half/7;})[0]||100000;
 var key=u.zone+'|'+Math.round(u.E/500)+'|'+Math.round(u.N/500)+'|'+step+'|'+Math.round(half/800)+'|'+(L2.live?L2.live.gen:0);
 if(key!==SKYV.gridKey){SKYV.gridKey=key;while(g.children.length){var c=g.children.pop();c.geometry.dispose();}
  var F=skyFrame(),pos=[],E0=Math.floor((u.E-half)/step)*step,E1=Math.ceil((u.E+half)/step)*step,N0=Math.floor((u.N-half)/step)*step,N1=Math.ceil((u.N+half)/step)*step;
  function P(E,N){var q=utmToLl(E,N,u.zone,u.south),l=llToLocal(F,q.lat,q.lon);return l;}
  var seg=Math.max(250,step/4);if(half>60000)half=60000;
  for(var E=E0;E<=E1;E+=step)for(var N=N0;N<N1;N+=seg){var a=P(E,N),b=P(E,Math.min(N1,N+seg));pos.push(a.x,1.6,a.z,b.x,1.6,b.z);}
  for(var N2=N0;N2<=N1;N2+=step)for(var E2=E0;E2<E1;E2+=seg){var a2=P(E2,N2),b2=P(Math.min(E1,E2+seg),N2);pos.push(a2.x,1.6,a2.z,b2.x,1.6,b2.z);}
  var geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.Float32BufferAttribute(pos,3));
  if(!SKYV.gridMat)SKYV.gridMat=new T3.LineBasicMaterial({color:0x9ffff0,transparent:true,opacity:.7,depthTest:false,fog:false,toneMapped:false});
  var ls=new T3.LineSegments(geo,SKYV.gridMat);ls.renderOrder=20;ls.frustumCulled=false;g.add(ls);SKYV.gridMeta={u:u,E0:E0,E1:E1,N0:N0,N1:N1,step:step};}
 skyGridLabels(SKYV.gridMeta);}
var skyV3=null;
function skyGridLabels(M){var box=document.getElementById('skyGridL');if(!box)return;if(!M){box.innerHTML='';return;}if(!skyV3)skyV3=new T3.Vector3();
 var ll=viewLL(),u=llToUtm(ll.lat,ll.lon,M.u.zone),F=skyFrame(),W=canvas.clientWidth,H=canvas.clientHeight,h='';
 function scr(E,N){var q=utmToLl(E,N,M.u.zone,M.u.south),l=llToLocal(F,q.lat,q.lon);skyV3.set(l.x,1.6,l.z).project(camera);return {x:(skyV3.x+1)/2*W,y:(1-skyV3.y)/2*H,ok:skyV3.z<1};}
 for(var E=M.E0;E<=M.E1;E+=M.step){var s=scr(E,u.N);if(s.ok&&s.x>40&&s.x<W-40&&s.y>40&&s.y<H-40)h+='<span style="left:'+s.x.toFixed(0)+'px;top:'+s.y.toFixed(0)+'px">'+Math.round(E/1000)%100+'E</span>';}
 for(var N=M.N0;N<=M.N1;N+=M.step){var t=scr(u.E,N);if(t.ok&&t.x>40&&t.x<W-40&&t.y>40&&t.y<H-40)h+='<span class="n" style="left:'+t.x.toFixed(0)+'px;top:'+t.y.toFixed(0)+'px">'+Math.round(N/1000)%100+'N</span>';}
 box.innerHTML=h;}
// ---- buildings / roads / vegetation display in sky mode ----
function skyApplyLayers(){if(!L2.group)return;var on=SKYV.on,bm=SKYV.bmode;
 L2.group.traverse(function(o){if(o===L2.group||o===L2.ground)return;var ud=o.userData||{};
  if(ud.bld)o.visible=!on||bm==='3d';
  else if(ud.roof){o.visible=!on||bm!=='off';var rm=o.material;if(rm&&rm.color){if(!rm.userData.c0)rm.userData.c0=rm.color.getHex();rm.color.setHex(on&&bm==='outline'?0x7ff5dc:rm.userData.c0);}}
  else if(ud.road)o.visible=!on||SKYV.roads;
  else if(o.isInstancedMesh||o.isPoints)o.visible=!on||bm==='3d';});}
// ---- toggle ----
function setSky(on,silent){if(on===SKYV.on)return;if(on&&mode!=='street')return;
 if(on){SKYV.prev={el:L2.camWant.el,d:L2.camWant.d,drone:L2.drone&&L2.drone.on};if(L2.drone&&L2.drone.on){L2.drone.on=false;var bd=document.getElementById('bDrone');if(bd)bd.setAttribute('aria-pressed','false');}
  SKYV.on=true;skyEnsureGroups();L2.camWant.el=SKYV.el;L2.camWant.d=Math.max(1500,Math.min(9000,Math.max(2800,L2.camWant.d*2.6)));
  if(!silent)toast(I18T('sky_eye_public_satellite'));}
 else{SKYV.on=false;var p=SKYV.prev;if(p){L2.camWant.el=p.el;L2.camWant.d=Math.max(140,Math.min(2400,p.d));if(p.drone&&L2.drone&&!silent){L2.drone.on=true;var bd2=document.getElementById('bDrone');if(bd2)bd2.setAttribute('aria-pressed','true');}}}
 var b=document.getElementById('bSky');if(b)b.setAttribute('aria-pressed',SKYV.on);
 for(var _ln in SKYV.L){if(SKYV.L[_ln].grp)SKYV.L[_ln].grp.visible=SKYV.on;}if(SKYV.gridGrp)SKYV.gridGrp.visible=SKYV.on&&SKYV.grid;
 document.getElementById('skyHud').classList.toggle('on',SKYV.on);document.body.classList.toggle('skyeye',SKYV.on);skyApplyLayers();skySensor();SKYV.uiAt=0;SKYV.evAt=0;skyControls();invalidate&&invalidate(600);}
function skyLeaveCity(){if(SKYV.on)setSky(false,true);skyClear();if(SKYV.gridGrp)while(SKYV.gridGrp.children.length){SKYV.gridGrp.children.pop().geometry.dispose();}SKYV.gridKey='';canvas.style.filter='';
 var h=document.getElementById('skyHud');if(h)h.classList.remove('on');skyGridLabels(null);}
// ---- HUD ----
// ---- sensor looks: CSS/SVG filters on the WebGL canvas; ExG is a real visible-band index, SAR and thermal are labelled simulated;
// DSM recolours buildings by their mapped height ----
function skySensor(){var s=SKYV.on?SKYV.sensor:'vis',f='';
 if(s==='pan')f='grayscale(1) contrast(1.38) brightness(1.04)';else if(s==='nv')f='grayscale(1) brightness(.92) contrast(1.3) sepia(1) hue-rotate(58deg) saturate(2.1)';
 else if(s==='ir')f='url(#seThermal) contrast(1.1)';else if(s==='veg')f='url(#seVeg)';else if(s==='sar')f='url(#seSar)';
 canvas.style.filter=f;U.uDsm.value=s==='dsm'&&SKYV.on?1:0;var hud=document.getElementById('skyHud');if(hud)hud.setAttribute('data-sensor',s);
 var lg=document.getElementById('skyLegend');if(lg){var zh=LZ(),h='';
  if(s==='dsm')h='<b>'+(I18T('building_height'))+'</b><i class="rmp dsm"></i><span>0</span><span>40</span><span>80</span><span>150+ m</span><em>'+(I18T('heights_from_osm_overture'))+'</em>';
  else if(s==='veg')h='<b>'+(I18T('excess_green_exg_2g'))+'</b><i class="rmp veg"></i><span>'+(I18T('bare_built'))+'</span><span></span><span></span><span>'+(I18T('dense_veg'))+'</span><em>'+(I18T('computed_from_the_three'))+'</em>';
  else if(s==='sar')h='<b>'+(I18T('sar_simulated'))+'</b><em>'+(I18T('mimics_the_look_of'))+'</em>';
  else if(s==='ir')h='<b>'+(I18T('thermal_simulated'))+'</b><i class="rmp ir"></i><span>'+(I18T('dark'))+'</span><span></span><span></span><span>'+(I18T('bright'))+'</span><em>'+(I18T('brightness_mapped_to_an'))+'</em>';
  lg.innerHTML=h;lg.style.display=h?'':'none';}}
// ---- intel feeds: satellites overhead (CelesTrak + SGP4), earthquakes (USGS), natural hazards (NASA EONET) ----
var INTEL={sat:{st:'idle',recs:[],vis:[],next:[],at:0,passAt:0},eq:{st:'idle',f:[],at:0},nat:{st:'idle',f:[],at:0}};
function loadScript(u){return new Promise(function(res,rej){var s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
function satLoad(){var S=INTEL.sat;if(S.st!=='idle')return;S.st='loading';
 var lib=window.satellite?Promise.resolve():loadScript('https://unpkg.com/satellite.js@5.0.0/dist/satellite.min.js');
 lib.then(function(){return Promise.all(['resource','stations','weather'].map(function(g){return fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP='+g+'&FORMAT=tle').then(function(r){return r.ok?r.text():'';}).catch(function(){return '';});}));})
 .then(function(txts){var seen={};txts.forEach(function(t,gi){var L=t.split(/\r?\n/);for(var i=0;i+2<L.length;i+=3){var nm=L[i].trim(),a=L[i+1],b=L[i+2];if(!a||a[0]!=='1'||!b||b[0]!=='2')continue;var id=a.slice(2,7);if(seen[id])continue;seen[id]=1;
   try{S.recs.push({n:nm,rec:satellite.twoline2satrec(a,b),g:['resource','stations','weather'][gi]});}catch(e){}}});S.st=S.recs.length?'ok':'err';S.at=0;}).catch(function(){S.st='err';});}
function satLook(rec,date,obs){var pv=satellite.propagate(rec,date);if(!pv||!pv.position)return null;var g=satellite.gstime(date),ecf=satellite.eciToEcf(pv.position,g),la=satellite.ecfToLookAngles(obs,ecf);return {el:la.elevation*R2D,az:(la.azimuth*R2D+360)%360,rng:la.rangeSat};}
function satStep(ll){var S=INTEL.sat;if(S.st!=='ok')return;var now=Date.now();if(now-S.at<4000)return;S.at=now;var obs={latitude:ll.lat*D2R,longitude:ll.lon*D2R,height:0.05},d=new Date(now),vis=[];
 S.recs.forEach(function(r){var l=satLook(r.rec,d,obs);if(l&&l.el>0)vis.push({n:r.n,g:r.g,el:l.el,az:l.az,rng:l.rng});});vis.sort(function(a,b){return b.el-a.el;});S.vis=vis;
 if(now-S.passAt>60000||S.passLL!==Math.round(ll.lat*10)+','+Math.round(ll.lon*10)){S.passAt=now;S.passLL=Math.round(ll.lat*10)+','+Math.round(ll.lon*10);var nx=[];
  S.recs.forEach(function(r){var up=vis.some(function(v){return v.n===r.n;});if(up)return;for(var m=1;m<=120;m+=1){var t=new Date(now+m*60000),l=satLook(r.rec,t,obs);if(!l)break;if(l.el>5){var mx=l.el;for(var q=m+1;q<m+20;q++){var l2=satLook(r.rec,new Date(now+q*60000),obs);if(!l2||l2.el<0)break;mx=Math.max(mx,l2.el);}nx.push({n:r.n,g:r.g,min:m,max:mx});break;}}});
  nx.sort(function(a,b){return a.min-b.min;});S.next=nx;}}
function eqLoad(){var E=INTEL.eq,now=Date.now();if(E.st==='loading'||(E.st==='ok'&&now-E.at<600000))return;E.st='loading';
 fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson').then(function(r){return r.json();}).then(function(j){E.f=j.features||[];E.st='ok';E.at=Date.now();}).catch(function(){E.st='err';E.at=Date.now();});}
function natLoad(){var N=INTEL.nat,now=Date.now();if(N.st==='loading'||(N.st==='ok'&&now-N.at<1800000))return;N.st='loading';
 fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=60').then(function(r){return r.json();}).then(function(j){N.f=j.events||[];N.st='ok';N.at=Date.now();}).catch(function(){N.st='err';N.at=Date.now();});}
var EONET_ZH={wildfires:'野火',severeStorms:'强风暴',volcanoes:'火山',seaLakeIce:'海冰/湖冰',floods:'洪水',drySoil:'干旱',dustHaze:'沙尘/霾',earthquakes:'地震',landslides:'滑坡',manmade:'人为',snow:'暴雪',tempExtremes:'极端温度',waterColor:'水色异常'};
function agoTxt(ms){var m=Math.round(ms/60000),zh=LZ();if(m<60)return m+(I18T('min_ago'));var h=Math.round(m/60);if(h<48)return h+(I18T('h_ago'));return Math.round(h/24)+(I18T('d_ago'));}
function intelHTML(ll){var zh=LZ(),t=SKYV.tab,h='';
 if(t==='sat'){satLoad();satStep(ll);var S=INTEL.sat;
  if(S.st==='loading')return '<div class="none">'+(I18T('loading_celestrak_orbital_elements'))+'</div>';
  if(S.st==='err')return '<div class="none">'+(I18T('orbital_data_unavailable'))+'</div>';
  h+='<div class="sub">'+(I18T('above_the_horizon_now'))+S.vis.length+'</div>';
  h+=S.vis.slice(0,6).map(function(v){return '<div class="it"><i class="g '+v.g+'"></i><span>'+esc(v.n)+'</span><b>'+(I18T('el'))+v.el.toFixed(0)+'° · '+(I18T('az'))+v.az.toFixed(0)+'°</b></div>';}).join('');
  h+='<div class="sub">'+(I18T('passes_in_the_next'))+'</div>';
  h+=S.next.slice(0,5).map(function(v){return '<div class="it"><i class="g '+v.g+'"></i><span>'+esc(v.n)+'</span><b>'+v.min+(I18T('min_max'))+v.max.toFixed(0)+'°</b></div>';}).join('')||'<div class="none">—</div>';
  h+='<div class="foot">'+(I18T('public_orbital_elements_for'))+'</div>';return h;}
 if(t==='eq'){eqLoad();var E=INTEL.eq;if(E.st==='loading'&&!E.f.length)return '<div class="none">'+(I18T('loading_usgs_earthquake_feed'))+'</div>';
  var L=E.f.map(function(f){var c=f.geometry.coordinates;return {d:hav(ll.lat,ll.lon,c[1],c[0]),m:f.properties.mag,p:f.properties.place,t:f.properties.time,lat:c[1],lon:c[0],dep:c[2]};}).filter(function(x){return x.d<1500;}).sort(function(a,b){return a.d-b.d;});
  h+='<div class="sub">'+(I18T('past_7_days_m2'))+L.length+'</div>';
  h+=L.slice(0,7).map(function(x,i){return '<div class="it go" data-go="'+x.lat+','+x.lon+'"><i style="background:'+(x.m>=6?'#ff4d6a':x.m>=4.5?'#ffb340':'#58c8e0')+'"></i><span>M'+x.m.toFixed(1)+' · '+esc(x.p||'')+'</span><b>'+fmtKm(x.d)+' · '+agoTxt(Date.now()-x.t)+'</b></div>';}).join('')||'<div class="none">'+(I18T('no_m2_5_quakes'))+'</div>';
  return h+'<div class="foot">USGS Earthquake Hazards Program · '+(I18T('click_to_fly_to'))+'</div>';}
 if(t==='nat'){natLoad();var N=INTEL.nat;if(N.st==='loading'&&!N.f.length)return '<div class="none">'+(I18T('loading_nasa_eonet'))+'</div>';
  var M=[];N.f.forEach(function(e){var g=e.geometry&&e.geometry[e.geometry.length-1];if(!g||g.type!=='Point')return;var c=g.coordinates,d=hav(ll.lat,ll.lon,c[1],c[0]);if(d<2500)M.push({d:d,t:e.title,c:(e.categories&&e.categories[0]&&e.categories[0].id)||'',lat:c[1],lon:c[0],at:Date.parse(g.date)});});M.sort(function(a,b){return a.d-b.d;});
  h+='<div class="sub">'+(I18T('open_natural_events_within'))+M.length+'</div>';
  h+=M.slice(0,7).map(function(x){return '<div class="it go" data-go="'+x.lat+','+x.lon+'"><i style="background:#ff8a3d"></i><span>'+esc((zh&&EONET_ZH[x.c]?EONET_ZH[x.c]+' · ':'')+x.t)+'</span><b>'+fmtKm(x.d)+'</b></div>';}).join('')||'<div class="none">'+(I18T('no_open_events_nearby'))+'</div>';
  return h+'<div class="foot">NASA Earth Observatory EONET · '+(I18T('wildfires_storms_volcanoes_and'))+'</div>';}
 return null;}
// ---- measuring tool: click ground points for distance (and area when 3+ points) ----
var MEAS={on:false,pts:[],obj:null};
function measClick(){var p=new T3.Vector3();if(!ray.ray.intersectPlane(new T3.Plane(new T3.Vector3(0,1,0),0),p))return;MEAS.pts.push([p.x,p.z]);measDraw();}
function measDraw(){if(MEAS.obj){streetScene.remove(MEAS.obj);MEAS.obj.geometry.dispose();MEAS.obj=null;}var P=MEAS.pts,pos=[];
 for(var i=0;i<P.length;i++){var a=P[i],b=P[(i+1)%P.length];if(i===P.length-1&&P.length<3)break;pos.push(a[0],3,a[1],b[0],3,b[1]);var s=8+L2.cam.d*.004;pos.push(a[0]-s,3,a[1],a[0]+s,3,a[1],a[0],3,a[1]-s,a[0],3,a[1]+s);}
 if(pos.length){var g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(pos,3));MEAS.obj=new T3.LineSegments(g,new T3.LineBasicMaterial({color:0xffd24a,depthTest:false,transparent:true,fog:false}));MEAS.obj.renderOrder=30;MEAS.obj.frustumCulled=false;streetScene.add(MEAS.obj);}
 var d=0;for(var j=1;j<P.length;j++)d+=Math.hypot(P[j][0]-P[j-1][0],P[j][1]-P[j-1][1]);var ar=0;if(P.length>=3){for(var k=0;k<P.length;k++){var q=P[k],r=P[(k+1)%P.length];ar+=q[0]*r[1]-r[0]*q[1];}ar=Math.abs(ar)/2;}
 MEAS.d=d;MEAS.a=ar;skyControls();}
function measClear(){MEAS.pts=[];measDraw();}
// ---- controls (bilingual; re-rendered on language switch) ----
function skyControls(){var el=document.getElementById('skyCtl');if(!el)return;var zh=LZ();
 function chip(attr,val,cur,label,tip){return '<button data-'+attr+'="'+val+'" class="'+(val===cur?'on':'')+'"'+(tip?' title="'+esc(tip)+'"':'')+'>'+label+'</button>';}
 var W=WAYBACK.list,wi=SKYV.histI==null?0:SKYV.histI,wd=W&&W[wi]?W[wi].date:(WAYBACK.err?(I18T('n_a')):'…');
 var h='<div class="sr"><span class="sl">'+(I18T('source'))+'</span>'+Object.keys(SKY_SRC).map(function(k){var S=SKY_SRC[k];return chip('src',k,SKYV.base,I18P(S.zh,S.en),I18P(S.dz,S.de));}).join('')+'</div>';
 if(SKYV.base==='modis'||SKYV.base==='viirs')h+='<div class="sr"><span class="sl">'+(I18T('date'))+'</span><button data-day="-1">◀</button><b class="dv">'+gibsDate()+'</b><button data-day="1">▶</button></div>';
 if(SKYV.base==='hist'||SKYV.cmp)h+='<div class="sr"><span class="sl">'+(I18T('archive'))+'</span><input type="range" id="skyHist" min="0" max="'+(W?W.length-1:0)+'" value="'+wi+'"'+(W?'':' disabled')+'><b class="dv">'+wd+'</b></div>';
 h+='<div class="sr"><span class="sl">'+(I18T('time'))+'</span>'+[['live',I18T('live')],['dawn',I18T('dawn')],['day',I18T('day')],['dusk',I18T('dusk')],['night',I18T('night')]].map(function(t){var on=t[0]==='live'?ENV.timeMode==='live':(ENV.timeMode!=='live'&&ENV.tod===t[0]);return '<button data-stod="'+t[0]+'" class="'+(on?'on':'')+'">'+t[1]+'</button>';}).join('')+'</div>';
 h+='<div class="sr"><span class="sl">'+(I18T('sensor'))+'</span>'+Object.keys(SKY_SENS).map(function(k){return chip('sens',k,SKYV.sensor,I18P(SKY_SENS[k].zh,SKY_SENS[k].en));}).join('')+'</div>'+
  '<div class="sr"><span class="sl">'+(I18T('bldg_2'))+'</span>'+chip('bm','3d',SKYV.bmode,I18T('s_3d'))+chip('bm','outline',SKYV.bmode,I18T('outline'))+chip('bm','off',SKYV.bmode,I18T('hide'))+'</div>'+
  '<div class="sr"><span class="sl">'+(I18T('overlay'))+'</span><button data-tg="roads" class="'+(SKYV.roads?'on':'')+'">'+(I18T('roads_2'))+'</button><button data-tg="grid" class="'+(SKYV.grid?'on':'')+'">'+(I18T('grid_g'))+'</button>'+
  '<button data-tg="rain" class="'+(SKYV.rain?'on':'')+'" title="RainViewer">'+(I18T('precip_radar'))+'</button><button data-tg="nauto" class="'+(SKYV.nightAuto?'on':'')+'">'+(I18T('day_night_sync'))+'</button><button data-tg="cmp" class="'+(SKYV.cmp?'on':'')+'">'+(I18T('change_swipe'))+'</button><button data-tg="meas" class="'+(MEAS.on?'on':'')+'">'+(I18T('measure'))+'</button></div>';
 if(MEAS.on)h+='<div class="sr meas"><span>'+(MEAS.pts.length?(I18T('dist'))+fmtKm((MEAS.d||0)/1000)+(MEAS.pts.length>=3?' · '+(I18T('area'))+((MEAS.a||0)>=1e6?(MEAS.a/1e6).toFixed(2)+' km²':Math.round(MEAS.a||0)+' m²'):''):(I18T('click_the_ground_to')))+'</span><button data-tg="measclr">'+(I18T('clear'))+'</button></div>';
 el.innerHTML=h;var hs=document.getElementById('skyHist');if(hs)hs.oninput=function(){SKYV.histI=+hs.value;var b=hs.nextSibling;if(b&&WAYBACK.list)b.textContent=WAYBACK.list[SKYV.histI].date;};
 var sw=document.getElementById('skySwipe');if(sw){sw.style.display=SKYV.on&&SKYV.cmp?'':'none';var lb=sw.querySelector('.lb');if(lb)lb.innerHTML='<span>'+(I18T('archive_2'))+wd+'</span><span>'+(I18T('now'))+esc(I18P(SKY_SRC[SKYV.base].zh,SKY_SRC[SKYV.base].en))+'</span>';}
 skySensor();}
function skyTabsHTML(){var zh=LZ(),T=[['ev',I18T('events')],['sat',I18T('satellites')],['eq',I18T('quakes')],['nat',I18T('hazards')]];
 return '<div class="tabs">'+T.map(function(t){return '<button data-tab="'+t[0]+'" class="'+(SKYV.tab===t[0]?'on':'')+'">'+t[1]+'</button>';}).join('')+'</div>';}
function wireSky(){var b=document.getElementById('bSky');if(b&&!b._w){b._w=1;b.onclick=function(){setSky(!SKYV.on);};}
 var c=document.getElementById('skyCtl');if(c&&!c._w){c._w=1;c.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;e.stopPropagation();
  if(t.dataset.stod){if(t.dataset.stod==='live'){ENV.timeMode='live';ENV.lapse=false;ENV.tod=null;ENV.lastShadow=0;envUI(true);todUI();}else setTod(t.dataset.stod);}
  else if(t.dataset.sens){SKYV.sensor=t.dataset.sens;}else if(t.dataset.bm){SKYV.bmode=t.dataset.bm;skyApplyLayers();}
  else if(t.dataset.src){SKYV.base=t.dataset.src;layClear(SKYV.L.base);if(SKYV.base==='hist')waybackLoad();var S=SKY_SRC[SKYV.base];if(S.maxZ<=9&&L2.camWant.d<20000)L2.camWant.d=30000;}
  else if(t.dataset.day){SKYV.dayBack=Math.max(0,Math.min(30,(SKYV.dayBack||0)-(+t.dataset.day)));layClear(SKYV.L.base);}
  else if(t.dataset.tg==='roads'){SKYV.roads=!SKYV.roads;skyApplyLayers();}else if(t.dataset.tg==='grid'){SKYV.grid=!SKYV.grid;SKYV.gridKey='';}
  else if(t.dataset.tg==='rain'){SKYV.rain=!SKYV.rain;if(SKYV.rain)rainLoad();}else if(t.dataset.tg==='nauto'){SKYV.nightAuto=!SKYV.nightAuto;}else if(t.dataset.tg==='cmp'){SKYV.cmp=!SKYV.cmp;if(SKYV.cmp)waybackLoad();}
  else if(t.dataset.tg==='meas'){MEAS.on=!MEAS.on;if(!MEAS.on)measClear();}else if(t.dataset.tg==='measclr'){measClear();}
  skyControls();});
  c.addEventListener('change',function(e){if(e.target.id==='skyHist'){layClear(SKYV.L.cmp);if(SKYV.base==='hist')layClear(SKYV.L.base);skyControls();}});}
 var ev=document.getElementById('skyEv');if(ev&&!ev._w){ev._w=1;ev.addEventListener('click',function(e){var tb=e.target.closest('[data-tab]');if(tb){e.stopPropagation();SKYV.tab=tb.getAttribute('data-tab');SKYV.evAt=0;return;}
  var g=e.target.closest('[data-go]');if(g){e.stopPropagation();var p=g.getAttribute('data-go').split(',');travelTo({lat:+p[0],lon:+p[1],name:g.querySelector('span').textContent.slice(0,40),zh:'',iso:''});return;}
  var r=e.target.closest('[data-ev]');if(r){e.stopPropagation();openEvent(r.getAttribute('data-ev'));}});}
 var sw=document.getElementById('skySwipe');if(sw&&!sw._w){sw._w=1;var drag=false;sw.addEventListener('pointerdown',function(e){drag=true;sw.setPointerCapture(e.pointerId);e.stopPropagation();});
  sw.addEventListener('pointermove',function(e){if(!drag)return;SKYV.split=Math.max(.05,Math.min(.95,e.clientX/window.innerWidth));sw.style.left=(SKYV.split*100)+'%';});
  sw.addEventListener('pointerup',function(e){drag=false;e.stopPropagation();});}
 var bd=document.getElementById('bDrone');if(bd&&!bd._sky){bd._sky=1;bd.addEventListener('click',function(){if(L2.drone&&L2.drone.on&&SKYV.on)setSky(false,true);});}
 window.addEventListener('keydown',function(e){if(mode!=='street'||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;var k=e.key.toLowerCase();
  if(k==='v'){setSky(!SKYV.on);}else if(k==='g'&&SKYV.on){SKYV.grid=!SKYV.grid;SKYV.gridKey='';skyControls();}else if(k==='m'&&SKYV.on){MEAS.on=!MEAS.on;if(!MEAS.on)measClear();skyControls();}});}

function skyLayout(){var W=window.innerWidth,H=window.innerHeight,open=!panel.classList.contains('min'),pr=panel.getBoundingClientRect(),freeR=open&&pr.width?pr.left-14:W-16;
 var f=document.getElementById('skyFrame');if(f)f.style.right=(W-freeR)+'px';var r=document.getElementById('skyRet');if(r){r.style.left=(W/2)+'px';r.style.top=(H/2)+'px';}
 var ev=document.getElementById('skyEv');if(!ev)return;var gz=document.getElementById('gizmo'),ah=document.getElementById('ahead'),g=gz&&gz.getBoundingClientRect(),a=ah&&ah.getBoundingClientRect();
 var top=g&&g.height?g.bottom+10:130,bot=a&&a.height?a.top-10:H-200;ev.style.right=(W-(g&&g.width?g.right:freeR))+'px';ev.style.top=top+'px';ev.style.maxHeight=Math.max(120,bot-top)+'px';}
function skyNote(S,zh){var k=SKYV.base;if((SKYV.nf||0)>0.5)return I18T('local_night_optical_satellites');if(k==='modis'||k==='viirs')return I18T('nasa_near_real_time');
 if(k==='night')return I18T('viirs_annual_night_lights');
 if(k==='hist')return I18T('esri_wayback_historical_release');
 return I18T('imagery_is_a_historical');}
function skyHudStep(now){var zh=LZ(),ll=viewLL(),S=SKY_SRC[SKYV.base]||SKY_SRC.esri;
 if(now-SKYV.uiAt>180){SKYV.uiAt=now;skyLayout();var u=llToUtm(ll.lat,ll.lon),mpp=skyMpp(),cl=Math.cos(ll.lat*D2R),gsd=156543.034*cl/Math.pow(2,Math.min(SKYV.lastZ||17,S.maxZ)),
   hdg=Math.round(camHeading()),alt=Math.round(Math.sin(L2.cam.el)*L2.cam.d),vw=mpp*canvas.clientWidth/1000,t=envNow(),dt=new Date(t),
   utc=dt.toISOString().slice(0,16).replace('T',' '),sun=ENV.sun||{el:0,az:0},cc=ENV.cur?Math.round((ENV.cur.cloud||0)*100):null;
  var row=function(k,v){return '<div class="r"><span>'+k+'</span><b>'+v+'</b></div>';};
  document.getElementById('skyData').innerHTML=
   '<div class="hd"><b>'+(I18T('sky_eye'))+'</b><span>'+(I18T('public_satellite_basemap_not'))+'</span></div>'+
   row('CTR',fmtLL(ll.lat,ll.lon))+row('MGRS',mgrs(ll.lat,ll.lon))+row('UTM',u.zone+(u.south?'S ':'N ')+Math.round(u.E)+'E '+Math.round(u.N)+'N')+
   row('GSD',gsd.toFixed(gsd<10?2:1)+' m/px · z'+Math.min(SKYV.lastZ,S.maxZ))+row(I18T('swath'),vw.toFixed(vw<10?1:0)+' km')+
   row('HDG / ALT',('00'+hdg).slice(-3)+'° · '+alt+' m')+row('SUN',(I18T('el_2'))+sun.el.toFixed(1)+'° · '+(I18T('az'))+Math.round(sun.az)+'°')+
   row('UTC',utc)+row(I18T('local_2'),fmtHM(t))+
   row(I18T('imagery'),esc((I18P(S.zh,S.en))+(S.daily?' · '+gibsDate():SKYV.base==='hist'&&WAYBACK.list?' · '+WAYBACK.list[SKYV.histI||0].date:'')))+row(I18T('load'),(SKYV.need?Math.round((SKYV.frac||0)*100)+'% · '+SKYV.need+(I18T('tiles_2')):'—')+(cc!=null?' · '+(I18T('cloud'))+cc+'%':''))+
   '<div class="note">'+esc(skyNote(S,zh))+'</div>'+
   '<div class="attr">'+esc(S.attr+(SKYV.cmp?' · Esri Wayback':'')+(SKYV.rain?' · RainViewer':''))+'</div>';
  // north arrow + scale bar
  var na=document.getElementById('skyNorth');if(na)na.style.transform='rotate('+(-hdg)+'deg)';
  var nice=[50,100,200,250,500,1000,2000,2500,5000,10000,20000,25000,50000],tgt=mpp*150,len=nice[0];nice.forEach(function(v){if(v<=tgt)len=v;});
  var sb=document.getElementById('skyScale');if(sb)sb.innerHTML='<i style="width:'+(len/mpp).toFixed(0)+'px"></i><span>'+(len>=1000?len/1000+' km':len+' m')+'</span>';}
 if(now-SKYV.evAt>900){SKYV.evAt=now;var list=[];(EV||[]).forEach(function(e){if(e.g||e.lat==null)return;var d=hav(ll.lat,ll.lon,e.lat,e.lon);if(d<=300)list.push([d,e]);});
  list.sort(function(a,b){return a[0]-b[0];});var nc=nearestCity(ll.lat,ll.lon,250),ci=nc&&typeof covInfo==='function'?covInfo(nc):null,G=ci?GRADES[ci.g]:null;
  var h='<div class="hd"><b>'+(I18T('nearby_events'))+'</b><span>≤ 300 km · '+list.length+'</span></div>';
  h+=list.slice(0,7).map(function(x){var e=x[1];return '<div class="ev" data-ev="'+e.id+'"><i style="background:'+lvColor(e.sl)+'"></i><em>'+e.y+'</em><span>'+esc(evTitle(e))+'</span><b>'+fmtKm(x[0])+'</b></div>';}).join('')||
   '<div class="none">'+(I18T('no_timeline_events_within'))+'</div>';
  if(nc&&G)h+='<div class="cov"><span>'+(I18T('nearest_city'))+esc(cityName(nc))+'</span><b style="color:'+G.c+'">'+ci.g+' '+(I18P(G.zh,G.en))+'</b></div>';
  h+='<div class="foot">'+(I18T('places_mark_primary_impact'))+'</div>';
  var ih=SKYV.tab!=='ev'?intelHTML(ll):null;document.getElementById('skyEv').innerHTML=skyTabsHTML()+(ih!=null?ih:h);}}
function skyStep(dt,now){if(!SKYV.on)return;if(mode!=='street'||!L2.active){setSky(false,true);return;}
 skyEnsureGroups();L2.camWant.el=SKYV.el;if(L2.drone)L2.drone.touch=now;
 skyTilesStep();skyGridStep();skyRetStep();if(now-(SKYV.layAt||0)>600){SKYV.layAt=now;skyApplyLayers();}skyHudStep(now);}

// ---- 安全大脑 source tiers: who reported / analysed each event, timeline filter by tier ----
var ORGS={cisa:['CISA','美国网络安全和基础设施安全局','https://www.cisa.gov/'],sans:['SANS ISC','SANS 互联网风暴中心','https://isc.sans.edu/'],mitre:['MITRE','MITRE ATT&CK / CVE','https://attack.mitre.org/'],first:['FIRST','全球应急响应组织论坛','https://www.first.org/'],gartner:['Gartner','高德纳','https://www.gartner.com/'],ibm:['IBM X-Force','IBM X-Force','https://www.ibm.com/reports/data-breach'],mandiant:['Google TI / Mandiant','谷歌威胁情报 / Mandiant','https://cloud.google.com/security/resources'],verizon:['Verizon DBIR','威瑞森 DBIR','https://www.verizon.com/business/resources/reports/dbir/'],krebs:['Krebs on Security','克雷布斯网络安全','https://krebsonsecurity.com/'],owasp:['OWASP','开放式 Web 应用安全项目','https://owasp.org/www-project-top-ten/'],
 cncert:['CNCERT/CC','国家互联网应急中心','https://www.cert.org.cn/'],cac:['CAC','国家互联网信息办公室','https://www.cac.gov.cn/'],cnvd:['CNVD','国家信息安全漏洞共享平台','https://www.cnvd.org.cn/'],cnnvd:['CNNVD','国家信息安全漏洞库','https://www.cnnvd.org.cn/'],threatbook:['ThreatBook','微步在线','https://threatbook.cn/'],qianxin:['Qi An Xin','奇安信','https://ti.qianxin.com/'],qihoo360:['360','360 数字安全','https://ti.360.cn/'],antiy:['Antiy','安天','https://www.antiy.cn/'],secrss:['secrss','安全内参','https://www.secrss.com/'],freebuf:['FreeBuf','FreeBuf','https://www.freebuf.com/'],
 enisa:['ENISA','欧盟网络安全局','https://www.enisa.europa.eu/'],edpb:['EDPB','欧洲数据保护委员会','https://edpb.europa.eu/'],'ncsc-uk':['NCSC-UK','英国国家网络安全中心','https://www.ncsc.gov.uk/'],bsi:['BSI','德国联邦信息安全局','https://www.bsi.bund.de/'],anssi:['ANSSI','法国国家网络与信息安全局','https://cyber.gouv.fr/'],eurepoc:['EuRepoC','欧洲网络事件信息库','https://eurepoc.eu/'],europol:['Europol EC3','欧洲刑警组织网络犯罪中心','https://www.europol.europa.eu/'],ccdcoe:['NATO CCDCOE','北约合作网络防御卓越中心','https://ccdcoe.org/'],kaspersky:['Kaspersky','卡巴斯基 Securelist','https://securelist.com/'],withsecure:['WithSecure','WithSecure（原 F-Secure）','https://www.withsecure.com/'],
 jpcert:['JPCERT/CC','日本计算机应急响应小组','https://www.jpcert.or.jp/'],checkpoint:['Check Point Research','Check Point 研究','https://research.checkpoint.com/'],acsc:['ASD / ACSC','澳大利亚信号局 / 网络安全中心','https://www.cyber.gov.au/'],'nca-sa':['NCA (Saudi)','沙特国家网络安全局','https://nca.gov.sa/'],trendmicro:['Trend Micro','趋势科技','https://www.trendmicro.com/vinfo/us/security/'],krcert:['KrCERT/CC','韩国互联网振兴院 KISA','https://www.krcert.or.kr/'],'csa-sg':['CSA Singapore','新加坡网络安全局','https://www.csa.gov.sg/'],cccs:['Cyber Centre (Canada)','加拿大网络安全中心','https://www.cyber.gc.ca/'],'group-ib':['Group-IB','Group-IB','https://www.group-ib.com/'],'cert-in':['CERT-In','印度计算机应急响应组','https://www.cert-in.org.in/']};
var BRAINS={1:{zh:'安全大脑 1 · 全球/美国',en:'Brain 1 · Global/US',s:'1'},2:{zh:'安全大脑 2 · 中国',en:'Brain 2 · China',s:'2'},3:{zh:'安全大脑 3 · 欧洲',en:'Brain 3 · Europe',s:'3'},4:{zh:'安全大脑 4 · 亚太/中东/美洲',en:'Brain 4 · APAC/ME/Americas',s:'4'}};
var EVF={b:{1:1,2:1,3:1,4:1},orgOnly:false};try{var _ef=JSON.parse(localStorage.getItem('se.evf')||'null');if(_ef&&_ef.b)EVF=_ef;}catch(e){}
function evPass(e){return !!EVF.b[e.brain||1]&&(!EVF.orgOnly||(e.org&&e.org.length));}
function applyEvFilter(){try{localStorage.setItem('se.evf',JSON.stringify(EVF));}catch(e){}EVY={};EV.forEach(function(e){if(evPass(e))(EVY[e.y]||(EVY[e.y]=[])).push(e);});buildHist();selectYear(tlYear||tlMaxY,false);renderEvFilter();}
function renderEvFilter(){var el=document.getElementById('tlBrain');if(!el){var tl=document.getElementById('tl');if(!tl)return;el=document.createElement('div');el.id='tlBrain';el.className='tl-brain';tl.insertBefore(el,document.getElementById('tlGlob'));
  el.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;var k=b.getAttribute('data-b');
   if(k==='org'){EVF.orgOnly=!EVF.orgOnly;}else if(k==='all'){EVF.b={1:1,2:1,3:1,4:1};}else{if(EVF.b[k]&&Object.keys(EVF.b).length>1)delete EVF.b[k];else EVF.b[k]=1;}applyEvFilter();});}
 var zh=LZ(),cnt={1:0,2:0,3:0,4:0};EV.forEach(function(e){if(!EVF.orgOnly||(e.org&&e.org.length))cnt[e.brain||1]++;});var n=0;for(var y in EVY)n+=EVY[y].length;
 el.innerHTML='<span class="lb">'+(I18T('brains'))+'</span>'+[1,2,3,4].map(function(k){return '<button data-b="'+k+'" class="'+(EVF.b[k]?'on':'')+'" title="'+esc(I18P(BRAINS[k].zh,BRAINS[k].en))+'">'+k+'<em>'+cnt[k]+'</em></button>';}).join('')+
  '<button data-b="org" class="org'+(EVF.orgOnly?' on':'')+'">'+(I18T('org_reported'))+'</button><span class="tot">'+n+(I18T('events_2'))+'</span>';}
function orgChipsHTML(e){var zh=LZ();var B=BRAINS[e.brain||1];var h='<div class="sec"><h3>'+(I18T('intel_sources'))+esc(I18P(B.zh,B.en))+'</h3>';
 if(e.org&&e.org.length)h+='<div class="orgs">'+e.org.map(function(k){var o=ORGS[k];if(!o)return '';return '<a href="'+esc(o[2])+'" target="_blank" rel="noopener noreferrer"><b>'+esc(o[0])+'</b><span>'+esc(I18P(o[1],o[0]))+'</span></a>';}).join('')+'</div>';
 else h+='<p class="ctrl" style="margin:0">'+(I18T('sourced_from_the_public'))+'</p>';return h+'</div>';}

// ---- Overture buildings: where OpenStreetMap has few footprints, fill in from the Overture Maps
// buildings theme (OSM + Microsoft/Google ML footprints + Esri community data), read tile-by-tile
// from Overture's public PMTiles archive. Same z14 grid as the street tiles.
var OVT={p:null,rel:'',ready:false,wait:null,used:0},OVT_FALLBACK='2026-09-23.1',OVT_MIN=1500;
function ovtInit(){if(OVT.wait||!window.pmtiles)return OVT.wait;var to=new Promise(function(r){setTimeout(r,6000);});
 OVT.wait=Promise.race([fetch('https://stac.overturemaps.org/catalog.json').then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),to.then(function(){return null;})])
  .then(function(j){OVT.rel=(j&&j.latest)||OVT_FALLBACK;OVT.p=new pmtiles.PMTiles('https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/'+OVT.rel+'/buildings.pmtiles');return OVT.p.getHeader();})
  .then(function(){OVT.ready=true;},function(e){OVT.p=null;console.warn('overture unavailable',e);});return OVT.wait;}
function ovtTile(x,y){if(!OVT.ready)return Promise.resolve(null);return OVT.p.getZxy(14,x,y).then(function(t){return t&&t.data?MVT.decode(new Uint8Array(t.data)):null;}).catch(function(){return null;});}
function ovtFor(nOsm,x,y){if(nOsm>=OVT_MIN||!OVT.wait)return Promise.resolve(null);return OVT.wait.then(function(){return ovtTile(x,y);});}
function ovtHeight(p,cx,cy){var h=+p.height;if(h>0)return h;var f=+(p.num_floors||p.level);if(f>0)return f*3.2;var s=Math.abs(Math.sin(cx*12.9898+cy*78.233)*43758.5453)%1;return 3.5+s*5;}

// ---- far field: a lighter z13 ring of streets, water, parks and buildings around the detailed
// z14 tiles, so the city runs on to the horizon instead of ending at the edge of the loaded block.
// Mid tiles are clipped in the shader wherever a detailed tile is already shown (no doubles).
var MID={tiles:{},queue:[],busy:0,group:null,cx:null,cy:null,ring:2,at:0,mats:null};
var NEARU={value:[]},NEARN={value:0};for(var _i=0;_i<36;_i++)NEARU.value.push(new T3.Vector4(1e9,1e9,1e9,1e9));
function nearClip(m){m.onBeforeCompile=function(sh){sh.uniforms.uNear=NEARU;sh.uniforms.uNearN=NEARN;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMidW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMidW=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMidW;uniform vec4 uNear[36];uniform int uNearN;')
   .replace('void main() {','void main() {\n for(int i=0;i<36;i++){if(i>=uNearN)break;vec4 r=uNear[i];if(vMidW.x>r.x&&vMidW.x<r.z&&vMidW.z>r.y&&vMidW.z<r.w)discard;}');};
 m.customProgramCacheKey=function(){return 'midclip';};return m;}
function midMats(){if(MID.mats)return MID.mats;MID.mats={
 bld:nearClip(new T3.MeshLambertMaterial({vertexColors:true,flatShading:true,side:T3.DoubleSide})),
 road:nearClip(new T3.MeshLambertMaterial({vertexColors:true})),
 water:nearClip(new T3.MeshLambertMaterial({color:0x2e5577})),
 park:nearClip(new T3.MeshLambertMaterial({color:0x4d6b3e})),
 wood:nearClip(new T3.MeshLambertMaterial({color:0x3f5a34}))};
 for(var k in MID.mats)MID.mats[k].userData.keep=1;return MID.mats;}
function midClear(){for(var k in MID.tiles)midUnload(k);MID.tiles={};MID.queue=[];MID.cx=MID.cy=null;if(MID.group&&MID.group.parent)MID.group.parent.remove(MID.group);MID.group=null;NEARN.value=0;}
function midUnload(k){var T=MID.tiles[k];if(!T)return;if(T.group){if(MID.group)MID.group.remove(T.group);disposeTree(T.group);}delete MID.tiles[k];}
function nearRects(){var lv=L2.live;if(!lv)return;var n=0;for(var k in lv.tiles){var T=lv.tiles[k];if(T.state!=='ready'&&T.state!=='empty')continue;if(n>=36)break;
  var x0=(tilon(T.x)-lv.lon0)*lv.mLon,x1=(tilon(T.x+1)-lv.lon0)*lv.mLon,z0=(tilat(T.y+1)-lv.lat0)*lv.mLat,z1=(tilat(T.y)-lv.lat0)*lv.mLat;if(z0>z1){var zt=z0;z0=z1;z1=zt;}NEARU.value[n].set(x0-1,z0-1,x1+1,z1+1);n++;}NEARN.value=n;}
function midUpdate(now){var lv=L2.live;if(!lv||!TILE_TPL)return;if(now-MID.at<450)return;MID.at=now;
 if(!MID.group){MID.group=new T3.Group();MID.group.name='mid';streetScene.add(MID.group);}
 nearRects();
 var ll=localToLL(L2.target.x,L2.target.z),x13=Math.floor(tlx(ll.lon)/2),y13=Math.floor(tly(ll.lat)/2);
 var RG=(SKYV&&SKYV.on)||L2.cam.d>1700?3:2;
 if(x13!==MID.cx||y13!==MID.cy||RG!==MID.ring){MID.cx=x13;MID.cy=y13;MID.ring=RG;var want=[];
  for(var dx=-RG;dx<=RG;dx++)for(var dy=-RG;dy<=RG;dy++){var k=(x13+dx)+','+(y13+dy);if(!MID.tiles[k]){MID.tiles[k]={x:x13+dx,y:y13+dy,state:'queued',lod:Math.max(Math.abs(dx),Math.abs(dy))};want.push(k);}}
  MID.queue=MID.queue.concat(want);
  Object.keys(MID.tiles).forEach(function(k){var T=MID.tiles[k];if(Math.abs(T.x-x13)>RG+1||Math.abs(T.y-y13)>RG+1)midUnload(k);});
  MID.queue.sort(function(a,b){var A=MID.tiles[a],B=MID.tiles[b];if(!A||!B)return 0;return (Math.abs(A.x-x13)+Math.abs(A.y-y13))-(Math.abs(B.x-x13)+Math.abs(B.y-y13));});}
 midPump();}
function midPump(){var lv=L2.live;if(!lv||MID.busy>=2)return;if(lv.busy||anyQueued(lv.tiles))return; // detailed tiles first
 var k;while((k=MID.queue.shift())){if(MID.tiles[k]&&MID.tiles[k].state==='queued')break;}if(!k)return;
 var T=MID.tiles[k],gen=lv.gen;T.state='loading';MID.busy++;
 fetch(TILE_TPL.replace('{z}',13).replace('{x}',T.x).replace('{y}',T.y)).then(function(r){return r.ok?r.arrayBuffer():null;}).catch(function(){return null;}).then(function(buf){
  if(!buf||!L2.live||L2.live.gen!==gen||MID.tiles[k]!==T)return null;
  var L0=MVT.decode(new Uint8Array(buf)),nb=L0.building?countFootprints(L0.building):0;
  var ovp=T.lod<=2&&nb<OVT_MIN*2&&OVT.wait?OVT.wait.then(function(){return OVT.ready?OVT.p.getZxy(13,T.x,T.y).then(function(t){return t&&t.data?MVT.decode(new Uint8Array(t.data)):null;}).catch(function(){return null;}):null;}):Promise.resolve(null);
  return ovp.then(function(OV){if(!L2.live||L2.live.gen!==gen||MID.tiles[k]!==T)return null;
   var d=tileToLocal(L0,T.x,T.y,L2.live,OV,2);var M=midMats(),g=new T3.Group();
   d.w.forEach(function(w){var m=buildShapeFill(w,0,0.35,M.water);m.receiveShadow=false;g.add(m);});
   d.pk.forEach(function(p){var m=buildShapeFill(p,1,p[0]===1?0.22:0.12,p[0]===1?M.park:M.wood);m.receiveShadow=false;g.add(m);});
   var rd=d.rd.filter(function(r){return r[0]<=(T.lod<=1?6:4);});var roads=buildRoads(rd);roads.mesh.material=M.road;roads.mesh.position.y=-0.25;roads.mesh.receiveShadow=false;g.add(roads.mesh);disposeTree(roads.glow);if(roads.br)disposeTree(roads.br);
   var B=T.lod<=2?d.b.filter(function(b){return b.length>=8;}):[];
   return (B.length?buildBuildings(B):Promise.resolve(null)).then(function(bld){if(!L2.live||L2.live.gen!==gen||MID.tiles[k]!==T){disposeTree(g);if(bld){disposeTree(bld.mesh);disposeTree(bld.roof);}return;}
    if(bld){bld.mesh.material.dispose();bld.mesh.material=M.bld;bld.mesh.castShadow=false;bld.mesh.receiveShadow=false;g.add(bld.mesh);disposeTree(bld.roof);}
    T.group=g;T.state='ready';T.nb=d.b.length;MID.group.add(g);if(!MID.hudT)MID.hudT=setTimeout(function(){MID.hudT=0;updateLiveHud();},600);});});
 }).catch(function(e){T.state='empty';console.warn('mid',k,e);}).then(function(){MID.busy--;midPump();});
 if(MID.busy<2)midPump();}
function anyQueued(o){for(var k in o){var st=o[k].state;if(st==='queued'||st==='loading')return true;}return false;}
function midCount(){var r=0,t=0;for(var k in MID.tiles){t++;if(MID.tiles[k].state==='ready')r++;}return [r,t];}

// ---- region layer: z10 tiles (~30 km each, 3x3) of highways, urban areas and water so the roads that
// link this city to its neighbours are visible, plus clickable labels for the towns around you.
var FAR={tiles:{},queue:[],busy:0,group:null,cx:null,cy:null,at:0,mats:null,lab:{at:0,list:[],key:''}};
var MIDR={value:new T3.Vector4(1e9,1e9,-1e9,-1e9)};
function farClip(m){m.onBeforeCompile=function(sh){sh.uniforms.uMidR=MIDR;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFarW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFarW=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFarW;uniform vec4 uMidR;')
   .replace('void main() {','void main() {\n if(vFarW.x>uMidR.x&&vFarW.x<uMidR.z&&vFarW.z>uMidR.y&&vFarW.z<uMidR.w)discard;');};
 m.customProgramCacheKey=function(){return 'farclip';};m.userData.keep=1;return m;}
function farMats(){if(FAR.mats)return FAR.mats;FAR.mats={
 urban:farClip(new T3.MeshLambertMaterial({color:0x6b6f78})),ind:farClip(new T3.MeshLambertMaterial({color:0x6f6a62})),
 water:farClip(new T3.MeshLambertMaterial({color:0x2e5577})),green:farClip(new T3.MeshLambertMaterial({color:0x48613a})),
 road:farClip(new T3.MeshLambertMaterial({color:0xd9c79a,emissive:0x5a4a20})),road2:farClip(new T3.MeshLambertMaterial({color:0xb9b2a0,emissive:0x2a2618}))};return FAR.mats;}
function farClear(){for(var k in FAR.tiles){var T=FAR.tiles[k];if(T.group){FAR.group.remove(T.group);disposeTree(T.group);}}FAR.tiles={};FAR.queue=[];FAR.cx=FAR.cy=null;if(FAR.group&&FAR.group.parent)FAR.group.parent.remove(FAR.group);FAR.group=null;
 MIDR.value.set(1e9,1e9,-1e9,-1e9);var el=document.getElementById('nbrLabels');if(el)el.innerHTML='';FAR.lab.key='';}
function midRect(){var lv=L2.live;if(!lv)return;var x0=1e9,z0=1e9,x1=-1e9,z1=-1e9,n=0;for(var k in MID.tiles){var T=MID.tiles[k];if(T.state!=='ready'&&T.state!=='empty')continue;n++;
  var a=(tilon(T.x*2)-lv.lon0)*lv.mLon,b=(tilon(T.x*2+2)-lv.lon0)*lv.mLon,c=(tilat(T.y*2+2)-lv.lat0)*lv.mLat,d=(tilat(T.y*2)-lv.lat0)*lv.mLat;x0=Math.min(x0,a);x1=Math.max(x1,b);z0=Math.min(z0,c);z1=Math.max(z1,d);}
 if(n)MIDR.value.set(x0+20,z0+20,x1-20,z1-20);else MIDR.value.set(1e9,1e9,-1e9,-1e9);}
function ribbon(rd,w,y){var P=[];rd.forEach(function(r){for(var i=2;i<r.length-2;i+=2){var ax=r[i],az=r[i+1],bx=r[i+2],bz=r[i+3],dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz);if(L<1)continue;var nx=-dz/L*w,nz=dx/L*w;
  P.push(ax+nx,y,az+nz,ax-nx,y,az-nz,bx-nx,y,bz-nz,ax+nx,y,az+nz,bx-nx,y,bz-nz,bx+nx,y,bz+nz);}});
 var g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(P),3));var N=new Float32Array(P.length);for(var i=1;i<N.length;i+=3)N[i]=1;g.setAttribute('normal',new T3.BufferAttribute(N,3));return g;}
function farUpdate(now){var lv=L2.live;if(!lv||!TILE_TPL)return;if(now-FAR.at<900)return;FAR.at=now;
 if(!FAR.group){FAR.group=new T3.Group();FAR.group.name='far';streetScene.add(FAR.group);}
 midRect();var ll=localToLL(L2.target.x,L2.target.z),x10=Math.floor(tlx(ll.lon)/16),y10=Math.floor(tly(ll.lat)/16);
 if(x10!==FAR.cx||y10!==FAR.cy){FAR.cx=x10;FAR.cy=y10;for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++){var k=(x10+dx)+','+(y10+dy);if(!FAR.tiles[k]){FAR.tiles[k]={x:x10+dx,y:y10+dy,state:'queued'};FAR.queue.push(k);}}
  Object.keys(FAR.tiles).forEach(function(k){var T=FAR.tiles[k];if(Math.abs(T.x-x10)>2||Math.abs(T.y-y10)>2){if(T.group){FAR.group.remove(T.group);disposeTree(T.group);}delete FAR.tiles[k];}});}
 farPump();}
function farPump(){var lv=L2.live;if(!lv||FAR.busy)return;if(lv.busy||MID.busy||anyQueued(lv.tiles)||anyQueued(MID.tiles))return;
 var k;while((k=FAR.queue.shift())){if(FAR.tiles[k]&&FAR.tiles[k].state==='queued')break;}if(!k)return;var T=FAR.tiles[k],gen=lv.gen;T.state='loading';FAR.busy=1;
 fetch(TILE_TPL.replace('{z}',10).replace('{x}',T.x).replace('{y}',T.y)).then(function(r){return r.ok?r.arrayBuffer():null;}).catch(function(){return null;}).then(function(buf){
  if(!buf||!L2.live||L2.live.gen!==gen||FAR.tiles[k]!==T)return;var d=tileToLocal(MVT.decode(new Uint8Array(buf)),T.x,T.y,L2.live,null,16),M=farMats(),g=new T3.Group();
  (d.lu||[]).forEach(function(u){if(u.ar<20000)return;var m=buildShapeFill(u.c,0,-0.9,u.k===3?M.ind:M.urban);m.receiveShadow=false;g.add(m);});
  d.pk.forEach(function(p){var m=buildShapeFill(p,1,-0.8,M.green);m.receiveShadow=false;g.add(m);});
  d.w.forEach(function(w){var m=buildShapeFill(w,0,-0.7,M.water);m.receiveShadow=false;g.add(m);});
  var maj=d.rd.filter(function(r){return r[0]<=1;}),sec=d.rd.filter(function(r){return r[0]>=2&&r[0]<=3;});
  if(maj.length)g.add(new T3.Mesh(ribbon(maj,38,-0.5),M.road));if(sec.length)g.add(new T3.Mesh(ribbon(sec,20,-0.55),M.road2));
  T.group=g;T.state='ready';FAR.group.add(g);
 }).catch(function(e){T.state='empty';console.warn('far',k,e);}).then(function(){FAR.busy=0;farPump();});}
// neighbour labels: towns within 70 km, pinned on the ground, click to travel there
function farLabels(now){var el=document.getElementById('nbrLabels');if(!el){el=document.createElement('div');el.id='nbrLabels';document.body.appendChild(el);
  el.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-nb]');if(!b)return;e.stopPropagation();var r=FAR.lab.list[+b.getAttribute('data-nb')];if(r)travelTo({lat:r[5],lon:r[6],name:r[0],zh:r[1],iso:r[4],ctry:r[3]});});}
 var on=mode==='street'&&L2.active&&!!L2.live;el.style.display=on?'':'none';if(!on||!NODES)return;
 var lv=L2.live,ll=localToLL(L2.target.x,L2.target.z),key=Math.round(ll.lat*40)+','+Math.round(ll.lon*40);
 if(key!==FAR.lab.key){FAR.lab.key=key;var c=[];NODES.rows.forEach(function(r){var d=hav(ll.lat,ll.lon,r[5],r[6]);if(d>2.5&&d<70)c.push([d,r]);});c.sort(function(a,b){return a[0]-b[0];});
  FAR.lab.list=c.slice(0,14).map(function(x){return x[1];});var zh=LZ();
  el.innerHTML=FAR.lab.list.map(function(r,i){return '<button data-nb="'+i+'" class="nb"><i></i><b>'+esc(zh&&r[1]?r[1]:r[0])+'</b><em></em></button>';}).join('');}
 if(now-FAR.lab.at<120)return;FAR.lab.at=now;var W=window.innerWidth,H=window.innerHeight,v=new T3.Vector3(),kids=el.children;
 for(var i=0;i<FAR.lab.list.length;i++){var r=FAR.lab.list[i],b=kids[i];if(!b)continue;var x=(r[6]-lv.lon0)*lv.mLon,z=(r[5]-lv.lat0)*lv.mLat;v.set(x,40,z).sub(camera.position).normalize().multiplyScalar(2500).add(camera.position).project(camera);
  var d=hav(ll.lat,ll.lon,r[5],r[6]);var vis=v.z<1&&v.x>-1.05&&v.x<1.05&&v.y>-1&&v.y<1.05;
  if(!vis){b.style.opacity=0;b.style.pointerEvents='none';continue;}b.style.opacity=d<12?1:Math.max(.55,1-(d-12)/90);b.style.pointerEvents='auto';
  b.style.transform='translate('+((v.x*.5+.5)*W).toFixed(0)+'px,'+((-v.y*.5+.5)*H).toFixed(0)+'px) translate(-50%,-100%)';b.lastChild.textContent=fmtKm(d);}}

// ---- address search (street level): local street names in loaded tiles + cities, then OpenStreetMap
// geocoding (Photon, biased to the view; Nominatim on Enter). Picking a result flies there over the ground,
// or drops straight in when it is far away. One request at a time, debounced (OSM usage policy).
var SRCH={t:0,seq:0,res:[],pin:null,last:0};
function hourOf(ms){var d=new Date(ms+utcOff()*1000);return d.getUTCHours()+d.getUTCMinutes()/60;}
function setTod(k){var rs=ENV.riseSet||riseSet(envNow(),ENV.lat,ENV.lon,utcOff()),r=rs&&rs.rise!=null?hourOf(rs.rise):6.5,s=rs&&rs.set!=null?hourOf(rs.set):18.5;
 var h=k==='dawn'?r-0.25:k==='day'?Math.min(13,(r+s)/2+0.5):k==='dusk'?s+0.2:Math.min(23.9,s+3.2);if(rs&&rs.rise==null&&rs.set==null)h=k==='night'?0.5:12;
 ENV.lapse=false;setHourLocal(((h%24)+24)%24);ENV.tod=k;todUI();}
function todUI(){if(typeof skyControls==='function'&&SKYV.on)skyControls();document.querySelectorAll('#eTod button').forEach(function(b){b.setAttribute('aria-pressed',ENV.timeMode!=='live'&&ENV.tod===b.dataset.tod);});}
function wireTod(){var row=document.getElementById('eTod');if(!row||row._w)return;row._w=1;row.querySelectorAll('button').forEach(function(b){b.onclick=function(){setTod(b.dataset.tod);};});
 var lv=document.getElementById('eLive'),hr=document.getElementById('eHour');if(lv)lv.addEventListener('click',function(){ENV.tod=null;todUI();});if(hr)hr.addEventListener('input',function(){ENV.tod=null;todUI();});
 row.addEventListener('pointerdown',function(e){e.stopPropagation();});}
function srchLocal(q){var out=[],ql=q.toLowerCase(),seen={};if(!q)return out;
 if(L2.live)for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(!T.data)continue;T.data.rn.forEach(function(r){var nm=r.n,zn=r.zh;if(!nm)return;if((nm.toLowerCase().indexOf(ql)>=0||(zn&&zn.indexOf(q)>=0))&&!seen['s'+nm]){seen['s'+nm]=1;var m=Math.floor(r.c.length/4)*2;var ll=localToLL(r.c[m],r.c[m+1]);out.push({t:'street',n:(LZ()&&zn?zn:nm),s:I18T('street_in_view'),lat:ll.lat,lon:ll.lon});}});}
 CITIES.forEach(function(c){if(out.length>12)return;if((c.en&&c.en.toLowerCase().indexOf(ql)===0)||(c.zh&&c.zh.indexOf(q)===0)){out.push({t:'city',n:cityName(c),s:(I18P(c.czh,c.country))||c.iso,lat:c.lat,lon:c.lon,id:c.id});}});
 return out.slice(0,8);}
function srchRemote(q,strict){var my=++SRCH.seq,ll=viewLL(),now=Date.now(),wait=Math.max(0,1100-(now-SRCH.last));
 return new Promise(function(r){setTimeout(r,wait);}).then(function(){if(my!==SRCH.seq)return null;SRCH.last=Date.now();
  var u=strict?'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=0&accept-language='+(I18T('en'))+'&q='+encodeURIComponent(q)
   :'https://photon.komoot.io/api/?limit=8&lang='+((LZ()?'default':'en'))+'&lat='+ll.lat.toFixed(4)+'&lon='+ll.lon.toFixed(4)+'&location_bias_scale=0.1&zoom=4&q='+encodeURIComponent(q);
  return fetch(u).then(function(x){return x.json();}).then(function(j){if(my!==SRCH.seq)return null;
   if(strict)return (j||[]).map(function(o){return {t:'geo',n:(o.name||o.display_name.split(',')[0]),s:o.display_name,lat:+o.lat,lon:+o.lon};});
   return (j.features||[]).map(function(f){var p=f.properties,c=f.geometry.coordinates,addr=[p.housenumber&&p.street?p.street+' '+p.housenumber:p.street,p.district||p.locality,p.city||p.county,p.state,p.country].filter(Boolean).join(', ');
    return {t:'geo',n:p.name||(p.street?(p.street+(p.housenumber?' '+p.housenumber:'')):addr),s:addr,lat:c[1],lon:c[0]};});});}).catch(function(){return null;});}
function srchRender(list,note){var box=document.getElementById('srchRes');if(!box)return;var zh=LZ(),ll=viewLL();SRCH.res=list||[];
 if(!list||!list.length){box.innerHTML=note?'<div class="sn">'+esc(note)+'</div>':'';box.hidden=!note;return;}box.hidden=false;
 box.innerHTML=list.map(function(r,i){var d=hav(ll.lat,ll.lon,r.lat,r.lon);return '<button data-i="'+i+'"><i class="'+r.t+'"></i><span><b>'+esc(r.n||'')+'</b><em>'+esc(r.s||'')+'</em></span><small>'+fmtKm(d)+'</small></button>';}).join('')+
  '<div class="sn">'+(I18T('geocoding_openstreetmap_contributors_pho'))+'</div>';}
function srchGo(r){var box=document.getElementById('srchRes');if(box)box.hidden=true;var ll=viewLL(),d=hav(ll.lat,ll.lon,r.lat,r.lon);srchPin(r);
 if(DRV.on&&!r.id){drvSetDest({lat:r.lat,lon:r.lon,n:r.n});return;}
 if(r.id&&d>60){enterCity(r.id);return;}
 if(L2.live&&d<=120)travelTo({lat:r.lat,lon:r.lon,name:r.n,zh:'',iso:''});else enterAt(r.lat,r.lon);}
function srchPin(r){SRCH.pinLL={lat:r.lat,lon:r.lon,n:r.n};}
function srchPinStep(){var el=document.getElementById('srchPin');if(!el)return;var P=SRCH.pinLL;if(!P||mode!=='street'||!L2.live){el.style.display='none';return;}
 var lv=L2.live,v=new T3.Vector3((P.lon-lv.lon0)*lv.mLon,30,(P.lat-lv.lat0)*lv.mLat);v.sub(camera.position);var dist=v.length();v.normalize().multiplyScalar(Math.min(dist,2500)).add(camera.position).project(camera);
 var ok=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;el.style.display=ok?'':'none';if(!ok)return;
 el.style.transform='translate('+((v.x*.5+.5)*window.innerWidth).toFixed(0)+'px,'+((-v.y*.5+.5)*window.innerHeight).toFixed(0)+'px) translate(-50%,-100%)';el.querySelector('b').textContent=P.n;el.querySelector('em').textContent=fmtKm(dist/1000);}
function wireSearch(){var inp=document.getElementById('srchIn');if(!inp||inp._w)return;inp._w=1;var box=document.getElementById('srchRes'),wrap=document.getElementById('srch');
 ['pointerdown','wheel','keydown'].forEach(function(t){wrap.addEventListener(t,function(e){e.stopPropagation();},{passive:t!=='keydown'});});
 function run(strict){var q=inp.value.trim();clearTimeout(SRCH.t);if(q.length<2){srchRender([]);return;}var loc=srchLocal(q);srchRender(loc,I18T('searching'));
  SRCH.t=setTimeout(function(){srchRemote(q,false).then(function(ph){if(ph==null)return;srchRender(srchMerge(loc,[],ph,q),I18T('searching'));
    return srchRemote(q,true).then(function(nm){if(nm==null)return;srchRender(srchMerge(loc,nm||[],ph,q),I18T('no_results'));});});},strict?0:500);}
 function srchMerge(loc,nm,ph,q){var num=/\d/.test(q),A=num?nm.concat(ph):ph.concat(nm),out=[],seen={},ql=q.toLowerCase().replace(/[\s,，]+/g,'');function sc(r){var n=(r.n||'').toLowerCase().replace(/[\s,，]+/g,'');return n&&(ql.indexOf(n)>=0||n.indexOf(ql)>=0)?2:0;}A=A.map(function(r,i){return [r,i];}).sort(function(a,b){return (sc(b[0])-sc(a[0]))||(a[1]-b[1]);}).map(function(x){return x[0];});loc.concat(A).forEach(function(r){var k=(r.n||'').toLowerCase()+'|'+r.lat.toFixed(3)+'|'+r.lon.toFixed(3);if(seen[k])return;seen[k]=1;out.push(r);});return out.slice(0,10);}
 inp.addEventListener('input',function(){run(false);});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();if(SRCH.res.length&&!e.shiftKey)srchGo(SRCH.res[0]);else run(true);}else if(e.key==='Escape'){inp.value='';srchRender([]);inp.blur();}});
 box.addEventListener('click',function(e){var b=e.target.closest('[data-i]');if(b)srchGo(SRCH.res[+b.getAttribute('data-i')]);});
 document.getElementById('srchX').onclick=function(){inp.value='';srchRender([]);SRCH.pinLL=null;};}

// ---- wind aligned to "now": Open-Meteo 15-minute steps interpolated to the current second (refreshed every
// 5 min), the next 45 min of wind/gust for flight decisions, and — in the US — the latest NWS station observation.
var WIND={m:null,obs:null,obsAt:0,obsBusy:false,at:0};
function wxM15(j){var m=j.minutely_15;if(!m||!m.time)return null;var off=(j.utc_offset_seconds||0)*1000;return {t:m.time.map(function(s){return Date.parse(s+':00Z')-off;}),ws:m.wind_speed_10m,wg:m.wind_gusts_10m,wd:m.wind_direction_10m};}
function windNow(ms){var M=WIND.m;if(!M||!M.t.length)return null;var T=M.t,i=0;while(i<T.length-1&&T[i+1]<=ms)i++;var j=Math.min(T.length-1,i+1),f=T[j]>T[i]?Math.max(0,Math.min(1,(ms-T[i])/(T[j]-T[i]))):0;
 function L(a){return a[i]==null?a[j]:a[j]==null?a[i]:a[i]+(a[j]-a[i])*f;}var d0=M.wd[i],d1=M.wd[j],dd=((d1-d0+540)%360)-180;
 var ahead=0,ag=0;for(var k=0;k<T.length;k++)if(T[k]>ms&&T[k]<=ms+45*60000){ahead=Math.max(ahead,M.ws[k]||0);ag=Math.max(ag,M.wg[k]||0);}
 return {ws:L(M.ws),wg:L(M.wg),wd:((d0+dd*f)%360+360)%360,maxWs45:ahead,maxWg45:ag,t0:T[i],t1:T[j]};}
function windStep(){if(!ENV.on||ENV.wxMode!=='live'||!ENV.wxLive)return;var now=Date.now();if(now-WIND.at<1000)return;WIND.at=now;var w=windNow(now);if(!w)return;
 ENV.wxLive.wind=w.ws;ENV.wxLive.gust=Math.max(w.wg,w.ws);ENV.wxLive.wdir=w.wd;ENV.wxLive.wNow=w;if(ENV.tgt){ENV.tgt.wind=w.ws;ENV.tgt.gust=Math.max(w.wg,w.ws);ENV.tgt.wdir=w.wd;}
 if(!WIND.obsBusy&&now-WIND.obsAt>600000)obsLoad();}
function obsLoad(){var ll={lat:ENV.lat,lon:ENV.lon};if(L2.live&&L2.target)ll=localToLL(L2.target.x,L2.target.z);var cc=L2.city&&L2.city.iso;if(cc&&cc!=='US'&&cc!=='PR'&&cc!=='GU'){WIND.obsAt=Date.now();return;}
 WIND.obsBusy=true;fetch('https://api.weather.gov/points/'+ll.lat.toFixed(4)+','+ll.lon.toFixed(4)).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(p){return fetch(p.properties.observationStations).then(function(r){return r.json();});})
 .then(function(st){var f=st.features&&st.features[0];if(!f)throw 0;var id=f.properties.stationIdentifier;return fetch('https://api.weather.gov/stations/'+id+'/observations/latest').then(function(r){return r.json();}).then(function(o){var q=o.properties,g=f.geometry.coordinates;
   WIND.obs={id:id,name:f.properties.name,t:Date.parse(q.timestamp),ws:q.windSpeed&&q.windSpeed.value!=null?q.windSpeed.value/3.6:null,wg:q.windGust&&q.windGust.value!=null?q.windGust.value/3.6:null,wd:q.windDirection?q.windDirection.value:null,temp:q.temperature?q.temperature.value:null,d:hav(ll.lat,ll.lon,g[1],g[0])};});})
 .catch(function(){WIND.obs=null;}).then(function(){WIND.obsBusy=false;WIND.obsAt=Date.now();});}
function windLine(zh){var L=ENV.wxLive,w=L&&L.wNow;if(!w)return '';var arr='↓↙←↖↑↗→↘'.charAt(Math.round(((w.wd+180)%360)/45)%8);
 var s=(I18T('wind_now'))+w.ws.toFixed(1)+' m/s '+arr+Math.round(w.wd)+'° · '+(I18T('gust_2'))+Math.max(w.wg,w.ws).toFixed(1)+' · '+(I18T('max_next_45_min'))+w.maxWs45.toFixed(1)+'/'+w.maxWg45.toFixed(1)+' m/s';
 s+=' · '+(I18T('s_15_min_model_interpolated'))+fmtHM(Date.now());
 var O=WIND.obs;if(O&&O.ws!=null){var age=Math.round((Date.now()-O.t)/60000);s+=' · '+(I18T('observed'))+O.id+' '+O.ws.toFixed(1)+' m/s'+(O.wd!=null?' '+Math.round(O.wd)+'°':'')+'（'+(age+(I18T('min_ago_2')))+fmtKm(O.d)+'）';}
 return s;}

// ---- full postal address + administrative jurisdiction for a clicked building (OSM Nominatim reverse,
// on click only, cached, at most one request per second). Public map data only.
var REV={c:{},last:0};
function revAddr(lat,lon){var k=lat.toFixed(5)+','+lon.toFixed(5),zh=LZ();if(REV.c[k+lang])return Promise.resolve(REV.c[k+lang]);
 var wait=Math.max(0,1100-(Date.now()-Math.max(REV.last,SRCH.last||0)));
 return new Promise(function(r){setTimeout(r,wait);}).then(function(){REV.last=Date.now();
  return fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&namedetails=0&accept-language='+(I18T('en_2'))+'&lat='+lat.toFixed(6)+'&lon='+lon.toFixed(6));})
 .then(function(r){return r.json();}).then(function(j){if(j&&j.address)for(var q in j.address){if(typeof j.address[q]==='string')j.address[q]=j.address[q].split(';')[0];}REV.c[k+lang]=j;return j;});}
function addrFormat(a,cc){if(!a)return '';var zh=LZ(),east=/^(cn|jp|kr|tw|hk|mo)$/.test(cc||'');
 var road=a.road||a.pedestrian||a.footway||a.path||a.square||'',hn=a.house_number||'',sub=a.neighbourhood||a.quarter||a.suburb||a.city_district||'',city=a.city||a.town||a.village||a.municipality||a.hamlet||'',
  county=a.county||'',state=a.state||a.province||a.region||'',pc=a.postcode||'',ctry=a.country||'';
 if(east)return [ctry,state,city,a.city_district||a.suburb||'',road,hn&&(hn+(I18T('s_2')))].filter(Boolean).join(I18T('s_3'))+(pc?(I18T('s_4'))+pc+')':'');
 return [[hn,road].filter(Boolean).join(' '),sub,[city,[state,pc].filter(Boolean).join(' ')].filter(Boolean).join(', '),ctry].filter(Boolean).join(', ');}
function addrJuris(a,cc){if(!a)return '';var zh=LZ(),rows=[],iso=a['ISO3166-2-lvl4']||a['ISO3166-2-lvl6']||'';
 function add(lbl,v){if(v)rows.push('<span><em>'+lbl+'</em>'+esc(v)+'</span>');}
 add(I18T('country'),a.country+(cc?' ('+cc.toUpperCase()+')':''));add(I18T('state_province'),(a.state||a.province||a.region||'')+(iso?' · '+iso:''));
 add(I18T('county'),a.county||a.state_district||'');add(I18T('city_town'),a.city||a.town||a.village||a.municipality||'');
 add(I18T('district'),a.city_district||a.borough||a.suburb||'');add(I18T('neighbourhood'),a.neighbourhood||a.quarter||'');
 return '<div class="juris">'+rows.join('')+'</div>';}
function fillFullAddr(lat,lon){var el=document.getElementById('fullAddr'),jr=document.getElementById('jurisA');if(!el)return;var zh=LZ();
 el.innerHTML='<span style="color:var(--faint)">'+(I18T('looking_up_openstreetmap'))+'</span>';
 revAddr(lat,lon).then(function(j){if(!document.getElementById('fullAddr'))return;var a=j&&j.address,cc=a&&a.country_code;
  if(!a){el.innerHTML='<span style="color:var(--faint)">'+(I18T('no_address_recorded_here'))+'</span>';return;}
  var f=addrFormat(a,cc);el.innerHTML=esc(f||j.display_name)+'<div class="addrsub">'+(I18T('osm_object'))+esc((j.osm_type||'')+' '+(j.osm_id||''))+(j.name?' · '+esc(j.name):'')+'</div>';
  if(jr)jr.innerHTML=addrJuris(a,cc);if(j.name&&!bxPhotos.named){bxPhotos.named=1;bxPhotos({lat:lat,lon:lon},j.name);}})
 .catch(function(){el.innerHTML='<span style="color:var(--faint)">'+(I18T('address_service_unavailable'))+'</span>';});}

// ---- category search (street level): places from the loaded map tiles + OSM Photon around the view, and a
// "knowledge" chip that lists nearby Wikipedia articles ----
var SCAT=[{k:'food',zh:'餐厅',en:'Restaurants',ic:'🍴',cls:['restaurant','fast_food'],ph:[['restaurant','amenity:restaurant'],['food','amenity:fast_food']]},
 {k:'cafe',zh:'咖啡',en:'Cafés',ic:'☕',cls:['cafe','bakery','ice_cream'],ph:[['cafe','amenity:cafe']]},
 {k:'hotel',zh:'酒店',en:'Hotels',ic:'🛏',cls:['lodging'],ph:[['hotel','tourism:hotel']]},
 {k:'see',zh:'景点',en:'Things to do',ic:'📷',cls:['attraction','theatre','cinema','zoo','stadium'],ph:[['attraction','tourism:attraction'],['viewpoint','tourism:viewpoint']]},
 {k:'museum',zh:'博物馆',en:'Museums',ic:'🏛',cls:['museum','art_gallery'],ph:[['museum','tourism:museum'],['gallery','tourism:gallery']]},
 {k:'park',zh:'公园',en:'Parks',ic:'🌳',cls:['park','garden'],ph:[['park','leisure:park']]},
 {k:'shop',zh:'购物',en:'Shopping',ic:'🛍',cls:['shop','grocery','clothing_store','books','electronics','gift'],ph:[['mall','shop:mall'],['supermarket','shop:supermarket']]},
 {k:'transit',zh:'公共交通',en:'Transit',ic:'🚉',cls:['railway','bus','ferry_terminal','aerialway'],ph:[['station','railway:station'],['station','public_transport:station'],['bus','highway:bus_stop']]},
 {k:'fuel',zh:'加油 / 充电',en:'Fuel / EV',ic:'⛽',cls:['fuel','charging_station'],ph:[['fuel','amenity:fuel'],['gas','amenity:fuel'],['charging','amenity:charging_station'],['ev','amenity:charging_station']]},
 {k:'wiki',zh:'知识',en:'Knowledge',ic:'📖',cls:[],ph:[]}];
function catLocal(C){var out=[],ll=viewLL(),seen={};if(!L2.live||!C.cls.length)return out;for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(!T.data)continue;T.data.po.forEach(function(p){if(C.cls.indexOf(p.cl)<0||!p.n||seen[p.n])return;seen[p.n]=1;var q=localToLL(p.x,p.z);out.push({t:'poi',n:LZ()&&p.zh?p.zh:p.n,s:(p.sc||p.cl)+(I18T('in_view')),lat:q.lat,lon:q.lon});});}
 return out.sort(function(a,b){return hav(ll.lat,ll.lon,a.lat,a.lon)-hav(ll.lat,ll.lon,b.lat,b.lon);}).slice(0,12);}
function catRemote(C){var ll=viewLL(),d=0.035,bb=[ll.lon-d/Math.cos(ll.lat*D2R),ll.lat-d,ll.lon+d/Math.cos(ll.lat*D2R),ll.lat+d].map(function(v){return v.toFixed(4);}).join(',');
 if(C.k==='wiki'){var wk=function(host){return fetch('https://'+host+'.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord='+ll.lat.toFixed(5)+'|'+ll.lon.toFixed(5)+'&gsradius=10000&gslimit=25&format=json&origin=*').then(function(r){return r.json();})
  .then(function(j){return ((j.query&&j.query.geosearch)||[]).map(function(g){return {t:'wiki',n:g.title,s:'Wikipedia · '+host,lat:g.lat,lon:g.lon,url:'https://'+host+'.wikipedia.org/?curid='+g.pageid};});}).catch(function(){return [];});};return wk((LZ()?'zh':'en')).then(function(r){return r.length||!LZ()?r:wk('en');});}
 return Promise.all(C.ph.map(function(p){return Promise.race([new Promise(function(r){setTimeout(function(){r({json:function(){return {features:[]};}});},8000);}),fetch('https://photon.komoot.io/api/?limit=15&q='+p[0]+'&osm_tag='+p[1]+'&lat='+ll.lat.toFixed(4)+'&lon='+ll.lon.toFixed(4)+'&bbox='+bb+'&lang='+((LZ()?'default':'en')))]).then(function(r){return r.json();}).catch(function(){return {features:[]};});}))
  .then(function(js){var out=[];js.forEach(function(j){(j.features||[]).forEach(function(f){var pr=f.properties,c=f.geometry.coordinates;if(!pr.name)return;out.push({t:'geo',n:pr.name,s:[pr.street&&((pr.housenumber?pr.housenumber+' ':'')+pr.street),pr.district||pr.locality,pr.city].filter(Boolean).join(', '),lat:c[1],lon:c[0]});});});return out;});}
function catRun(k){var C=SCAT.filter(function(c){return c.k===k;})[0];if(!C)return;SRCH.cat=k;catChips();var zh=LZ(),loc=catLocal(C);srchRender(loc,I18T('searching'));
 catRemote(C).then(function(rem){if(SRCH.cat!==k)return;var ll=viewLL(),seen={},all=[];loc.concat(rem).forEach(function(r){var key=(r.n||'').toLowerCase();if(seen[key])return;seen[key]=1;all.push(r);});
  all.sort(function(a,b){return hav(ll.lat,ll.lon,a.lat,a.lon)-hav(ll.lat,ll.lon,b.lat,b.lon);});srchRender(all.slice(0,14),I18T('nothing_found_nearby'));});}
function catChips(){var el=document.getElementById('srchCats');if(!el)return;var zh=LZ();el.innerHTML=SCAT.map(function(c){return '<button data-cat="'+c.k+'" class="'+(SRCH.cat===c.k?'on':'')+'"><i>'+c.ic+'</i>'+(I18P(c.zh,c.en))+'</button>';}).join('');}
// ---- live 2D route map (street level): roads, water and parks from the loaded tiles, your track, heading and the
// planned travel line; its own search box sends the camera on an auto-cruise to the address ----
var MM={trail:[],at:0,last:null,scale:1.6};
function mmLayout(){var el=document.getElementById('mmap');if(!el)return null;var on=mode==='street'&&L2.active&&!(typeof SKYV!=='undefined'&&SKYV.on);el.style.display=on?'':'none';document.body.classList.toggle('mmOn',on);if(!on)return null;
 var dr0=L2.drone&&L2.drone.on,W=window.innerWidth,H=window.innerHeight,gz=dhRect('gizmo'),hb=dhRect('dhHolo'),ah=dhRect('ahead'),right=gz?gz.right:W-16,top=(hb&&hb.height?hb.bottom:(gz?gz.bottom:120))+10,bottom=ah?ah.top-10:H-20;
 if(DRV.on&&W>=900){var mh=Math.round(Math.max(150,Math.min(260,H*.26))),t0=92;el.style.left='16px';el.style.top=t0+'px';el.style.width='340px';el.style.height=mh+'px';root.style.setProperty('--drvAhT',(t0+mh)+'px');return el;}
 if(DL.on&&DL.mm){el.style.left=DL.mm.left+'px';el.style.top=DL.mm.top+'px';el.style.height=DL.mm.h+'px';el.style.width=DL.mm.w+'px';return el;}el.style.width='';
 var h=Math.max(150,Math.min(330,bottom-top));el.style.left=(right-el.offsetWidth)+'px';el.style.top=Math.min(top,H-h-20)+'px';el.style.height=h+'px';return el;}
function mmStep(now){var el=mmLayout();if(!el||!L2.live)return;if(now-MM.at<200)return;MM.at=now;var cv=document.getElementById('mmC');if(!cv)return;
 var dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);var tg=L2.target,mpp=MM.scale*(1+L2.cam.d/900);var cx=w/2,cy=h*0.6;
 var hdgR=camHeading()*D2R;// heading-up map: rotate world so the heading points up
 var cs=Math.cos(hdgR),sn=Math.sin(hdgR);function P(x,z){var dx=(x-tg.x)/mpp,dz=(tg.z-z)/mpp;return [cx+dx*cs-dz*sn,cy-(dx*sn+dz*cs)];}
 var range=Math.hypot(w,h)*mpp;
 // breadcrumb
 if(!MM.last||Math.hypot(tg.x-MM.last.x,tg.z-MM.last.z)>15){var ll=localToLL(tg.x,tg.z);MM.trail.push(ll);if(MM.trail.length>600)MM.trail.shift();MM.last={x:tg.x,z:tg.z};}
 g.fillStyle='rgba(4,10,22,.86)';g.fillRect(0,0,w,h);
 for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(!T.data)continue;var d=T.data;
  g.fillStyle='rgba(46,85,119,.85)';d.w.forEach(function(poly){g.beginPath();for(var i=0;i<poly.length;i+=2){var p=P(poly[i],poly[i+1]);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);}g.fill();});
  g.fillStyle='rgba(60,95,55,.6)';d.pk.forEach(function(poly){g.beginPath();for(var i=1;i<poly.length;i+=2){var p=P(poly[i],poly[i+1]);if(i>1)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);}g.fill();});
  d.rd.forEach(function(r){var cl=r[0];if(cl>6)return;g.strokeStyle=cl<=1?'rgba(255,210,120,.9)':cl<=3?'rgba(220,230,240,.75)':'rgba(150,170,195,.5)';g.lineWidth=cl<=1?2.2:cl<=3?1.5:0.8;g.beginPath();
   for(var i=2;i<r.length;i+=2){var p=P(r[i],r[i+1]);if(i>2)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);}g.stroke();});}
 // planned route (travel) and destination pin
 var lv=L2.live,dst=TRV.on&&TRV.dest?TRV.dest:(SRCH.pinLL||null);
 if(dst){var dp=P((dst.lon-lv.lon0)*lv.mLon,(dst.lat-lv.lat0)*lv.mLat);g.setLineDash([6,5]);g.strokeStyle='#ffd24a';g.lineWidth=2;g.beginPath();g.moveTo(cx,cy);g.lineTo(dp[0],dp[1]);g.stroke();g.setLineDash([]);
  var ex=Math.max(10,Math.min(w-10,dp[0])),ey=Math.max(10,Math.min(h-10,dp[1]));g.fillStyle='#ffd24a';g.beginPath();g.arc(ex,ey,5,0,7);g.fill();}
 // track
 if(MM.trail.length>1){g.strokeStyle='rgba(127,245,220,.9)';g.lineWidth=2.2;g.beginPath();MM.trail.forEach(function(q,i){var p=P((q.lon-lv.lon0)*lv.mLon,(q.lat-lv.lat0)*lv.mLat);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.stroke();}
 // own ship + view cone
 g.fillStyle='rgba(127,245,220,.14)';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,Math.min(w,h)*.55,-Math.PI/2-0.5,-Math.PI/2+0.5);g.closePath();g.fill();
 g.fillStyle='#7ff5dc';g.strokeStyle='#06101f';g.lineWidth=1.5;g.beginPath();g.moveTo(cx,cy-11);g.lineTo(cx+7,cy+7);g.lineTo(cx,cy+3);g.lineTo(cx-7,cy+7);g.closePath();g.fill();g.stroke();
 // north arrow + scale
 var na=-hdgR;g.save();g.translate(w-18,18);g.rotate(na);g.fillStyle='#ff6b7f';g.beginPath();g.moveTo(0,-10);g.lineTo(5,3);g.lineTo(-5,3);g.closePath();g.fill();g.fillStyle='#fff';g.font='8px monospace';g.textAlign='center';g.fillText('N',0,12);g.restore();
 var nice=[50,100,200,500,1000,2000,5000],tgtm=mpp*60,len=nice[0];nice.forEach(function(v){if(v<=tgtm)len=v;});var px=len/mpp;g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.moveTo(10,h-12);g.lineTo(10+px,h-12);g.moveTo(10,h-16);g.lineTo(10,h-8);g.moveTo(10+px,h-16);g.lineTo(10+px,h-8);g.stroke();
 g.fillStyle='#fff';g.font='9px monospace';g.textAlign='left';g.fillText(len>=1000?len/1000+' km':len+' m',14+px,h-9);
 var zh=LZ(),inf=document.getElementById('mmInfo');if(inf){var ll2=localToLL(tg.x,tg.z),txt=fmtLL(ll2.lat,ll2.lon);if(TRV.on&&TRV.dest&&isFinite(TRV.x)){var rem=Math.hypot(TRV.x-tg.x,TRV.z-tg.z)/1000;txt=(I18T('cruising_to'))+(zh&&TRV.dest.zh?TRV.dest.zh:TRV.dest.name)+' · '+fmtKm(rem)+' · '+Math.round(TRV.v*3.6)+' km/h'+(TRV.v>1?' · ETA '+Math.max(1,Math.round(rem*1000/TRV.v/60))+(I18T('min')):'');}inf.textContent=txt;}}
function mmGo(q){var zh=LZ(),res=document.getElementById('mmRes');if(!q){res.innerHTML='';return;}res.innerHTML='<div class="sn">'+(I18T('searching'))+'</div>';
 srchRemote(q,/\d/.test(q)).then(function(list){if(list==null)return;list=(list||[]).slice(0,4);SRCH.mm=list;if(MM.auto&&list.length){MM.auto=0;MM.trail=[];srchGo(list[0]);res.innerHTML='';return;}MM.auto=0;
  res.innerHTML=list.length?list.map(function(r,i){return '<button data-mi="'+i+'"><b>'+esc(r.n||'')+'</b><em>'+esc(r.s||'')+'</em></button>';}).join(''):'<div class="sn">'+(I18T('no_results'))+'</div>';});}
function wireMM(){var inp=document.getElementById('mmIn');if(!inp||inp._w)return;inp._w=1;var box=document.getElementById('mmap');
 ['pointerdown','wheel','keydown'].forEach(function(t){box.addEventListener(t,function(e){e.stopPropagation();},{passive:t!=='keydown'});});var tm=0;
 inp.addEventListener('input',function(){clearTimeout(tm);SRCH.mm=[];var q=inp.value.trim();tm=setTimeout(function(){mmGo(q.length>=2?q:'');},600);});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var L=SRCH.mm||[];if(L.length){MM.trail=[];srchGo(L[0]);document.getElementById('mmRes').innerHTML='';inp.blur();}else{MM.auto=1;clearTimeout(tm);mmGo(inp.value.trim());}}else if(e.key==='Escape'){inp.value='';document.getElementById('mmRes').innerHTML='';inp.blur();}});
 document.getElementById('mmRes').addEventListener('click',function(e){var b=e.target.closest('[data-mi]');if(!b)return;var r=(SRCH.mm||[])[+b.getAttribute('data-mi')];if(r){MM.trail=[];srchGo(r);document.getElementById('mmRes').innerHTML='';}});
 box.querySelectorAll('[data-mz]').forEach(function(b){b.onclick=function(){MM.scale=Math.max(.5,Math.min(8,MM.scale*(b.getAttribute('data-mz')==='+'?.7:1.4)));};});
 var cats=document.getElementById('srchCats');if(cats)cats.addEventListener('click',function(e){var b=e.target.closest('[data-cat]');if(!b)return;e.stopPropagation();var k=b.getAttribute('data-cat');if(SRCH.cat===k){SRCH.cat=null;catChips();srchRender([]);}else catRun(k);});
 catChips();}

// ---- building detail extras: laser survey (geometry rebuilt from the footprint + height, with live ranging from
// the drone camera), nearby real-world photos (Wikimedia Commons), and the country's mobile network operators ----
var LZR={b:null,grp:null,beams:null,bg:null,cnt:0,t0:0,lab:[],corners:[],h:0,mh:0,near:null};
function lzrClear(){if(LZR.grp&&L2.group){L2.group.remove(LZR.grp);disposeTree(LZR.grp);}LZR.grp=null;LZR.b=null;var el=document.getElementById('lzrL');if(el)el.innerHTML='';LZR.lab=[];}
function lzrSet(b){lzrClear();if(!b||!L2.group)return;var h=Math.max(3,b[0]),mh=b[1]||0,P=[],i,j;for(i=2;i<b.length-1;i+=2)P.push([b[i],b[i+1]]);
 if(P.length>2&&P[0][0]===P[P.length-1][0]&&P[0][1]===P[P.length-1][1])P.pop();if(P.length<3)return;
 var g=new T3.Group(),pc=[],ln=[],n=P.length;
 // facade point cloud: one return every ~1.5 m along each wall and ~1.8 m up
 for(i=0;i<n;i++){var a=P[i],c=P[(i+1)%n],L=Math.hypot(c[0]-a[0],c[1]-a[1]),sx=Math.max(1,Math.round(L/1.5)),sy=Math.max(2,Math.round((h-mh)/1.8));
  for(var u=0;u<=sx;u++)for(var v=0;v<=sy;v++){var t=u/sx,jx=(Math.random()-.5)*.25;pc.push(a[0]+(c[0]-a[0])*t+jx,mh+(h-mh)*v/sy+(Math.random()-.5)*.2,a[1]+(c[1]-a[1])*t+jx);}
  ln.push(a[0],mh,a[1],a[0],h,a[1],a[0],h,a[1],c[0],h,c[1],a[0],mh+.2,a[1],c[0],mh+.2,c[1]);}
 // roof returns
 var bb=b._bb||[Math.min.apply(0,P.map(function(p){return p[0];})),Math.min.apply(0,P.map(function(p){return p[1];})),Math.max.apply(0,P.map(function(p){return p[0];})),Math.max.apply(0,P.map(function(p){return p[1];}))];
 var st=Math.max(2,Math.sqrt((bb[2]-bb[0])*(bb[3]-bb[1])/1500));for(var x=bb[0];x<=bb[2];x+=st)for(var z=bb[1];z<=bb[3];z+=st)if(pip(x,z,b,2))pc.push(x,h+.15,z);
 if(pc.length>3*9000)pc.length=3*9000;
 // sort bottom-up so the scan sweeps upward
 var idx=[];for(i=0;i<pc.length;i+=3)idx.push(i);idx.sort(function(p,q){return pc[p+1]-pc[q+1];});var srt=new Float32Array(pc.length);idx.forEach(function(p,k){srt[k*3]=pc[p];srt[k*3+1]=pc[p+1];srt[k*3+2]=pc[p+2];});
 var pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.BufferAttribute(srt,3));pg.setDrawRange(0,0);
 var pts=new T3.Points(pg,new T3.PointsMaterial({color:0x39ff9c,size:1.1,sizeAttenuation:true,transparent:true,opacity:.85,blending:T3.AdditiveBlending,depthWrite:false}));g.add(pts);
 var lg=new T3.BufferGeometry();lg.setAttribute('position',new T3.Float32BufferAttribute(ln,3));g.add(new T3.LineSegments(lg,new T3.LineBasicMaterial({color:0x7dffc0,transparent:true,opacity:.95,blending:T3.AdditiveBlending,depthWrite:false})));
 // scan plane ring
 var rr=[];for(i=0;i<n;i++){var a2=P[i],c2=P[(i+1)%n];rr.push(a2[0],0,a2[1],c2[0],0,c2[1]);}var rg=new T3.BufferGeometry();rg.setAttribute('position',new T3.Float32BufferAttribute(rr,3));
 var ring=new T3.LineSegments(rg,new T3.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:T3.AdditiveBlending,depthWrite:false}));g.add(ring);
 // beams from the drone to the roof corners (updated every frame)
 var nb=Math.min(n,14),bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.BufferAttribute(new Float32Array(nb*6),3));
 var beams=new T3.LineSegments(bg,new T3.LineBasicMaterial({color:0xff3d6e,transparent:true,opacity:.75,blending:T3.AdditiveBlending,depthWrite:false}));beams.frustumCulled=false;g.add(beams);
 g.children.forEach(function(o){o.visible=false;});g.traverse(function(o){o.layers.set(1);});camera.layers.enable(1);L2.group.add(g);
 var corners=P.map(function(p){return [p[0],h,p[1]];});if(corners.length>nb){var stp=corners.length/nb,cc=[];for(i=0;i<nb;i++)cc.push(corners[Math.floor(i*stp)]);corners=cc;}
 // edge labels: the longest walls
 var ed=[];for(i=0;i<n;i++){var e1=P[i],e2=P[(i+1)%n];ed.push({L:Math.hypot(e2[0]-e1[0],e2[1]-e1[1]),p:[(e1[0]+e2[0])/2,h,(e1[1]+e2[1])/2]});}ed.sort(function(p,q){return q.L-p.L;});
 var hi=0;for(i=1;i<n;i++)if(P[i][0]<P[hi][0])hi=i;
 LZR.lab=ed.slice(0,6).filter(function(e){return e.L>3;}).map(function(e){return {p:e.p,t:e.L.toFixed(2)+' m',k:'e'};});
 LZR.lab.push({p:[P[hi][0],(h+mh)/2,P[hi][1]],t:'H '+(h-mh).toFixed(1)+' m',k:'h'});LZR.lab.push({p:null,t:'',k:'r'});
 var el=document.getElementById('lzrL');if(el)el.innerHTML=LZR.lab.map(function(l,k){return '<span class="lz '+l.k+'" data-k="'+k+'">'+l.t+'</span>';}).join('');
 LZR.b=b;LZR.grp=g;LZR.pts=pts;LZR.pg=pg;LZR.cnt=srt.length/3;LZR.ring=ring;LZR.bg=bg;LZR.corners=corners;LZR.h=h;LZR.mh=mh;LZR.P=P;LZR.t0=performance.now();}
function lzrStep(now){if(!LZR.grp)return;if(mode!=='street'||LZR.grp.parent!==L2.group){lzrClear();return;}var t=(now-LZR.t0)/2600,f=Math.min(1,t);LZR.pg.setDrawRange(0,Math.floor(LZR.cnt*f));
 var yy=f<1?LZR.mh+(LZR.h-LZR.mh)*f:LZR.mh+(LZR.h-LZR.mh)*(.5+.5*Math.sin(now/900));LZR.ring.position.y=yy;LZR.ring.material.opacity=f<1?.9:.35;
 // beams from just below the camera (the drone's sensor)
 var e=camera.position,ex=e.x,ey=e.y-2,ez=e.z,arr=LZR.bg.attributes.position.array,best=1e9,bc=null;LZR.corners.forEach(function(c,i){arr[i*6]=ex;arr[i*6+1]=ey;arr[i*6+2]=ez;arr[i*6+3]=c[0];arr[i*6+4]=c[1];arr[i*6+5]=c[2];var d=Math.hypot(c[0]-ex,c[1]-ey,c[2]-ez);if(d<best){best=d;bc=c;}});
 LZR.bg.attributes.position.needsUpdate=true;LZR.beams=1;LZR.pts.material.opacity=.55+.3*Math.sin(now/240);
 var hz=bc?Math.hypot(bc[0]-ex,bc[2]-ez):0,dep=bc?Math.atan2(ey-bc[1],hz)*R2D:0;LZR.near={d:best,hz:hz,dep:dep};
 var rl=LZR.lab[LZR.lab.length-1];rl.p=bc;rl.t='⟟ '+best.toFixed(2)+' m';
 var el=document.getElementById('lzrL');if(!el)return;var W=window.innerWidth,H=window.innerHeight,v=new T3.Vector3();
 LZR.lab.forEach(function(l,k){var s=el.children[k];if(!s)return;if(!l.p){s.style.display='none';return;}v.set(l.p[0],l.p[1],l.p[2]).project(camera);if(v.z>1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1){s.style.display='none';return;}
  s.style.display='';s.style.transform='translate('+((v.x*.5+.5)*W).toFixed(0)+'px,'+((-v.y*.5+.5)*H).toFixed(0)+'px) translate(-50%,-120%)';if(l.k==='r')s.textContent=l.t;});
 if(now-(LZR.pt||0)>250){LZR.pt=now;var lv=document.getElementById('lzrLive');if(lv){var zh=LZ();lv.innerHTML=(I18T('uav_nearest_roof_corner'))+'<b>'+best.toFixed(2)+' m</b> · '+(I18T('horiz'))+hz.toFixed(2)+' m · '+(I18T('depression'))+dep.toFixed(1)+'°';}}}
function lzrPanel(b){var h=Math.max(3,b[0]),mh=b[1]||0,P=[],i,zh=LZ();for(i=2;i<b.length-1;i+=2)P.push([b[i],b[i+1]]);if(P.length>2&&P[0][0]===P[P.length-1][0]&&P[0][1]===P[P.length-1][1])P.pop();
 var n=P.length,ed=[],dia=0;for(i=0;i<n;i++){var a=P[i],c=P[(i+1)%n];ed.push(Math.hypot(c[0]-a[0],c[1]-a[1]));for(var j=i+1;j<n;j++)dia=Math.max(dia,Math.hypot(P[j][0]-a[0],P[j][1]-a[1]));}
 var top=ed.map(function(L,k){return [L,k];}).sort(function(p,q){return q[0]-p[0];}).slice(0,6),sd=Math.hypot(dia,h-mh);
 return '<h3>'+(I18T('laser_survey_geometry'))+'</h3><div class="blk lzrb"><div id="lzrLive" class="lzrlive">…</div>'
  +'<dl class="kv"><dt>'+(I18T('walls'))+'</dt><dd>'+n+'</dd><dt>'+(I18T('longest_walls'))+'</dt><dd>'+top.map(function(e){return e[0].toFixed(2)+' m';}).join(' · ')+'</dd>'
  +'<dt>'+(I18T('height_base_roof'))+'</dt><dd>'+(h-mh).toFixed(2)+' m</dd><dt>'+(I18T('plan_diagonal'))+'</dt><dd>'+dia.toFixed(2)+' m</dd><dt>'+(I18T('space_diagonal'))+'</dt><dd>'+sd.toFixed(2)+' m</dd></dl>'
  +'<p class="lzrnote">'+(I18T('values_are_computed_from'))+'</p></div>';}
// Wikimedia Commons: geotagged photos around the building, plus interior shots when the place has a name
function bxPhotos(ll,name){var el=document.getElementById('bxPhotos');if(!el)return;var zh=LZ(),my=(bxPhotos.seq=(bxPhotos.seq||0)+1);
 el.innerHTML='<h3>'+(I18T('real_world_photos_within'))+'</h3><div class="ph-grid"><span class="ph-note">'+(I18T('loading_wikimedia_commons'))+'</span></div>';
 var base='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo|coordinates&iiprop=url|extmetadata&iiurlwidth=360&iiextmetadatafilter=Artist|LicenseShortName|ImageDescription';
 var q1=fetch(base+'&generator=geosearch&ggscoord='+ll.lat.toFixed(6)+'|'+ll.lon.toFixed(6)+'&ggsradius=300&ggslimit=18&ggsnamespace=6').then(function(r){return r.json();}).catch(function(){return {};});
 var q2=name?fetch(base+'&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch='+encodeURIComponent('"'+name+'" interior filetype:bitmap')).then(function(r){return r.json();}).catch(function(){return {};}):Promise.resolve({});
 Promise.all([q1,q2]).then(function(rs){if(my!==bxPhotos.seq||!document.getElementById('bxPhotos'))return;var seen={},list=[];
  rs.forEach(function(j,qi){var pg=j&&j.query&&j.query.pages;if(!pg)return;Object.keys(pg).forEach(function(k){var p=pg[k],ii=p.imageinfo&&p.imageinfo[0];if(!ii||!ii.thumburl||seen[p.title]||!/\.(jpe?g|png|webp)$/i.test(p.title))return;seen[p.title]=1;
   var co=p.coordinates&&p.coordinates[0],d=co?hav(ll.lat,ll.lon,co.lat,co.lon)*1000:null,md=ii.extmetadata||{},strip=function(s){return (s||'').replace(/<[^>]*>/g,'').trim();};
   list.push({u:ii.thumburl,h:ii.descriptionurl,d:d,int:qi===1||/interior|inside|lobby|hall|室内|内部/i.test(p.title),a:strip(md.Artist&&md.Artist.value).slice(0,40),l:strip(md.LicenseShortName&&md.LicenseShortName.value),t:p.title.replace(/^File:/,'').replace(/\.[a-z]+$/i,'')});});});
  list.sort(function(a,b){return (b.int-a.int)||((a.d==null?1e9:a.d)-(b.d==null?1e9:b.d));});list=list.slice(0,12);
  var g=el.querySelector('.ph-grid');if(!list.length){g.innerHTML='<span class="ph-note">'+(I18T('no_geotagged_public_photos'))+'</span>';return;}
  g.innerHTML=list.map(function(p){return '<a class="ph" href="'+esc(p.h)+'" target="_blank" rel="noopener" title="'+esc(p.t+' — '+p.a+' · '+p.l)+'"><img loading="lazy" src="'+esc(p.u)+'" alt="'+esc(p.t)+'"><em>'+(p.int?(I18T('interior')):'')+(p.d!=null?Math.round(p.d)+' m':'')+'</em></a>';}).join('');
  el.insertAdjacentHTML('beforeend','<p class="ph-note">'+(I18T('photos_uploaded_by_visitors'))+'</p>');});}
// mobile network operators by country (public licence holders; coverage varies street by street)
var MNO={US:[['AT&T','310 410'],['Verizon','311 480'],['T-Mobile','310 260']],CA:[['Rogers','302 720'],['Bell','302 610'],['Telus','302 220'],['Freedom','302 490']],MX:[['Telcel','334 020'],['AT&T México','334 050'],['Movistar','334 030']],
 BR:[['Vivo','724 06'],['Claro','724 05'],['TIM','724 04']],AR:[['Personal','722 34'],['Claro','722 310'],['Movistar','722 07']],CL:[['Entel','730 01'],['Movistar','730 02'],['Claro','730 03'],['WOM','730 09']],CO:[['Claro','732 101'],['Movistar','732 123'],['Tigo','732 103'],['WOM','732 360']],PE:[['Claro','716 10'],['Movistar','716 06'],['Entel','716 17'],['Bitel','716 15']],
 GB:[['EE','234 30'],['VodafoneThree','234 15 / 234 20'],['O2','234 10']],IE:[['Vodafone','272 01'],['Three','272 05'],['Eir','272 03']],FR:[['Orange','208 01'],['SFR','208 10'],['Bouygues Telecom','208 20'],['Free','208 15']],DE:[['Telekom','262 01'],['Vodafone','262 02'],['O2 Telefónica','262 03'],['1&1','262 23']],
 ES:[['Movistar','214 07'],['MasOrange','214 03 / 214 04'],['Vodafone','214 01'],['Digi','214 22']],IT:[['TIM','222 01'],['Vodafone','222 10'],['WindTre','222 88'],['Iliad','222 50']],PT:[['MEO','268 06'],['Vodafone','268 01'],['NOS','268 03'],['Digi','268 08']],NL:[['KPN','204 08'],['Vodafone','204 04'],['Odido','204 16']],
 BE:[['Proximus','206 01'],['Orange','206 10'],['BASE','206 20'],['Digi','206 30']],CH:[['Swisscom','228 01'],['Sunrise','228 02'],['Salt','228 03']],AT:[['A1','232 01'],['Magenta','232 03'],['Drei','232 05']],SE:[['Telia','240 01'],['Tele2','240 07'],['Telenor','240 08'],['Tre','240 02']],
 NO:[['Telenor','242 01'],['Telia','242 02'],['Ice','242 14']],DK:[['TDC / YouSee','238 01'],['Telenor','238 02'],['Telia','238 20'],['3','238 06']],FI:[['Elisa','244 05'],['Telia','244 91'],['DNA','244 12']],PL:[['Orange','260 03'],['Play','260 06'],['Plus','260 01'],['T-Mobile','260 02']],
 CZ:[['O2','230 02'],['T-Mobile','230 01'],['Vodafone','230 03']],GR:[['Cosmote','202 01'],['Vodafone','202 05'],['Nova','202 09']],TR:[['Turkcell','286 01'],['Vodafone','286 02'],['Türk Telekom','286 03']],UA:[['Kyivstar','255 03'],['Vodafone','255 01'],['lifecell','255 06']],RU:[['MTS','250 01'],['MegaFon','250 02'],['Beeline','250 99'],['T2','250 20']],
 CN:[['中国移动 China Mobile','460 00'],['中国联通 China Unicom','460 01'],['中国电信 China Telecom','460 11'],['中国广电 China Broadnet','460 15']],HK:[['csl / 1O1O','454 00'],['SmarTone','454 06'],['3HK','454 03'],['中国移动香港','454 12']],TW:[['中华电信','466 92'],['台湾大哥大','466 97'],['远传电信','466 01']],
 JP:[['NTT docomo','440 10'],['au (KDDI)','440 50'],['SoftBank','440 20'],['Rakuten Mobile','440 11']],KR:[['SK Telecom','450 05'],['KT','450 08'],['LG U+','450 06']],SG:[['Singtel','525 01'],['StarHub','525 05'],['M1','525 03'],['Simba','525 10']],MY:[['CelcomDigi','502 13'],['Maxis','502 12'],['U Mobile','502 18']],
 TH:[['AIS','520 03'],['True','520 04'],['NT','520 47']],VN:[['Viettel','452 04'],['VinaPhone','452 02'],['MobiFone','452 01']],ID:[['Telkomsel','510 10'],['Indosat Ooredoo Hutchison','510 01'],['XLSmart','510 11']],PH:[['Smart','515 03'],['Globe','515 02'],['DITO','515 66']],
 IN:[['Jio','405 857'],['Airtel','404 10'],['Vi','404 20'],['BSNL','404 34']],PK:[['Jazz','410 01'],['Zong','410 04'],['Telenor','410 06'],['Ufone','410 03']],BD:[['Grameenphone','470 01'],['Robi','470 02'],['Banglalink','470 03'],['Teletalk','470 04']],
 AU:[['Telstra','505 01'],['Optus','505 02'],['TPG Telecom (Vodafone)','505 03']],NZ:[['One NZ','530 01'],['Spark','530 05'],['2degrees','530 24']],AE:[['e& (Etisalat)','424 02'],['du','424 03']],SA:[['stc','420 01'],['Mobily','420 03'],['Zain','420 04']],IL:[['Cellcom','425 02'],['Partner','425 01'],['Pelephone','425 03'],['HOT Mobile','425 07']],
 EG:[['Vodafone','602 02'],['Orange','602 01'],['e& (Etisalat)','602 03'],['WE','602 04']],ZA:[['Vodacom','655 01'],['MTN','655 10'],['Cell C','655 07'],['Telkom','655 02']],NG:[['MTN','621 30'],['Airtel','621 20'],['Glo','621 50'],['9mobile','621 60']],KE:[['Safaricom','639 02'],['Airtel','639 03']],
 HU:[['Magyar Telekom','216 30'],['Yettel','216 01'],['One','216 70']],RO:[['Orange','226 10'],['Vodafone','226 01'],['Digi','226 05']]};
function bxNet(iso,ll){var el=document.getElementById('bxNet');if(!el)return;var zh=LZ(),L=MNO[iso],cn=(L2.city&&(I18P(L2.city.czh,L2.city.country)))||iso||'—';
 el.innerHTML='<h3>'+(I18T('mobile_networks'))+'</h3><div class="blk">'+(L?'<div class="mno">'+L.map(function(o){return '<span><b>'+esc(o[0])+'</b><em>MCC/MNC '+esc(o[1])+'</em></span>';}).join('')+'</div>':'<p>'+(I18T('operators_for_this_country'))+'</p>')
  +'<p class="lzrnote">'+(I18P('这是 '+esc(cn)+' 持有全国移动牌照的运营商，这栋楼的实际信号和制式（4G/5G）以各家覆盖图为准：','National mobile licence holders in '+esc(cn)+'; actual signal and 4G/5G at this building depend on each operator’s coverage map: '))
  +'<a href="https://www.nperf.com/'+((LZ()?'zh':'en'))+'/map/'+esc(iso||'')+'/-/-/signal/?ll='+ll.lat.toFixed(5)+'&lg='+ll.lon.toFixed(5)+'&zoom=15" target="_blank" rel="noopener">nPerf ↗</a>'+(iso==='US'?' · <a href="https://broadbandmap.fcc.gov/home" target="_blank" rel="noopener">FCC Broadband Map ↗</a>':'')+'</p></div>';}
function bxFill(b){var bf=buildingFacts(b),el=document.getElementById('bxLaser');if(el)el.innerHTML=lzrPanel(b);var nm=bf.places&&bf.places[0]?bf.places[0].n:'';bxPhotos.named=!!nm;bxPhotos(bf.ll,nm);bxNet(L2.city&&L2.city.iso,bf.ll);}

// ---- drone spatial mapping (drone mode only): everything the drone flies past is scanned into an abstract data
// layer — terrain particles coloured by land type and real elevation, buildings as glass shells plus data
// particles whose colour depth encodes height / spacing / range / planning type, wall-to-wall spacing lines,
// flowing road streams and range rings around the drone. Layer order: terrain → roads → shells → particles →
// spacing → labels, so nothing fights for depth. ----
var SMAP={RC:120,RCS:300,on:false,mode:'h',L:{tall:true,holo:true,part:true,terr:true,flow:true,dist:true,real:true},R:220,scan:null,list:[],pend:[],grp:null,gen:-1,grid:null,gridOf:null,
 cells:{},cellN:0,tcell:{},elev:null,elevC:null,elevBusy:0,at:0,bt:0,lt:0,last:null,mats:null,pairs:[],sum:{foot:0,gfa:0,h:0},panelBuilt:0};
var SMAP_MODES=[['h','楼高','Height'],['g','楼间距','Spacing'],['d','距无人机','Range'],['k','规划类型','Planning'],['c','净空','Clearance']];
var SMAP_LAYERS=[['tall','高度标注','Height tags'],['holo','全息外壳','Glass shells'],['part','数据粒子','Data particles'],['terr','地形','Terrain'],['flow','道路流线','Road streams'],['dist','楼间距','Spacing lines'],['real','实体建筑','Solid buildings']];
function smapReach(tg){var cp=camera.position,best=0,v=new T3.Vector3(),W=window.innerWidth,xl=DL.on?-1:-1,xr=DL.on?(DL.VR/W)*2-1:1;
 [[xl,1],[xr,1],[xl,-1],[xr,-1],[0,1]].forEach(function(c){v.set(c[0],c[1],.5).unproject(camera).sub(cp).normalize();var d=v.y<-.02?Math.min(4000,Math.hypot(cp.x+v.x*(-cp.y/v.y)-tg.x,cp.z+v.z*(-cp.y/v.y)-tg.z)):cp.y*4;if(d>best)best=d;});
 return Math.max(260,Math.min(smapSky()?6000:2200,best));}
function smapSky(){return typeof SKYV!=='undefined'&&SKYV.on;}
function smapRc(){return smapSky()?SMAP.RCS:SMAP.RC;}
function smapActive(){return SMAP.on&&mode==='street'&&L2.active&&!!L2.live&&(smapSky()||(L2.drone&&L2.drone.on));}
var SMAP_RAMP='uniform float uAlt;vec3 clr(float dz){return dz<0.?vec3(1.,.16,.22):dz<30.?mix(vec3(1.,.52,.12),vec3(1.,.86,.2),dz/30.):dz<60.?mix(vec3(1.,.86,.2),vec3(.22,1.,.58),(dz-30.)/30.):vec3(.22,1.,.58);}vec3 ramp(float t){t=clamp(t,0.,1.);vec3 a=vec3(.12,.14,.55),b=vec3(.10,.82,1.),c=vec3(.92,.32,.95),d=vec3(1.,.80,.32);return t<.34?mix(a,b,t/.34):t<.67?mix(b,c,(t-.34)/.33):mix(c,d,(t-.67)/.33);}';
function smapMats(){if(SMAP.mats)return SMAP.mats;var U0={uAlt:{value:0},uT:{value:0},uD:{value:new T3.Vector3()},uMode:{value:0},uPulse:{value:0},uR:{value:SMAP.R},uRc:{value:120},uFade:{value:1},uPx:{value:1}};
 var part=new T3.ShaderMaterial({uniforms:U0,transparent:true,depthWrite:false,blending:T3.AdditiveBlending,
  vertexShader:'attribute vec3 aC;attribute vec4 aV;uniform float uT,uMode,uPulse,uR,uRc,uPx,uFade;uniform vec3 uD;varying vec3 vC;varying float vA;'+SMAP_RAMP+'float vis(float dd){float core=1.-smoothstep(uRc*.92,uRc*1.08,dd);float w=uPulse-dd;float rev=(w<0.||dd>uR*1.03)?0.:smoothstep(0.,uR*.12+40.,w)*mix(.18,1.,exp(-w/(uR*.55)))*(1.-smoothstep(uR*.95,uR*1.03,dd))*uFade;return max(core,rev);}'+
   'void main(){vec3 p=position;float dd=distance(p.xz,uD.xz),f=aV.z,r=aV.w,v,vs=vis(dd);if(vs<.01){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;vC=vec3(0.);vA=0.;return;}'+
   'if(f<.5){v=uMode<.5?aV.x:uMode<1.5?aV.y:uMode<2.5?clamp(1.-dd/(uR*1.6),0.,1.):.6;vC=uMode>3.5?clr(uAlt-p.y):uMode<2.5?ramp(v):aC;'+
   'p+=vec3(sin(uT*.7+r*40.+p.y*.06),sin(uT*.5+r*23.)*.5,cos(uT*.6+r*31.+p.x*.04))*.28;}'+
   'else if(f<1.5){v=aV.x;vC=aC;}else{v=.5+.5*sin(aV.y*.22-uT*3.+r*2.);vC=aC;}'+
   'float pl=.35*exp(-pow((dd-uPulse)/(18.+uR*.03),2.))*step(uRc,dd)*step(dd,uR*1.03);vC=vC*(.45+.55*v)+pl*vec3(.5,.9,1.);vA=((f<1.5?.32+.55*v:.15+.75*v*v)+pl*.5)*vs;'+
   'vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((f<.5?2.0:f<1.5?3.4:3.0)*(.7+.6*v+r*.5)*uPx*420./-mv.z,1.4,18.);}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vC,vA*(1.-r*1.8));}'});
 var holo=new T3.ShaderMaterial({uniforms:U0,transparent:true,depthWrite:false,blending:T3.AdditiveBlending,side:T3.DoubleSide,
  vertexShader:'attribute vec3 aC;attribute vec2 aV;uniform float uMode,uR;uniform vec3 uD;varying vec3 vN,vVw,vC;varying float vY,vV,vDd;'+SMAP_RAMP+
   'void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vVw=normalize(-mv.xyz);vY=position.y;float dd=distance(position.xz,uD.xz);vDd=dd;'+
   'vV=uMode<.5?aV.x:uMode<1.5?aV.y:uMode<2.5?clamp(1.-dd/(uR*1.6),0.,1.):.6;vC=uMode>3.5?clr(uAlt-position.y):uMode<2.5?ramp(vV):aC;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float uT,uPulse,uR,uRc;varying vec3 vN,vVw,vC;varying float vY,vV,vDd;float vis(float dd){return 1.-smoothstep(uRc*.92,uRc*1.08,dd);}void main(){float vs=vis(vDd);if(vs<.01)discard;float fr=pow(1.-abs(dot(vN,vVw)),2.2);float sl=smoothstep(.86,1.,fract(vY*.33-uT*.55));'+
   'float fl=.92+.08*sin(uT*37.+vY);gl_FragColor=vec4(vC*(.6+.6*vV),(.035+fr*.42+sl*.16)*fl*vs);}'});
 var line=new T3.ShaderMaterial({uniforms:U0,transparent:true,depthWrite:false,blending:T3.AdditiveBlending,
  vertexShader:'attribute vec3 aC;uniform vec3 uD;varying vec3 vC;varying float vDd;void main(){vC=aC;vDd=distance(position.xz,uD.xz);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uPulse,uR,uRc;varying vec3 vC;varying float vDd;float vis(float dd){return 1.-smoothstep(uRc*.92,uRc*1.08,dd);}void main(){float vs=vis(vDd);if(vs<.01)discard;gl_FragColor=vec4(vC,.85*vs);}'});
 var ring=new T3.ShaderMaterial({uniforms:{uO:{value:1}},transparent:true,depthWrite:false,blending:T3.AdditiveBlending,
  vertexShader:'attribute vec3 aC;varying vec3 vC;void main(){vC=aC;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uO;varying vec3 vC;void main(){gl_FragColor=vec4(vC,uO);}'});
 var ring2=ring.clone();ring2.uniforms={uO:{value:1}};
 SMAP.mats={part:part,holo:holo,line:line,ring:ring,pulse:ring2,U:U0};return SMAP.mats;}
function smapReset(){if(SMAP.grp&&SMAP.grp.parent)SMAP.grp.parent.remove(SMAP.grp);if(SMAP.grp)SMAP.grp.traverse(function(o){if(o.geometry)o.geometry.dispose();});
 SMAP.grp=null;SMAP.scan=new Set();SMAP.list=[];SMAP.pend=[];SMAP.cells={};SMAP.cellN=0;SMAP.tcell={};SMAP.pairs=[];SMAP.sum={foot:0,gfa:0,h:0};SMAP.last=null;SMAP.elev=null;SMAP.elevC=null;
 var el=document.getElementById('smapL');if(el)el.innerHTML='';}
function smapGroup(){if(!SMAP.grp||SMAP.grp.parent!==L2.group||SMAP.gen!==L2.live.gen){smapReset();SMAP.gen=L2.live.gen;var g=new T3.Group();
  ['terr','flow','holo','part','dist'].forEach(function(k,i){var s=new T3.Group();s.name=k;s.renderOrder=10+i;g.add(s);});
  var rg=new T3.Group();rg.name='rings';g.add(rg);var M=smapMats();
  ['core','outer'].forEach(function(nm){var p=[],c=[];for(var i=0;i<160;i++){var a1=i/160*Math.PI*2,a2=(i+1)/160*Math.PI*2;if(nm==='core'||i%3!==2){p.push(Math.cos(a1),1.2,Math.sin(a1),Math.cos(a2),1.2,Math.sin(a2));var k=nm==='core'?.6:.32;c.push(.35*k,.9*k,1*k,.35*k,.9*k,1*k);}}
   var gg=new T3.BufferGeometry();gg.setAttribute('position',new T3.Float32BufferAttribute(p,3));gg.setAttribute('aC',new T3.Float32BufferAttribute(c,3));var ln=new T3.LineSegments(gg,M.ring);ln.name=nm;rg.add(ln);});
  var pr=[],pc=[];for(var i=0;i<128;i++){var a1=i/128*Math.PI*2,a2=(i+1)/128*Math.PI*2;pr.push(Math.cos(a1),1.5,Math.sin(a1),Math.cos(a2),1.5,Math.sin(a2));pc.push(.7,1,1,.7,1,1);}
  var pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.Float32BufferAttribute(pr,3));pg.setAttribute('aC',new T3.Float32BufferAttribute(pc,3));var pulse=new T3.LineSegments(pg,M.pulse);pulse.name='pulse';rg.add(pulse);
  L2.group.add(g);SMAP.grp=g;}return SMAP.grp;}
function smapSub(k){return SMAP.grp.getObjectByName(k);}
// spatial grid over all loaded buildings (for neighbour / spacing queries)
function smapGridGet(){if(SMAP.gridOf===L2.picks&&SMAP.grid)return SMAP.grid;var G={};(L2.picks||[]).forEach(function(pl){var bb=pl._bb||smapBB(pl);pl._bb=bb;var cx=Math.floor((bb[0]+bb[2])/120),cz=Math.floor((bb[1]+bb[3])/120),k=cx+','+cz;(G[k]||(G[k]=[])).push(pl);});SMAP.grid=G;SMAP.gridOf=L2.picks;return G;}
function smapBB(pl){var a0=1e9,b0=1e9,a1=-1e9,b1=-1e9;for(var m=2;m<pl.length-1;m+=2){a0=Math.min(a0,pl[m]);b0=Math.min(b0,pl[m+1]);a1=Math.max(a1,pl[m]);b1=Math.max(b1,pl[m+1]);}return [a0,b0,a1,b1];}
function smapNear(x,z,r){var G=smapGridGet(),out=[],c0=Math.floor((x-r)/60),c1=Math.floor((x+r)/60),d0=Math.floor((z-r)/60),d1=Math.floor((z+r)/60);for(var i=c0;i<=c1;i++)for(var j=d0;j<=d1;j++){var L=G[i+','+j];if(L)for(var k=0;k<L.length;k++)out.push(L[k]);}return out;}
function segPt(px,pz,ax,az,bx,bz){var dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l)):0,qx=ax+dx*t,qz=az+dz*t;return [Math.hypot(px-qx,pz-qz),qx,qz];}
function polyGap(a,b){var best=[1e9,0,0,0,0],i,j,na=a.length-1,nb=b.length-1;
 if(pip(b[2],b[3],a,2)||pip(a[2],a[3],b,2))return [0,a[2],a[3],a[2],a[3]];
 for(i=2;i<na;i+=2)for(j=2;j<nb;j+=2){var j2=j+2<nb?j+2:2,r=segPt(a[i],a[i+1],b[j],b[j+1],b[j2],b[j2+1]);if(r[0]<best[0])best=[r[0],a[i],a[i+1],r[1],r[2]];}
 for(j=2;j<nb;j+=2)for(i=2;i<na;i+=2){var i2=i+2<na?i+2:2,r2=segPt(b[j],b[j+1],a[i],a[i+1],a[i2],a[i2+1]);if(r2[0]<best[0])best=[r2[0],r2[1],r2[2],b[j],b[j+1]];}return best;}
function smapCatColor(pl){var M=TAX[txOf(pl).m];var c=new T3.Color(M?M.col:'#7ff5dc');return [c.r,c.g,c.b];}
// scan: register buildings + terrain cells inside the drone swath
function smapScan(){var tg=L2.target,R=Math.min(SMAP.R,smapSky()?2500:1500),tn=0;if(SMAP.last&&Math.hypot(tg.x-SMAP.last.x,tg.z-SMAP.last.z)<12&&R<=(SMAP.lastR||0)*1.08)return;SMAP.last={x:tg.x,z:tg.z};SMAP.lastR=R;
 var c0=Math.floor((tg.x-R)/40),c1=Math.floor((tg.x+R)/40),d0=Math.floor((tg.z-R)/40),d1=Math.floor((tg.z+R)/40);for(var i=c0;i<=c1;i++)for(var j=d0;j<=d1;j++){if(Math.hypot(i*40+20-tg.x,j*40+20-tg.z)>R)continue;var k=i+','+j;if(!SMAP.cells[k]){SMAP.cells[k]=1;SMAP.cellN++;}}
 smapNear(tg.x,tg.z,R).forEach(function(pl){if(SMAP.scan.has(pl)||SMAP.list.length+SMAP.pend.length>2600)return;var bb=pl._bb;if(Math.hypot((bb[0]+bb[2])/2-tg.x,(bb[1]+bb[3])/2-tg.z)>R)return;SMAP.scan.add(pl);SMAP.pend.push(pl);});
 var tc0=Math.floor((tg.x-R)/120),tc1=Math.floor((tg.x+R)/120),td0=Math.floor((tg.z-R)/120),td1=Math.floor((tg.z+R)/120);var cl=[];for(i=tc0;i<=tc1;i++)for(j=td0;j<=td1;j++){var kk=i+','+j,dc=Math.hypot(i*120+60-tg.x,j*120+60-tg.z);if(SMAP.tcell[kk]||dc>R+60)continue;cl.push([dc,i,j,kk]);}
 cl.sort(function(a,b){return a[0]-b[0];}).slice(0,14).forEach(function(c){SMAP.tcell[c[3]]=1;smapTerrain(c[1],c[2],c[0]>1000);});if(cl.length>14)SMAP.last=null;
 if(!SMAP.elevBusy&&(!SMAP.elevC||Math.hypot(tg.x-SMAP.elevC.x,tg.z-SMAP.elevC.z)>R*.8))smapElev(tg.x,tg.z);}
// real elevation grid (Open-Meteo, 10×10 samples over ~600 m); terrain colours/heights follow it
function smapElev(x,z){SMAP.elevBusy=1;var lv=L2.live,S=Math.max(640,Math.round(SMAP.R*2.6)),N=10,la=[],lo=[],i,j;for(j=0;j<N;j++)for(i=0;i<N;i++){var ll=localToLL(x-S/2+i*S/(N-1),z-S/2+j*S/(N-1));la.push(ll.lat.toFixed(5));lo.push(ll.lon.toFixed(5));}
 fetch('https://api.open-meteo.com/v1/elevation?latitude='+la.join(',')+'&longitude='+lo.join(',')).then(function(r){return r.json();}).then(function(j){if(!j||!j.elevation)return;var E=j.elevation,mn=Math.min.apply(0,E),mx=Math.max.apply(0,E);
  var prev=SMAP.elev;SMAP.elev={x0:x-S/2,z0:z-S/2,S:S,N:N,E:E,mn:prev?Math.min(prev.mn,mn):mn,mx:prev?Math.max(prev.mx,mx):mx,base:prev?prev.base:(mn+mx)/2};SMAP.elevC={x:x,z:z};
  var t=smapSub('terr');if(t){while(t.children.length){var o=t.children.pop();o.geometry.dispose();}}SMAP.tcell={};SMAP.last=null;})
 .catch(function(){SMAP.elevC={x:x,z:z};}).then(function(){SMAP.elevBusy=0;});}
function smapElevAt(x,z){var E=SMAP.elev;if(!E)return null;var fx=(x-E.x0)/E.S*(E.N-1),fz=(z-E.z0)/E.S*(E.N-1);if(fx<0||fz<0||fx>E.N-1||fz>E.N-1)return null;var i=Math.min(E.N-2,Math.floor(fx)),j=Math.min(E.N-2,Math.floor(fz)),u=fx-i,v=fz-j,A=E.E;
 return A[j*E.N+i]*(1-u)*(1-v)+A[j*E.N+i+1]*u*(1-v)+A[(j+1)*E.N+i]*(1-u)*v+A[(j+1)*E.N+i+1]*u*v;}
function smapTerrain(ci,cj,far){var x0=ci*120,z0=cj*120,P=[],C=[],V=[],W=[],PK=[],RD=[],k,T;for(k in L2.live.tiles){T=L2.live.tiles[k];if(!T.data)continue;var d=T.data;
  d.w.forEach(function(p){W.push(p);});d.pk.forEach(function(p){PK.push(p);});d.rd.forEach(function(r){RD.push(r);});}
 function inPoly(x,z,poly,o){var mnx=1e9,mxx=-1e9;return pip(x,z,poly,o);}
 var E=SMAP.elev,ns=far?12:24,sp=120/ns,col=new T3.Color(),i,j;
 for(i=0;i<ns;i++)for(j=0;j<ns;j++){var x=x0+i*sp+Math.random()*sp,z=z0+j*sp+Math.random()*sp,ty=0,q;
  for(q=0;q<W.length&&!ty;q++)if(inPoly(x,z,W[q],0))ty=1;for(q=0;q<PK.length&&!ty;q++)if(inPoly(x,z,PK[q],1))ty=2;
  var e=smapElevAt(x,z),rel=e!=null&&E?(e-E.base):0,t=E&&E.mx>E.mn?(e!=null?(e-E.mn)/(E.mx-E.mn):.5):.5;
  if(ty===1)col.setRGB(.15,.45,1);else if(ty===2)col.setRGB(.25,.95,.45);else{col.setRGB(.08+.9*t,.55+.25*(1-t),.75*(1-t)+.15);}
  P.push(x,.6+Math.max(-14,Math.min(14,rel*1.5)),z);C.push(col.r,col.g,col.b);V.push(ty?.55:.25+.5*t,0,1,Math.random());}
 var M=smapMats(),g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(P,3));g.setAttribute('aC',new T3.Float32BufferAttribute(C,3));g.setAttribute('aV',new T3.Float32BufferAttribute(V,4));
 var pts=new T3.Points(g,M.part);pts.frustumCulled=false;smapSub('terr').add(pts);
 // road streams inside this cell: particles every 3 m, brightness travels along the road
 var rp=[],rc=[],rv=[];RD.forEach(function(r){var cl=r[0];if(cl>6)return;var acc=0;for(var m=2;m+3<r.length;m+=2){var ax=r[m],az=r[m+1],bx=r[m+2],bz=r[m+3],L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/3));
  for(var s=0;s<n;s++){var t=s/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(x<x0||x>=x0+120||z<z0||z>=z0+120){continue;}rp.push(x,1,z);
   if(cl<=1)rc.push(1,.75,.3);else if(cl<=3)rc.push(.9,.95,1);else rc.push(.45,.7,1);rv.push(0,acc+L*t,2,Math.random());}acc+=L;}});
 if(rp.length){var rg=new T3.BufferGeometry();rg.setAttribute('position',new T3.Float32BufferAttribute(rp,3));rg.setAttribute('aC',new T3.Float32BufferAttribute(rc,3));rg.setAttribute('aV',new T3.Float32BufferAttribute(rv,4));var rpts=new T3.Points(rg,M.part);rpts.frustumCulled=false;smapSub('flow').add(rpts);}}
// build a batch of scanned buildings: glass shells, data particles, spacing lines
function smapBuild(){if(!SMAP.pend.length)return;var batch=SMAP.pend.splice(0,40),M=smapMats(),HP=[],HN=[],HC=[],HV=[],PP=[],PC=[],PV=[],LP=[],LC=[];
 batch.forEach(function(pl){var h=Math.max(3,pl[0]),mh=pl[1]||0,bb=pl._bb,cx=(bb[0]+bb[2])/2,cz=(bb[1]+bb[3])/2,best=[1e9],nb=null;
  smapNear(cx,cz,90).forEach(function(o){if(o===pl)return;var ob=o._bb;if(ob[0]>bb[2]+60||ob[2]<bb[0]-60||ob[1]>bb[3]+60||ob[3]<bb[1]-60)return;var g=polyGap(pl,o);if(g[0]<best[0]){best=g;nb=o;}});
  var gap=nb?best[0]:60,vh=Math.min(1,Math.log(1+h)/Math.log(160)),vg=Math.max(0,1-gap/30),cc=smapCatColor(pl);
  var P=[];for(var i=2;i<pl.length-1;i+=2)P.push([pl[i],pl[i+1]]);if(P.length>2&&P[0][0]===P[P.length-1][0]&&P[0][1]===P[P.length-1][1])P.pop();var n=P.length;if(n<3)return;
  var foot=Math.abs(polyArea(pl.slice(2,pl.length-1),0));SMAP.sum.foot+=foot;SMAP.sum.gfa+=foot*Math.max(1,Math.round((h-mh)/3.4));SMAP.sum.h+=h-mh;
  for(i=0;i<n;i++){var a=P[i],b=P[(i+1)%n],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1,nx=ez/L,nz=-ex/L;
   [[a[0],mh,a[1]],[b[0],mh,b[1]],[b[0],h,b[1]],[a[0],mh,a[1]],[b[0],h,b[1]],[a[0],h,a[1]]].forEach(function(v){HP.push(v[0],v[1],v[2]);HN.push(nx,0,nz);HC.push(cc[0],cc[1],cc[2]);HV.push(vh,vg);});
   var sx=Math.max(1,Math.round(L/2.4)),sy=Math.max(2,Math.round((h-mh)/2.6));var skip=SMAP.list.length>900?.75:SMAP.list.length>450?.55:.35;for(var u=0;u<=sx;u+=1)for(var v=0;v<=sy;v++){if(Math.random()<skip)continue;var t=u/sx;PP.push(a[0]+ex*t,mh+(h-mh)*v/sy,a[1]+ez*t);PC.push(cc[0],cc[1],cc[2]);PV.push(vh,vg,0,Math.random());}
   LP.push(a[0],h,a[1],b[0],h,b[1],a[0],mh,a[1],a[0],h,a[1]);for(var q=0;q<4;q++)LC.push(.45+.5*vh,.85,1);}
  var st=Math.max(3,Math.sqrt(foot/80));for(var x=bb[0];x<=bb[2];x+=st)for(var z=bb[1];z<=bb[3];z+=st)if(pip(x,z,pl,2)){PP.push(x,h+.3,z);PC.push(cc[0],cc[1],cc[2]);PV.push(vh,vg,0,Math.random());}
  if(nb&&best[0]<40){var gy=Math.min(h,Math.max(3,nb[0]))*.5;LP.push(best[1],gy,best[2],best[3],gy,best[4]);var gc=best[0]<6?[1,.3,.4]:best[0]<15?[1,.75,.3]:[.4,1,.7];LC.push(gc[0],gc[1],gc[2],gc[0],gc[1],gc[2]);
   SMAP.pairs.push({g:best[0],a:[best[1],gy,best[2]],b:[best[3],gy,best[4]],m:[(best[1]+best[3])/2,gy,(best[2]+best[4])/2]});}
  SMAP.list.push({pl:pl,h:h-mh,gap:gap,foot:foot,cat:pl[pl.length-1],cx:cx,cz:cz});});
 function geo(at){var g=new T3.BufferGeometry();for(var k in at)g.setAttribute(k,new T3.Float32BufferAttribute(at[k][0],at[k][1]));return g;}
 if(HP.length){var hm=new T3.Mesh(geo({position:[HP,3],normal:[HN,3],aC:[HC,3],aV:[HV,2]}),M.holo);hm.frustumCulled=false;smapSub('holo').add(hm);}
 if(PP.length){var pm=new T3.Points(geo({position:[PP,3],aC:[PC,3],aV:[PV,4]}),M.part);pm.frustumCulled=false;smapSub('part').add(pm);}
 if(LP.length){var lm=new T3.LineSegments(geo({position:[LP,3],aC:[LC,3]}),M.line);lm.frustumCulled=false;smapSub('dist').add(lm);}}
function smapStep(dt,now){var on=smapActive(),pn=document.getElementById('smapP');if(pn){pn.style.display=on&&!smapSky()?'':'none';var bt=document.getElementById('bSmap');if(bt)bt.style.display=mode==='street'?'':'none';if(on&&!DL.on){var hb=document.getElementById('l2hud'),hr=hb&&hb.getBoundingClientRect(),eb=document.getElementById('envBar'),er=eb&&eb.getBoundingClientRect();var lim=Math.min(hr&&hr.height?hr.top:window.innerHeight,er&&er.height&&er.left<340?er.top:1e9);pn.style.maxHeight=Math.max(200,lim-pn.offsetTop-12)+'px';}}
 if(now-(SMAP.vt||0)>500){SMAP.vt=now;var sky2=smapSky(),hide=on&&!SMAP.L.real&&!sky2;if(L2.live)for(var k in L2.live.tiles){var T=L2.live.tiles[k];if(T.bm){T.bm[0].visible=!hide;T.bm[1].visible=sky2||!on;if(T.bm[2])T.bm[2].visible=!hide;}}}
 U.uSm.value.set(L2.target?L2.target.x:0,L2.target?L2.target.z:0,smapRc(),(on&&!smapSky())?1:0);
 if(!on){U.uSonB.value.w=0;U.uSmX.value.z=0;if(SMAP.grp)SMAP.grp.visible=false;var el0=document.getElementById('smapL');if(el0&&el0.innerHTML)el0.innerHTML='';return;}
 var sky=smapSky(),g=smapGroup();g.visible=true;['holo','part','terr','flow','dist'].forEach(function(k){smapSub(k).visible=!sky&&!!SMAP.L[k];});
 var M=smapMats(),tg=L2.target;M.U.uT.value=now/1000;M.U.uD.value.set(tg.x,0,tg.z);M.U.uMode.value={h:0,g:1,d:2,k:3,c:4}[SMAP.mode];M.U.uAlt.value=camera.position.y;U.uSmX.value.set(camera.position.y,0,1,0);M.U.uPx.value=Math.min(2,window.devicePixelRatio||1);
 // fixed focus circle; the outer reach is the ground distance to the farthest visible screen corner, so it grows
 // as you scroll out / climb. One sound-speed wave (343 m/s) sweeps out to that edge before the next one starts.
 var Rc=smapRc(),Rw=smapReach(tg);SMAP.R+=(Rw-SMAP.R)*Math.min(1,dt*2);var R=SMAP.R;M.U.uR.value=R;M.U.uRc.value=Rc;
 if(SMAP.pr==null)SMAP.pr=Rc;if(SMAP.hold>0){SMAP.hold-=dt;}else{SMAP.pr+=(smapSky()?Math.max(343,R/7):343)*Math.min(dt,.1);if(SMAP.pr>=R*1.03){SMAP.pr=R*1.03;SMAP.hold=smapSky()?1.6:1.2;SMAP.wave=(SMAP.wave||0)+1;}}
 if(SMAP.hold<=0&&SMAP.pr>=R*1.03)SMAP.pr=Rc;if(SMAP.hold>0&&SMAP.hold-dt<=0)SMAP.pr=Rc;var pr=SMAP.pr,ph=Math.min(1,(pr-Rc)/Math.max(1,R-Rc));M.U.uPulse.value=pr;M.U.uFade.value=SMAP.hold>0?Math.max(0,SMAP.hold/(smapSky()?1.6:1.2)):1;var rings=smapSub('rings');rings.position.set(tg.x,0,tg.z);
 var pu=rings.getObjectByName('pulse');pu.scale.set(pr,1,pr);M.pulse.uniforms.uO.value=SMAP.hold>0?0:.55*(1-ph);rings.getObjectByName('core').scale.set(Rc,1,Rc);rings.getObjectByName('outer').scale.set(R,1,R);
 // solid buildings take the colour mapping too (inside the focus circle in drone view; along the sonar sweep in sky view)
 U.uSonA.value.set(tg.x,tg.z,Rc,pr);U.uSonB.value.set(R,{h:0,g:1,d:2,k:3,c:4}[SMAP.mode],sky?M.U.uFade.value:0,1);
 var rl=document.getElementById('smR');if(rl)rl.textContent=Math.round(Rc)+' / '+Math.round(R)+' m · '+Math.round(smapSky()?Math.max(343,R/7):343)+' m/s';
 if(!sky){if(now-SMAP.at>350){SMAP.at=now;smapScan();camera.layers.enable(1);g.traverse(function(o){if(o.layers.mask!==2)o.layers.set(1);});}if(now-SMAP.bt>120){SMAP.bt=now;smapBuild();}
  smapLabels(now);if(now-SMAP.lt>600){SMAP.lt=now;smapPanel();}}else{var el9=document.getElementById('smapL');if(el9&&el9.innerHTML)el9.innerHTML='';}}
function smapLabels(now){var el=document.getElementById('smapL');if(!el)return;if(!SMAP.L.dist&&!SMAP.L.tall){if(el.innerHTML)el.innerHTML='';return;}if(now-(SMAP.lb||0)<140)return;SMAP.lb=now;
 var tg=L2.target,Rc0=smapRc(),near=SMAP.pairs.filter(function(p){return p.g>=.3;}).map(function(p){return [Math.hypot(p.m[0]-tg.x,p.m[2]-tg.z),p];}).filter(function(q){return q[0]<Rc0;}).sort(function(a,b){return a[0]-b[0];}).slice(0,8),W=window.innerWidth,H=window.innerHeight,v=new T3.Vector3(),html='';
 if(!SMAP.L.dist)near=[];if(SMAP.L.tall){var alt=camera.position.y,zh=LZ();SMAP.list.filter(function(o){return Math.hypot(o.cx-tg.x,o.cz-tg.z)<Rc0;}).sort(function(a,b){return b.h-a.h;}).slice(0,5).forEach(function(o){v.set(o.cx,o.h+4,o.cz).project(camera);if(v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1)return;var dz=alt-o.h,cl=dz<0?' c':dz<30?' m':'';html+='<span class="st'+cl+'" style="transform:translate('+((v.x*.5+.5)*W).toFixed(0)+'px,'+((-v.y*.5+.5)*H).toFixed(0)+'px) translate(-50%,-100%)">▲ '+Math.round(o.h)+' m · '+Math.max(1,Math.round(o.h/3.5))+(I18T('f'))+'<em>'+(dz<0?(I18T('above_uav'))+Math.round(-dz)+' m':(I18T('clear_2'))+Math.round(dz)+' m')+'</em></span>';});}
 near.forEach(function(q){var p=q[1];v.set(p.m[0],p.m[1],p.m[2]).project(camera);if(v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1)return;html+='<span class="sl'+(p.g<6?' c':p.g<15?' m':'')+'" style="transform:translate('+((v.x*.5+.5)*W).toFixed(0)+'px,'+((-v.y*.5+.5)*H).toFixed(0)+'px) translate(-50%,-50%)">'+(p.g<0.3?(I18T('joined')):p.g.toFixed(1)+' m')+'</span>';});
 [Math.round(Rc0),Math.round(SMAP.R)].forEach(function(r){v.set(tg.x+r*.707,1,tg.z+r*.707).project(camera);if(v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1)html+='<span class="sr" style="transform:translate('+((v.x*.5+.5)*W).toFixed(0)+'px,'+((-v.y*.5+.5)*H).toFixed(0)+'px) translate(-50%,-50%)">'+r+' m</span>';});
 el.innerHTML=html;}
function smapPanel(){var p=document.getElementById('smapP');if(!p)return;var zh=LZ();
 if(!SMAP.panelBuilt||SMAP.panelLang!==lang){SMAP.panelBuilt=1;SMAP.panelLang=lang;
  p.innerHTML='<div class="smH"><b>'+(I18T('spatial_map'))+'</b><span>'+(I18T('core_outer'))+'<b id="smR"></b></span><button id="smOn" aria-pressed="true">'+(I18T('on'))+'</button></div>'
   +'<div class="smSec"><em>'+(I18T('flight_telemetry_uav'))+'</em><div class="smTel" id="smTel"></div></div><div class="smSec"><em>'+(I18T('colour_mapping'))+'</em><div class="smChips">'+SMAP_MODES.map(function(m){return '<button data-sm="'+m[0]+'">'+(I18P(m[1],m[2]))+'</button>';}).join('')+'</div><div class="smRamp" id="smRamp"></div></div>'
   +'<div class="smSec"><em>'+(I18T('layers'))+'</em><div class="smLay">'+SMAP_LAYERS.map(function(l,i){return '<label><input type="checkbox" data-sl="'+l[0]+'"'+(SMAP.L[l[0]]?' checked':'')+'><i>'+(i+1)+'</i>'+(I18P(l[1],l[2]))+'</label>';}).join('')+'</div></div>'
   +'<div class="smSec"><em>'+(I18T('lidar_every_beam_traced'))+'</em><div id="smLid"></div><div class="lidS" id="smLidS"></div></div>'
   +'<div class="smSec"><em>'+(I18T('survey_2'))+'</em><div class="smStats" id="smStats"></div></div>'
   +'<div class="smBtns"><button id="smClr">'+(I18T('rescan'))+'</button><button id="smCsv">'+(I18T('export_csv'))+'</button></div>';
  ['pointerdown','wheel'].forEach(function(t){p.addEventListener(t,function(e){e.stopPropagation();},{passive:true});});
  p.querySelectorAll('[data-sm]').forEach(function(b){b.onclick=function(){SMAP.mode=b.getAttribute('data-sm');smapPanel();};});
  p.querySelectorAll('[data-sl]').forEach(function(c){c.onchange=function(){SMAP.L[c.getAttribute('data-sl')]=c.checked;};});
  document.getElementById('smOn').onclick=function(){SMAP.on=false;toast(I18T('spatial_map_off_turn'));var b=document.getElementById('bSmap');if(b)b.setAttribute('aria-pressed','false');};
  document.getElementById('smClr').onclick=function(){smapReset();};document.getElementById('smCsv').onclick=smapCsv;lidUI();}
 p.querySelectorAll('[data-sm]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-sm')===SMAP.mode);});
 var rmp={h:[I18T('low'),'≈160 m '+(I18T('high'))],g:['≥30 m '+(I18T('open_2')),I18T('s_0_m_tight')],d:[Math.round(SMAP.R*1.6)+' m',I18T('below_drone')]}[SMAP.mode];var alt=Math.round(camera.position.y);
 document.getElementById('smRamp').innerHTML=SMAP.mode==='c'?'<div class="smCat smClr"><span><i style="background:#ff2938"></i>'+(I18T('above_uav_2'))+alt+' m</span><span><i style="background:#ff8520"></i>'+(I18T('s_30_m_clear'))+'</span><span><i style="background:#ffdb33"></i>30–60 m</span><span><i style="background:#38ff94"></i>'+(I18T('s_60_m_safe'))+'</span></div>':SMAP.mode==='g'?'<div class="bar"></div><div class="lbl"><span>'+rmp[0]+'</span><span>'+rmp[1]+'</span></div><div class="smNote">'+(I18T('spacing_is_carried_by'))+'</div>':SMAP.mode==='k'?'<div class="smCat">'+TAX.map(function(M,i){return '<span><i style="background:'+M.col+'"></i>'+(i+1)+' '+esc(I18P(M.zh.replace('建筑',''),M.en))+'</span>';}).join('')+'</div>':'<div class="bar"></div><div class="lbl"><span>'+rmp[0]+'</span><span>'+rmp[1]+'</span></div>';
 var L=SMAP.list,n=L.length,area=SMAP.cellN*1600,gaps=L.map(function(o){return o.gap;}).filter(function(g){return g<60;}),E=SMAP.elev,eh=smapElevAt(L2.target.x,L2.target.z),cp=camera.position;
 var sep=gaps.filter(function(g){return g>=.3;}),joined=gaps.length-sep.length,avgG=sep.length?sep.reduce(function(a,b){return a+b;},0)/sep.length:0,minG=sep.length?Math.min.apply(0,sep):0;
 function row(k,v){return '<div><em>'+k+'</em><b>'+v+'</b></div>';}
 document.getElementById('smStats').innerHTML=row(I18T('buildings'),n.toLocaleString()+(SMAP.pend.length?' <small>+'+SMAP.pend.length+'</small>':''))+row(I18T('area_2'),(area/1e6).toFixed(2)+' km²')
  +row(I18T('avg_height'),n?(SMAP.sum.h/n).toFixed(1)+' m':'—')+row(I18T('avg_spacing'),sep.length?avgG.toFixed(1)+' m':'—')+row(I18T('min_spacing'),sep.length?minG.toFixed(1)+' m':'—')+row(I18T('joined_2'),joined+' / '+gaps.length)
  +row(I18T('coverage'),area?(SMAP.sum.foot/area*100).toFixed(1)+' %':'—')+row(I18T('far_2'),area?(SMAP.sum.gfa/area).toFixed(2):'—')
  +row(I18T('terrain'),E?Math.round(E.mn)+'–'+Math.round(E.mx)+' m':(I18T('loading')))+row(I18T('uav_altitude'),eh!=null?Math.round(eh+cp.y)+' m':Math.round(cp.y)+' m AGL');}
function wireSmap(){var b=document.getElementById('bSmap');if(!b||b._w)return;b._w=1;b.onclick=function(){SMAP.on=!SMAP.on;b.setAttribute('aria-pressed',SMAP.on);if(SMAP.on&&!(L2.drone&&L2.drone.on)){var bd=document.getElementById('bDrone');if(bd)bd.click();}};}
function smapTel(tl,ac,home,agl,zh){var el=document.getElementById('smTel');if(!el)return;var vs=DHUD.vs,gs=DHUD.hs*3.6;
 function c(k,v,w){return '<div'+(w?' class="w"':'')+'><em>'+k+'</em><b>'+v+'</b></div>';}
 el.innerHTML=c('UTC',tl[0][1])+c(I18T('elev'),tl[1][1])+c(I18T('hdg'),tl[2][1])+c(I18T('gmb'),tl[3][1])
  +c(I18T('uav_position'),fmtLL6(ac.lat,ac.lon),1)+c(I18T('from_origin'),fmtKm(home/1000))+c(I18T('gs'),Math.round(gs)+' km/h')+c(I18T('v_s'),vs.toFixed(1)+' m/s');}
function smapCsv(){var zh=LZ(),rows=[['id','lat','lon','class','sub_class','height_m','footprint_m2','nearest_gap_m']];SMAP.list.forEach(function(o,i){var ll=localToLL(o.cx,o.cz),t=txOf(o.pl),M=TAX[t.m];rows.push([i+1,ll.lat.toFixed(6),ll.lon.toFixed(6),'"'+M.en+'"','"'+(M.s[t.s]?M.s[t.s][1]:t.s)+'"',o.h.toFixed(1),Math.round(o.foot),o.gap<60?o.gap.toFixed(2):'']);});
 var csv=rows.map(function(r){return r.join(',');}).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='sentinel-spatial-scan.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}

// ---- building taxonomy: 9 major classes → sub-classes, each with its own colour and general (not building-specific)
// safety considerations. Evidence order per building: map POI inside the footprint → Overture building class →
// OSM land use → name keywords → building form. `p` maps a class to the existing network-profile lesson (0-4). ----
var TAX=[
 {k:'res',zh:'住宅建筑',en:'Residential',col:'#4f9dff',p:0,d:{zh:'提供市民日常居住、休息与家庭生活的基本空间。',en:'Everyday homes, rest and family life.'},
  s:{house:['独立住宅','House'],apt:['公寓 / 住宅楼','Apartments'],dorm:['宿舍','Dormitory'],res:['住宅（推断）','Residential (inferred)']},
  sec:{zh:['消防：楼梯间与疏散通道保持畅通，高层需防烟楼梯与喷淋','门禁与访客管理、快递与外卖的接收动线','家庭网络：路由器口令、智能家居与摄像头隔离、固件更新'],en:['Fire: keep stairs and egress clear; high-rises need smoke-proof stairs and sprinklers','Entry control and visitor/parcel flows','Home network: router passwords, isolate smart devices, update firmware']}},
 {k:'com',zh:'商业与零售建筑',en:'Commercial & Retail',col:'#b07bff',p:1,d:{zh:'承载城市经济贸易、办公写字、商品零售与消费娱乐。',en:'Trade, offices, retail and consumer leisure.'},
  s:{office:['办公 / 写字楼','Office'],retail:['零售商店','Retail'],mall:['商场 / 百货','Mall / department store'],market:['超市 / 市场','Supermarket / market'],hotel:['酒店住宿','Hotel'],food:['餐饮','Food & drink'],mixed:['综合 / 混合用途（推断）','Mixed use (inferred)'],tower:['超高层综合体（办公 / 酒店 / 观光）','Mixed-use tower (office / hotel / observation)']},
  sec:{zh:['人流高峰的疏散容量与出入口管理','支付与 POS 终端、访客 Wi-Fi 与内部网络分离','营业时间外的防盗与监控（注意隐私合规）'],en:['Egress capacity and entrances at peak footfall','Payment/POS and guest Wi-Fi separated from internal networks','After-hours intrusion and CCTV within privacy rules']}},
 {k:'pub',zh:'公共与行政建筑',en:'Institutional & Public',col:'#ff5d6c',p:4,d:{zh:'维持城市行政管理、社会治安、法律审判与公共安全。',en:'Administration, public order, courts and public safety.'},
  s:{gov:['政府 / 市政厅','Government / city hall'],police:['警察局','Police station'],fire:['消防局','Fire station'],court:['法院','Courthouse'],post:['邮政','Post office'],comm:['社区服务中心','Community centre'],civic:['公共建筑','Civic building']},
  sec:{zh:['公众开放区与内部办公区分离，访客登记与引导','应急服务建筑：车辆出入通道不被占用','政务系统的身份认证、数据分级与日志审计'],en:['Separate public counters from internal areas; visitor sign-in','Emergency-service buildings: keep vehicle egress clear','Strong identity, data classification and audit logging for public systems']}},
 {k:'edu',zh:'教育与科研建筑',en:'Educational & Research',col:'#3fd6c4',p:4,d:{zh:'负责人口基础教育、高等学术深造与高精尖科学研发。',en:'Schooling, higher education and research.'},
  s:{kinder:['幼儿园','Kindergarten'],school:['中小学','School'],univ:['大学 / 学院','University / college'],lib:['图书馆','Library'],research:['科研机构','Research institute']},
  sec:{zh:['上下学时段的人车分流与校门管理','校园网：学生、教职工、访客与实验室网络分区','科研数据与知识产权的访问控制和备份'],en:['Separate pedestrians and traffic at school gates','Campus network zones for students, staff, guests and labs','Access control and backups for research data']}},
 {k:'med',zh:'医疗与卫生建筑',en:'Healthcare & Medical',col:'#ff8fc7',p:4,d:{zh:'保障公共卫生安全、提供临床治疗、急救与药物分发。',en:'Public health, clinical care, emergency care and medicine.'},
  s:{hosp:['医院','Hospital'],clinic:['诊所','Clinic'],dent:['牙科','Dentist'],pharm:['药店','Pharmacy'],care:['养老 / 护理机构','Care home'],vet:['宠物医院','Veterinary']},
  sec:{zh:['急救车道与急诊入口保持畅通','医疗设备与病历系统的网络隔离、患者隐私保护','备用电源与药品冷链的连续性'],en:['Keep ambulance lanes and the emergency entrance clear','Isolate medical devices and records systems; protect patient privacy','Backup power and cold-chain continuity']}},
 {k:'ind',zh:'工业与物流建筑',en:'Industrial & Logistics',col:'#f0a33a',p:3,d:{zh:'承担物质财富生产、商品仓储流转与数字算力存储。',en:'Production, warehousing and digital compute.'},
  s:{fac:['工厂 / 制造','Factory'],ware:['仓储物流','Warehouse / logistics'],dc:['数据中心','Data centre'],craft:['作坊 / 车间','Workshop']},
  sec:{zh:['危险品存放、消防分区与员工安全培训','工控系统（OT）与办公网络隔离，远程维护走受控通道','装卸区车辆动线与夜间照明'],en:['Hazardous storage, fire compartments and staff safety training','Isolate OT from office IT; controlled remote maintenance','Loading-dock vehicle flows and night lighting']}},
 {k:'cul',zh:'文化、娱乐与文体建筑',en:'Cultural & Recreational',col:'#f5d547',p:2,d:{zh:'满足市民精神文化需求、举办标志性文体赛事与展览。',en:'Culture, events, sport and exhibitions.'},
  s:{museum:['博物馆 / 美术馆','Museum / gallery'],theatre:['剧院 / 音乐厅','Theatre / concert hall'],cinema:['电影院','Cinema'],stadium:['体育场馆','Stadium / arena'],sport:['健身 / 游泳','Fitness / pool'],studio:['影音制作（录音 / 影棚 / 摄影写真）','Studios (recording / film / photo)'],ent:['娱乐 / 景点','Entertainment / attraction']},
  sec:{zh:['大型活动的人流容量、分区安检与疏散','展品与设备的防盗、防火（尤其是易燃布景与灯光）','票务与场馆 Wi-Fi 的网络安全'],en:['Crowd capacity, zoned screening and evacuation for events','Theft and fire protection for exhibits, sets and lighting','Ticketing and venue Wi-Fi security']}},
 {k:'trn',zh:'交通与基建建筑',en:'Transit & Infrastructure',col:'#8fe06a',p:3,d:{zh:'构成城市生命线，确保人流运输与水电气能源运转。',en:'City lifelines: moving people and keeping utilities running.'},
  s:{rail:['火车 / 地铁站','Rail / metro station'],bus:['公交 / 客运站','Bus station'],ferry:['码头 / 渡轮','Ferry terminal'],air:['机场航站楼','Airport terminal'],parking:['停车楼','Parking structure'],fuel:['加油站 / 充电站','Fuel / EV charging'],util:['公用设施','Utility building']},
  sec:{zh:['客流高峰的站台容量与紧急疏散','公共广播与信息屏在故障时的备用方案','公用设施属于关键基础设施，细节不公开——这里只讲通用原则'],en:['Platform capacity and evacuation at peak','Fallback for public address and signage during outages','Utilities are critical infrastructure — only general principles here']}},
 {k:'rel',zh:'宗教与精神建筑',en:'Spiritual & Religious',col:'#e8e4f8',p:4,d:{zh:'提供多元的信仰空间、精神冥想与传统祭祀集会场所。',en:'Places of faith, meditation and traditional gatherings.'},
  s:{chr:['基督教（教堂）','Christian'],isl:['伊斯兰教（清真寺）','Islamic'],bud:['佛教（寺院）','Buddhist'],hin:['印度教（神庙）','Hindu'],jud:['犹太教（会堂）','Jewish'],sik:['锡克教（谒师所）','Sikh'],tao:['道教（宫观）','Taoist'],shi:['神道（神社）','Shinto'],worship:['宗教场所（未细分）','Place of worship']},
  sec:{zh:['节日与集会时的人流组织与疏散','古建筑与木结构的防火（香烛、电线老化）','尊重宗教习俗的访客引导'],en:['Crowd flow and evacuation on festival days','Fire safety for historic and timber structures (candles, old wiring)','Visitor guidance that respects religious customs']}}];
var TXPOI={hospital:[4,'hosp'],clinic:[4,'clinic'],doctors:[4,'clinic'],dentist:[4,'dent'],pharmacy:[4,'pharm'],chemist:[4,'pharm'],nursing_home:[4,'care'],veterinary:[4,'vet'],
 police:[2,'police'],fire_station:[2,'fire'],courthouse:[2,'court'],town_hall:[2,'gov'],townhall:[2,'gov'],government:[2,'gov'],post:[2,'post'],post_office:[2,'post'],community_centre:[2,'comm'],
 school:[3,'school'],kindergarten:[3,'kinder'],college:[3,'univ'],university:[3,'univ'],library:[3,'lib'],research_institute:[3,'research'],
 place_of_worship:[8,'worship'],
 museum:[6,'museum'],art_gallery:[6,'museum'],gallery:[6,'museum'],theatre:[6,'theatre'],arts_centre:[6,'theatre'],cinema:[6,'cinema'],stadium:[6,'stadium'],sports:[6,'sport'],sports_centre:[6,'sport'],fitness:[6,'sport'],swimming:[6,'sport'],swimming_pool:[6,'sport'],studio:[6,'studio'],entertainment:[6,'ent'],attraction:[6,'ent'],zoo:[6,'ent'],
 lodging:[1,'hotel'],hotel:[1,'hotel'],restaurant:[1,'food'],fast_food:[1,'food'],cafe:[1,'food'],bar:[1,'food'],beer:[1,'food'],bakery:[1,'food'],ice_cream:[1,'food'],department_store:[1,'mall'],mall:[1,'mall'],supermarket:[1,'market'],grocery:[1,'market'],marketplace:[1,'market'],office:[1,'office'],coworking:[1,'office'],
 shop:[1,'retail'],clothing_store:[1,'retail'],books:[1,'retail'],electronics:[1,'retail'],furniture:[1,'retail'],hardware:[1,'retail'],jewelry:[1,'retail'],shoe:[1,'retail'],gift:[1,'retail'],florist:[1,'retail'],toys:[1,'retail'],cosmetics:[1,'retail'],optician:[1,'retail'],pet:[1,'retail'],stationery:[1,'retail'],convenience:[1,'retail'],mobile_phone:[1,'retail'],alcohol_shop:[1,'retail'],
 railway:[7,'rail'],bus:[7,'bus'],ferry_terminal:[7,'ferry'],aerialway:[7,'rail'],aerodrome:[7,'air'],fuel:[7,'fuel'],charging_station:[7,'fuel'],parking:[7,'parking']};
var TXOVT={apartments:[0,'apt'],residential:[0,'apt'],house:[0,'house'],detached:[0,'house'],semidetached_house:[0,'house'],terrace:[0,'house'],bungalow:[0,'house'],dormitory:[0,'dorm'],
 church:[8,'chr'],cathedral:[8,'chr'],chapel:[8,'chr'],mosque:[8,'isl'],synagogue:[8,'jud'],shrine:[8,'shi'],temple:[8,'worship'],religious:[8,'worship'],
 hospital:[4,'hosp'],clinic:[4,'clinic'],school:[3,'school'],kindergarten:[3,'kinder'],university:[3,'univ'],college:[3,'univ'],fire_station:[2,'fire'],government:[2,'gov'],civic:[2,'civic'],public:[2,'civic'],
 warehouse:[5,'ware'],industrial:[5,'fac'],factory:[5,'fac'],manufacture:[5,'fac'],office:[1,'office'],commercial:[1,'office'],retail:[1,'retail'],supermarket:[1,'market'],kiosk:[1,'retail'],hotel:[1,'hotel'],
 train_station:[7,'rail'],transportation:[7,'rail'],parking:[7,'parking'],stadium:[6,'stadium'],grandstand:[6,'stadium'],sports_hall:[6,'sport'],sports_centre:[6,'sport'],
 sub_residential:[0,'res'],sub_commercial:[1,'mixed'],sub_civic:[2,'civic'],sub_education:[3,'school'],sub_medical:[4,'clinic'],sub_industrial:[5,'fac'],sub_entertainment:[6,'ent'],sub_transportation:[7,'rail'],sub_religious:[8,'worship'],sub_service:[7,'util']};
var TXLU={residential:[0,'res'],neighbourhood:[0,'res'],suburb:[0,'res'],quarter:[0,'res'],commercial:[1,'office'],office:[1,'office'],retail:[1,'retail'],industrial:[5,'fac'],railway:[7,'rail'],
 school:[3,'school'],kindergarten:[3,'kinder'],university:[3,'univ'],college:[3,'univ'],education:[3,'school'],hospital:[4,'hosp'],stadium:[6,'stadium'],zoo:[6,'ent'],theme_park:[6,'ent'],bus_station:[7,'bus'],religious:[8,'worship'],library:[3,'lib']};
function txReligion(n){n=(n||'').toLowerCase();if(!n)return null;
 if(/synagogue|shul|chabad|beth (el|israel|am)|犹太/.test(n))return 'jud';if(/gurdwara|sikh|锡克/.test(n))return 'sik';if(/mosque|masjid|islamic|清真|camii|mesquita|mezquita/.test(n))return 'isl';
 if(/hindu|mandir|shiva|krishna|ganesh|balaji|swaminarayan|印度教/.test(n))return 'hin';if(/shrine|jinja|神社|大社|神宮/.test(n))return 'shi';if(/taoist|daoist|道观|道觀|宫$|宮$|观$|觀$/.test(n))return 'tao';
 if(/buddhist|buddha|wat |pagoda|vihara|dharma|zen |寺|禅|禪|佛|庵/.test(n))return 'bud';
 if(/church|cathedral|chapel|basilica|parish|baptist|methodist|lutheran|presbyterian|catholic|教堂|礼拜|禮拜|天主|基督|igreja|iglesia|église|eglise|kirche|chiesa/.test(n))return 'chr';return null;}
function txName(n){n=(n||'').toLowerCase();if(!n)return null;if(/recording|录音|錄音|影棚|film studio|studios\b|photo ?studio|photograph|摄影|攝影|写真|寫真/.test(n))return [6,'studio'];
 if(/data ?cent(er|re)|datacenter|数据中心|數據中心|\bidc\b/.test(n))return [5,'dc'];if(/warehouse|logistics|distribution cent|fulfil|仓|倉|物流/.test(n))return [5,'ware'];if(/factory|manufactur|工厂|工廠|制造|製造/.test(n))return [5,'fac'];
 var r=txReligion(n);if(r&&/church|cathedral|chapel|mosque|masjid|temple|synagogue|shrine|gurdwara|mandir|寺|教堂|清真|神社|宫|宮|观|觀/.test(n))return [8,r];return null;}
// classify one building from the evidence the tile gave us
function txClassify(x,zoneRaw,pois,cat){var r=null,why='form',n='';
 var cand=[];for(var i=0;i<pois.length;i++){var p=pois[i],m=TXPOI[p.sc]||TXPOI[p.cl];if(m){var c=m.slice();if(c[0]===8){var rg=txReligion(p.n);if(rg)c[1]=rg;}cand.push([c,p]);}}
 if(cand.length){var PRI=[4,2,3,8,7],pick=null;for(var q=0;q<PRI.length&&!pick;q++)for(var w=0;w<cand.length;w++)if(cand[w][0][0]===PRI[q]){pick=cand[w];break;}
  if(!pick){var subs={};cand.forEach(function(c){subs[c[0][0]+':'+c[0][1]]=1;});if(x.h>=60&&Object.keys(subs).length>1){r=[1,'tower'];why='poi';n='';}else{var cnt={};cand.forEach(function(c){var k=c[0][0];cnt[k]=(cnt[k]||0)+1;});var bm=+Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||(a==1?-1:1);})[0];for(w=0;w<cand.length;w++)if(cand[w][0][0]===bm){pick=cand[w];break;}}}
  if(pick){r=pick[0];why='poi';n=pick[1].n;}}
 if(!r)for(i=0;i<pois.length&&!r;i++){var nm=txName(pois[i].n);if(nm){r=nm;why='name';n=pois[i].n;}}
 if(!r&&x.oc){var o=TXOVT[x.oc]||TXOVT['sub_'+x.os];if(o){r=o.slice();why='ovt';}}
 if(!r&&zoneRaw&&TXLU[zoneRaw]){r=TXLU[zoneRaw].slice();why='lu';}
 if(!r){r=cat===0?[0,'res']:cat===1?[1,'mixed']:cat===2?[1,'retail']:cat===3?[5,'fac']:[1,'mixed'];why='form';}
 return {m:r[0],s:r[1],why:why,n:n};}
function pipFlat(x,z,c){var ins=false,n=c.length/2,j=n-1;for(var i=0;i<n;i++){var xi=c[2*i],zi=c[2*i+1],xj=c[2*j],zj=c[2*j+1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))ins=!ins;j=i;}return ins;}
function txOf(b){if(b._tx)return b._tx;var c=b[b.length-1];return {m:c===0?0:c===3?5:1,s:c===0?'res':c===2?'retail':c===3?'fac':'mixed',why:'form',n:''};}
function txSub(t){var M=TAX[t.m],s=M&&M.s[t.s];return s?(I18P(s[0],s[1])):'';}
function txWhy(w){var zh=LZ();return {poi:I18T('map_poi_inside_the'),ovt:I18T('overture_building_class'),lu:I18T('osm_land_use'),name:I18T('inferred_from_the_name'),form:I18T('inferred_from_building_form')}[w]||w;}
function txProfile(t){var M=TAX[t.m];if(!M)return 4;if(t.m===1&&/retail|mall|market|food/.test(t.s))return 2;return M.p;}
function txCounts(){var n={},s={};(L2.picks||[]).forEach(function(b){var t=txOf(b);n[t.m]=(n[t.m]||0)+1;var k=t.m+':'+t.s;s[k]=(s[k]||0)+1;});return {n:n,s:s};}
function txSecHTML(m){var M=TAX[m],zh=LZ();return '<div class="txsec"><b>'+(I18T('safety_considerations_general_to'))+'</b><ul>'+LX(M.sec).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>';}
function renderTax(m){var M=TAX[m],zh=LZ();if(!M)return;var C=txCounts();
 pHead.innerHTML=headHTML(I18T('building_class_2'),(m+1)+' · '+(I18P(M.zh,M.en)),'<span class="chip" style="color:'+M.col+'">■ '+(I18P(M.en,M.zh))+'</span><span class="chip">'+(C.n[m]||0)+' '+T('buildings')+'</span>',true);
 var subs=Object.keys(M.s).map(function(k){var c=C.s[m+':'+k]||0;return '<div class="txs'+(c?'':' z')+'"><i style="background:'+M.col+'"></i><span>'+esc(I18P(M.s[k][0],M.s[k][1]))+'</span><em>'+c+'</em></div>';}).join('');
 var p=M.p,ape=LX(D.CATAPE[p]);
 pBody.innerHTML='<p class="ctrl" style="margin:0">'+esc(LX(M.d))+'</p><div class="sec"><h3>'+(I18T('sub_classes_loaded_streets'))+'</h3><div class="txsubs">'+subs+'</div></div>'
  +'<div class="sec">'+txSecHTML(m)+'</div>'
  +'<div class="sec"><h3>'+T('net')+' · '+esc(LX(D.CATS[p]).n)+'</h3><div class="blk"><p>'+esc(LX(D.CATS[p]).net)+'</p></div></div><div class="sec">'+triHTML(ape.a,ape.p,ape.e)+'</div>'
  +'<div class="btns"><button class="btn" data-back="city">← '+esc(cityName(L2.city))+'</button></div>';
 wire();pBody.scrollTop=0;state={type:'tax',m:m};}
function txLegendHTML(counts,btn){var zh=LZ();return TAX.map(function(M,i){var on=U.uFocus.value===i;return '<button class="lgb" data-tx="'+i+'" aria-pressed="'+on+'" title="'+esc(LX(M.d))+'"><i style="background:'+M.col+'"></i>'+(i+1)+' '+esc(I18P(M.zh.replace('建筑',''),M.en))+'<em>'+(counts[i]||0)+'</em></button>';}).join('');}


// ---- drone-view layout blueprint (only while the drone view is on): top = heading compass; left / right edges =
// spatial coordinates (telemetry, speed / altitude tapes, orientation globe + XYZ gizmo); centre = own-ship model;
// bottom-left = tactical map + forward radar in one panel; right column = spatial-map and environment panels ----
var DL={on:false,set:[],at:0};
function dlById(i){return document.getElementById(i);}
function dlSt(el,o){if(!el)return;for(var k in o)el.style[k]=o[k];if(DL.set.indexOf(el)<0)DL.set.push(el);}
function dlClear(){if(DL.vo!=null){camera.clearViewOffset();DL.vo=null;}DL.set.forEach(function(el){['left','top','right','bottom','width','height','maxHeight'].forEach(function(k){el.style[k]='';});});DL.set=[];document.body.classList.remove('dlay');}
function dLayout(now){if(now&&now-DL.at<150&&DL.on)return DL;DL.at=now||0;var W=window.innerWidth,H=window.innerHeight,pn=panel.classList.contains('min')?null:panel.getBoundingClientRect(),VR=pn&&pn.left>W*.45?pn.left-8:W;
 var want=mode==='street'&&L2.active&&L2.drone&&L2.drone.on&&!(typeof SKYV!=='undefined'&&SKYV.on)&&VR>=1000&&H>=660;
 if(!want){if(DL.on){DL.on=false;dlClear();}return null;}
 if(!DL.on){DL.on=true;document.body.classList.add('dlay');}
 var L0=16,LW=340,RW=320,R1=VR-12,R0=R1-RW,T0=92,d=Math.round(W/2-VR/2),vk=d+'|'+W+'|'+H;
 // shift the camera's principal point so the drone's focus sits in the middle of the visible view, not under the side panel
 if(DL.vo!==vk){if(d>0)camera.setViewOffset(W+2*d,H,2*d,0,W,H);else camera.clearViewOffset();DL.vo=vk;}
 if(!DOCK.on){dlSt(dlById('miniGlobe'),{left:(R0-4)+'px',top:(T0-6)+'px',right:'auto',bottom:'auto'});dlSt(dlById('gizmo'),{left:(R1-170)+'px',top:T0+'px',right:'auto',bottom:'auto'});}
 var eb=dlById('envBar');dlSt(eb,{left:L0+'px',width:(VR-12-L0)+'px',top:'auto',bottom:'10px',maxHeight:'none'});var ws=dlById('envWs');if(ws&&ws.textContent&&ws.title!==ws.textContent)ws.title=ws.textContent;
 var lir=dlById('liveInfo')&&dlById('liveInfo').getBoundingClientRect(),li=lir&&lir.height?lir.top:H-170;
 var ah=dlById('ahead'),ahH=ah&&ah.offsetHeight?ah.offsetHeight:170,aTop=li-10-ahH;dlSt(ah,{left:L0+'px',top:aTop+'px',right:'auto',bottom:'auto',width:LW+'px'});
 var mmH=Math.max(160,Math.min(300,aTop-150-330));DL.mm={left:L0,top:aTop-mmH,w:LW,h:mmH};var SP0=146;
 dlSt(dlById('smapP'),{left:L0+'px',top:SP0+'px',width:LW+'px',maxHeight:Math.max(140,DL.mm.top-10-SP0)+'px'});
 var cy=H/2,arm=Math.max(150,Math.min(300,H*.26)),hbx=dlById('dhHolo'),hh=hbx&&hbx.offsetHeight?hbx.offsetHeight:160;
 DL.holo={left:VR/2-125,top:Math.round(H*0.2)};
 DL.L0=L0;DL.LW=LW;DL.R0=R0;DL.VR=VR;DL.li=li;DL.mmTop=DL.mm.top;DL.x0=L0+LW+44;DL.x1=R0-44;return DL;}

// ---- orientation globe + XYZ gizmo docked on top of the city / street panel (street level, wide screens) ----
var DOCK={on:false,pt:null};
function dockNav(){var W=window.innerWidth,H=window.innerHeight,open=!panel.classList.contains('min'),want=mode==='street'&&L2.active&&open&&W>900&&H>600,mg=document.getElementById('miniGlobe'),gz=document.getElementById('gizmo');
 if(!want){if(DOCK.on){DOCK.on=false;document.body.classList.remove('dock');panel.style.top='';}return;}
 if(!DOCK.on){DOCK.on=true;document.body.classList.add('dock');DOCK.pt=null;panel.style.top='';DOCK.pt=panel.getBoundingClientRect().top;}
 var pr=panel.getBoundingClientRect(),T0=DOCK.pt||82,gw=141,zw=136,gap=10,x=pr.left+(pr.width-gw-zw-gap)/2;
 if(mg){mg.style.left=x+'px';mg.style.top=(T0-6)+'px';}if(gz){gz.style.left=(x+gw+gap)+'px';gz.style.right='auto';gz.style.top=T0+'px';}
 var nt=(T0+198)+'px';if(panel.style.top!==nt)panel.style.top=nt;}
// ---- edge-collapsible panels: the panel slides off to its nearest screen edge, a slim tab stays to bring it back ----
var CLP={ids:['skyPanel','skyEv','envBar','ahead','mmap','smapP'],at:0};
function clBase(el){var x=el.offsetLeft,y=el.offsetTop,p=el.offsetParent;if(p){var pr=p.getBoundingClientRect();x+=pr.left+p.clientLeft;y+=pr.top+p.clientTop;}return {left:x,top:y,width:el.offsetWidth,height:el.offsetHeight,bottom:y+el.offsetHeight};}
function clSide(r){var W=window.innerWidth,H=window.innerHeight;if(r.width>W*.45&&r.bottom>H-90)return 'b';return r.left+r.width/2<(DL.on?DL.VR:W)/2?'l':'r';}
function clToggle(el){el._clp=!el._clp;if(el._clp){el._side=clSide(clBase(el));}try{localStorage.setItem('se_cl_'+el.id,el._clp?el._side:'');}catch(e){}el._tx=el._ty=0;winTr(el);clStep(1);}
function clStep(force){var now=performance.now();if(!force&&now-CLP.at<120)return;CLP.at=now;var W=window.innerWidth,H=window.innerHeight;
 CLP.ids.forEach(function(id){var el=document.getElementById(id);if(!el)return;
  if(!el._tab){var b=document.createElement('button');b.className='clTab';b.type='button';b.setAttribute('aria-label','Collapse / expand');b.addEventListener('pointerdown',function(e){e.stopPropagation();});b.addEventListener('click',function(e){e.stopPropagation();clToggle(el);});document.body.appendChild(b);el._tab=b;
   el.style.transition=(el.style.transition?el.style.transition+',':'')+'translate .35s ease';var st=null;try{st=localStorage.getItem('se_cl_'+id);}catch(e){}if(st){el._clp=true;el._side=st;}}
  var b=el._tab,r=clBase(el),rr=el.getBoundingClientRect(),vis=rr.width>20&&rr.height>20&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  if(!vis){b.style.display='none';return;}b.style.display='';
  var bl=r.left,bt=r.top,side=el._clp?el._side:clSide(r),tx=0,ty=0;
  if(el._clp){if(side==='l')tx=-(bl+r.width)+6;else if(side==='r')tx=W-bl-6;else ty=H-bt-6;}
  if(Math.abs(tx-(el._tx||0))>1||Math.abs(ty-(el._ty||0))>1){el._tx=tx;el._ty=ty;winTr(el);}
  var L=bl+tx+(el._clp?0:(el._ux||0)),T=bt+ty+(el._clp?0:(el._uy||0));b.dataset.side=side;b.classList.toggle('on',!!el._clp);
  if(side==='l'){b.style.left=(L+r.width+2)+'px';b.style.top=(T+r.height/2-22)+'px';}else if(side==='r'){b.style.left=(L-18)+'px';b.style.top=(T+r.height/2-22)+'px';}else{b.style.left=(L+r.width/2-22)+'px';b.style.top=(T-18)+'px';}});}
// ---- drone orbit: comfortable oblique aerial view (28°–52° pitch, ~5°/s constant yaw, no roll) ----
var DRONE={w:5*D2R,elMid:40*D2R,elAmp:12*D2R,elP:40,dAmp:.12,dP:55,idle:3500,ramp:3};
L2.drone={on:true,t:0,blend:0,touch:0,d0:950};
function droneTouch(){if(L2.drone){L2.drone.touch=performance.now();L2.drone.blend=0;}}
function droneStep(dt,now){var D=L2.drone;var hud=document.getElementById('droneHud'),hdg=0;
 var anyKey=false;for(var k in KEYS)if(KEYS[k]){anyKey=true;break;}
 var active=D.on&&mode==='street'&&!Object.keys(ptrs).length&&!anyKey&&now-D.touch>DRONE.idle;
 if(hud)hud.classList.toggle('on',D.on&&mode==='street');
 if(active){if(D.blend===0)D.d0=L2.camWant.d;D.blend=Math.min(1,D.blend+dt/DRONE.ramp);D.t+=dt;var b=D.blend*D.blend*(3-2*D.blend);
  L2.camWant.az+=DRONE.w*dt*b;
  var el=DRONE.elMid+DRONE.elAmp*Math.sin(D.t*2*Math.PI/DRONE.elP);L2.camWant.el+=(el-L2.camWant.el)*Math.min(1,dt*.8)*b;
  var dd=D.d0*(1+DRONE.dAmp*Math.sin(D.t*2*Math.PI/DRONE.dP+1.3));L2.camWant.d+=(dd-L2.camWant.d)*Math.min(1,dt*.5)*b;}
 hdg=Math.round(camHeading());
 if(hud&&D.on&&now-(D.tmAt||0)>120){D.tmAt=now;var alt=Math.round(Math.sin(L2.cam.el)*L2.cam.d),hdg2=Math.round(camHeading());
  droneHudDraw(active,now);}
 var cmp=document.getElementById('cmp');if(cmp&&hud)cmp.style.transform='rotate('+(-hdg)+'deg)';if(D.on&&mode==='street'&&!SKYV.on&&now-(D.sfAt||0)>500){D.sfAt=now;droneSensor();}}

// ---- drone camera HUD, laid out like a real UAV operator screen: translucent heading tape across the top,
// height scale on the right, speed scale on the left, long gapped crosshair with inner brackets, corner data
// blocks (time / elevation / heading, mode / FOV), aircraft and focus coordinates, EO / NV / IR camera modes,
// and a holographic model of your own aircraft. Every number comes from the actual camera.
var DHUD={pt:null,py:null,at:0,hs:0,vs:0,t0:0,sens:'eo',holo:null};
function dhRect(id){var e=document.getElementById(id);if(!e)return null;var r=e.getBoundingClientRect();return r.width?r:null;}
function droneHudDraw(active,now){var hud=document.getElementById('droneHud');if(!hud)return;var zh=LZ();
 var W=window.innerWidth,H=window.innerHeight,tg=L2.target,cp=camera.position;if(!DHUD.t0)DHUD.t0=now;
 var dt=DHUD.at?(now-DHUD.at)/1000:0;if(dt>0&&DHUD.pt){var sh=Math.hypot(tg.x-DHUD.pt.x,tg.z-DHUD.pt.z)/dt,sv=(cp.y-DHUD.py)/dt;DHUD.hs+=(sh-DHUD.hs)*.35;DHUD.vs+=(sv-DHUD.vs)*.35;}
 DHUD.pt={x:tg.x,z:tg.z};DHUD.py=cp.y;DHUD.at=now;
 var hdg=camHeading(),elDeg=L2.cam.el*R2D,agl=Math.max(0,cp.y);
 var ac=L2.live?localToLL(cp.x,cp.z):viewLL(),fo=L2.live?localToLL(tg.x,tg.z):viewLL(),slant=cp.distanceTo(new T3.Vector3(tg.x,0,tg.z)),home=Math.hypot(cp.x,cp.z);
 // layout from the panels already on screen
 var mg=dhRect('miniGlobe'),gz=dhRect('gizmo'),ah=dhRect('ahead'),eb=dhRect('envBar'),pn=panel.classList.contains('min')?null:panel.getBoundingClientRect();
 var x0=mg?mg.right+28:120,x1=gz?gz.left-28:(pn?pn.left-40:W-60),yT=96,xR=(function(){var hb0=dhRect('dhHolo');return hb0?hb0.left-40:(gz?gz.left-46:x1);})(),yR0=gz?gz.bottom+24:170,yR1=ah?ah.top-30:H-200,xL=x0,yL0=mg?mg.bottom+28:200,yL1=eb?eb.top-30:H-220;
 if(DL.on){x0=DL.x0;x1=DL.x1;yT=94;xL=DL.L0+DL.LW+26;yL0=250;yL1=Math.min(DL.li-40,H-200);xR=DL.R0-26;yR0=250;yR1=DL.li-100;}
 var cx=DL.on?DL.VR/2:W/2,cy=H/2,s='';
 // heading tape
 var ppd=Math.max(5,(x1-x0)/80),mid=(x0+x1)/2;s+='<g class="ht"><line x1="'+x0+'" y1="'+(yT+18)+'" x2="'+x1+'" y2="'+(yT+18)+'" class="base"/>';
 for(var a=Math.ceil((hdg-(mid-x0)/ppd)/5)*5;a<=hdg+(x1-mid)/ppd;a+=5){var x=mid+(a-hdg)*ppd,n=((a%360)+360)%360,big=n%30===0,c4={0:'N',90:'E',180:'S',270:'W'}[n];
  s+='<line x1="'+x.toFixed(1)+'" y1="'+(yT+(big?6:11))+'" x2="'+x.toFixed(1)+'" y2="'+(yT+18)+'"/>';if(big)s+='<text x="'+x.toFixed(1)+'" y="'+(yT+1)+'"'+(c4?' class="card"':'')+'>'+(c4||('0'+n/10).slice(-2))+'</text>';}
 s+='<path d="M'+mid+' '+(yT+20)+'l-6 8h12z" class="ptr"/><rect x="'+(mid-24)+'" y="'+(yT+29)+'" width="48" height="16" rx="2" class="bx"/><text x="'+mid+'" y="'+(yT+41)+'" class="val">'+('00'+Math.round(hdg)%360).slice(-3)+'°</text></g>';
 // vertical scale helper
 function vscale(x,y0,y1,val,step,label,right){var o='<g class="vs"><line x1="'+x+'" y1="'+y0+'" x2="'+x+'" y2="'+y1+'" class="base"/>',ym=(y0+y1)/2,ppu=Math.max(6,(y1-y0)/12)/step,dir=right?1:-1;
  for(var v=Math.floor((val-(ym-y0)/ppu)/step)*step;v<=val+(y1-ym)/ppu;v+=step){if(v<0)continue;var y=ym-(v-val)*ppu;if(y<y0||y>y1)continue;var major=Math.round(v/step)%5===0;
   o+='<line x1="'+x+'" y1="'+y.toFixed(1)+'" x2="'+(x+dir*(major?12:6))+'" y2="'+y.toFixed(1)+'"/>';if(major)o+='<text x="'+(x+dir*16)+'" y="'+(y+3).toFixed(1)+'"'+(right?'':' class="r"')+'>'+v+'</text>';}
  var bw=58,bx=right?x+4:x-4-bw;return o+'<path d="M'+(right?x+2:x-2)+' '+ym+'l'+(dir*8)+' -8v16z" class="ptr"/><rect x="'+bx+'" y="'+(ym-9)+'" width="'+bw+'" height="18" rx="2" class="bx"/><text x="'+(bx+bw/2)+'" y="'+(ym+4)+'" class="val">'+Math.round(val)+'</text><text x="'+(bx+bw/2)+'" y="'+(y0-8)+'" class="lab">'+label+'</text></g>';}
 if(yR1-yR0>120)s+=vscale(xR,yR0,yR1,agl,agl>1500?50:agl>400?10:5,I18T('alt_m'),false);
 if(yL1-yL0>120)s+=vscale(xL,yL0,yL1,DHUD.hs*3.6,10,I18T('gs_km_h'),true);
 // crosshair: long gapped arms with ticks, inner brackets, centre circle
 var arm=Math.max(150,Math.min(300,H*0.26)),gap=16;s+='<g class="xh"><path d="M'+(cx-arm)+' '+cy+'H'+(cx-gap)+'M'+(cx+gap)+' '+cy+'H'+(cx+arm)+'M'+cx+' '+(cy-arm*.62)+'V'+(cy-gap)+'M'+cx+' '+(cy+gap)+'V'+(cy+arm*.62)+'"/>';
 for(var t=1;t<=4;t++){var dx=arm*t/4.6;s+='<path d="M'+(cx-dx)+' '+(cy-5)+'v10M'+(cx+dx)+' '+(cy-5)+'v10M'+(cx-5)+' '+(cy-dx*.62)+'h10M'+(cx-5)+' '+(cy+dx*.62)+'h10" class="tk"/>';}
 var bwid=arm*.52,bh=arm*.34;s+='<path d="M'+(cx-bwid)+' '+(cy-bh+14)+'v-14h14M'+(cx+bwid)+' '+(cy-bh+14)+'v-14h-14M'+(cx-bwid)+' '+(cy+bh-14)+'v14h14M'+(cx+bwid)+' '+(cy+bh-14)+'v14h-14" class="br"/><circle cx="'+cx+'" cy="'+cy+'" r="5" class="c0"/><circle cx="'+cx+'" cy="'+cy+'" r="1.5" class="dot"/>';
 // pitch marks along the vertical arm (gimbal angle)
 var ppv=H/camera.fov;for(var p=0;p>=-90;p-=10){var y=cy-(p+elDeg)*ppv;if(Math.abs(y-cy)>arm*.62||Math.abs(y-cy)<gap)continue;s+='<path d="M'+(cx+9)+' '+y.toFixed(1)+'h16" class="pl"/><text x="'+(cx+29)+'" y="'+(y+3).toFixed(1)+'" class="pt">'+(p===0?'HOR':p)+'</text>';}
 s+='</g>';
 // corner data blocks
 var t=new Date(envNow()),utc=t.toISOString().slice(11,19),run=Math.floor((now-DHUD.t0)/1000),rc=('0'+Math.floor(run/3600)).slice(-2)+':'+('0'+Math.floor(run/60)%60).slice(-2)+':'+('0'+run%60).slice(-2);
 var tl=[['UTC',utc+'Z'],[I18T('elev'),Math.round(agl)+' m · '+Math.round(agl*3.281)+' ft'],[I18T('hdg'),hdg.toFixed(1)+'° T'],[I18T('gmb'),'−'+elDeg.toFixed(1)+'°']];
 var tr=[[I18T('mode'),active?(I18T('auto_orbit')):(I18T('manual'))],[I18T('sensor'),{eo:'EO',nv:'NV',ir:'IR'}[DHUD.sens]],['FOV',camera.fov.toFixed(0)+'°'],['REC',rc]];
 function blk(rows,x,y,right){var o='';rows.forEach(function(r,i){o+='<text x="'+x+'" y="'+(y+i*15)+'" class="dk'+(right?' r':'')+'">'+esc(r[0])+'</text><text x="'+(right?x-58:x+58)+'" y="'+(y+i*15)+'" class="dv'+(right?' r':'')+'">'+esc(r[1])+'</text>';});return o;}
 var hb=dhRect('dhHolo'),mmR=DL.on?null:dhRect('mmap');if(DL.on){s+=blk(tr,DL.R0-34,yR0-70,true);smapTel(tl,ac,home,agl,zh);}else s+=blk(tl,mg?Math.max(20,mg.left-40):20,(mg?mg.bottom:200)+48,false)+blk(tr,mmR?mmR.left-12:(gz?gz.right:x1),(mmR?Math.max(mmR.top+14,(hb&&hb.height?hb.bottom:0)+26):(hb&&hb.height?hb.bottom:(gz?gz.bottom:200))+26),true);
 if(DL.on){x1=DL.R0-34;yR1=DL.li-62;yL1=236;x0=DL.L0+2;}
 var br='<text x="'+(mmR?mmR.left-12:x1)+'" y="'+(yR1+2)+'" class="dk r">'+(I18T('focus'))+'</text><text x="'+(mmR?mmR.left-12:x1)+'" y="'+(yR1+17)+'" class="dv r">'+fmtLL6(fo.lat,fo.lon)+'</text><text x="'+(mmR?mmR.left-12:x1)+'" y="'+(yR1+32)+'" class="dv r">MGRS '+mgrs(fo.lat,fo.lon)+' · '+(I18T('slant'))+fmtKm(slant/1000)+'</text>';
 var bl='<text x="'+x0+'" y="'+(yL1+2)+'" class="dk">'+(I18T('uav'))+'</text><text x="'+x0+'" y="'+(yL1+17)+'" class="dv">'+fmtLL6(ac.lat,ac.lon)+'</text><text x="'+x0+'" y="'+(yL1+32)+'" class="dv">D '+fmtKm(home/1000)+' · V.S '+DHUD.vs.toFixed(1)+' m/s</text>';
 s+=br+(DL.on?'':bl);
 var svg=document.getElementById('dhSvg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.innerHTML=s;
 var ch=document.getElementById('dhSens');if(ch){var L=[['eo',I18T('eo')],['nv',I18T('nv')],['ir',I18T('ir_sim')]];ch.innerHTML=L.map(function(c){return '<button data-ds="'+c[0]+'" class="'+(DHUD.sens===c[0]?'on':'')+'">'+c[1]+'</button>';}).join('');ch.style.left=mid+'px';ch.style.top=(yT+52)+'px';}
 holoStep(now,hdg,elDeg,agl,gz);}
function droneSensor(){var on=L2.drone&&L2.drone.on&&mode==='street'&&!(typeof SKYV!=='undefined'&&SKYV.on);if(!on)return;var f='';
 if(DHUD.sens==='nv')f='grayscale(1) brightness(1.05) contrast(1.35) sepia(1) hue-rotate(58deg) saturate(2.2)';else if(DHUD.sens==='ir')f='url(#seThermal) contrast(1.1)';canvas.style.filter=f;}
function wireDroneHud(){var ch=document.getElementById('dhSens');if(!ch||ch._w)return;ch._w=1;ch.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-ds]');if(!b)return;e.stopPropagation();DHUD.sens=b.getAttribute('data-ds');droneSensor();});
 var bd=document.getElementById('bDrone');if(bd)bd.addEventListener('click',function(){setTimeout(function(){if(!(L2.drone&&L2.drone.on)&&!(SKYV&&SKYV.on))canvas.style.filter='';else droneSensor();},30);});}
// ---- own-ship card: AETHER A-7-01 — the reference render wrapped onto a 3D armature ----
// The photo is cut out (data/aether-a701.png) and projected onto a relief armature built from a depth map
// (data/aether-depth.png: R = depth, A = silhouette): hemispheres for the plasma balls and glass bubble, an
// inflated pod for the hull. Live layers on top: lightning crackle, star-burst flares, ripple rings, turbine glow.
function fillPlasma(P){var a=P.fa,R=P.R0,i=0,p=new T3.Vector3(),q=new T3.Vector3(),s1=new T3.Vector3(),s2=new T3.Vector3(),up=new T3.Vector3(0,1,0);
 for(var f=0;f<P.NF;f++){var d=P.dirs[f];d.x+=(Math.random()-.5)*.35;d.y+=(Math.random()-.5)*.35;d.z+=(Math.random()-.5)*.2;d.z=Math.abs(d.z)+.15;d.normalize();s1.crossVectors(d,up);if(s1.lengthSq()<1e-4)s1.set(1,0,0);s1.normalize();s2.crossVectors(d,s1);
  p.set(0,0,0);for(var s=1;s<=P.SEG;s++){var t=s/P.SEG,j=R*.18*Math.sin(t*Math.PI);q.copy(d).multiplyScalar(R*.95*t).addScaledVector(s1,(Math.random()-.5)*j*2).addScaledVector(s2,(Math.random()-.5)*j*2);
   a[i++]=p.x;a[i++]=p.y;a[i++]=p.z;a[i++]=q.x;a[i++]=q.y;a[i++]=q.z;p.copy(q);}}
 P.fgeo.attributes.position.needsUpdate=true;}
var AETH={CW:1409,CH:499,S:108,ZMIN:-150,ZMAX:221,
 balls:[[229-88,303-108,131,0],[1355-88,308-108,130,0],[794-88,214-108,94,-150]],hub:[723-88,436-108,131,90]};
function aethW(px,py,pz){return [(px-AETH.CW/2)/AETH.S,-(py-AETH.CH/2)/AETH.S,(pz||0)/AETH.S];}
function holoBuild(){var c=document.getElementById('dhHoloC');if(!c)return null;var r;try{r=new T3.WebGLRenderer({canvas:c,alpha:true,antialias:true});}catch(_e){return null;}
 r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
 var sc=new T3.Scene(),cam=new T3.PerspectiveCamera(24,2,1,120),g=new T3.Group(),i;cam.position.set(0,.6,19);cam.lookAt(0,-.1,0);sc.add(g);
 function cvs(w,h){var e=document.createElement('canvas');e.width=w;e.height=h;return e;}
 function radTex(stops){var e=cvs(128,128),x=e.getContext('2d'),gr=x.createRadialGradient(64,64,0,64,64,64);stops.forEach(function(s){gr.addColorStop(s[0],s[1]);});x.fillStyle=gr;x.fillRect(0,0,128,128);return new T3.CanvasTexture(e);}
 var glow=radTex([[0,'rgba(255,255,255,1)'],[.2,'rgba(210,225,255,.85)'],[.5,'rgba(150,140,255,.35)'],[1,'rgba(80,60,200,0)']]);
 var fe=cvs(512,512),fx=fe.getContext('2d');fx.translate(256,256);fx.globalCompositeOperation='lighter';
 for(i=0;i<52;i++){var an=Math.random()*Math.PI*2,ln=110+Math.random()*140,wd=1.2+Math.random()*3,hu=Math.round(Math.random()*360);fx.save();fx.rotate(an);var lg=fx.createLinearGradient(0,0,ln,0);lg.addColorStop(0,'rgba(255,255,255,.85)');lg.addColorStop(.4,'hsla('+hu+',90%,80%,.4)');lg.addColorStop(1,'hsla('+hu+',90%,70%,0)');fx.fillStyle=lg;fx.beginPath();fx.moveTo(0,-wd);fx.lineTo(ln,0);fx.lineTo(0,wd);fx.fill();fx.restore();}
 var flareT=new T3.CanvasTexture(fe);
 // armature + wrapped photo (built once both images arrive)
 var H={r:r,sc:sc,cam:cam,g:g,w:0,h:0,pjt:0,plasmas:[],rip:[],ready:false};
 var photo=new T3.TextureLoader().load('data/aether-a701.png?v='+SEV,function(){H.tx=1;});photo.colorSpace=T3.SRGBColorSpace;photo.anisotropy=8;
 var dimg=new Image();dimg.onload=function(){var GW=dimg.width,GH=dimg.height,e=cvs(GW,GH),x=e.getContext('2d');x.drawImage(dimg,0,0);var px=x.getImageData(0,0,GW,GH).data;
  var V=new Float32Array(GW*GH*3),UV=new Float32Array(GW*GH*2),I=[],msk=new Uint8Array(GW*GH),Z=new Float32Array(GW*GH),gi,gj,k;
  for(gj=0;gj<GH;gj++)for(gi=0;gi<GW;gi++){k=gj*GW+gi;var u=gi/(GW-1),v=gj/(GH-1),zp=AETH.ZMIN+px[k*4]/255*(AETH.ZMAX-AETH.ZMIN);msk[k]=px[k*4+3]>127?1:0;Z[k]=zp;
   var w3=aethW(u*AETH.CW,v*AETH.CH,zp);V[k*3]=w3[0];V[k*3+1]=w3[1];V[k*3+2]=w3[2];UV[k*2]=u;UV[k*2+1]=1-v;}
  for(gj=0;gj<GH-1;gj++)for(gi=0;gi<GW-1;gi++){var a=gj*GW+gi,b=a+1,c2=a+GW,d=c2+1;if(!(msk[a]||msk[b]||msk[c2]||msk[d]))continue;I.push(a,c2,b,b,c2,d);}
  var geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.BufferAttribute(V,3));geo.setAttribute('uv',new T3.BufferAttribute(UV,2));geo.setIndex(I);
  var mesh=new T3.Mesh(geo,new T3.MeshBasicMaterial({map:photo,transparent:true,alphaTest:.04,side:T3.DoubleSide}));g.add(mesh);H.mesh=mesh;H.ready=true;};
 dimg.src='data/aether-depth.png?v='+SEV;
 // live overlays on the three plasma balls
 function ripples(parent,r0,n){for(var q=0;q<n;q++){var m=new T3.Mesh(new T3.RingGeometry(.985,1,96),new T3.MeshBasicMaterial({color:0xe6eeff,transparent:true,opacity:.35,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}));m.rotation.x=-Math.PI/2+.12;parent.add(m);H.rip.push({m:m,ph:q/n,r0:r0});}}
 AETH.balls.forEach(function(B,bi){var w3=aethW(B[0],B[1],B[3]),R0=B[2]/AETH.S,grp=new T3.Group();grp.position.set(w3[0],w3[1],w3[2]);g.add(grp);
  var NF=14,SEG=6,dirs=[];for(var f=0;f<NF;f++){var th=Math.random()*Math.PI*2;dirs.push(new T3.Vector3(Math.cos(th),Math.sin(th),.4+Math.random()*.6).normalize());}
  var nv=NF*SEG*2,fa=new Float32Array(nv*3),fc=new Float32Array(nv*3),cl=new T3.Color();for(var vi=0;vi<nv;vi++){if(vi%12===0)cl.setHSL([.78,.85,.62,.55,.92][(Math.random()*5)|0],1,.75);fc[vi*3]=cl.r;fc[vi*3+1]=cl.g;fc[vi*3+2]=cl.b;}
  var fgeo=new T3.BufferGeometry();fgeo.setAttribute('position',new T3.BufferAttribute(fa,3));fgeo.setAttribute('color',new T3.BufferAttribute(fc,3));
  var fil=new T3.LineSegments(fgeo,new T3.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}));grp.add(fil);
  var core=new T3.Sprite(new T3.SpriteMaterial({map:glow,color:0xffffff,transparent:true,opacity:.8,blending:T3.AdditiveBlending,depthWrite:false}));core.scale.setScalar(R0*.9);core.position.z=R0*.9;grp.add(core);
  var flare=new T3.Sprite(new T3.SpriteMaterial({map:flareT,color:0xffffff,transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}));flare.scale.setScalar(R0*4.2);flare.position.z=R0*.5;grp.add(flare);
  var halo=new T3.Sprite(new T3.SpriteMaterial({map:glow,color:0xb8a0ff,transparent:true,opacity:.25,blending:T3.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(R0*2.6);grp.add(halo);
  if(bi<2)ripples(grp,R0*1.03,4);
  var P={grp:grp,fa:fa,fgeo:fgeo,dirs:dirs,NF:NF,SEG:SEG,R0:R0,fil:fil,core:core,flare:flare,halo:halo};fillPlasma(P);H.plasmas.push(P);});
 // turbine hub glow inside the glass bubble + its ripple skirt
 var hb=AETH.hub,hw=aethW(hb[0],hb[1],hb[3]+hb[2]*.55);var hub=new T3.Sprite(new T3.SpriteMaterial({map:glow,color:0x9fe8ff,transparent:true,opacity:.7,blending:T3.AdditiveBlending,depthWrite:false}));hub.scale.setScalar(.75);hub.position.set(hw[0],hw[1],hw[2]);g.add(hub);H.hub=hub;
 var bgp=new T3.Group(),bw3=aethW(hb[0],hb[1]+20,hb[3]);bgp.position.set(bw3[0],bw3[1],bw3[2]);g.add(bgp);ripples(bgp,hb[2]/AETH.S*1.05,3);
 // soft floor shadow
 var sh=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,.55)'],[.6,'rgba(0,0,0,.2)'],[1,'rgba(0,0,0,0)']]),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.scale.set(10,2.4,1);sh.position.set(.3,-2.75,0);sc.add(sh);
 return H;}
function holoStep(now,hdg,elDeg,agl,gz){var box=document.getElementById('dhHolo');if(!box)return;var on=L2.drone&&L2.drone.on&&mode==='street';box.style.display=on?'':'none';if(!on)return;
 var mgE=document.getElementById('miniGlobe'),mgR=mgE&&mgE.offsetParent?mgE.getBoundingClientRect():null,bw=box.offsetWidth||340;if(mgR&&mgR.width){box.style.left=Math.max(8,Math.round(mgR.left-bw-14))+'px';box.style.top=Math.round(mgR.top)+'px';}else if(DL.on&&DL.holo){box.style.left=DL.holo.left+'px';box.style.top=DL.holo.top+'px';}else if(gz){box.style.left=(gz.right-box.offsetWidth)+'px';box.style.top=(gz.bottom+12)+'px';}
 if(!DHUD.holo)DHUD.holo=holoBuild();var Hh=DHUD.holo;if(!Hh)return;var cv=Hh.r.domElement,w=cv.clientWidth,h=cv.clientHeight;
 if(w&&(w!==Hh.w||h!==Hh.h)){Hh.w=w;Hh.h=h;Hh.r.setSize(w,h,false);var as=w/h,tv=Math.max(.15,.37/as);Hh.cam.aspect=as;Hh.cam.fov=2*Math.atan(tv)*180/Math.PI;Hh.cam.updateProjectionMatrix();}
 // gentle turntable sway so the wrapped armature reads as 3D; hover bob
 Hh.g.rotation.y=Math.sin(now/4200)*.14;Hh.g.rotation.x=.04+Math.sin(now/5300)*.03;Hh.g.position.y=Math.sin(now/1100)*.06;
 if(now-(Hh.lr||0)<33)return;Hh.lr=now;
 if(now-Hh.pjt>75){Hh.pjt=now;Hh.plasmas.forEach(fillPlasma);}
 Hh.plasmas.forEach(function(P,pi){var fl=Math.random()<.2?.3:0;P.fil.material.opacity=Math.min(.9,.35+.2*Math.sin(now/80+pi*2)+fl);P.core.material.opacity=.6+.25*Math.sin(now/110+pi);P.flare.material.rotation=now/9000*(pi%2?1:-1);P.flare.material.opacity=.4+.15*Math.sin(now/300+pi);P.halo.material.opacity=.18+.1*Math.sin(now/170+pi*1.3);});
 Hh.rip.forEach(function(R){var ph=(now/2600+R.ph)%1;R.m.scale.setScalar(R.r0*(1+ph*1.1));R.m.material.opacity=.38*(1-ph)*(ph<.08?ph/.08:1);});
 if(Hh.hub)Hh.hub.material.opacity=.5+.3*Math.sin(now/140);
 Hh.r.render(Hh.sc,Hh.cam);var zh=LZ();var hdS=box.querySelector('.dhHd span');if(hdS){var hdt2=I18T('my_uav');if(hdS.textContent!==hdt2)hdS.textContent=hdt2;}
 document.getElementById('dhHoloT').innerHTML='<span>'+(I18T('alt'))+Math.round(agl)+' m</span><span>'+(I18T('hdg_2'))+('00'+Math.round(hdg)%360).slice(-3)+'°</span><span>'+(I18T('gmb_2'))+'−'+Math.round(elDeg)+'°</span><span>'+(I18T('gs_2'))+Math.round(DHUD.hs*3.6)+' km/h</span>';}

function fmtLL6(lat,lon){return Math.abs(lat).toFixed(5)+'°'+(lat>=0?'N':'S')+' '+Math.abs(lon).toFixed(5)+'°'+(lon>=0?'E':'W');}
// sky-eye reticle label: focus coordinates + ring radius from the current ground resolution
function skyRetStep(){var lb=document.getElementById('skyRetL');if(!lb||!SKYV.on)return;var ll=viewLL(),mpp=skyMpp(),r=Math.round(44*mpp),zh=LZ();
 var nice=[5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000,20000],rr=nice[0];nice.forEach(function(v){if(v<=r)rr=v;});var px=rr/mpp;
 var ring=document.getElementById('skyRing');if(ring){ring.setAttribute('r',px.toFixed(1));}var rl=document.getElementById('skyRingL');if(rl){rl.setAttribute('x',(px*0.71+5).toFixed(1));rl.setAttribute('y',(-px*0.71-5).toFixed(1));rl.textContent=rr>=1000?rr/1000+' km':rr+' m';}
 lb.innerHTML='<b>'+(I18T('focus_2'))+fmtLL6(ll.lat,ll.lon)+'</b><span>MGRS '+mgrs(ll.lat,ll.lon)+'</span>';}


// ====================================================================
// DRIVE MODULE — "SE-VOLT" sci-fi mirror-chrome EV (original design), street autopilot on real road data.
//  · Roads, road class and one-way come from the live OpenStreetMap tiles (OpenMapTiles schema).
//  · Route: OSRM (real driving route) when reachable, otherwise A* on the loaded road graph (one-way aware).
//  · Traffic controls: real OSM traffic_signals / stop / give_way nodes via Overpass when reachable, otherwise
//    inferred from the road classes meeting at each junction (marked as such in the HUD).
//  · Signal timing is simulated (fixed-time plan per junction), speed limits are per-country road-class defaults
//    (the vector tiles carry no maxspeed), drive side follows the country.
//  · Flight mode lifts off and flies a straight line above the rooftops; energy model with regen.
// ====================================================================
var DRV={on:false,view:'fp',fly:false,flyPh:0,alt:0,speedX:1,simT:0,car:null,cock:null,parts:null,route:null,s:0,v:0,yaw:0,pos:new T3.Vector3(),geo:null,
 ctl:[],scanAt:0,soc:1,cap:210,odo:0,stopT:0,state:'idle',dest:null,ovp:null,lht:false,us:true,lim:13.4,rcls:5,road:'',hudAt:0,scrAt:0,gen:-1,
 camP:new T3.Vector3(),camL:new T3.Vector3(),camInit:false,pick:false,planning:false,pool:null,wheelSpin:0,env:null,msg:''};
var DRV_LHT={GB:1,IE:1,JP:1,AU:1,NZ:1,IN:1,ZA:1,HK:1,MO:1,SG:1,MY:1,TH:1,ID:1,PK:1,BD:1,LK:1,NP:1,KE:1,UG:1,TZ:1,ZM:1,ZW:1,MZ:1,BW:1,NA:1,MW:1,CY:1,MT:1,JM:1,TT:1,BS:1,BB:1,GY:1,SR:1,MU:1,BN:1,TL:1,FJ:1,PG:1};
// default limits by road class (OpenMapTiles class index → m/s): US in mph, elsewhere km/h
var DRV_LIM_US=[65,55,40,35,30,25,15,10,10,0,25,10],DRV_LIM_KM=[110,90,60,50,50,40,20,15,10,0,40,10];
function drvLimit(cls){var v=(DRV.us?DRV_LIM_US:DRV_LIM_KM)[cls];if(v==null||!v)v=DRV.us?25:40;return DRV.us?v*0.44704:v/3.6;}
function drvFmtV(ms){return DRV.us?Math.round(ms/0.44704):Math.round(ms*3.6);}
function drvUnit(){return DRV.us?'mph':'km/h';}
// ---------- car model ----------
function drvEnvMap(){if(DRV.env)return DRV.env;try{var pm=new T3.PMREMGenerator(renderer),es=new T3.Scene(),e=document.createElement('canvas');e.width=16;e.height=256;var x=e.getContext('2d'),gr=x.createLinearGradient(0,0,0,256);
 gr.addColorStop(0,'#5d7fb8');gr.addColorStop(.38,'#1b2a48');gr.addColorStop(.5,'#c9d6ea');gr.addColorStop(.53,'#2a3242');gr.addColorStop(1,'#07090d');x.fillStyle=gr;x.fillRect(0,0,16,256);
 es.add(new T3.Mesh(new T3.SphereGeometry(40,32,16),new T3.MeshBasicMaterial({map:new T3.CanvasTexture(e),side:T3.BackSide})));
 // city-light strips + soft boxes so the mirror skin always has something bright to reflect
 for(var i=0;i<26;i++){var a=i/26*Math.PI*2,h=2+Math.random()*10,m=new T3.Mesh(new T3.PlaneGeometry(2+Math.random()*5,h),new T3.MeshBasicMaterial({color:new T3.Color().setHSL(Math.random()<.5?.08:.58,.7,.55+Math.random()*.3),side:T3.DoubleSide}));m.position.set(Math.cos(a)*30,h/2-2,Math.sin(a)*30);m.lookAt(0,h/2-2,0);es.add(m);}
 [[0,30,0,30,8],[18,10,10,8,4],[-16,8,-12,10,3]].forEach(function(b){var m=new T3.Mesh(new T3.PlaneGeometry(b[3],b[4]),new T3.MeshBasicMaterial({color:0xffffff,side:T3.DoubleSide}));m.position.set(b[0],b[1],b[2]);m.lookAt(0,0,0);es.add(m);});
 DRV.env=pm.fromScene(es,.02).texture;pm.dispose();}catch(_e){DRV.env=null;}return DRV.env;}
function drvBuildCar(){var g=new T3.Group(),i,k,env=drvEnvMap();
 var chrome=new T3.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.045,clearcoat:1,clearcoatRoughness:.03,envMap:env,envMapIntensity:1.5});
 var glass=new T3.MeshPhysicalMaterial({color:0x050a14,metalness:.4,roughness:.04,clearcoat:1,envMap:env,envMapIntensity:1.1,transparent:true,opacity:.92});
 var dark=new T3.MeshStandardMaterial({color:0x0a0c10,metalness:.6,roughness:.5});
 // body: lofted wedge, forward = +Z, nose low, cab-forward roof, Kamm tail
 var SEC=[[-2.45,.45,1.02,.32],[-2.3,.95,1.0,.26],[-1.6,1.18,1.0,.24],[-.6,1.36,.98,.24],[.4,1.3,.98,.24],[1.2,1.0,.98,.24],[1.9,.74,.96,.26],[2.35,.58,.9,.28],[2.5,.42,.6,.34]];
 function lerpSec(u){var x=u*(SEC.length-1),j=Math.min(SEC.length-2,Math.floor(x)),t=x-j,e=(1-Math.cos(t*Math.PI))/2,A=SEC[j],B=SEC[j+1];return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*e,A[2]+(B[2]-A[2])*e,A[3]+(B[3]-A[3])*e];}
 var NS=40,NP=32,V=[],I=[];for(k=0;k<NS;k++){var s=lerpSec(k/(NS-1)),top=s[1],w=s[2],bot=s[3],cy=(top+bot)/2,ht=(top-bot)/2;
  for(i=0;i<=NP;i++){var an=i/NP*Math.PI*2,ca=Math.cos(an),sa=Math.sin(an),ex=ca>0?.38:.9;V.push((sa<0?-1:1)*Math.pow(Math.abs(sa),.32)*w,cy+(ca<0?-1:1)*Math.pow(Math.abs(ca),ex)*ht,s[0]);}}
 for(k=0;k<NS-1;k++)for(i=0;i<NP;i++){var a=k*(NP+1)+i,b=a+1,c=a+NP+1,d=c+1;I.push(a,b,c,b,d,c);}
 var bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.Float32BufferAttribute(V,3));bg.setIndex(I);bg.computeVertexNormals();
 var body=new T3.Mesh(bg,chrome);g.add(body);
 // greenhouse: one sweep of black glass from windshield to rear window
 var gs=new T3.Mesh(new T3.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI*.5),glass);gs.scale.set(.86,.34,1.75);gs.position.set(0,1.0,-.35);g.add(gs);
 // side light blades
 var blades=[];[-1,1].forEach(function(sd){var sb=new T3.Mesh(new T3.BoxGeometry(.02,.03,4.2),new T3.MeshBasicMaterial({color:0x48e6ff}));sb.position.set(sd*1.0,.6,.05);g.add(sb);blades.push(sb);});
 // turn-signal lamps (local +X is the driver's left in the drawn frame)
 var blink=[];[[.82,2.47],[-.82,2.47],[.86,-2.49],[-.86,-2.49]].forEach(function(p){var m=new T3.Mesh(new T3.BoxGeometry(.22,.07,.05),new T3.MeshBasicMaterial({color:0x2a1a05}));m.position.set(p[0],.66,p[1]);m.userData.side=p[0]>0?'L':'R';g.add(m);blink.push(m);});
 // light bars + underglow
 var fl=new T3.Mesh(new T3.BoxGeometry(1.1,.04,.03),new T3.MeshBasicMaterial({color:0xeaf6ff}));fl.position.set(0,.6,2.53);g.add(fl);
 var rl=new T3.Mesh(new T3.BoxGeometry(1.9,.05,.03),new T3.MeshBasicMaterial({color:0xff2a3c}));rl.position.set(0,.92,-2.48);g.add(rl);
 var gtx=(function(){var e=document.createElement('canvas');e.width=e.height=64;var x=e.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(120,230,255,.9)');gr.addColorStop(1,'rgba(40,120,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new T3.CanvasTexture(e);})();
 var ug=new T3.Mesh(new T3.PlaneGeometry(2.6,5.6),new T3.MeshBasicMaterial({map:gtx,transparent:true,opacity:.55,blending:T3.AdditiveBlending,depthWrite:false}));ug.rotation.x=-Math.PI/2;ug.position.y=.06;g.add(ug);
 // wheels (fold flat and turn into lift fans in flight mode)
 var wheels=[],rimM=new T3.MeshBasicMaterial({color:0x6fe6ff,transparent:true,opacity:.9,blending:T3.AdditiveBlending,depthWrite:false});
 [[-1,1.55],[1,1.55],[-1,-1.55],[1,-1.55]].forEach(function(p){var hold=new T3.Group();hold.position.set(p[0]*.88,.38,p[1]);var spin=new T3.Group();hold.add(spin);
  var tire=new T3.Mesh(new T3.CylinderGeometry(.37,.37,.26,28),dark);tire.rotation.z=Math.PI/2;spin.add(tire);
  var rim=new T3.Mesh(new T3.TorusGeometry(.27,.03,8,32),rimM);rim.rotation.y=Math.PI/2;rim.position.x=p[0]*.14;spin.add(rim);
  var jet=new T3.Mesh(new T3.CircleGeometry(.3,24),new T3.MeshBasicMaterial({map:gtx,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}));jet.rotation.x=Math.PI/2;jet.position.y=-.02;hold.add(jet);
  g.add(hold);wheels.push({hold:hold,spin:spin,side:p[0],jet:jet});});
 // cockpit (first person only): dash, yoke ring, floating centre screen, pillars
 var ck=new T3.Group();ck.visible=false;g.add(ck);
 var dashM=new T3.MeshStandardMaterial({color:0x10141b,metalness:.3,roughness:.6}),trimM=new T3.MeshBasicMaterial({color:0x3fd0ff});
 var dash=new T3.Mesh(new T3.BoxGeometry(1.86,.12,.5),dashM);dash.position.set(0,.76,1.0);ck.add(dash);
 var trim=new T3.Mesh(new T3.BoxGeometry(1.8,.012,.012),trimM);trim.position.set(0,.825,.77);ck.add(trim);
 var yoke=new T3.Mesh(new T3.TorusGeometry(.17,.02,10,40),new T3.MeshStandardMaterial({color:0x1a1f27,metalness:.5,roughness:.35}));yoke.position.set(.36,.8,.66);yoke.rotation.x=-.5;ck.add(yoke);
 var scC=document.createElement('canvas');scC.width=512;scC.height=320;var scT=new T3.CanvasTexture(scC);scT.colorSpace=T3.SRGBColorSpace;
 var scr=new T3.Mesh(new T3.PlaneGeometry(.34,.21),new T3.MeshBasicMaterial({map:scT,toneMapped:false}));scr.position.set(0,.9,.82);scr.rotation.set(-.35,Math.PI,0);ck.add(scr);
 [[-.82,1],[.82,1]].forEach(function(p){var pl=new T3.Mesh(new T3.BoxGeometry(.07,.9,.07),dashM);pl.position.set(p[0],1.38,.55);pl.rotation.x=-.62;ck.add(pl);});
 var hood=new T3.Mesh(new T3.PlaneGeometry(1.7,.9),chrome);hood.rotation.x=-Math.PI/2+.22;hood.position.set(0,.68,1.75);ck.add(hood);
 DRV.parts={blink:blink,blades:blades,body:body,gs:gs,wheels:wheels,ug:ug,ck:ck,scC:scC,scT:scT,yoke:yoke,fl:fl,rl:rl};
 g.traverse(function(o){o.frustumCulled=false;o.layers.set(0);});return g;}
// ---------- per-tile road index: segment grid (class + name) and junctions ----------
var DRV_CELL=40;
// road network builder: polylines → graph, healing T-junctions whose shared vertex was generalised away in the tiles
function drvNet(lines,snap){var CS=24,SG={},segs=[],cnt={},li,i;
 function key(x,z){return Math.round(x)+','+Math.round(z);}
 lines.forEach(function(L,li){var c=L.c;cnt[key(c[0],c[1])]=(cnt[key(c[0],c[1])]||0)+1;var e=c.length-2;cnt[key(c[e],c[e+1])]=(cnt[key(c[e],c[e+1])]||0)+1;
  for(var i=0;i+3<c.length;i+=2){var s={ax:c[i],az:c[i+1],bx:c[i+2],bz:c[i+3],li:li,sp:[]};var id=segs.length;segs.push(s);
   var x0=Math.floor(Math.min(s.ax,s.bx)/CS),x1=Math.floor(Math.max(s.ax,s.bx)/CS),z0=Math.floor(Math.min(s.az,s.bz)/CS),z1=Math.floor(Math.max(s.az,s.bz)/CS);
   for(var a=x0;a<=x1;a++)for(var b=z0;b<=z1;b++){var k=a+','+b;(SG[k]||(SG[k]=[])).push(id);}}});
 var links=[];
 lines.forEach(function(L,li){var c=L.c;[0,c.length-2].forEach(function(k){var x=c[k],z=c[k+1];if(cnt[key(x,z)]>1)return;var cx=Math.floor(x/CS),cz=Math.floor(z/CS),best=null,bd=snap*snap,bt=0;
  for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var Lg=SG[a+','+b];if(!Lg)continue;for(var q=0;q<Lg.length;q++){var s=segs[Lg[q]];if(s.li===li)continue;var dx=s.bx-s.ax,dz=s.bz-s.az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/l)):0,px=s.ax+t*dx,pz=s.az+t*dz,e=(px-x)*(px-x)+(pz-z)*(pz-z);if(e<bd){bd=e;best=s;bt=t;}}}
  if(best){var px=best.ax+bt*(best.bx-best.ax),pz=best.az+bt*(best.bz-best.az);best.sp.push({t:bt,x:px,z:pz});links.push([x,z,px,pz,li]);}});});
 return {segs:segs,links:links,key:key};}
function drvIndexTile(T){if(T._dx||!T.data)return T._dx;var d=T.data,G={},lines=[];
 function put(c,o){(G[c]||(G[c]=[])).push(o);}
 d.rd.forEach(function(r,ri){var cl=r[0];if(cl>8&&cl!==10)return;var ow=d.ow?d.ow[ri]:0;lines.push({c:r.slice(2),cl:cl,ow:ow});
  for(var i=2;i+3<r.length;i+=2){var x1=r[i],z1=r[i+1],x2=r[i+2],z2=r[i+3],seg=[x1,z1,x2,z2,cl,ow,ri,d];
   var cx0=Math.floor(Math.min(x1,x2)/DRV_CELL),cx1=Math.floor(Math.max(x1,x2)/DRV_CELL),cz0=Math.floor(Math.min(z1,z2)/DRV_CELL),cz1=Math.floor(Math.max(z1,z2)/DRV_CELL);
   for(var a=cx0;a<=cx1;a++)for(var b=cz0;b<=cz1;b++)put(a+','+b,seg);}});
 // junction detection on the healed network (vehicle roads only)
 var veh=lines.filter(function(L){return L.cl<=6||L.cl===10;}),NT=drvNet(veh,9),K=NT.key,nb={},cls={},ax={};
 function link(x1,z1,x2,z2,cl){var a=K(x1,z1),b=K(x2,z2);if(a===b)return;(nb[a]||(nb[a]={}))[b]=1;(nb[b]||(nb[b]={}))[a]=1;[[a,x1,z1,x2,z2],[b,x2,z2,x1,z1]].forEach(function(e){var C=cls[e[0]]||(cls[e[0]]=[]);if(C.indexOf(cl)<0)C.push(cl);if(ax[e[0]]==null||cl<ax[e[0]][0])ax[e[0]]=[cl,Math.atan2(e[3]-e[1],e[4]-e[2])];});}
 NT.segs.forEach(function(sg){var cl=veh[sg.li].cl,pts=[[sg.ax,sg.az]].concat(sg.sp.sort(function(p,q){return p.t-q.t;}).map(function(p){return [p.x,p.z];}),[[sg.bx,sg.bz]]);for(var i=0;i+1<pts.length;i++)link(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],cl);});
 NT.links.forEach(function(l){link(l[0],l[1],l[2],l[3],veh[l[4]].cl);});
 var J=[],JG={};for(var k in nb){var n=0;for(var _ in nb[k])n++;if(n<3)continue;var p=k.split(','),x=+p[0],z=+p[1],C=cls[k].slice().sort(function(a,b){return a-b;});
  var o={x:x,z:z,c1:C[0],c2:C.length>1?C[1]:C[0],ax:ax[k][1],n:n};J.push(o);var c=Math.floor(x/DRV_CELL)+','+Math.floor(z/DRV_CELL);(JG[c]||(JG[c]=[])).push(o);}
 var NG={};(d.rn||[]).forEach(function(r){for(var i=0;i+3<r.c.length;i+=2){var c=Math.floor(r.c[i]/DRV_CELL)+','+Math.floor(r.c[i+1]/DRV_CELL);(NG[c]||(NG[c]=[])).push([r.c[i],r.c[i+1],r.c[i+2],r.c[i+3],r]);}});
 T._dx={G:G,J:J,JG:JG,NG:NG};return T._dx;}
function drvTiles(){var lv=L2.live,out=[];if(!lv)return out;for(var k in lv.tiles){var T=lv.tiles[k];if(T.state==='ready'&&T.data)out.push(T);}return out;}
function drvNearSeg(x,z,maxD){var best=null,bd=(maxD||30)*(maxD||30),cx=Math.floor(x/DRV_CELL),cz=Math.floor(z/DRV_CELL);drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;
 for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var L=X.G[a+','+b];if(!L)continue;for(var i=0;i<L.length;i++){var s=L[i],e=segD2(x,z,s[0],s[1],s[2],s[3]);if(e<bd){bd=e;best=s;}}}});return best;}
function drvLaneSeg(x,z,yaw){var best=null,bd=144,cx=Math.floor(x/DRV_CELL),cz=Math.floor(z/DRV_CELL),fx=Math.sin(yaw),fz=Math.cos(yaw);drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;
 for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var L=X.G[a+','+b];if(!L)continue;for(var i=0;i<L.length;i++){var s=L[i];if(s[4]>6&&s[4]!==10)continue;var dx=s[2]-s[0],dz=s[3]-s[1],dl=Math.hypot(dx,dz);if(dl<.5||Math.abs((dx*fx+dz*fz)/dl)<.8)continue;var e=segD2(x,z,s[0],s[1],s[2],s[3]);if(e<bd){bd=e;best=s;}}}});return best;}
function drvNearName(x,z){var best=null,bd=900,cx=Math.floor(x/DRV_CELL),cz=Math.floor(z/DRV_CELL);drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;
 for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var L=X.NG[a+','+b];if(!L)continue;for(var i=0;i<L.length;i++){var s=L[i],e=segD2(x,z,s[0],s[1],s[2],s[3]);if(e<bd){bd=e;best=s[4];}}}});return best?(LZ()&&best.zh?best.zh:best.n):'';}
function drvNearJunction(x,z,r){var best=null,bd=r*r,cx=Math.floor(x/DRV_CELL),cz=Math.floor(z/DRV_CELL);drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;
 for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var L=X.JG[a+','+b];if(!L)continue;for(var i=0;i<L.length;i++){var j=L[i],e=(j.x-x)*(j.x-x)+(j.z-z)*(j.z-z);if(e<bd){bd=e;best=j;}}}});return best;}
// ---------- route (stored in lat/lon so it survives frame rebases) ----------
function drvRouteLocal(){var R=DRV.route,lv=L2.live;if(!R||!lv)return null;if(R.gen===lv.gen)return R;var n=R.ll.length,P=new Float32Array(n*2),S=new Float32Array(n),acc=0;
 for(var i=0;i<n;i++){P[i*2]=(R.ll[i][1]-lv.lon0)*lv.mLon;P[i*2+1]=(R.ll[i][0]-lv.lat0)*lv.mLat;if(i){acc+=Math.hypot(P[i*2]-P[i*2-2],P[i*2+1]-P[i*2-1]);}S[i]=acc;}
 R.P=P;R.S=S;R.len=acc;R.gen=lv.gen;return R;}
function drvAt(s,out){var R=drvRouteLocal();if(!R)return null;var S=R.S,n=S.length;s=Math.max(0,Math.min(R.len,s));var lo=0,hi=n-1;while(hi-lo>1){var m=(lo+hi)>>1;if(S[m]<=s)lo=m;else hi=m;}
 var L=S[hi]-S[lo]||1,t=(s-S[lo])/L,P=R.P;out=out||{};out.x=P[lo*2]+(P[hi*2]-P[lo*2])*t;out.z=P[lo*2+1]+(P[hi*2+1]-P[lo*2+1])*t;out.yaw=Math.atan2(P[hi*2]-P[lo*2],P[hi*2+1]-P[lo*2+1]);out.i=lo;return out;}
function drvOSRM(a,b){var ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort();},9000);
 var url='https://router.project-osrm.org/route/v1/driving/'+a.lon.toFixed(6)+','+a.lat.toFixed(6)+';'+b.lon.toFixed(6)+','+b.lat.toFixed(6)+'?overview=full&geometries=geojson&steps=true';
 return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){return r.ok?r.json():null;}).then(function(j){clearTimeout(to);if(!j||!j.routes||!j.routes[0])return null;var rt=j.routes[0];
  var ll=rt.geometry.coordinates.map(function(c){return [c[1],c[0]];}),steps=[];(rt.legs||[]).forEach(function(lg){(lg.steps||[]).forEach(function(st){var m=st.maneuver||{};steps.push({lat:m.location[1],lon:m.location[0],type:m.type,mod:m.modifier||'',name:st.name||''});});});
  return {ll:ll,steps:steps,src:'osrm',dur:rt.duration,gen:-1};}).catch(function(){clearTimeout(to);return null;});}
// local A* on the loaded road graph (one-way aware), time-weighted by class default speed
// Rule-aware local router. Edge-based A* (the state is the road segment you arrive on), so turns can be judged:
//  · one-way and access=no/private are hard rules; driveways / parking aisles cost ×4 (only used to start or finish),
//  · turn restrictions from OpenStreetMap (no_left_turn, only_straight_on …) when Overpass is reachable,
//  · no U-turns except at a dead end,
//  · expected delay: signals 15 s, stop signs 8 s, yield 3 s (inferred from the junction's road classes),
//    plus turning time — crossing turns 8 s, kerb-side turns 3 s.
function drvLocalRoute(ax,az,bx,bz,RX){var N={},ids=[],lines=[],E=[];function node(x,z){var key=Math.round(x)+','+Math.round(z);var n=N[key];if(!n){n=N[key]={x:x,z:z,out:[],id:ids.length,cls:[],deg:{}};ids.push(n);}return n;}
 drvTiles().forEach(function(T){var d=T.data;d.rd.forEach(function(r,ri){var cl=r[0];if(r[1]===2&&cl>4)return;if(cl>6&&cl!==10)return;var ac=d.ac?d.ac[ri]:0;if(ac===2)return;lines.push({c:r.slice(2),cl:cl,ow:d.ow?d.ow[ri]:0,ac:ac});});});
 if(!lines.length)return null;var NT=drvNet(lines,12);
 function edge(A,B,L){var len=Math.hypot(B.x-A.x,B.z-A.z);if(len<.01)return;var w=len/drvLimit(L.cl)*(L.ac===1?4:1),dx=(B.x-A.x)/len,dz=(B.z-A.z)/len;
  [[A,B,dx,dz,L.ow!==-1],[B,A,-dx,-dz,L.ow!==1]].forEach(function(q){q[0].deg[q[1].id]=1;q[1].deg[q[0].id]=1;if(q[0].cls.indexOf(L.cl)<0)q[0].cls.push(L.cl);if(!q[4])return;var e={f:q[0],t:q[1],w:w,dx:q[2],dz:q[3],cl:L.cl,id:E.length};E.push(e);q[0].out.push(e);});}
 NT.segs.forEach(function(sg){var L=lines[sg.li],pts=[[sg.ax,sg.az]].concat(sg.sp.sort(function(p,q){return p.t-q.t;}).map(function(p){return [p.x,p.z];}),[[sg.bx,sg.bz]]);
  for(var i=0;i+1<pts.length;i++){var A=node(pts[i][0],pts[i][1]),B=node(pts[i+1][0],pts[i+1][1]);if(A!==B)edge(A,B,L);}});
 NT.links.forEach(function(l){var A=node(l[0],l[1]),B=node(l[2],l[3]);if(A!==B)edge(A,B,{cl:lines[l[4]].cl,ow:0,ac:lines[l[4]].ac});});
 function nearest(x,z){var b=null,bd=1e18;for(var i=0;i<ids.length;i++){var n=ids[i];if(!n.out.length)continue;var e=(n.x-x)*(n.x-x)+(n.z-z)*(n.z-z);if(e<bd){bd=e;b=n;}}return b;}
 var S0=nearest(ax,az),G0=nearest(bx,bz);if(!S0||!G0)return null;var vmax=drvLimit(0);
 function ndeg(n){var k=0;for(var _ in n.deg)k++;return k;}
 function delay(n){if(ndeg(n)<3)return 0;var C=n.cls.slice().sort(function(a,b){return a-b;}),c1=C[0],c2=C.length>1?C[1]:C[0];return (c1<=4&&c2<=4)?15:(c1<=4)?6:3;}
 var crossSign=DRV.lht?-1:1,RXL=RX||[];
 function banned(n,e,f){for(var i=0;i<RXL.length;i++){var r=RXL[i];if(Math.abs(r.x-n.x)>12||Math.abs(r.z-n.z)>12)continue;var fin=e.dx*r.fx+e.dz*r.fz>.8,tout=f.dx*r.tx+f.dz*r.tz>.8;if(!fin)continue;if(r.no&&tout)return true;if(!r.no&&!tout)return true;}return false;}
 function turnCost(e,f){var c=e.dx*f.dz-e.dz*f.dx,d=e.dx*f.dx+e.dz*f.dz,ang=Math.atan2(c,d);if(Math.abs(ang)<.5)return 0;return (ang*crossSign<0)?8:3;}// bearing-increase = crossing turn in the drawn (visual) frame
 var g=new Float64Array(E.length).fill(Infinity),prev=new Int32Array(E.length).fill(-1),open=[],closed=new Uint8Array(E.length),bestE=-1,bestD=1e18,goal=-1;
 function push(it){open.push(it);var i=open.length-1;while(i>0){var p=(i-1)>>1;if(open[p][0]<=open[i][0])break;var t=open[p];open[p]=open[i];open[i]=t;i=p;}}
 function pop(){var top=open[0],last=open.pop();if(open.length){open[0]=last;var i=0;for(;;){var l=i*2+1,r=l+1,m=i;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===i)break;var t=open[m];open[m]=open[i];open[i]=t;i=m;}}return top;}
 S0.out.forEach(function(e){g[e.id]=e.w;push([e.w+Math.hypot(e.t.x-G0.x,e.t.z-G0.z)/vmax,e]);});
 var it=0;while(open.length&&it++<600000){var e=pop()[1];if(closed[e.id])continue;closed[e.id]=1;var n=e.t;if(n===G0){goal=e.id;break;}var hd=Math.hypot(n.x-bx,n.z-bz);if(hd<bestD){bestD=hd;bestE=e.id;}
  var dead=n.out.length<=1,dl=delay(n);
  for(var j=0;j<n.out.length;j++){var f=n.out[j];if(f.t===e.f&&!dead)continue;if(RXL.length&&banned(n,e,f))continue;var ng=g[e.id]+f.w+(ndeg(n)>=3?dl+turnCost(e,f):0);if(ng<g[f.id]){g[f.id]=ng;prev[f.id]=e.id;push([ng+Math.hypot(f.t.x-G0.x,f.t.z-G0.z)/vmax,f]);}}}
 var end=goal>=0?goal:bestE;if(end<0)return null;var path=[],k=end;while(k>=0){path.push(E[k].t);if(prev[k]<0)path.push(E[k].f);k=prev[k];}path.reverse();
 var lv=L2.live;return {ll:path.map(function(p){return [lv.lat0+p.z/lv.mLat,lv.lon0+p.x/lv.mLon];}),steps:[],src:'local',gen:-1,eta:goal>=0?g[goal]:null,partial:Math.hypot(E[end].t.x-bx,E[end].t.z-bz)>150,rx:RXL.length};}
// OSM turn restrictions around the trip (Overpass): from-way direction into the via node, to-way direction out of it
function drvRestrictions(a,b){var pad=.01,bb=[Math.min(a.lat,b.lat)-pad,Math.min(a.lon,b.lon)-pad,Math.max(a.lat,b.lat)+pad,Math.max(a.lon,b.lon)+pad];if((bb[2]-bb[0])*(bb[3]-bb[1])>.05)return Promise.resolve(null);
 var q='[out:json][timeout:12];relation["type"="restriction"]["restriction"]('+bb.join(',')+');out geom;',ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort();},8000);
 return fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:ctl?ctl.signal:undefined}).then(function(r){return r.ok?r.json():null;}).then(function(j){clearTimeout(to);if(!j||!j.elements)return null;var lv=L2.live,out=[];
  function loc(p){return [(p.lon-lv.lon0)*lv.mLon,(p.lat-lv.lat0)*lv.mLat];}
  j.elements.forEach(function(rel){var rs=(rel.tags&&rel.tags.restriction)||'',via=null,fr=null,tw=null;(rel.members||[]).forEach(function(m){if(m.role==='via'&&m.type==='node')via=loc(m);else if(m.role==='from'&&m.geometry)fr=m.geometry.map(loc);else if(m.role==='to'&&m.geometry)tw=m.geometry.map(loc);});
   if(!via||!fr||!tw||!/^(no_|only_)/.test(rs))return;function near(G){var bi=0,bd=1e18;G.forEach(function(p,i){var d=(p[0]-via[0])*(p[0]-via[0])+(p[1]-via[1])*(p[1]-via[1]);if(d<bd){bd=d;bi=i;}});return bi;}
   var i1=near(fr),pf=fr[i1===0?1:i1-1]||fr[0],i2=near(tw),pt=tw[i2===tw.length-1?i2-1:i2+1]||tw[0];var fx=via[0]-pf[0],fz=via[1]-pf[1],fl=Math.hypot(fx,fz)||1,tx=pt[0]-via[0],tz=pt[1]-via[1],tl=Math.hypot(tx,tz)||1;
   out.push({x:via[0],z:via[1],fx:fx/fl,fz:fz/fl,tx:tx/tl,tz:tz/tl,no:rs.indexOf('no_')===0,k:rs});});return out;}).catch(function(){clearTimeout(to);return null;});}
// real traffic controls along the route from OpenStreetMap (Overpass); null result → inferred controls
function drvOverpass(R){var lat0=1e9,lat1=-1e9,lon0=1e9,lon1=-1e9,acc=0,last=null;for(var i=0;i<R.ll.length;i++){var p=R.ll[i];if(last)acc+=hav(last[0],last[1],p[0],p[1]);last=p;if(acc>14)break;lat0=Math.min(lat0,p[0]);lat1=Math.max(lat1,p[0]);lon0=Math.min(lon0,p[1]);lon1=Math.max(lon1,p[1]);}
 var pad=.0012,bb=[lat0-pad,lon0-pad,lat1+pad,lon1+pad],q='[out:json][timeout:15];(node["highway"~"^(traffic_signals|stop|give_way)$"]('+bb.join(',')+');node["crossing"="traffic_signals"]('+bb.join(',')+'););out;';
 var ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort();},12000);
 return fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:ctl?ctl.signal:undefined})
  .then(function(r){return r.ok?r.json():null;}).then(function(j){clearTimeout(to);if(!j||!j.elements)return null;return {bb:bb,n:j.elements.map(function(e){var h=e.tags&&e.tags.highway,t=h==='stop'?'stop':h==='give_way'?'yield':'sig';return {lat:e.lat,lon:e.lon,t:t};})};})
  .catch(function(){clearTimeout(to);return null;});}
function drvOvpLocal(){var O=DRV.ovp,lv=L2.live;if(!O||!lv)return null;if(O.gen!==lv.gen){O.gen=lv.gen;O.G={};O.n.forEach(function(n){n.x=(n.lon-lv.lon0)*lv.mLon;n.z=(n.lat-lv.lat0)*lv.mLat;var c=Math.floor(n.x/DRV_CELL)+','+Math.floor(n.z/DRV_CELL);(O.G[c]||(O.G[c]=[])).push(n);});}return O;}
function drvOvpCovers(lat,lon){var O=DRV.ovp;return !!(O&&lat>=O.bb[0]&&lat<=O.bb[2]&&lon>=O.bb[1]&&lon<=O.bb[3]);}
function drvOvpNear(x,z,r){var O=drvOvpLocal();if(!O)return null;var best=null,bd=r*r,cx=Math.floor(x/DRV_CELL),cz=Math.floor(z/DRV_CELL);
 for(var a=cx-1;a<=cx+1;a++)for(var b=cz-1;b<=cz+1;b++){var L=O.G[a+','+b];if(!L)continue;for(var i=0;i<L.length;i++){var n=L[i],e=(n.x-x)*(n.x-x)+(n.z-z)*(n.z-z);if(e<bd){bd=e;best=n;}}}return best;}
// scan the route ahead for junctions and decide each one's control
function drvScan(){var R=drvRouteLocal();if(!R||DRV.fly)return;var s0=DRV.s,s1=Math.min(R.len,s0+1400),p={},lv=L2.live;
 for(var s=Math.max(0,s0-20);s<=s1;s+=6){drvAt(s,p);var j=drvNearJunction(p.x,p.z,7);if(!j)continue;var dup=false;for(var q=0;q<DRV.ctl.length;q++){var c=DRV.ctl[q];if(Math.abs(c.s-s)<16||(c.jx===j.x&&c.jz===j.z)){dup=true;break;}}if(dup)continue;
  var ll=localToLL(j.x,j.z),seg=drvNearSeg(p.x,p.z,12),ours=seg?seg[4]:j.c2,cross=ours===j.c1?j.c2:j.c1,t=null,real=false;
  var inf=(ours>=1&&ours<=4&&cross>=1&&cross<=4)?'sig':(ours>=1&&ours<=4&&cross===5)?'pb':(ours===5&&cross>=1&&cross<=5)?'zeb':(ours===6&&cross<=5)?'yield':null;
  if(drvOvpCovers(ll.lat,ll.lon)){var n=drvOvpNear(j.x,j.z,24);if(n){t=n.t;real=true;}else t=inf==='sig'?null:inf;}
  else t=inf;
  if(!t)continue;
  var hsh=Math.abs(Math.sin(j.x*12.9898+j.z*78.233)*43758.5453)%1,major=(ours<=2||cross<=2),C=major?100:80;
  var cA=j.c1,cB=j.c2;var ctl={s:s,jx:j.x,jz:j.z,t:t,real:real,ax:j.ax,cA:cA,cB:cB,ours:ours,cross:cross,done:false,obj:null,turn:drvTurnAt(s)};
  ctl.stopOff=lifeStopOff(RW[cross]||8,t!=='stop',4.9);drvSnapCtl(ctl,s);if(ctl.t!=='stop'){drvUsePlan(ctl);if(ctl.t==='sig')drvPlan(ctl);}DRV.ctl.push(ctl);}
 DRV.ctl.sort(function(a,b){return a.s-b.s;});DRV.ctl=DRV.ctl.filter(function(c){return c.s>DRV.s-60;});}
// fixed-time signal plan: phase A = the junction's main axis, B = the crossing axis
// Fixed-time two-phase plan per junction, following common traffic-engineering practice:
//  · cycle by road classes (major×major 110 s … minor 60 s), green split weighted by road class,
//  · yellow = 1 s reaction + v / (2·3.05 m/s²) (ITE kinematic formula), clamped 3–6 s,
//  · all-red clearance = (crossing width + 6 m vehicle) / v, clamped 1–2.5 s,
//  · minimum green ≥ pedestrian need: 7 s WALK + crossing width / 1.07 m/s,
//  · leading protected left arrow (8 s) where two major roads meet,
//  · green-wave offsets: offset = position along the main axis / progression speed, so a straight arterial runs green-to-green.
var DRV_W={0:5,1:4,2:3,3:2.2,4:1.6,5:1,6:.7,10:1};
// align a control with the junction station on the road we are driving (same geometry as the painted stop line)
function drvSnapCtl(ctl,s){var lines=LIFE.lines;if(!lines)return;var p={},pa={};drvAt(s,p);drvAt(Math.max(0,s-20),pa);var fx=Math.sin(pa.yaw),fz=Math.cos(pa.yaw),best=null,bd=14*14;
 for(var i=0;i<lines.length;i++){var L=lines[i];if(!L.js)continue;if(p.x<Math.min(L.x0,L.x1)-30||p.x>Math.max(L.x0,L.x1)+30||p.z<Math.min(L.z0,L.z1)-30||p.z>Math.max(L.z0,L.z1)+30)continue;
  for(var k=0;k<L.js.length;k++){var q=L.js[k];if(!q[4])continue;var e=(q[1]-p.x)*(q[1]-p.x)+(q[2]-p.z)*(q[2]-p.z);if(e>=bd)continue;var a={};lifeAt(L,q[0],a);if(Math.abs(a.dx*fx+a.dz*fz)<.8)continue;bd=e;best=q;}}
 if(!best)return;var bs=s,be=1e18;for(var t=s-25;t<=s+6;t+=.5){drvAt(t,p);var e2=(p.x-best[1])*(p.x-best[1])+(p.z-best[2])*(p.z-best[2]);if(e2<be){be=e2;bs=t;}}
 if(be>36)return;if(!ctl.real){var f=best[4];ctl.t=f===2?'sig':f===3?'pb':f===1?'zeb':ctl.t;}ctl.s=bs;ctl.stopOff=best[3]+(best[4]>=1&&ctl.t!=='stop'?3.3:0)+1.6+2.45;ctl.st0=best;}
function drvCtlPlan(c){return lifePlan(c._pj||(c._pj={x:c.jx,z:c.jz,ax:c.ax,c1:c.cA,c2:c.cB}));}
function drvUsePlan(ctl){var P=lifePlan({x:ctl.jx,z:ctl.jz,ax:ctl.ax,c1:ctl.cA,c2:ctl.cB});ctl.jx=P.jx;ctl.jz=P.jz;ctl.ax=P.ax;ctl.cA=P.cA;ctl.cB=P.cB;}
function drvPrefetch(){var lv=L2.live,R=drvRouteLocal();if(!lv||!R||!TILE_TPL)return;var p={},n=0;DRV.pf=DRV.pf||{};
 for(var s=DRV.s+400;s<Math.min(R.len,DRV.s+4400)&&n<2;s+=400){drvAt(s,p);var ll=localToLL(p.x,p.z),x=Math.floor(tlx(ll.lon)),y=Math.floor(tly(ll.lat)),k=x+','+y;if(lv.tiles[k]||DRV.pf[k])continue;DRV.pf[k]=1;n++;try{fetchTile(x,y);}catch(_e){}}}
function drvPlan(c){var vA=drvLimit(c.cA),vB=drvLimit(c.cB),WA=(RW[c.cA]||8)+6,WB=(RW[c.cB]||8)+6;
 c.YA=Math.max(3,Math.min(6,1+vA/(2*3.05)));c.YB=Math.max(3,Math.min(6,1+vB/(2*3.05)));c.RA=Math.max(1,Math.min(2.5,(WB+6)/vA));c.RB=Math.max(1,Math.min(2.5,(WA+6)/vB));
 c.C=(c.cA<=2&&c.cB<=2)?110:(c.cA<=2)?90:(c.cA<=4&&c.cB<=4)?75:60;c.LA=(c.cA<=3&&c.cB<=3)?8:0;
 var gminA=7+WB/1.07,gminB=7+WA/1.07,av=c.C-c.YA-c.RA-c.YB-c.RB-c.LA,wa=DRV_W[c.cA]||1,wb=DRV_W[c.cB]||1;
 c.GA=Math.max(gminA,av*wa/(wa+wb));c.GB=av-c.GA;if(c.GB<gminB){c.GB=gminB;c.GA=Math.max(gminA,av-c.GB);c.C=c.LA+c.GA+c.YA+c.RA+c.GB+c.YB+c.RB;}
 var ux=Math.sin(c.ax),uz=Math.cos(c.ax),proj=c.jx*ux+c.jz*uz;c.off=((proj/Math.max(8,vA))%c.C+c.C)%c.C;c.wave=true;}
function drvTurnAt(s){var y1=drvAt(s-16,{}).yaw,y2=drvAt(s+16,{}).yaw,d=((y2-y1+Math.PI*3)%(Math.PI*2))-Math.PI,a=Math.abs(d)*R2D;return a<30?'S':a>150?'U':d<0?'R':'L';}
// state for OUR movement at the junction: G (green), GA (protected arrow), Y, R; rem = seconds to the next change
function drvSig(c,yaw){if(c.C==null)drvPlan(c);var t=(DRV.simT+c.off)%c.C,mainAx=Math.abs(Math.cos(yaw-c.ax))>.707,L=c.LA,turn=c.turn||'S',left=DRV.lht?(turn==='R'):(turn==='L');
 var a0=L,a1=a0+c.GA,a2=a1+c.YA,a3=a2+c.RA,b1=a3+c.GB,b2=b1+c.YB,b3=b2+c.RB,st,rem;
 if(mainAx){if(t<a0){st=left?'GA':'R';rem=a0-t;}else if(t<a1){st=(left&&c.LA&&c.cA<=2&&c.cB<=2)?'R':'G';rem=a1-t;}else if(t<a2){st=(left&&c.LA&&c.cA<=2&&c.cB<=2)?'R':'Y';rem=a2-t;}else{st='R';rem=c.C-t+(left?0:a0);}}
 else{if(t<a3){st='R';rem=a3-t;}else if(t<b1){st='G';rem=b1-t;}else if(t<b2){st='Y';rem=b2-t;}else{st='R';rem=c.C-t+a3;}}
 return {st:st,rem:rem,left:left,turn:turn,yel:mainAx?c.YA:c.YB};}
// ---------- signal / sign props along the route ----------
function drvPool(){if(DRV.pool)return DRV.pool;var P={sig:[],stop:[]},pole=new T3.MeshStandardMaterial({color:0x2a2f36,metalness:.6,roughness:.4}),box=new T3.MeshStandardMaterial({color:0x0e1116,metalness:.3,roughness:.6});
 for(var i=0;i<14;i++){var g=new T3.Group();var p=new T3.Mesh(new T3.CylinderGeometry(.09,.11,5.4,10),pole);p.position.y=2.7;g.add(p);var arm=new T3.Mesh(new T3.BoxGeometry(.12,.12,3.2),pole);arm.position.set(0,5.3,1.6);g.add(arm);
  var h=new T3.Mesh(new T3.BoxGeometry(.32,1.15,.42),box);h.position.set(0,4.75,3.0);g.add(h);var L=[];['#ff2a2a','#ffc21a','#22ff7a'].forEach(function(c,k){var m=new T3.Mesh(new T3.CircleGeometry(.14,18),new T3.MeshBasicMaterial({color:0x222222}));m.position.set(.17,5.12-k*.37,3.0);m.rotation.y=Math.PI/2;m.userData.on=new T3.Color(c);g.add(m);L.push(m);});
  var halo=new T3.Sprite(new T3.SpriteMaterial({color:0xffffff,transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(1.3);g.add(halo);g.userData={L:L,halo:halo};g.visible=false;streetScene.add(g);P.sig.push(g);}
 for(i=0;i<14;i++){var oc=new T3.MeshBasicMaterial({color:0xd8202a});var s=new T3.Group();var sp=new T3.Mesh(new T3.CylinderGeometry(.05,.05,2.3,8),pole);sp.position.y=1.15;s.add(sp);var o=new T3.Mesh(new T3.CircleGeometry(.38,8),oc);o.rotation.z=Math.PI/8;o.position.y=2.35;s.add(o);var o2=new T3.Mesh(new T3.CircleGeometry(.4,8),new T3.MeshBasicMaterial({color:0xffffff}));o2.rotation.z=Math.PI/8;o2.position.set(0,2.35,-.01);s.add(o2);s.visible=false;streetScene.add(s);P.stop.push(s);}
 DRV.pool=P;return P;}
function drvProps(){var P=drvPool(),si=0,so=0,p={},side=DRV.lht?-1:1;
 DRV.ctl.forEach(function(c){if(c.s<DRV.s-25||c.s>DRV.s+420||DRV.fly)return;drvAt(Math.max(0,c.s-9),p);var rx=-Math.cos(p.yaw)*side,rz=Math.sin(p.yaw)*side,px=p.x+rx*6.2,pz=p.z+rz*6.2;
  if((c.t==='sig'||c.t==='pb')&&si<P.sig.length){var g=P.sig[si++];g.visible=true;g.position.set(px,0,pz);g.rotation.y=p.yaw+Math.PI/2;g.scale.z=side;var S=c.t==='pb'?{st:lifePB(drvCtlPlan(c))}:drvSig(c,p.yaw),idx=S.st==='R'?0:S.st==='Y'?1:2;
   g.userData.L.forEach(function(m,k){m.material.color.copy(k===idx?m.userData.on:TMPC.setHex(0x1a1a1a));});var h=g.userData.halo;h.material.color.copy(g.userData.L[idx].userData.on);h.material.opacity=.55;h.position.copy(g.userData.L[idx].position);}
  else if((c.t==='stop'||c.t==='yield'||c.t==='zeb')&&so<P.stop.length){var s=P.stop[so++];s.visible=true;s.position.set(px,0,pz);s.rotation.y=p.yaw+Math.PI;s.children[1].material.color.setHex(c.t==='stop'?0xd8202a:c.t==='zeb'?0x1d63c9:0xff8c1a);s.scale.setScalar(c.t==='stop'?1:.8);}});
 for(;si<P.sig.length;si++)P.sig[si].visible=false;for(;so<P.stop.length;so++)P.stop[so].visible=false;}
// ---------- start / stop ----------
function drvStart(){if(DRV.on||mode!=='street'||!L2.active)return;if(!L2.live){toast(I18T('driving_needs_the_live'));return;}
 if(L2.drone&&L2.drone.on){var bd=document.getElementById('bDrone');if(bd)bd.click();}if(typeof SKYV!=='undefined'&&SKYV.on)setSky(false);if(TRV.on)travelStop(false);
 var iso=(L2.city&&L2.city.iso)||'US';DRV.us=(iso==='US'||iso==='PR'||iso==='GU'||iso==='GB'&&false);DRV.lht=!!DRV_LHT[iso];
 if(!DRV.car){DRV.car=drvBuildCar();}streetScene.add(DRV.car);DRV.on=true;try{lifeInit();drvPool();if(renderer.compileAsync)renderer.compileAsync(streetScene,camera).catch(function(){});}catch(_e){}DRV.state='idle';DRV.route=null;DRV.ctl=[];DRV.v=0;DRV.fly=false;DRV.alt=0;DRV.flyPh=0;DRV.camInit=false;
 var tg=L2.target,seg=drvNearSeg(tg.x,tg.z,120);if(seg){var t=Math.max(0,Math.min(1,((tg.x-seg[0])*(seg[2]-seg[0])+(tg.z-seg[1])*(seg[3]-seg[1]))/(((seg[2]-seg[0])*(seg[2]-seg[0])+(seg[3]-seg[1])*(seg[3]-seg[1]))||1)));DRV.pos.set(seg[0]+(seg[2]-seg[0])*t,0,seg[1]+(seg[3]-seg[1])*t);DRV.yaw=Math.atan2(seg[2]-seg[0],seg[3]-seg[1]);}
 else{DRV.pos.set(tg.x,0,tg.z);DRV.yaw=0;}DRV.geo=localToLL(DRV.pos.x,DRV.pos.z);DRV.gen=L2.live.gen;L2.camWant.d=Math.max(160,Math.min(400,L2.camWant.d));
 if(DRV.parts)DRV.parts.yoke.position.x=DRV.lht?-.36:.36;DRV.panelOpen=!panel.classList.contains('min');if(window.innerWidth>=900)setPanel(false);var mi=document.getElementById('mmIn');if(mi){mi._ph=mi.placeholder;mi.placeholder=I18T('address_drive_there');}document.body.classList.add('driving');var b=document.getElementById('bDrive');if(b)b.setAttribute('aria-pressed','true');drvUI();
 toast(I18T('drive_mode_enter_a'));}
function drvEnd(){if(!DRV.on)return;DRV.on=false;DRV.route=null;DRV.ctl=[];if(DRV.car)streetScene.remove(DRV.car);if(DRV.pool){DRV.pool.sig.concat(DRV.pool.stop).forEach(function(g){g.visible=false;});}
 if(DRV.panelOpen)setPanel(true);var mi=document.getElementById('mmIn');if(mi&&mi._ph)mi.placeholder=mi._ph;document.body.classList.remove('driving');var b=document.getElementById('bDrive');if(b)b.setAttribute('aria-pressed','false');L2.camWant.d=Math.max(L2.camWant.d,600);L2.camWant.el=.62;DRV.pick=false;drvUI();}
function drvSetDest(dest){if(!DRV.on)return;DRV.dest=dest;DRV.planning=true;DRV.state='plan';DRV.ctl=[];DRV.passS=null;DRV.ovp=null;drvUI();
 var a=DRV.geo||localToLL(DRV.pos.x,DRV.pos.z);if(DRV.fly){DRV.planning=false;DRV.state='fly';drvUI();return;}
 drvOSRM(a,dest).then(function(R){if(!DRV.on||DRV.dest!==dest)return;var lv=L2.live;
  if(!R){var bx=(dest.lon-lv.lon0)*lv.mLon,bz=(dest.lat-lv.lat0)*lv.mLat;return drvRestrictions(a,dest).then(function(RX){if(!DRV.on||DRV.dest!==dest)return null;DRV.rx=RX;return drvLocalRoute(DRV.pos.x,DRV.pos.z,bx,bz,RX||[]);});}return R;}).then(function(R){if(!DRV.on||DRV.dest!==dest)return;var lv=L2.live;
  DRV.planning=false;if(!R||R.ll.length<2){DRV.state='idle';toast(I18T('no_route_found_try'));drvUI();return;}
  R.ll.unshift([a.lat,a.lon]);DRV.route=R;DRV.s=0;DRV.state='drive';drvRouteLocal();
  // turn steps → route distance
  var RL=DRV.route,j=0;(R.steps||[]).forEach(function(st){var x=(st.lon-lv.lon0)*lv.mLon,z=(st.lat-lv.lat0)*lv.mLat,bi=j,bd=1e18;for(var i=j;i<RL.P.length/2;i++){var e=(RL.P[i*2]-x)*(RL.P[i*2]-x)+(RL.P[i*2+1]-z)*(RL.P[i*2+1]-z);if(e<bd){bd=e;bi=i;}if(e>bd*4&&i>bi+40)break;}j=bi;st.s=RL.S[bi];});
  // prefetch the tiles the route passes through (first ~8 km)
  var seen={},k=0;for(var i=0;i<R.ll.length&&k<40;i+=3){var cx=Math.floor(tlx(R.ll[i][1])),cy=Math.floor(tly(R.ll[i][0])),key=cx+','+cy;if(seen[key])continue;seen[key]=1;k++;fetchTile(cx,cy);}
  drvOverpass(R).then(function(O){if(!DRV.on||DRV.route!==R)return;if(O){O.gen=-1;DRV.ovp=O;DRV.ctl=[];}drvUI();});
  drvScan();drvUI();toast((I18T('route_ready'))+fmtKm(RL.len/1000)+(R.src==='osrm'?' · OSRM':(I18T('local_roads')))+(R.partial?(I18T('to_the_edge_of')):''));});}
function drvSetFly(on){if(!DRV.on||DRV.fly===on)return;DRV.fly=on;if(on){DRV.state=DRV.dest?'fly':'hover';DRV.geo=localToLL(DRV.pos.x,DRV.pos.z);DRV.v=Math.max(DRV.v,4);}
 else{DRV.state='land';}drvUI();}
// ---------- per-frame step ----------
function drvStep(dt,now){if(!DRV.on||!L2.live)return;var lv=L2.live,P=DRV.parts,i;
 if(DRV.gen!==lv.gen){DRV.gen=lv.gen;if(DRV.geo){DRV.pos.x=(DRV.geo.lon-lv.lon0)*lv.mLon;DRV.pos.z=(DRV.geo.lat-lv.lat0)*lv.mLat;}DRV.ctl.forEach(function(c){c.obj=null;});}
 var n=Math.max(1,Math.min(6,Math.ceil(DRV.speedX*dt/.02))),h=dt*DRV.speedX/n;for(i=0;i<n;i++)drvSim(h);
 DRV.geo=localToLL(DRV.pos.x,DRV.pos.z);
 // the map streams around the car; heading-up widgets (tactical map, radar, gizmo) follow the car's heading
 L2.target.x=DRV.pos.x;L2.target.z=DRV.pos.z;var az=-Math.PI/2-DRV.yaw;while(az-L2.cam.az>Math.PI)az-=2*Math.PI;while(az-L2.cam.az<-Math.PI)az+=2*Math.PI;L2.cam.az=L2.camWant.az=az;
 if(DRV.route&&!DRV.fly&&now-(DRV.pfAt||0)>2000){DRV.pfAt=now;drvPrefetch();}
 if(now-DRV.scanAt>900){DRV.scanAt=now;drvScan();var sg=drvLaneSeg(DRV.pos.x,DRV.pos.z,DRV.yaw)||drvNearSeg(DRV.pos.x,DRV.pos.z,25);if(sg&&(sg[4]<=6||sg[4]===10)){DRV.rcls=sg[4];DRV.rowo=sg[5]||0;DRV.lim=drvLimit(sg[4]);}DRV.road=drvNearName(DRV.pos.x,DRV.pos.z);}
 // car pose
 var c=DRV.car,by=DRV.fly?0:lifeBridgeY(DRV.pos.x,DRV.pos.z,DRV.yaw,DRV.brY||0);DRV.brY=(DRV.brY||0)+(by-(DRV.brY||0))*Math.min(1,dt*6);
 drvLaneStep(dt,now);
 c.position.set(DRV.pos.x-Math.cos(DRV.yaw)*DRV.lane,1.0+DRV.brY+DRV.alt+(DRV.fly?Math.sin(now/600)*.25:0),DRV.pos.z+Math.sin(DRV.yaw)*DRV.lane);c.rotation.y=DRV.yaw;c.rotation.z=DRV.fly?Math.sin(now/1300)*.03:0;

 DRV.wheelSpin+=DRV.v*dt*DRV.speedX/.37;var fp=DRV.flyPh;P.wheels.forEach(function(w){w.spin.rotation.x=DRV.fly?0:DRV.wheelSpin;w.hold.rotation.z=-w.side*fp*Math.PI/2;w.hold.position.x=w.side*(.88+fp*.55);w.jet.material.opacity=fp*(.6+.3*Math.sin(now/60+w.side));});
 P.ug.material.opacity=.35+fp*.45;P.ck.visible=DRV.view==='fp';P.body.visible=P.gs.visible=P.fl.visible=P.rl.visible=P.ug.visible=DRV.view!=='fp';P.blades.forEach(function(b){b.visible=DRV.view!=='fp';});P.wheels.forEach(function(w){w.hold.visible=DRV.view!=='fp';});
 if(now-(DRV.blAt||0)>250){DRV.blAt=now;DRV.blink=null;if(DRV.route&&!DRV.fly&&DRV.state==='drive'){for(var bs=12;bs<=48;bs+=12){var tn=drvTurnAt(DRV.s+bs);if(tn==='L'||tn==='R'){DRV.blink=tn;break;}}}}
 var bon=DRV.blink&&Math.floor(now/333)%2===0;P.blink.forEach(function(m){m.material.color.setHex(bon&&m.userData.side===DRV.blink?0xffa21a:0x2a1a05);m.visible=DRV.view!=='fp';});
 drvProps();
 if(now-(DRV.alAt||0)>1500){DRV.alAt=now;drvAlong();}if(now-DRV.hudAt>140){DRV.hudAt=now;drvHud();}if(DRV.view==='fp'&&now-DRV.scrAt>260){DRV.scrAt=now;drvScreen();}}
// my lane: pick from the real lane layout + the next turn on the route; pull over to the kerb at the destination
function drvLaneStep(dt,now){ if(now-(DRV.lnAt||0)>300){DRV.lnAt=now;var lsg=DRV.fly?null:drvLaneSeg(DRV.pos.x,DRV.pos.z,DRV.yaw);if(lsg)DRV.LN=rdLane(lsg[4],lsg[5],lsg[7]&&lsg[7].ln?lsg[7].ln[lsg[6]]||0:0,RW);
  var tn='S';if(DRV.route&&!DRV.fly){for(var bs=8;bs<=68;bs+=10){var t0=drvTurnAt(DRV.s+bs);if(t0==='L'||t0==='R'){tn=t0;break;}}}DRV.tlane=tn;}
 // lane: turning across traffic → the lane next to the centre line; turning with traffic → the outside lane; straight → right-hand (or middle of 3+) lane
 var LNd=DRV.LN||rdLane(DRV.rcls||5,DRV.rowo||0,0,RW),kL=DRV.tlane==='S'||!DRV.tlane?(LNd.n>=3?1:LNd.n-1):((DRV.tlane==='L')!==!!DRV.lht?0:LNd.n-1);DRV.laneK=kL;
 var RlA=DRV.route&&drvRouteLocal(),remA=RlA?RlA.len-DRV.s:1e9;DRV.parked=DRV.state==='arrived'||(DRV.state==='drive'&&remA<50&&!RlA.partial);
 var lt=DRV.fly||DRV.alt>.5?0:DRV.parked?(LNd.wc-1.2)*(DRV.lht?-1:1):laneU(LNd,kL,DRV.lht?-1:1);DRV.lane=(DRV.lane||0)+Math.max(-1.4*dt,Math.min(1.4*dt,lt-(DRV.lane||0)));}
function drvSim(dt){DRV.simT+=dt;var p={},R=DRV.route;
 // flight: take off, cruise straight to the destination above the rooftops, land
 if(DRV.fly||DRV.flyPh>0||DRV.alt>0.01){
  var want=DRV.fly?1:0;DRV.flyPh+=(want-DRV.flyPh)*Math.min(1,dt*1.6);if(!DRV.fly&&DRV.flyPh<.01&&DRV.alt<.05){DRV.flyPh=0;DRV.alt=0;drvAfterLanding();return;}
  var cruise=DRV.fly?Math.max(90,drvRoofAhead()+35):0;DRV.alt+=Math.max(-7*dt,Math.min(9*dt,(cruise-DRV.alt)*dt*.9));if(DRV.alt<0)DRV.alt=0;
  var vt=0;if(DRV.fly&&DRV.dest&&DRV.alt>25){var lv=L2.live,dx=(DRV.dest.lon-lv.lon0)*lv.mLon-DRV.pos.x,dz=(DRV.dest.lat-lv.lat0)*lv.mLat-DRV.pos.z,dd=Math.hypot(dx,dz);
   if(dd<60){drvSetFly(false);DRV.route=null;DRV.state='land';DRV.dest=null;DRV.msg='arrived';}else{var ty=Math.atan2(dx,dz),dy=((ty-DRV.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;DRV.yaw+=dy*Math.min(1,dt*.8);vt=Math.min(72,Math.sqrt(2*3*Math.max(0,dd-40)));}}
  DRV.v+=Math.max(-5*dt,Math.min(4*dt,vt-DRV.v));DRV.pos.x+=Math.sin(DRV.yaw)*DRV.v*dt;DRV.pos.z+=Math.cos(DRV.yaw)*DRV.v*dt;
  drvEnergy(DRV.v,dt,true);DRV.odo+=DRV.v*dt;return;}
 if(DRV.state!=='drive'||!R){DRV.v=Math.max(0,DRV.v-4*dt);return;}
 var Rl=drvRouteLocal();if(!Rl)return;var lim=DRV.lim*.96,vt=lim;
 // curvature ahead → comfortable cornering speed
 var a0=drvAt(DRV.s+6,{}).yaw,mx=0;for(var d=12;d<=48;d+=6){var y=drvAt(DRV.s+d,{}).yaw,dy=Math.abs(((y-a0+Math.PI*3)%(Math.PI*2))-Math.PI);if(dy/d>mx)mx=dy/d;}
 if(mx>1e-3)vt=Math.min(vt,Math.sqrt(2.6/mx));vt=Math.max(vt,3.5);
 // end of route
 var rem=Rl.len-DRV.s;vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,rem-2)));
 // ambient vehicles ahead in our lane: keep a safe time gap (2 s + 6 m standstill)
 vt=Math.min(vt,lifeLeadGap(DRV.pos.x,DRV.pos.z,DRV.yaw,DRV.v));
 // traffic controls
 DRV.next=null;DRV.hold=null;for(var q=0;q<DRV.ctl.length;q++){var c=DRV.ctl[q],so=c.stopOff||7;if(c.s<DRV.s+3-so)continue;var stopAt=c.s-so,dist=stopAt-DRV.s;if(dist<-6)continue;
  if(c.t==='sig'){drvAt(c.s-so-2,p);var S=drvSig(c,p.yaw);c.st=S;if(!DRV.next)DRV.next={c:c,d:dist};
   // red / arrow-only: stop at the line. Yellow: stop only if a comfortable stop (≤3 m/s²) is possible, otherwise clear the junction.
   // Turn on red (US/Canada, right turn; mirrored for left-hand traffic is not allowed): full stop ≥2 s, then go.
   var mustStop=S.st==='R'||(S.st==='Y'&&dist>DRV.v*DRV.v/(2*3.0)+.5);if(c.passed||(DRV.passS!=null&&c.s-DRV.passS<38&&c.s>DRV.passS))mustStop=false;
   if(!mustStop&&S.left&&S.st==='G'&&!c.goL&&dist>-1){if(dist<12&&lifeOncoming({x:c.jx,z:c.jz},Math.sin(p.yaw),Math.cos(p.yaw),null)){mustStop=true;c.yieldL=true;}else if(dist<1.5)c.goL=true;}else c.yieldL=false;
   var tor=(DRV.us||(L2.city&&L2.city.iso==='CA'))&&!DRV.lht&&c.turn==='R'&&S.st==='R';
   if(dist>-1.5&&mustStop){if(tor&&c.torOk){}else{DRV.hold=stopAt;vt=Math.min(vt,Math.sqrt(2*3.0*Math.max(0,dist)));if(dist<.6){vt=0;if(tor&&DRV.v<.2){DRV.stopT+=dt;if(DRV.stopT>2.2){c.torOk=true;DRV.stopT=0;}}}}}
   if(dist<-.5&&!c.passed){c.passed=true;c.passSt=S.st;DRV.passS=c.s;}break;}
  if(c.t==='stop'&&!c.done){if(!DRV.next)DRV.next={c:c,d:dist};if(dist>-1.5)DRV.hold=stopAt;vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,dist)));if(dist<1.2&&DRV.v<.3){DRV.stopT+=dt;vt=0;if(DRV.stopT>2.2){c.done=true;DRV.stopT=0;}}break;}
  if(c.t==='pb'){var ps=lifePB(drvCtlPlan(c));c.pbs=ps;if(!DRV.next)DRV.next={c:c,d:dist};var mS=ps==='R'||(ps==='Y'&&dist>DRV.v*DRV.v/(2*3.0)+.5);if(c.passed)mS=false;
   if(dist>-1.5&&mS){DRV.hold=stopAt;vt=Math.min(vt,Math.sqrt(2*3.0*Math.max(0,dist)));if(dist<.6)vt=0;}if(dist<-.5&&!c.passed){c.passed=true;DRV.passS=c.s;}if(mS||dist<120)break;continue;}
  if((c.t==='zeb'||c.t==='yield')&&!c.done&&dist<30&&dist>-3){if(!DRV.next)DRV.next={c:c,d:dist};vt=Math.min(vt,4.5+Math.max(0,dist)*.45);
   var PPz=drvCtlPlan(c),zw=(LIFE.clock-(PPz.zw!=null?PPz.zw:-9))<.5&&(DRV.zwT||0)<15,gap=lifeGapClear({x:c.jx,z:c.jz},{hx:Math.sin(DRV.yaw),hz:Math.cos(DRV.yaw),wait:DRV.zwT||0});c.zw=zw;c.gap=gap;
   if(dist<16&&(zw||!gap)){DRV.hold=stopAt;vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,dist)));if(dist<.8){vt=0;if(DRV.v<.3)DRV.zwT=(DRV.zwT||0)+dt;}}
   else if(dist<2.5){c.done=true;DRV.zwT=0;}break;}
  if(dist>380)break;}
 var v0=DRV.v,acc=vt>DRV.v?2.6:-Math.min(5,Math.max(1.5,(DRV.v-vt)*2));if(DRV.hold!=null&&DRV.v>vt){var dl=Math.max(.05,DRV.hold-DRV.s);acc=-Math.min(7,Math.max(-acc,DRV.v*DRV.v/(2*dl)));}DRV.v=Math.max(0,DRV.v+acc*dt);if((acc>0&&DRV.v>vt)||(acc<0&&DRV.v<vt))DRV.v=vt;
 DRV.s+=DRV.v*dt;if(DRV.hold!=null&&DRV.s>DRV.hold){DRV.s=Math.max(DRV.s-DRV.v*dt,DRV.hold);DRV.v=0;}drvAt(DRV.s,p);var lane=0;var yd=((p.yaw-DRV.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;DRV.yaw+=yd*Math.min(1,dt*6);
 DRV.pos.x=p.x-Math.cos(DRV.yaw)*lane;DRV.pos.z=p.z+Math.sin(DRV.yaw)*lane;
 drvEnergy(DRV.v,dt,false,v0);DRV.odo+=DRV.v*dt;DRV.stillT=DRV.v<.2?(DRV.stillT||0)+dt:0;
 if(rem<1.5&&DRV.v<.2){if(Rl.partial&&DRV.dest){drvSetDest(DRV.dest);}else{DRV.state='arrived';toast(I18T('arrived_2'));DRV.route=null;DRV.ctl=[];drvUI();}}}
function drvAfterLanding(){var tg=DRV.pos,seg=drvNearSeg(tg.x,tg.z,80);if(seg){var t=Math.max(0,Math.min(1,((tg.x-seg[0])*(seg[2]-seg[0])+(tg.z-seg[1])*(seg[3]-seg[1]))/(((seg[2]-seg[0])*(seg[2]-seg[0])+(seg[3]-seg[1])*(seg[3]-seg[1]))||1)));DRV.pos.x=seg[0]+(seg[2]-seg[0])*t;DRV.pos.z=seg[1]+(seg[3]-seg[1])*t;}
 DRV.geo=localToLL(DRV.pos.x,DRV.pos.z);if(DRV.dest&&DRV.msg!=='arrived')drvSetDest(DRV.dest);else{DRV.state=DRV.msg==='arrived'?'arrived':'idle';if(DRV.msg==='arrived')toast(I18T('landed_at_the_destination'));DRV.msg='';drvUI();}}
function drvRoofAhead(){var mx=0,x=DRV.pos.x+Math.sin(DRV.yaw)*80,z=DRV.pos.z+Math.cos(DRV.yaw)*80,P=L2.picks||[];if(!DRV._rt||performance.now()-DRV._rt>600){DRV._rt=performance.now();
  for(var i=0;i<P.length;i++){var b=P[i],bb=b._bb;if(!bb||b[0]<60)continue;if(bb[2]<x-150||bb[0]>x+150||bb[3]<z-150||bb[1]>z+150)continue;if(b[0]>mx)mx=b[0];}DRV._roof=mx;}return DRV._roof||0;}
// energy: 210 kWh pack; ground ≈ 110 Wh/km + aero, flight ≈ 550 Wh/km + 45 kW hover; 65 % regen on braking
function drvEnergy(v,dt,fly,v0){var wh=fly?(.55*v+45000/3600)*dt:(.11+.00009*v*v)*v*dt+1500/3600*dt;if(!fly&&v0!=null&&v<v0){wh-=.65*.5*2100*(v0*v0-v*v)/3600;}DRV.soc=Math.max(0,Math.min(1,DRV.soc-wh/1000/DRV.cap));}
// ---------- camera ----------
function drvChase(c,fx,fz,dt){var now=performance.now(),C=DRV.cz||(DRV.cz={D:48,H:40,at:0,tD:48,tH:40,fresh:true});
 if(now-C.at>200){C.at=now;var G=lidGrid(),CS=40,cx=Math.floor(c.x/CS),cz=Math.floor(c.z/CS),sum=0,n=0,seen=new Set();
  for(var a=cx-2;a<=cx+2;a++)for(var b=cz-2;b<=cz+2;b++){var L=G[a+','+b];if(L)for(var i=0;i<L.length;i++){var B=L[i];if(seen.has(B))continue;seen.add(B);sum+=B[0];n++;}}
  var avg=n?sum/n:6,Hmin=Math.max(24,Math.min(110,22+avg*.9));
  function need(D){var req=Hmin,st=new Set();for(var t=.1;t<=1.001;t+=.06){var px=c.x-fx*D*t,pz=c.z-fz*D*t,L=G[Math.floor(px/CS)+','+Math.floor(pz/CS)];if(!L)continue;
    for(var i=0;i<L.length;i++){var B=L[i],bb=B._bb;if(st.has(B)||!bb||px<bb[0]||px>bb[2]||pz<bb[1]||pz>bb[3])continue;if(!lidPip(px,pz,B))continue;st.add(B);req=Math.max(req,(B[0]+5-1.5)/t+1.5);}}return req;}
  var D1=Math.max(40,Math.min(70,30+avg*.6)),h1=need(D1),D2=26,h2=h1>150?need(D2):1e9;if(h2<h1*.8){C.tD=D2;C.tH=Math.min(320,h2);}else{C.tD=D1;C.tH=Math.min(320,h1);}if(C.fresh){C.fresh=false;C.H=C.tH;C.D=C.tD;}}
 C.H+=(C.tH-C.H)*Math.min(1,dt*(C.tH>C.H?3:.7));C.D+=(C.tD-C.D)*Math.min(1,dt*1.2);return C;}
function drvCam(dt){if(!DRV.on)return false;var c=DRV.car.position,fx=Math.sin(DRV.yaw),fz=Math.cos(DRV.yaw),rx=-Math.cos(DRV.yaw),rz=Math.sin(DRV.yaw),eye=new T3.Vector3(),look=new T3.Vector3(),k;
 if(DRV.view==='fp'){var ds=DRV.lht?.36:-.36;eye.set(c.x+rx*ds+fx*.05,c.y+1.2,c.z+rz*ds+fz*.05);look.set(eye.x+fx*30,eye.y-1.4-(DRV.fly?DRV.alt*.12:0),eye.z+fz*30);k=1;}
 else if(DRV.view==='tp'){var dd=7+Math.max(0,Math.min(1,(L2.cam.d-160)/2240))*34;eye.set(c.x-fx*dd,c.y+1.6+dd*.22,c.z-fz*dd);look.set(c.x+fx*5,c.y+1.1,c.z+fz*5);k=1-Math.exp(-dt*7);}
 else{var CZ=drvChase(c,fx,fz,dt);eye.set(c.x-fx*CZ.D,c.y+CZ.H,c.z-fz*CZ.D);look.set(c.x+fx*Math.max(6,20-CZ.H*.06),c.y,c.z+fz*Math.max(6,20-CZ.H*.06));k=1-Math.exp(-dt*3);}
 if(!DRV.camInit){DRV.camP.copy(eye);DRV.camL.copy(look);DRV.camInit=true;}else{DRV.camP.lerp(eye,k);DRV.camL.lerp(look,DRV.view==='fp'?1:k);}
 camera.position.copy(DRV.camP);camera.lookAt(DRV.camL);if(L2.ground){L2.ground.position.x=c.x;L2.ground.position.z=c.z;}return true;}
function drvNearFar(){return DRV.view==='fp'?[.08,7000]:DRV.view==='tp'?[.3,14000]:[1,20000];}

// ---------- cities & countries along the real route (ground route or flight line) ----------
function drvAlongPath(){var g=DRV.geo;if(!g)return null;var pts=[[g.lat,g.lon]];
 if(DRV.fly||!DRV.route){if(DRV.dest){for(var i=1;i<=24;i++){var t=i/24;pts.push([g.lat+(DRV.dest.lat-g.lat)*t,g.lon+(DRV.dest.lon-g.lon)*t]);}}
  else{var R=200,b=DRV.yaw;for(var k=1;k<=10;k++){var d=R*k/10/111.2;pts.push([g.lat+Math.cos(b)*d,g.lon+Math.sin(b)*d/Math.cos(g.lat*D2R)]);}}return pts;}
 var Rl=drvRouteLocal(),ll=DRV.route.ll,i0=Rl?drvAt(DRV.s,{}).i:0,last=pts[0];for(var j=i0+1;j<ll.length;j++){var q=ll[j];if(hav(last[0],last[1],q[0],q[1])>=.4||j===ll.length-1){pts.push(q);last=q;}}return pts;}
function drvAlong(){var el=document.getElementById('dvAlong');if(!el||!NODES)return;var zh=LZ(),z2=iso2zh(),P=drvAlongPath();if(!P||P.length<2){el.innerHTML='';return;}
 // cumulative km + bbox
 var cum=[0],la0=1e9,la1=-1e9,lo0=1e9,lo1=-1e9;for(var i=0;i<P.length;i++){if(i)cum.push(cum[i-1]+hav(P[i-1][0],P[i-1][1],P[i][0],P[i][1]));la0=Math.min(la0,P[i][0]);la1=Math.max(la1,P[i][0]);lo0=Math.min(lo0,P[i][1]);lo1=Math.max(lo1,P[i][1]);}
 var tot=cum[cum.length-1],band=Math.max(12,Math.min(60,tot*.08)),mlat=band/111.2,mlon=band/(111.2*Math.max(.2,Math.cos((la0+la1)/2*D2R)));
 var rows=NODES.rows,hits=[],here=null,hd=1e9,g=DRV.geo;
 for(var r=0;r<rows.length;r++){var R=rows[r],lat=R[5],lon=R[6];var dh=hav(g.lat,g.lon,lat,lon);if(dh<hd){hd=dh;here=R;}
  if(lat<la0-mlat||lat>la1+mlat||lon<lo0-mlon||lon>lo1+mlon)continue;
  var best=1e9,at=0,ky=111.2,kx=111.2*Math.cos(lat*D2R);
  for(var k=0;k+1<P.length;k++){var ax=(P[k][1]-lon)*kx,ay=(P[k][0]-lat)*ky,bx=(P[k+1][1]-lon)*kx,by=(P[k+1][0]-lat)*ky,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0,x=ax+t*dx,y=ay+t*dy,e=Math.sqrt(x*x+y*y);if(e<best){best=e;at=cum[k]+(cum[k+1]-cum[k])*t;}}
  if(best<=band&&at>.3)hits.push({R:R,off:best,at:at});}
 hits=hits.filter(function(x){return x.R!==here;});hits.sort(function(a,b){return a.at-b.at;});
 var ctry=[],seen={};if(here){ctry.push(here[4]);seen[here[4]]=1;}hits.forEach(function(h){var c=h.R[4];if(c&&c!=='-99'&&!seen[c]){seen[c]=1;ctry.push(c);}});
 if(DRV.dest){var dn=null,dd=1e9;for(var r2=0;r2<rows.length;r2++){var e2=hav(DRV.dest.lat,DRV.dest.lon,rows[r2][5],rows[r2][6]);if(e2<dd){dd=e2;dn=rows[r2];}}if(dn&&!seen[dn[4]]){ctry.push(dn[4]);}}
 function cn(iso,fb){return (zh&&z2[iso])?z2[iso]:(fb||iso);}
 function nm(R){return zh&&R[1]?R[1]:R[0];}
 var h='<div class="dvAh"><b>'+(I18T('along_the_route'))+'</b><span>'+(DRV.fly||!DRV.route?(I18T('flight_line')):(I18T('road_route')))+' · '+(I18T('s_5'))+Math.round(band)+' km</span></div>';
 if(here)h+='<div class="dvHere">'+(I18T('near'))+esc(nm(here))+' · '+esc(cn(here[4],here[3]))+(hd>1?' <em>'+fmtKm(hd)+'</em>':'')+'</div>';
 if(ctry.length)h+='<div class="dvCt">'+(I18T('countries'))+ctry.map(function(c){var R=null;for(var q=0;q<hits.length;q++)if(hits[q].R[4]===c){R=hits[q].R;break;}return esc(cn(c,R?R[3]:(here&&here[4]===c?here[3]:c)));}).join(' → ')+'</div>';
 var L=hits.slice(0,8);if(!L.length)h+='<div class="sn">'+(I18T('no_listed_places_along'))+'</div>';
 L.forEach(function(x){var pass=x.at<3;h+='<div class="dvTown'+(pass?' now':'')+'"><span>'+esc(nm(x.R))+'<em>'+esc(cn(x.R[4],x.R[3]))+'</em></span><b>'+(pass?(I18T('passing')):(I18T('in'))+fmtKm(x.at))+'</b><i>'+(I18T('off'))+fmtKm(x.off)+'</i></div>';});
 el.innerHTML=h;}
// ---------- HUD + centre screen ----------
function drvTurnGeo(st){var y1=drvAt(st.s-14,{}).yaw,y2=drvAt(st.s+14,{}).yaw,d=((y2-y1+Math.PI*3)%(Math.PI*2))-Math.PI,a=Math.abs(d)*R2D,side=d<0?'right':'left';
 return a<18?'straight':a<55?'slight '+side:a<150?side:'uturn';}
function drvTurnText(st){var zh=LZ(),m=st.mod||'',t=st.type||'';if(t==='arrive')return I18T('arrive');if(t==='roundabout'||t==='rotary')return I18T('roundabout');
 var M={left:I18T('turn_left'),'slight left':I18T('bear_left'),'sharp left':I18T('sharp_left'),right:I18T('turn_right'),'slight right':I18T('bear_right'),'sharp right':I18T('sharp_right'),straight:I18T('continue'),uturn:I18T('u_turn')};return M[m]||(I18T('continue_2'));}
function drvTurnIcon(m){return /uturn/.test(m)?'⤺':/sharp left|^left/.test(m)?'↰':/slight left/.test(m)?'↖':/sharp right|^right/.test(m)?'↱':/slight right/.test(m)?'↗':'↑';}
function drvNextStep(){var R=DRV.route;if(!R||!R.steps)return null;for(var i=0;i<R.steps.length;i++){var st=R.steps[i];if(st.s!=null&&st.s>DRV.s+2&&st.type!=='depart')return st;}return null;}
function drvHud(){var el=document.getElementById('drvHud');if(!el)return;var zh=LZ(),R=DRV.route&&drvRouteLocal(),rem=R?Math.max(0,R.len-DRV.s):0,v=DRV.v;
 var lv=L2.live,dd=0;if(DRV.fly&&DRV.dest&&lv)dd=Math.hypot((DRV.dest.lon-lv.lon0)*lv.mLon-DRV.pos.x,(DRV.dest.lat-lv.lat0)*lv.mLat-DRV.pos.z);
 var st=drvNextStep(),nx=DRV.next,sig='';if(st&&st.type!=='arrive'&&st.type!=='roundabout'&&st.type!=='rotary')st.mod=drvTurnGeo(st);
 if(!DRV.fly&&nx){var c=nx.c,dm=Math.max(0,Math.round(nx.d))+' m',src=c.real?(I18T('osm')):(I18T('inferred'));
  if(c.t==='sig'){var S=c.st||{st:'G',rem:0},col=S.st==='R'?'r':S.st==='Y'?'y':'g',ph=S.st==='GA'?(I18T('left_arrow')):S.st==='G'?(I18P(S.left?'绿灯·让对向':'绿灯 通行','green')):S.st==='Y'?(I18P('黄灯 '+S.yel.toFixed(1)+'s','yellow '+S.yel.toFixed(1)+'s')):(c.torOk?(I18T('red_turn_after_stop')):(I18T('red_stop')));
   sig='<div class="dvSig '+col+'"><i></i><i></i><i></i><b>'+(S.st==='GA'?'⬅ ':'')+Math.ceil(S.rem)+'s</b><em>'+esc(ph)+' · '+dm+' · '+src+(c.wave?(I18T('green_wave')):'')+'</em><em>'+(I18T('cycle'))+Math.round(c.C)+'s · '+(I18T('g'))+Math.round(c.GA)+'/'+Math.round(c.GB)+'s</em></div>';}
  else if(c.t==='pb'){var pS=c.pbs||'G',pc=pS==='R'?'r':pS==='Y'?'y':'g',pt=pS==='R'?(I18T('pedestrians_crossing_stop')):pS==='Y'?(I18T('button_pressed')):(I18T('ped_button_no_call'));
   sig='<div class="dvSig '+pc+'"><i></i><i></i><i></i><b>🚶</b><em>'+esc(pt)+' · '+dm+'</em><em>'+(I18T('push_button_crossing'))+'</em></div>';}
  else sig='<div class="dvSign '+c.t+'"><b>'+(c.t==='stop'?'STOP':c.t==='zeb'?'🚶':(I18T('yield')))+'</b><em>'+(c.t==='zeb'?(I18P(c.zw?'有人过街 · 停车让行':c.gap===false?'等待主路车流':'斑马线 · 让行',c.zw?'people waiting · stop':c.gap===false?'waiting for a gap':'zebra · give way')):'')+(c.t==='zeb'?' · ':'')+dm+' · '+src+'</em></div>';}
 var etaS=DRV.fly?(dd/Math.max(8,v||40)):(R&&R.dur&&R.len?R.dur*rem/R.len:rem/Math.max(6,DRV.lim*.75));
 var rng=DRV.soc*DRV.cap*1000/(DRV.fly?560:150),mode=DRV.fly?(I18T('flight')):(I18T('autopilot')),stTxt={idle:I18T('parked_set_a_destination'),plan:I18T('planning'),drive:'',arrived:I18T('arrived_3'),fly:'',hover:I18T('hovering_set_a_destination'),land:I18T('landing')}[DRV.state]||'';
 el.innerHTML='<div class="dvL"><div class="dvSp"><b>'+drvFmtV(v)+'</b><span>'+drvUnit()+'</span></div>'+(!DRV.fly?'<div class="dvLim"><b>'+drvFmtV(DRV.lim)+'</b><span>'+(I18T('limit'))+'</span></div>':'<div class="dvLim fl"><b>'+Math.round(DRV.alt)+'</b><span>m AGL</span></div>')+sig+'</div>'+
  '<div class="dvC"><div class="dvMode">'+mode+(stTxt?' · '+stTxt:'')+(DRV.blink?' <span class="dvBl'+(Math.floor(performance.now()/333)%2?' on':'')+'">'+(DRV.blink==='L'?(I18T('indicator')):(I18T('indicator_2')))+'</span>':'')+'</div>'+(st&&!DRV.fly?'<div class="dvTurn"><i>'+drvTurnIcon(st.mod)+'</i><b>'+esc(drvTurnText(st))+'</b><span>'+fmtKm(Math.max(0,st.s-DRV.s)/1000)+(st.name?' · '+esc(st.name):'')+'</span></div>':'')+
  '<div class="dvRoad">'+esc(DRV.road||'')+(DRV.road?' · ':'')+(I18P(['高速','快速路','主干道','次干道','支路','街巷','服务道路','小路','步道','','公交道','码头'][DRV.rcls]||'',['Motorway','Trunk','Primary','Secondary','Tertiary','Street','Service','Track','Path','','Busway','Pier'][DRV.rcls]||''))+' · '+(DRV.lht?(I18T('keep_left')):(I18T('keep_right')))+'</div></div>'+
  '<div class="dvR"><div class="dvEta">'+((DRV.state==='drive'||DRV.state==='fly')?(fmtKm((DRV.fly?dd:rem)/1000)+' · '+Math.max(1,Math.round(etaS/60))+' min'):'—')+'</div><div class="dvBat"><i style="width:'+Math.round(DRV.soc*100)+'%"></i></div><div class="dvBatT">'+(DRV.soc*100).toFixed(1)+'% · '+(I18T('range'))+fmtKm(rng)+'</div>'+
  '<div class="dvSrc">'+(DRV.route?(DRV.route.src==='osrm'?(I18T('osrm_osm_one_way')):(I18P('本地路网 · 单行✓ 私人路✗ 掉头✗ 禁转 '+(DRV.route.rx||0),'local · one-way✓ private✗ U-turn✗ restrictions '+(DRV.route.rx||0)))):'')+(DRV.ovp?(I18T('osm_controls'))+DRV.ovp.n.length:(DRV.route?(I18T('inferred_controls')):''))+'</div></div>';}
function drvScreen(){var P=DRV.parts,c=P.scC,x=c.getContext('2d'),W=c.width,H=c.height,R=drvRouteLocal(),zh=LZ();x.fillStyle='#04070d';x.fillRect(0,0,W,H);
 x.save();x.translate(W*.38,H*.72);x.rotate(DRV.yaw+Math.PI);var sc=.45;x.strokeStyle='rgba(90,140,200,.35)';x.lineWidth=2;
 var cx=Math.floor(DRV.pos.x/DRV_CELL),cz=Math.floor(DRV.pos.z/DRV_CELL);drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;for(var a=cx-6;a<=cx+6;a++)for(var b=cz-6;b<=cz+6;b++){var L=X.G[a+','+b];if(!L)continue;x.beginPath();L.forEach(function(s){x.moveTo((s[0]-DRV.pos.x)*sc,(s[1]-DRV.pos.z)*sc);x.lineTo((s[2]-DRV.pos.x)*sc,(s[3]-DRV.pos.z)*sc);});x.stroke();}});
 if(R){x.strokeStyle='#38c8ff';x.lineWidth=6;x.beginPath();for(var i=0;i<R.P.length/2;i++){var px=(R.P[i*2]-DRV.pos.x)*sc,pz=(R.P[i*2+1]-DRV.pos.z)*sc;if(i)x.lineTo(px,pz);else x.moveTo(px,pz);}x.stroke();}
 DRV.ctl.forEach(function(k){if(k.s<DRV.s||k.s>DRV.s+500)return;var q=drvAt(k.s,{});x.fillStyle=k.t==='sig'?(k.st&&k.st.st==='R'?'#ff3b3b':k.st&&k.st.st==='Y'?'#ffc21a':'#2bff88'):'#ff5a5a';x.beginPath();x.arc((q.x-DRV.pos.x)*sc,(q.z-DRV.pos.z)*sc,6,0,7);x.fill();});
 x.restore();x.fillStyle='#e8f6ff';x.beginPath();x.moveTo(W*.38,H*.72-14);x.lineTo(W*.38-9,H*.72+9);x.lineTo(W*.38+9,H*.72+9);x.fill();
 x.fillStyle='rgba(4,7,13,.85)';x.fillRect(W*.7,0,W*.3,H);x.fillStyle='#bfe8ff';x.font='600 64px monospace';x.textAlign='center';x.fillText(String(drvFmtV(DRV.v)),W*.85,H*.36);x.font='20px monospace';x.fillText(drvUnit(),W*.85,H*.46);
 x.fillStyle='#38c8ff';x.fillRect(W*.74,H*.62,W*.22*DRV.soc,14);x.strokeStyle='#38c8ff';x.strokeRect(W*.74,H*.62,W*.22,14);x.fillStyle='#bfe8ff';x.font='18px monospace';x.fillText((DRV.soc*100).toFixed(0)+'%',W*.85,H*.78);x.fillText(DRV.fly?(I18T('fly')):(I18T('auto')),W*.85,H*.9);
 P.scT.needsUpdate=true;}
function drvUI(){var p=document.getElementById('drvP');if(!p)return;lidUI();p.hidden=!DRV.on;var hud=document.getElementById('drvHud');if(hud)hud.hidden=!DRV.on;if(!DRV.on)return;
 p.querySelectorAll('[data-dv]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-dv')===DRV.view);});p.querySelectorAll('[data-dx]').forEach(function(b){b.setAttribute('aria-pressed',+b.getAttribute('data-dx')===DRV.speedX);});
 var f=document.getElementById('dvFly');if(f)f.setAttribute('aria-pressed',DRV.fly);var pk=document.getElementById('dvPick');if(pk)pk.setAttribute('aria-pressed',DRV.pick);
 var s=document.getElementById('dvState');if(s){var zh=LZ();s.textContent=DRV.dest?((I18T('to'))+(DRV.dest.n||'')):(I18T('no_destination'));}}
function wireDrive(){var b=document.getElementById('bDrive');if(!b||b._w||!document.getElementById('drvP'))return;b._w=1;b.onclick=function(){if(DRV.on)drvEnd();else drvStart();};
 var p=document.getElementById('drvP');['pointerdown','wheel','keydown'].forEach(function(t){p.addEventListener(t,function(e){e.stopPropagation();},{passive:t!=='keydown'});});
 p.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;var v=t.getAttribute('data-dv'),x=t.getAttribute('data-dx');
  if(v){DRV.view=v;DRV.camInit=false;}else if(x){DRV.speedX=+x;}else if(t.id==='dvFly'){drvSetFly(!DRV.fly);}else if(t.id==='dvPick'){DRV.pick=!DRV.pick;if(DRV.pick)toast(I18T('tap_the_street_to'));}
  else if(t.id==='dvStop'){DRV.route=null;DRV.dest=null;DRV.ctl=[];DRV.state=DRV.fly?'hover':'idle';}else if(t.id==='dvEnd'){drvEnd();return;}
  else if(t.hasAttribute('data-ri')){var r=(DRV.res||[])[+t.getAttribute('data-ri')];if(r){document.getElementById('dvRes').innerHTML='';drvSetDest({lat:r.lat,lon:r.lon,n:r.n});}}drvUI();});
 var inp=document.getElementById('dvIn'),tm=0;function go(q,auto){var res=document.getElementById('dvRes'),zh=LZ();if(!q){res.innerHTML='';return;}res.innerHTML='<div class="sn">'+(I18T('searching'))+'</div>';
  srchRemote(q,/\d/.test(q)).then(function(list){if(list==null)return;list=(list||[]).slice(0,4);DRV.res=list;if(auto&&list.length){res.innerHTML='';drvSetDest({lat:list[0].lat,lon:list[0].lon,n:list[0].n});return;}
   res.innerHTML=list.length?list.map(function(r,i){return '<button type="button" data-ri="'+i+'"><b>'+esc(r.n||'')+'</b><em>'+esc(r.s||'')+'</em></button>';}).join(''):'<div class="sn">'+(I18T('no_results'))+'</div>';});}
 inp.addEventListener('input',function(){clearTimeout(tm);var q=inp.value.trim();tm=setTimeout(function(){go(q.length>=2?q:'');},600);});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();clearTimeout(tm);var L=DRV.res||[];if(L.length){document.getElementById('dvRes').innerHTML='';drvSetDest({lat:L[0].lat,lon:L[0].lon,n:L[0].n});inp.blur();}else go(inp.value.trim(),true);}});
 // tap-to-set destination (capture phase, so the building picker does not also fire)
 var dn=null;canvas.addEventListener('pointerdown',function(e){if(DRV.on&&DRV.pick)dn={x:e.clientX,y:e.clientY,t:performance.now()};},true);
 canvas.addEventListener('pointerup',function(e){if(!(DRV.on&&DRV.pick&&dn))return;var tap=Math.hypot(e.clientX-dn.x,e.clientY-dn.y)<8&&performance.now()-dn.t<600;dn=null;if(!tap)return;
  e.stopImmediatePropagation();var r=canvas.getBoundingClientRect(),v=new T3.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),rc=new T3.Raycaster();rc.setFromCamera(v,camera);
  var pl=new T3.Plane(new T3.Vector3(0,1,0),0),hit=new T3.Vector3();if(!rc.ray.intersectPlane(pl,hit))return;var ll=localToLL(hit.x,hit.z);DRV.pick=false;drvSetDest({lat:ll.lat,lon:ll.lon,n:(drvNearName(hit.x,hit.z)||(I18T('picked_point')))});drvUI();},true);
 window.addEventListener('keydown',function(e){if(!DRV.on||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;var k=e.key.toLowerCase();if(k==='f'){drvSetFly(!DRV.fly);drvUI();}else if(k==='c'){var L=['fp','tp','top'];DRV.view=L[(L.indexOf(DRV.view)+1)%3];DRV.camInit=false;drvUI();}});}


// ====================================================================
// STREET LIFE — the city around the camera / car is populated with vehicles, pedestrians, dogs on leads and cats.
//  · Vehicles drive on the real road polylines, in lanes, at road-class speeds, respect one-way, climb bridges, and
//    obey the SAME signal plans as your car: when your approach is red the crossing street is green and its cars go.
//  · Pedestrians walk the sidewalks (offset from the kerb by road width); ~1 in 4 walks a dog; cats loiter by buildings.
// Everything is procedural low-poly geometry + instancing (no downloaded models), animated in the vertex shader.
// ====================================================================
var LIFE={ms:0,dbg:{rr:0,pr:0,cross:0,wait:0,still:0},inited:false,cars:[],peds:[],cats:[],at:0,maxCar:130,maxPed:90,maxCat:12,R:650,ends:null,lines:null,jx:null,plans:{},q:{},meshes:null,stats:{c:0,p:0,d:0,k:0}};
// merge simple boxes into one geometry; each box can carry a swing sign (legs/arms) and its pivot height
function lifeBoxes(list){var P=[],N=[],C=[],SW=[],PV=[];list.forEach(function(b){var g=new T3.BoxGeometry(b[0],b[1],b[2]).toNonIndexed();g.translate(b[3],b[4],b[5]);var p=g.attributes.position.array,n=g.attributes.normal.array,c=new T3.Color(b[6]==null?0xffffff:b[6]);
  for(var i=0;i<p.length;i+=3){P.push(p[i],p[i+1],p[i+2]);N.push(n[i],n[i+1],n[i+2]);C.push(c.r,c.g,c.b);SW.push(b[7]||0);PV.push(b[8]||0);}});
 var G=new T3.BufferGeometry();G.setAttribute('position',new T3.Float32BufferAttribute(P,3));G.setAttribute('normal',new T3.Float32BufferAttribute(N,3));G.setAttribute('color',new T3.Float32BufferAttribute(C,3));G.setAttribute('aSw',new T3.Float32BufferAttribute(SW,1));G.setAttribute('aPv',new T3.Float32BufferAttribute(PV,1));return G;}
// walking material: limbs swing about their pivot (forward = +Z); per-instance phase/speed in aPh
function lifeWalkMat(){var m=new T3.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0});m.onBeforeCompile=function(sh){sh.uniforms.uT=U.uTime;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aSw;attribute float aPv;attribute vec2 aPh;uniform float uT;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nif(abs(aSw)>0.5){float an=sin(uT*aPh.y+aPh.x)*0.6*sign(aSw)*step(0.05,aPh.y);float yy=transformed.y-aPv,zz=transformed.z;transformed.y=aPv+yy*cos(an)-zz*sin(an);transformed.z=yy*sin(an)+zz*cos(an);}');};return m;}
function lifeInit(){if(LIFE.inited)return;LIFE.inited=true;var M={};
 // vehicles: sedan / SUV / bus / box truck (body is tinted per instance; lights are a separate emissive mesh)
 var dark=0x111317,glass=0x1a2433;
 var kinds=[{n:'sedan',L:4.6,w:1.85,parts:[[4.6,.75,1.85,0,.55,0,null],[2.3,.6,1.65,0,1.2,-.25,glass],[4.62,.28,1.87,0,.2,0,dark]],lf:[2.31,.62],lr:[-2.31,.72],cap:70},
  {n:'suv',L:4.9,w:1.95,parts:[[4.9,.95,1.95,0,.7,0,null],[3.1,.75,1.85,0,1.5,-.35,glass],[4.92,.3,1.97,0,.22,0,dark]],lf:[2.46,.8],lr:[-2.46,.95],cap:40},
  {n:'bus',L:12,w:2.55,parts:[[12,2.7,2.55,0,1.75,0,null],[11.6,.9,2.57,0,2.2,0,glass],[12.02,.4,2.57,0,.3,0,dark]],lf:[6.01,.9],lr:[-6.01,1.1],cap:8},
  {n:'truck',L:9,w:2.5,parts:[[6.4,2.9,2.5,-1.2,2.0,0,0xd9dde3],[2.4,2.1,2.4,3.3,1.5,0,null],[1.2,.8,2.3,3.6,2.2,0,glass],[9,.4,2.4,0,.3,0,dark]],lf:[4.5,.9],lr:[-4.4,1.0],cap:12}];
 M.kinds=kinds.map(function(k){var parts=k.parts.map(function(p){return [p[0],p[1],p[2],p[5],p[4],p[3],p[6]==null?0xffffff:p[6]];});// box: w(x)… we lay length on Z
  var body=lifeBoxes(parts.map(function(p){return [p[2],p[1],p[0],p[3],p[4],p[5],p[6]];}));
  var lp=[],lc=[];function quad(x,y,z,w,h,nz,c){var hw=w/2,hh=h/2;var v=[[x-hw,y-hh,z],[x+hw,y-hh,z],[x+hw,y+hh,z],[x-hw,y-hh,z],[x+hw,y+hh,z],[x-hw,y+hh,z]];v.forEach(function(q){lp.push(q[0],q[1],q[2]+nz*.01);lc.push(c[0],c[1],c[2]);});}
  [-1,1].forEach(function(sd){quad(sd*k.w*.36,k.lf[1],k.lf[0],.34,.14,1,[1,.97,.85]);quad(sd*k.w*.38,k.lr[1],k.lr[0],.3,.16,-1,[1,.08,.1]);});
  var lg=new T3.BufferGeometry();lg.setAttribute('position',new T3.Float32BufferAttribute(lp,3));lg.setAttribute('color',new T3.Float32BufferAttribute(lc,3));
  var bm=new T3.InstancedMesh(body,new T3.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.55}),k.cap),lm=new T3.InstancedMesh(lg,new T3.MeshBasicMaterial({vertexColors:true,side:T3.DoubleSide,toneMapped:false}),k.cap);
  [bm,lm].forEach(function(o){o.count=0;o.frustumCulled=false;o.instanceMatrix.setUsage(T3.DynamicDrawUsage);streetScene.add(o);});bm.castShadow=false;bm.receiveShadow=true;
  return {k:k,body:bm,lights:lm,free:[],n:0};});
 // pedestrians: clothes mesh with swinging limbs + head mesh
 var shirt=0xffffff,pants=0x6a6f7a,shoe=0x22252b;
 var ped=lifeBoxes([[.42,.58,.24,0,1.17,0,shirt],[.16,.82,.18,-.1,.46,0,pants,1,.88],[.16,.82,.18,.1,.46,0,pants,-1,.88],[.11,.6,.12,-.27,1.12,0,shirt,-1,1.4],[.11,.6,.12,.27,1.12,0,shirt,1,1.4],[.17,.08,.26,-.1,.04,.04,shoe,1,.88],[.17,.08,.26,.1,.04,.04,shoe,-1,.88]]);
 var pm=new T3.InstancedMesh(ped,lifeWalkMat(),LIFE.maxPed),ph=new T3.InstancedBufferAttribute(new Float32Array(LIFE.maxPed*2),2);ped.setAttribute('aPh',ph);
 var hg=new T3.SphereGeometry(.12,10,8);hg.translate(0,1.62,0);var hm=new T3.InstancedMesh(hg,new T3.MeshStandardMaterial({roughness:.7}),LIFE.maxPed);
 // dog (on a lead) and cat
 var fur=0xffffff;var dog=lifeBoxes([[.26,.26,.72,0,.48,0,fur],[.22,.22,.26,0,.66,.44,fur],[.07,.3,.07,-.09,.16,.26,fur,1,.32],[.07,.3,.07,.09,.16,.26,fur,-1,.32],[.07,.3,.07,-.09,.16,-.26,fur,-1,.32],[.07,.3,.07,.09,.16,-.26,fur,1,.32],[.05,.05,.3,0,.62,-.46,fur]]);
 var dm=new T3.InstancedMesh(dog,lifeWalkMat(),LIFE.maxPed),dph=new T3.InstancedBufferAttribute(new Float32Array(LIFE.maxPed*2),2);dog.setAttribute('aPh',dph);
 var cat=lifeBoxes([[.16,.16,.44,0,.25,0,fur],[.15,.14,.14,0,.36,.26,fur],[.05,.18,.05,-.05,.09,.15,fur,1,.18],[.05,.18,.05,.05,.09,.15,fur,-1,.18],[.05,.18,.05,-.05,.09,-.15,fur,-1,.18],[.05,.18,.05,.05,.09,-.15,fur,1,.18],[.04,.3,.04,0,.42,-.24,fur]]);
 var km=new T3.InstancedMesh(cat,lifeWalkMat(),LIFE.maxCat),kph=new T3.InstancedBufferAttribute(new Float32Array(LIFE.maxCat*2),2);cat.setAttribute('aPh',kph);
 var lead=new T3.LineSegments(new T3.BufferGeometry(),new T3.LineBasicMaterial({color:0xd8c08a,transparent:true,opacity:.85}));lead.geometry.setAttribute('position',new T3.BufferAttribute(new Float32Array(LIFE.maxPed*6),3));
 [pm,hm,dm,km].forEach(function(o){o.count=0;o.frustumCulled=false;o.instanceMatrix.setUsage(T3.DynamicDrawUsage);o.castShadow=false;streetScene.add(o);});lead.frustumCulled=false;streetScene.add(lead);
 M.ped=pm;M.pph=ph;M.head=hm;M.dog=dm;M.dph=dph;M.cat=km;M.kph=kph;M.lead=lead;
 // cloud deck (follows the camera; coverage from live weather)
 var cm=new T3.ShaderMaterial({uniforms:{uT:U.uTime,uCov:{value:.4},uDay:U.uDay,uOff:{value:new T3.Vector2()},uSunC:{value:new T3.Color(1,1,1)}},transparent:true,depthWrite:false,fog:false,side:T3.DoubleSide,
  vertexShader:'varying vec2 vW;varying float vR;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xz;vR=length(position.xy);gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'uniform float uT,uCov,uDay;uniform vec2 uOff;uniform vec3 uSunC;varying vec2 vW;varying float vR;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}'+
   'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}void main(){vec2 p=(vW+uOff)*.00042;float f=fbm(p),c=smoothstep(1.02-uCov,1.22-uCov*.6,f);float e=1.-smoothstep(9000.,19000.,vR);if(c*e<.01)discard;'+
   'float sh=.62+.38*fbm(p*2.3+3.1);vec3 day=mix(vec3(.62,.66,.72),vec3(1.),sh)*uSunC;vec3 night=vec3(.08,.1,.15)*(.6+.4*sh);gl_FragColor=vec4(mix(night,day,uDay),c*e*(.55+.35*uCov));}'});
 var cp=new T3.Mesh(new T3.PlaneGeometry(40000,40000,1,1),cm);cp.rotation.x=-Math.PI/2;cp.renderOrder=-1;cp.frustumCulled=false;streetScene.add(cp);M.cloud=cp;
 // signs: speed-limit plates along your route (texture per value) and zebra crossings at signalled junctions
 M.lim=[];for(var i=0;i<6;i++){var gq=new T3.Group(),post=new T3.Mesh(new T3.CylinderGeometry(.04,.04,2.4,6),new T3.MeshStandardMaterial({color:0x8a9099,metalness:.6,roughness:.4}));post.position.y=1.2;gq.add(post);
  var pl=new T3.Mesh(new T3.PlaneGeometry(.62,.78),new T3.MeshBasicMaterial({color:0xffffff,map:lifeLimTex(25,'mph')}));pl.position.set(0,2.45,0);gq.add(pl);gq.userData.pl=pl;gq.visible=false;streetScene.add(gq);M.lim.push(gq);}
 var zm=new T3.MeshBasicMaterial({color:0xe9edf2,transparent:true,opacity:.85,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6}),zg=new T3.PlaneGeometry(.5,3);zg.rotateX(-Math.PI/2);
 M.zeb=new T3.InstancedMesh(zg,zm,70);M.zeb.count=0;M.zeb.frustumCulled=false;streetScene.add(M.zeb);
 // signal heads for BOTH directions at nearby signalled junctions (so you see the cross street green while yours is red)
 var poleM=new T3.MeshStandardMaterial({color:0x2a2f36,metalness:.6,roughness:.4}),boxM=new T3.MeshStandardMaterial({color:0x0e1116,metalness:.3,roughness:.6}),pg=new T3.CylinderGeometry(.08,.1,4.3,8),hb=new T3.BoxGeometry(.34,1.05,.3),lg=new T3.CircleGeometry(.12,14);
 pg.translate(0,2.15,0);hb.translate(0,3.9,0);M.js={pole:new T3.InstancedMesh(pg,poleM,36),head:new T3.InstancedMesh(hb,boxM,36),lamp:new T3.InstancedMesh(lg,new T3.MeshBasicMaterial({toneMapped:false}),216)};
 for(var nm in M.js){var o4=M.js[nm];o4.count=0;o4.frustumCulled=false;o4.instanceMatrix.setUsage(T3.DynamicDrawUsage);streetScene.add(o4);}M.js.lamp.setColorAt(0,new T3.Color());
 LIFE.meshes=M;}
var LSIG_ON=[new T3.Color(0xff2a2a),new T3.Color(0xffc21a),new T3.Color(0x22ff7a)],LSIG_OFF=new T3.Color(0x1c1c1c);
function lifeJSigs(F){var M=LIFE.meshes,J=M.js,cand=[],seen={},c0x=Math.floor((F.x-420)/DRV_CELL),c1x=Math.floor((F.x+420)/DRV_CELL),c0z=Math.floor((F.z-420)/DRV_CELL),c1z=Math.floor((F.z+420)/DRV_CELL);
 drvTiles().forEach(function(T){var X=drvIndexTile(T);if(!X)return;if(!X.bb){var q=[1e9,1e9,-1e9,-1e9];X.J.forEach(function(j){q[0]=Math.min(q[0],j.x);q[1]=Math.min(q[1],j.z);q[2]=Math.max(q[2],j.x);q[3]=Math.max(q[3],j.z);});X.bb=q;}if(F.x<X.bb[0]-420||F.x>X.bb[2]+420||F.z<X.bb[1]-420||F.z>X.bb[3]+420)return;for(var a=c0x;a<=c1x;a++)for(var b=c0z;b<=c1z;b++){var cl=X.JG[a+','+b];if(!cl)continue;cl.forEach(function(j){if(!(j.c1>=1&&j.c1<=4&&j.c2<=5))return;var d=Math.hypot(j.x-F.x,j.z-F.z);if(d>420)return;var k=Math.round(j.x)+','+Math.round(j.z);if(seen[k])return;seen[k]=1;cand.push([d,j]);});}});
 cand.sort(function(a,b){return a[0]-b[0];});var nh=0,nl=0,G=new T3.Matrix4(),L=new T3.Matrix4(),O=new T3.Matrix4(),q=new T3.Quaternion(),up=new T3.Vector3(0,1,0),v=new T3.Vector3(),one=new T3.Vector3(1,1,1),fl=new T3.Matrix4().makeRotationY(Math.PI);
 var usedP={};for(var n=0,ci=0;n<18&&ci<cand.length;ci++){var j=cand[ci][1],P=lifePlan(j);if(usedP[P.key])continue;usedP[P.key]=1;n++;var ux=Math.sin(j.ax),uz=Math.cos(j.ax),vx=uz,vz=-ux,wA=(RW[j.c1]||10)/2+2.2,wB=(RW[j.c2]||10)/2+2.2;
  var pbJ=j.c2===5,pst=pbJ?lifePB(P):null;
  for(var a=0;a<2;a++){var sg=a?-1:1,yaw=j.ax+(a?(pbJ?Math.PI:Math.PI/2):0);q.setFromAxisAngle(up,yaw);v.set(j.x+sg*(ux*wB+vx*wA),1.0,j.z+sg*(uz*wB+vz*wA));G.compose(v,q,one);J.pole.setMatrixAt(nh,G);J.head.setMatrixAt(nh,G);nh++;
   var st=pbJ?pst:drvSig(P,yaw).st,on=st==='R'?0:st==='Y'?1:2;
   for(var f=0;f<2;f++)for(var k=0;k<3;k++){L.makeTranslation(0,4.22-k*.32,f?-.16:.16);if(f)L.multiply(fl);O.multiplyMatrices(G,L);J.lamp.setMatrixAt(nl,O);J.lamp.setColorAt(nl,k===on?LSIG_ON[k]:LSIG_OFF);nl++;}}}
 J.pole.count=J.head.count=nh;J.lamp.count=nl;[J.pole,J.head,J.lamp].forEach(function(o){o.instanceMatrix.needsUpdate=true;});if(J.lamp.instanceColor)J.lamp.instanceColor.needsUpdate=true;}
function lifeLimTex(v,unit){var k=v+unit;LIFE.texLim=LIFE.texLim||{};if(LIFE.texLim[k])return LIFE.texLim[k];var c=document.createElement('canvas');c.width=128;c.height=160;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,160);x.strokeStyle='#111';x.lineWidth=6;x.strokeRect(6,6,116,148);
 x.fillStyle='#111';x.textAlign='center';x.font='bold 22px Arial';x.fillText(unit==='mph'?'SPEED':'',64,40);x.fillText(unit==='mph'?'LIMIT':'',64,64);x.font='bold 62px Arial';x.fillText(String(v),64,unit==='mph'?128:100);if(unit!=='mph'){x.beginPath();x.arc(64,80,56,0,7);x.lineWidth=12;x.strokeStyle='#d8202a';x.stroke();}
 var t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;LIFE.texLim[k]=t;return t;}
// ---------- road graph for life ----------
// each tile's lines are built once and cached on the tile (stable objects, stable ids) — agents keep their road when other tiles stream in or out
function lifeTileLines(T){if(T._ll)return T._ll;var d=T.data,out=[];if(!d.bz)d.bz=bridgeProfile(d.rd,d.ly);
 d.rd.forEach(function(r,ri){var cl=r[0];if(r[1]===2||cl>8&&cl!==10)return;var c=r.slice(2);if(c.length<4)return;var cum=[0];for(var i=2;i<c.length;i+=2)cum.push(cum[cum.length-1]+Math.hypot(c[i]-c[i-2],c[i+1]-c[i-1]));
  var L={c:c,cum:cum,len:cum[cum.length-1],cl:cl,ow:d.ow?d.ow[ri]:0,br:r[1]===1,bz:r[1]===1?d.bz[ri]:0,js:(d.js&&d.js[ri])||null,ri:ri,id:(LIFE.nid=(LIFE.nid||0)+1),T:T,x0:c[0],z0:c[1],x1:c[c.length-2],z1:c[c.length-1]};if(L.len>=8)out.push(L);});
 T._ll=out;return out;}
function lifeLive(L){var lv=L2.live;return !!(lv&&L.T&&lv.gen===LIFE.lgen&&lv.tiles[L.T.x+','+L.T.y]===L.T&&L.T.state==='ready');}
function lifeLines(){var lv=L2.live;if(!lv)return null;var nw=performance.now();if(LIFE.lines&&LIFE.lgen===lv.gen&&nw-(LIFE.lchk||0)<400)return LIFE.lines;LIFE.lchk=nw;var ks=[];for(var k in lv.tiles){if(lv.tiles[k].state==='ready'&&lv.tiles[k].data)ks.push(k);}var sig=lv.gen+'|'+ks.join(';');if(LIFE.lines&&LIFE.lsig===sig)return LIFE.lines;
 if(LIFE.lgen!==lv.gen){LIFE.lgen=lv.gen;LIFE.vj={};LIFE.plans={};LIFE.pgrid={};LIFE.cars=[];LIFE.peds=[];LIFE.cats=[];}
 var lines=[],ends={};ks.forEach(function(k){var ls=lifeTileLines(lv.tiles[k]);for(var i=0;i<ls.length;i++){var L=ls[i];lines.push(L);
   var a=Math.round(L.x0)+','+Math.round(L.z0),b=Math.round(L.x1)+','+Math.round(L.z1);(ends[a]||(ends[a]=[])).push([L,0]);(ends[b]||(ends[b]=[])).push([L,1]);}});
 LIFE.lines=lines;LIFE.ends=ends;LIFE.lsig=sig;lifeStGrid(lines);return lines;}
function lifeAt(L,s,out){var cum=L.cum,n=cum.length,lo=0,hi=n-1;s=Math.max(0,Math.min(L.len,s));while(hi-lo>1){var m=(lo+hi)>>1;if(cum[m]<=s)lo=m;else hi=m;}var t=(s-cum[lo])/((cum[hi]-cum[lo])||1),c=L.c;
 out.x=c[lo*2]+(c[hi*2]-c[lo*2])*t;out.z=c[lo*2+1]+(c[hi*2+1]-c[lo*2+1])*t;out.dx=(c[hi*2]-c[lo*2]);out.dz=(c[hi*2+1]-c[lo*2+1]);var l=Math.hypot(out.dx,out.dz)||1;out.dx/=l;out.dz/=l;out.y=L.bz?brH(s,L.len,L.bz):0;out.i=lo;return out;}
function lifePlan(j){if(j._plan&&LIFE.plans[j._plan.key]===j._plan)return j._plan;var g=LIFE.pgrid||(LIFE.pgrid={}),gx=Math.floor(j.x/24),gz=Math.floor(j.z/24),best=null,bd=24*24;
 for(var a=gx-1;a<=gx+1;a++)for(var b=gz-1;b<=gz+1;b++){var L=g[a+','+b];if(L)for(var i=0;i<L.length;i++){var q=L[i],e=(q.jx-j.x)*(q.jx-j.x)+(q.jz-j.z)*(q.jz-j.z);if(e<bd){bd=e;best=q;}}}
 if(!best){best={jx:j.x,jz:j.z,ax:j.ax,cA:j.c1,cB:j.c2,turn:'S'};drvPlan(best);best.key=Math.round(j.x)+','+Math.round(j.z);LIFE.plans[best.key]=best;(g[gx+','+gz]||(g[gx+','+gz]=[])).push(best);}
 j._plan=best;return best;}
// ==== real lane counts (OpenStreetMap lanes / lanes:forward / lanes:backward via Overpass) ====
// One request per ready tile, nearest first, one at a time; compact results cached in Cache Storage. When a tile's
// lanes arrive its roads are rebuilt in the worker (paint, width, stations) and the life lines pick the new lanes up.
var LANES={q:[],busy:false,mem:{},fail:0,ok:0,applied:0,ver:1};
function lanesWant(T){if(T._lnq||!T.data||/nolanes/.test(location.hash))return;T._lnq=1;LANES.q.push(T);lanesPump();}
function lanesPump(){if(LANES.busy||LANES.fail>12)return;var lv=L2.live;if(!lv){LANES.q=[];return;}var F=lifeFocus(),best=-1,bd=1e18;
 LANES.q=LANES.q.filter(function(T){return lv.tiles[T.x+','+T.y]===T&&T.state==='ready';});
 LANES.q.forEach(function(T,i){var lon=tilon(T.x+.5),lat=tilat(T.y+.5),x=(lon-lv.lon0)*lv.mLon,z=(lat-lv.lat0)*lv.mLat,d=(x-F.x)*(x-F.x)+(z-F.z)*(z-F.z);if(d<bd){bd=d;best=i;}});
 if(best<0)return;var T=LANES.q.splice(best,1)[0],gen=lv.gen;LANES.busy=true;
 var bad=false;lanesFetch(T.x,T.y).then(function(W){if(W){LANES.ok++;if(L2.live&&L2.live.gen===gen&&L2.live.tiles[T.x+','+T.y]===T)return lanesApply(T,W);}else bad=true;})
  .catch(function(){bad=true;}).then(function(){LANES.busy=false;if(bad){LANES.fail++;T._lnr=(T._lnr||0)+1;if(T._lnr<3)LANES.q.push(T);}
   // the public Overpass server is often slow (20–40 s): back off after a failure instead of hammering it
   setTimeout(lanesPump,bad?20000:LANES.mem[T.x+','+T.y]&&LANES.mem[T.x+','+T.y].c?50:1500);});}
function lanesFetch(x,y){var k=x+','+y,url='https://se-lanes.local/v'+LANES.ver+'/14/'+x+'/'+y+'.json';if(LANES.mem[k])return Promise.resolve(LANES.mem[k].w);
 var cp=window.caches?caches.open('se-lanes').then(function(c){return c.match(url).then(function(r){return r?r.json():null;});}).catch(function(){return null;}):Promise.resolve(null);
 return cp.then(function(hit){if(hit){LANES.mem[k]={w:hit,c:1};return hit;}
  var s=tilat(y+1),n=tilat(y),w=tilon(x),e=tilon(x+1),bb=[s,w,n,e].map(function(v){return v.toFixed(6);}).join(',');
  var q='[out:json][timeout:80];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"]["lanes"]('+bb+');out tags geom qt;';
  var ctl=window.AbortController?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort();},90000);
  return fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:ctl?ctl.signal:undefined})
   .then(function(r){clearTimeout(to);return r.ok?r.json():null;}).then(function(j){if(!j||!j.elements)return null;
    var W=[];j.elements.forEach(function(el){var t=el.tags||{},g=el.geometry;if(!g||g.length<2)return;var tot=parseInt(t.lanes,10)||0,fw=parseInt(t['lanes:forward'],10)||0,bw=parseInt(t['lanes:backward'],10)||0;if(!tot&&!fw&&!bw)return;
     var code=Math.min(15,tot)|(Math.min(15,fw)<<4)|(Math.min(15,bw)<<8),c=[];g.forEach(function(p){c.push(Math.round(p.lat*1e6)/1e6,Math.round(p.lon*1e6)/1e6);});W.push({c:code,g:c});});
    LANES.mem[k]={w:W};if(window.caches)caches.open('se-lanes').then(function(c){c.put(url,new Response(JSON.stringify(W),{headers:{'Content-Type':'application/json'}}));}).catch(function(){});return W;});})
  .catch(function(){return null;});}
// match each tile road to the parallel OSM way under it (majority vote over its vertices)
function lanesMatch(T,W){var d=T.data,lv=L2.live,G={},CS=16;W.forEach(function(w,wi){var p=[];for(var i=0;i<w.g.length;i+=2)p.push([(w.g[i+1]-lv.lon0)*lv.mLon,(w.g[i]-lv.lat0)*lv.mLat]);
  for(var i=0;i+1<p.length;i++){var a=p[i],b=p[i+1],sg=[a[0],a[1],b[0],b[1],wi];for(var cx=Math.floor(Math.min(a[0],b[0])/CS);cx<=Math.floor(Math.max(a[0],b[0])/CS);cx++)for(var cz=Math.floor(Math.min(a[1],b[1])/CS);cz<=Math.floor(Math.max(a[1],b[1])/CS);cz++)(G[cx+','+cz]||(G[cx+','+cz]=[])).push(sg);}});
 var ln=new Int16Array(d.rd.length),n=0;
 d.rd.forEach(function(r,ri){var cl=r[0];if(!(cl<=6||cl===10)||r[1]===2)return;var tol=(RW[cl]||7)/2+3,votes={},ns=0;
  for(var i=2;i+3<r.length;i+=2){var x=(r[i]+r[i+2])/2,z=(r[i+1]+r[i+3])/2,dx=r[i+2]-r[i],dz=r[i+3]-r[i+1],dl=Math.hypot(dx,dz);if(dl<2)continue;dx/=dl;dz/=dl;ns++;
   var cell=G[Math.floor(x/CS)+','+Math.floor(z/CS)];if(!cell)continue;var bw=-1,be=tol*tol;
   for(var k=0;k<cell.length;k++){var q=cell[k],ex=q[2]-q[0],ez=q[3]-q[1],el=Math.hypot(ex,ez);if(el<.5)continue;if(Math.abs((ex*dx+ez*dz)/el)<.85)continue;var e=segD2(x,z,q[0],q[1],q[2],q[3]);if(e<be){be=e;bw=q[4];}}
   if(bw>=0)votes[bw]=(votes[bw]||0)+Math.min(dl,40);}
  var top=-1,tv=0;for(var k2 in votes)if(votes[k2]>tv){tv=votes[k2];top=+k2;}if(top>=0&&ns){ln[ri]=W[top].c;n++;}});
 return n?ln:null;}
function lanesApply(T,W){var d=T.data,ln=lanesMatch(T,W);if(!ln)return;var ch=false;
 for(var i=0;i<ln.length;i++){if(!ln[i])continue;var r=d.rd[i],a=rdLane(r[0],d.ow?d.ow[i]:0,ln[i],RW),b=rdLane(r[0],d.ow?d.ow[i]:0,0,RW);if(a.n!==b.n||a.wc!==b.wc){ch=true;break;}}
 d.ln=ln;d.lnv=(d.lnv||0)+1;if(!ch)return;var gen=L2.live.gen;
 return lanesRoads(d).then(function(ra){var lv=L2.live;if(!ra||!lv||lv.gen!==gen||lv.tiles[T.x+','+T.y]!==T||!T.group||!T.rd3)return;
  var old=T.rd3,roads=buildRoads(d.rd,ra,d.ly,d.ow);[old.mesh,old.glow,old.br].forEach(function(o){if(o){T.group.remove(o);disposeTree(o);}});
  T.group.add(roads.mesh);T.group.add(roads.glow);if(roads.br)T.group.add(roads.br);T.rd3=roads;d.js=ra.js;
  if(T._ll)T._ll.forEach(function(L){L.js=(d.js&&d.js[L.ri])||null;});if(LIFE.lines)lifeStGrid(LIFE.lines);LIFE.vj={};LANES.applied++;renderer.shadowMap.needsUpdate=true;});}
function lanesRoads(d){var w=twBoot();if(!w)return Promise.resolve(roadArrays(d.rd,roadCols(),d.ly,d.ow,null,d.ln));
 return new Promise(function(res){var id=++TW.id;TW.cb[id]={rej:function(){res(roadArrays(d.rd,roadCols(),d.ly,d.ow,null,d.ln));},res:function(m){res(m.d);},a:function(){}};w.postMessage({op:'r',id:id,rd:d.rd,ly:d.ly,ow:d.ow,ln:d.ln});});}
// lane layout of a life line (cached until the tile's lanes change)
function lifeLN(L){var d=L.T&&L.T.data,v=d?d.lnv||0:0;if(L._ln&&L._lnv===v)return L._ln;L._lnv=v;L._ln=rdLane(L.cl,L.ow,d&&d.ln?d.ln[L.ri]||0:0,RW);return L._ln;}
// centre of lane k (0 = next to the centre line / the lane for turning across traffic), metres right of the driving direction
function laneU(LN,k,side){var n=LN.n;k=Math.max(0,Math.min(n-1,k));return (LN.two?(k+.5)*LN.wc/n:-LN.wc+(k+.5)*2*LN.wc/n)*side;}
function lifeFocus(){if(DRV.on&&DRV.car)return {x:DRV.pos.x,z:DRV.pos.z};var t=L2.target;return {x:t.x,z:t.z};}
function lifeSpawnCar(F,lines){lines=LIFE.near||lines;var L=null;for(var tr=0;tr<12;tr++){var c=lines[(Math.random()*lines.length)|0];if(c.cl>5&&c.cl!==10||c.len<30)continue;var mx=(c.x0+c.x1)/2,mz=(c.z0+c.z1)/2;if(Math.hypot(mx-F.x,mz-F.z)<LIFE.R*.95){L=c;break;}}if(!L)return null;
 var dir=L.ow===1?1:L.ow===-1?-1:(Math.random()<.5?1:-1),r=Math.random(),kind=L.cl<=2&&r<.12?3:r<.05?2:r<.4?1:0,lanes=lifeLN(L).n;
 var col=new T3.Color().setHSL(Math.random(),Math.random()<.5?.05:.55,Math.random()<.35?.85:.18+Math.random()*.45);if(kind===2)col.setHex(Math.random()<.5?0x2a6fd6:0xf2b134);
 var s0=Math.random()*L.len,ln=(Math.random()*lanes)|0;for(var i=0;i<LIFE.cars.length;i++){var o=LIFE.cars[i];if(o.L===L&&o.dir===dir&&o.lane===ln&&Math.abs(o.s-s0)<16)return null;}
 if(LIFE.cars.length>20){var q={};lifeAt(L,s0,q);if(Math.hypot(q.x-camera.position.x,q.z-camera.position.z)<170)return null;}
 return {L:L,s:s0,dir:dir,v:drvLimit(L.cl)*.6,vmax:drvLimit(L.cl)*(.82+Math.random()*.2),kind:kind,lane:ln,col:col,wait:0,stopKey:null,id:Math.random()};}
// pedestrian push-button signal on a major road where a minor street joins: cars run on green until someone presses;
// then (after ≥10 s of car green) amber 3.5 s → red for the WALK time + 1.5 s clearance → green.
function lifePB(P){var t=LIFE.clock||0;if(P.pbS==null){P.pbS='G';P.pbT=t-99;P.pbW=9;}var e=t-P.pbT;
 if(P.pbS==='G'&&P.pbReq&&e>=10){P.pbS='Y';P.pbT=t;P.pbReq=0;e=0;}
 if(P.pbS==='Y'&&e>=3.5){P.pbS='R';P.pbT=t;e=0;}
 if(P.pbS==='R'&&e>=P.pbW+1.5){P.pbS='G';P.pbT=t;P.pbW=9;}
 return P.pbS;}
// the crossing a pedestrian walking along L makes at station q0: the station of the road being crossed (its control + zebra position)
function lifeXSt(q0,L){if(q0.X)return q0.X;var G=LIFE.stg;if(!G)return null;var gx=Math.floor(q0[1]/16),gz=Math.floor(q0[2]/16),best=null,bd=81,a={},b={};lifeAt(L,q0[0],a);
 for(var i=gx-1;i<=gx+1;i++)for(var j=gz-1;j<=gz+1;j++){var cell=G[i+','+j];if(!cell)continue;for(var k=0;k<cell.length;k++){var e=cell[k];if(e[0]===L)continue;var q=e[1],d=(q[1]-q0[1])*(q[1]-q0[1])+(q[2]-q0[2])*(q[2]-q0[2]);if(d>=bd)continue;lifeAt(e[0],q[0],b);if(Math.abs(a.dx*b.dx+a.dz*b.dz)>.75)continue;bd=d;best=e;}}
 if(!best)return null;var M=best[0],q=best[1],sg=0;lifeAt(M,q[0],b);if(q[0]<q[3]+2){sg=1;}else if(M.len-q[0]<q[3]+2){sg=-1;}
 var X={f:q[4],r:q[3],ax:b.dx*(sg||1),az:b.dz*(sg||1),one:!!sg};q0.X=X;return X;}
function lifeStGrid(lines){var G={};lines.forEach(function(L){if(!L.js||L.br)return;L.js.forEach(function(q){var k=Math.floor(q[1]/16)+','+Math.floor(q[2]/16);(G[k]||(G[k]=[])).push([L,q]);});});LIFE.stg=G;}
// next road for a vehicle at the end of its line, with the kind of turn: S straight, X across oncoming traffic (left in
// right-hand traffic), W with the traffic (right in right-hand traffic)
function lifeNextLine(c,L){var atEnd=c.dir>0,key=atEnd?Math.round(L.x1)+','+Math.round(L.z1):Math.round(L.x0)+','+Math.round(L.z0),opts=(LIFE.ends[key]||[]).filter(function(o){return o[0]!==L&&(o[0].cl<=5||o[0].cl===10)&&(o[1]===0?o[0].ow!==-1:o[0].ow!==1);});
 if(!opts.length)return null;var e0={};lifeAt(L,atEnd?L.len:0,e0);var hx=e0.dx*c.dir,hz=e0.dz*c.dir,sc=opts.map(function(o){var e1={},d1=o[1]===0?1:-1;lifeAt(o[0],o[1]===0?1:o[0].len-1,e1);var ux=e1.dx*d1,uz=e1.dz*d1;return [o,ux*hx+uz*hz,ux*-hz+uz*hx];}).filter(function(q){return q[1]>-.5;});
 if(!sc.length)return null;var st=sc.filter(function(q){return q[1]>.85;}),pk=(st.length&&Math.random()<.6?st:sc),q=pk[(Math.random()*pk.length)|0],rt=q[2]*(DRV.lht?-1:1);
 return [q[0][0],q[0][1],q[1]>.85?'S':rt<0?'X':'W'];}
// permissive left turn (right turn in left-hand traffic): oncoming traffic still moving into the junction within ~40 m has priority
function lifeOncoming(J,hx,hz,self){var CG=LIFE.cg;if(!CG)return false;var gx=Math.floor(J.x/12),gz=Math.floor(J.z/12);
 for(var a=gx-4;a<=gx+4;a++)for(var b=gz-4;b<=gz+4;b++){var cell=CG[a+','+b];if(!cell)continue;for(var i=0;i<cell.length;i++){var o=cell[i];if(o===self||!o.p||o.hx==null||o.v<1.5)continue;if(o.hx*hx+o.hz*hz>-.7)continue;
  var dx=J.x-o.p.x,dz=J.z-o.p.z,f=dx*o.hx+dz*o.hz;if(f<-2||f>40)continue;if(Math.abs(dx*o.hz-dz*o.hx)>9)continue;return true;}}return false;}
// a turn onto the crossing road at a junction in the middle of this road (OSM ways run through many junctions)
function lifeTurnPick(c,L,q0){var G=LIFE.stg;if(!G)return null;var gx=Math.floor(q0[1]/16),gz=Math.floor(q0[2]/16),a={},b={},opts=[];lifeAt(L,q0[0],a);var hx=a.dx*c.dir,hz=a.dz*c.dir;
 for(var i=gx-1;i<=gx+1;i++)for(var j=gz-1;j<=gz+1;j++){var cell=G[i+','+j];if(!cell)continue;for(var k=0;k<cell.length;k++){var e=cell[k],M=e[0],q=e[1];if(M===L||M.br||!(M.cl<=5||M.cl===10)||M.len<40)continue;
  if((q[1]-q0[1])*(q[1]-q0[1])+(q[2]-q0[2])*(q[2]-q0[2])>81)continue;lifeAt(M,q[0],b);if(Math.abs(b.dx*hx+b.dz*hz)>.6)continue;
  [1,-1].forEach(function(d){if(d>0?(M.ow===-1||M.len-q[0]<30):(M.ow===1||q[0]<30))return;var ux=b.dx*d,uz=b.dz*d,rt=(ux*-hz+uz*hx)*(DRV.lht?-1:1);opts.push({M:M,sM:q[0],dirM:d,t:rt<0?'X':'W'});});}}
 if(!opts.length)return null;var o=opts[(Math.random()*opts.length)|0];o.L=L;o.sv=q0[0];return o;}
// stop position: front bumper 0.3 m behind the painted stop line; the line sits after the crosswalk (signals) or at the kerb line (stop signs)
function lifeStopOff(crossW,sig,carL){return crossW/2+(sig?3.3:0)+1.6+carL/2;}
// other road users around a vehicle: queue behind same-direction traffic, yield to anything crossing in front, stop for people in the road
function lifeNeighbours(c,hx,hz,M,why){var CG=LIFE.cg,PG=LIFE.pg,cx=Math.floor(c.p.x/12),cz=Math.floor(c.p.z/12),Lc=M.kinds[c.kind].k.L,vt=1e9;
 for(var a=cx-2;a<=cx+2;a++)for(var b=cz-2;b<=cz+2;b++){var cell=CG[a+','+b];if(cell)for(var i=0;i<cell.length;i++){var o=cell[i];if(o===c||!o.p)continue;
   var ex=o.p.x-c.p.x,ez=o.p.z-c.p.z,fw=ex*hx+ez*hz;if(fw<=0||fw>42)continue;var lat=Math.abs(ex*hz-ez*hx),dot=(o.hx||0)*hx+(o.hz||0)*hz,Lo=M.kinds[o.kind].k.L,gap=fw-(Lc+Lo)/2;
   if(dot>.7){if(lat<1.8){vt=Math.min(vt,Math.max(0,(gap-2.5)*.9),o.v+Math.max(0,gap-10)*.5);if(why&&vt<.5){why.k='follow';why.o=[Math.round(o.p.x),Math.round(o.p.z),o.id,+o.v.toFixed(1)];}}}
   else if(dot>-.7){var wo=M.kinds[o.kind].k.w||2;if(o.id===-1&&(c.still||0)>8&&o.v<.3&&!(fw<Lc/2+2.5&&lat<2.2))continue;if(lat<Lo/2+1.6&&fw<Lc/2+4+c.v*c.v/10&&!((c.still||0)>40&&fw>Lc/2+1.5)){if(!lifeSees(o,c,M)||c.id>o.id){vt=Math.min(vt,Math.max(0,(fw-Lc/2-wo/2-1.2)*.8));if(why&&vt<.5){why.k='cross';why.o=[Math.round(o.p.x),Math.round(o.p.z),o.id,+o.v.toFixed(1),+(o.still||0).toFixed(0)];}}}}}
  var pc=PG[a+','+b];if(pc)for(var j=0;j<pc.length;j++){var w=pc[j];if(!w.p)continue;var px=w.p.x-c.p.x,pz=w.p.z-c.p.z,pf=px*hx+pz*hz;if(pf<=0||pf>Lc/2+5+c.v*c.v/8)continue;var pl=Math.abs(px*hz-pz*hx),pd=Math.abs((w.hx||0)*hx+(w.hz||0)*hz),ahead=pf/Math.max(1.5,c.v),still=w.hold||w.pause>0;if(still?pl<1.4:(pd<.92?pl<2.0+Math.min(3.5,1.3*ahead*(1-pd)):pl<1.2)){vt=Math.min(vt,Math.max(0,(pf-Lc/2-2.5)*.8));LIFE.dbg.yieldPed=(LIFE.dbg.yieldPed||0)+1;if(why&&vt<.5){why.k='ped';why.o=[Math.round(w.p.x),Math.round(w.p.z),w.hold,w.jc&&w.jc.t,w.jc&&+((w.jc.sv-w.s)*w.dir).toFixed(1),w.jc&&w.jc.kerb,w.pause>0,w.L.cl,+pf.toFixed(1),+pl.toFixed(1),+pd.toFixed(2)];}}}}
 return vt;}
function lifeSees(o,c,M){if(!o.p||!c.p||o.hx==null)return false;var ex=c.p.x-o.p.x,ez=c.p.z-o.p.z,fw=ex*o.hx+ez*o.hz;if(fw<=0)return false;var lat=Math.abs(ex*o.hz-ez*o.hx),Lo=M.kinds[o.kind].k.L,Lc=M.kinds[c.kind].k.L,dot=(c.hx||0)*o.hx+(c.hz||0)*o.hz;return dot<.7&&dot>-.7&&lat<Lc/2+1.6&&fw<Lo/2+4+o.v*o.v/10;}
// stop sign gap acceptance: no crossing vehicle heading into the junction within ~35 m
function lifeGapClear(J,c){if((c.wait||0)>20)return true;var CG=LIFE.cg,gx=Math.floor(J.x/12),gz=Math.floor(J.z/12);for(var a=gx-3;a<=gx+3;a++)for(var b=gz-3;b<=gz+3;b++){var cell=CG[a+','+b];if(!cell)continue;
  for(var i=0;i<cell.length;i++){var o=cell[i];if(o===c||!o.p||o.hx==null)continue;var dx=J.x-o.p.x,dz=J.z-o.p.z,d=Math.hypot(dx,dz);if(d>35||d<1)continue;var tow=(dx*o.hx+dz*o.hz)/d;if(tow<.6)continue;
   var dot=o.hx*(c.hx||0)+o.hz*(c.hz||0);if(Math.abs(dot)<.75&&o.v>1)return false;if(d<9&&Math.abs(dot)<.75)return false;}}
 if(DRV.on&&DRV.car){var dx=J.x-DRV.car.position.x,dz=J.z-DRV.car.position.z,d=Math.hypot(dx,dz),fx=Math.sin(DRV.yaw),fz=Math.cos(DRV.yaw);if(d<35&&d>1&&(dx*fx+dz*fz)/d>.6&&Math.abs(fx*(c.hx||0)+fz*(c.hz||0))<.75&&DRV.v>1)return false;}
 return true;}
function lifeStJ(q0,L){if(q0.J)return q0.J;var j=drvNearJunction(q0[1],q0[2],12),o;
 if(j)o={x:j.x,z:j.z,c1:j.c1,c2:j.c2,ax:j.ax};else{var p={},s=Math.max(0,Math.min(L.len,q0[0]));lifeAt(L,s,p);var a=Math.atan2(p.dx,p.dz);o={x:q0[1],z:q0[2],c1:Math.min(L.cl,q0[5]),c2:Math.max(L.cl,q0[5]),ax:L.cl<=q0[5]?a:a+Math.PI/2};}
 o.key=Math.round(o.x)+','+Math.round(o.z);q0.J=o;return o;}
function lifeVJ(L,vi){var k=L.id*4096+vi,m=LIFE.vj||(LIFE.vj={}),v=m[k],t=LIFE.clock||0;if(v===undefined||(v.J===null&&t-v.t>3)){v=m[k]={J:drvNearJunction(L.c[vi*2],L.c[vi*2+1],7)||null,t:t};}return v.J;}
// pedestrian on a footpath: wait if a moving vehicle (or my car) will pass within ~2.5 m of the next few steps in the next ~3 s
function lifeCarPath(w){if(!w.p||w.hx==null)return false;var nx=w.p.x+w.hx*1.5,nz=w.p.z+w.hz*1.5,CG=LIFE.cg,gx=Math.floor(nx/12),gz=Math.floor(nz/12);
 for(var a=gx-2;a<=gx+2;a++)for(var b=gz-2;b<=gz+2;b++){var cell=CG&&CG[a+','+b];if(cell)for(var i=0;i<cell.length;i++){var o=cell[i];if(!o.p||o.hx==null||o.v<.8)continue;var ex=nx-o.p.x,ez=nz-o.p.z,f=ex*o.hx+ez*o.hz;if(f<-3||f>Math.max(8,o.v*3))continue;if(Math.abs(ex*o.hz-ez*o.hx)<2.6)return true;}}return false;}
// a pedestrian about to step off the kerb waits while any moving vehicle is within ~12 m of its path
function lifeCarNear(w,R){if(!w.p)return false;var CG=LIFE.cg,gx=Math.floor(w.p.x/12),gz=Math.floor(w.p.z/12);R=R||8;
 for(var a=gx-1;a<=gx+1;a++)for(var b=gz-1;b<=gz+1;b++){var cell=CG&&CG[a+','+b];if(cell)for(var i=0;i<cell.length;i++){var o=cell[i];if(!o.p||o.v<1||o.hx==null)continue;var ex=w.p.x-o.p.x,ez=w.p.z-o.p.z;if(ex*o.hx+ez*o.hz<-2)continue;if(Math.hypot(ex,ez)<R)return true;}}return false;}
// zebra: a moving vehicle that would reach the crossing within ~4 s (ignores vehicles already stopped for us)
function lifeCarComing(w){if(!w.p)return false;var CG=LIFE.cg,gx=Math.floor(w.p.x/12),gz=Math.floor(w.p.z/12);
 for(var a=gx-3;a<=gx+3;a++)for(var b=gz-3;b<=gz+3;b++){var cell=CG&&CG[a+','+b];if(cell)for(var i=0;i<cell.length;i++){var o=cell[i];if(!o.p||o.v<1||o.hx==null)continue;var ex=w.p.x-o.p.x,ez=w.p.z-o.p.z,f=ex*o.hx+ez*o.hz;if(f<-1||f>Math.max(10,o.v*4))continue;if(Math.abs(ex*o.hz-ez*o.hx)<9)return true;}}return false;}
function lifePedJ(w){var L=w.L,JSs=L.js;if(!JSs)return null;var p={};lifeAt(L,w.s,p);
 for(var k=0;k<JSs.length;k++){var q0=JSs[w.dir>0?k:JSs.length-1-k],dd=(q0[0]-w.s)*w.dir;if(dd<0)continue;if(dd>45)break;
  var X=lifeXSt(q0,L),hx=p.dx*w.dir,hz=p.dz*w.dir;
  // a side street that only joins on the far side of the road: nothing to cross on this pavement
  if(X&&X.one&&(X.ax*-hz+X.az*hx)*w.side<-.3&&(w.dir>0?L.len-q0[0]:q0[0])>q0[3]+2)continue;
  var f=X?X.f:(q0[4]===2?2:(q0[4]===1&&q0[5]<=4)?3:1),o={J:lifeStJ(q0,L),t:f===2?'sig':f===3?'pb':'zeb',sig:f===2,sv:q0[0],kerb:q0[3]+.9,zoff:X?Math.max(X.r+1.8,lifeLN(L).wc+1):0,end:(w.dir>0?L.len-q0[0]:q0[0])<q0[3]+2,yaw:(function(){var ps={};lifeAt(L,q0[0]-w.dir*(q0[3]+1),ps);return Math.atan2(ps.dx*w.dir,ps.dz*w.dir);})()};
  if(w.jc&&w.jc.sv===o.sv&&w.jc.J===o.J&&w.jc.t===o.t){o.go=w.jc.go;o.goT=w.jc.goT;o.goS=w.jc.goS;o.gd=w.jc.gd;o.dec=w.jc.dec;}return o;}return null;}
function lifePedOK(L){return L.cl>=2&&L.cl<=5&&!L.br&&L.len>=22;}
// leave a line end onto another pavement: straight on (across the side road at the crossing) or round the corner — never through the carriageway
function lifePedXfer(w,mode,probe){var L=w.L,atEnd=w.dir>0,key=atEnd?Math.round(L.x1)+','+Math.round(L.z1):Math.round(L.x0)+','+Math.round(L.z0),e0={},a={};lifeAt(L,atEnd?L.len:0,e0);lifeAt(L,Math.max(0,Math.min(L.len,w.s)),a);
 var hx=e0.dx*w.dir,hz=e0.dz*w.dir,oc=w.oc!=null?w.oc:w.off,Px=a.x+(-a.dz*w.dir)*oc*w.side,Pz=a.z+(a.dx*w.dir)*oc*w.side,nx=atEnd?L.x1:L.x0,nz=atEnd?L.z1:L.z0;
 var sc=(LIFE.ends[key]||[]).filter(function(o){return o[0]!==L&&lifePedOK(o[0]);}).map(function(o){var e1={},d1=o[1]===0?1:-1;lifeAt(o[0],o[1]===0?1:o[0].len-1,e1);var ux=e1.dx*d1,uz=e1.dz*d1;return {o:o,d1:d1,dot:ux*hx+uz*hz,pj:(Px-nx)*ux+(Pz-nz)*uz};});
 var st=sc.filter(function(q){return q.dot>.85;}),cn=sc.filter(function(q){return Math.abs(q.dot)<.6&&q.pj>.8;}),pick=null;
 if(mode==='turn')pick=cn.length?cn[(Math.random()*cn.length)|0]:null;else if(mode==='straight')pick=st.length?st[0]:null;else pick=st.length?st[0]:cn.length?cn[(Math.random()*cn.length)|0]:null;
 if(!pick)return false;if(probe)return true;var o=pick.o,NL=o[0],sn=Math.max(.3,pick.pj);w.L=NL;w.dir=pick.d1;w.s=pick.d1>0?Math.min(NL.len,sn):Math.max(0,NL.len-sn);var b={};lifeAt(NL,w.s,b);
 var rx=-b.dz*w.dir,rz=b.dx*w.dir,lat=(Px-b.x)*rx+(Pz-b.z)*rz;w.side=lat>=0?1:-1;w.oc=Math.max(Math.abs(lat),lifeLN(NL).wc+.8);w.off=lifePedOff(NL,w.offr);w.jc=null;w.jcAt=0;return true;}
function lifePedOff(L,r){return lifeLN(L).wc+.8+(r==null?Math.random():r)*1.8;}
function lifeSpawnPed(F,lines){lines=LIFE.near||lines;var L=null;for(var tr=0;tr<12;tr++){var c=lines[(Math.random()*lines.length)|0];if(!lifePedOK(c))continue;var mx=(c.x0+c.x1)/2,mz=(c.z0+c.z1)/2;if(Math.hypot(mx-F.x,mz-F.z)<LIFE.R*.7){L=c;break;}}if(!L)return null;
 var sk=[0xf1c9a5,0xe0ac69,0xc68642,0x8d5524,0xffdbac][(Math.random()*5)|0],cl=new T3.Color().setHSL(Math.random(),.45+Math.random()*.4,.35+Math.random()*.35);
 return {L:L,s:Math.random()*L.len,dir:Math.random()<.5?1:-1,side:Math.random()<.5?1:-1,offr:Math.random(),off:0,v:1.15+Math.random()*.45,col:cl,skin:new T3.Color(sk),dog:Math.random()<.25,dogCol:new T3.Color([0xd9b27c,0x3b2a1e,0xf2efe8,0x8a6a4a,0x1c1c1c][(Math.random()*5)|0]),ph:Math.random()*6.28,pause:0};}
function lifeStep(dt,now){var on=mode==='street'&&L2.active&&!!L2.live;if(!on){if(LIFE.meshes)lifeHide();return;}lifeInit();var M=LIFE.meshes,F=lifeFocus(),i;
 if(!DRV.on)DRV.simT+=dt;LIFE.clock=(LIFE.clock||0)+dt;
 // clouds
 var c0=ENV&&ENV.cur?ENV.cur.cloud:.4;M.cloud.visible=true;M.cloud.position.set(camera.position.x,Math.max(1400,camera.position.y+900),camera.position.z);M.cloud.material.uniforms.uCov.value=Math.max(.05,Math.min(.98,c0));var wd=((ENV.cur&&ENV.cur.wdir)||250)*D2R,ws=Math.max(1,(ENV.cur&&ENV.cur.wind)||3);LIFE.cOx=(LIFE.cOx||0)+Math.sin(wd)*ws*dt*1.5;LIFE.cOz=(LIFE.cOz||0)-Math.cos(wd)*ws*dt*1.5;M.cloud.material.uniforms.uOff.value.set(LIFE.cOx,LIFE.cOz);
 var _p0=performance.now();var lines=lifeLines();if(!lines||!lines.length)return;var _p1=performance.now();
 // population upkeep (once a second)
 if(now-LIFE.at>1000){LIFE.at=now;var iso0=(L2.city&&L2.city.iso)||'US';RMK.side.value=DRV_LHT[iso0]?-1:1;RMK.yel.value=/^(US|CA|MX|CN|BR|AR|CL|CO|PE|VE|EC|BO|UY|PY|KR|TW)$/.test(iso0)?1:0;LIFE.R=DRV.on?520:Math.max(450,Math.min(900,camera.position.y*1.6));var RR=LIFE.R*LIFE.R;LIFE.near=lines.filter(function(l){var mx=(l.x0+l.x1)/2-F.x,mz=(l.z0+l.z1)/2-F.z;return mx*mx+mz*mz<RR;});if(!LIFE.near.length)LIFE.near=null;
  LIFE.cars=LIFE.cars.filter(function(c){return Math.hypot(c.p?c.p.x-F.x:0,c.p?c.p.z-F.z:0)<LIFE.R*1.15&&lifeLive(c.L);});
  LIFE.peds=LIFE.peds.filter(function(p){return Math.hypot(p.p?p.p.x-F.x:0,p.p?p.p.z-F.z:0)<LIFE.R*.9&&lifeLive(p.L);});
  var wantC=Math.round(LIFE.maxCar*(DRV.on?1:.8)),wantP=LIFE.maxPed;for(i=0;i<60&&LIFE.cars.length<wantC;i++){var nc=lifeSpawnCar(F,lines);if(nc)LIFE.cars.push(nc);}for(i=0;i<50&&LIFE.peds.length<wantP;i++){var np=lifeSpawnPed(F,lines);if(np)LIFE.peds.push(np);}
  if(LIFE.cats.length<LIFE.maxCat&&L2.picks&&L2.picks.length){for(i=0;i<4&&LIFE.cats.length<LIFE.maxCat;i++){var b=L2.picks[(Math.random()*L2.picks.length)|0],bb=b&&b._bb;if(!bb)continue;var cx=(bb[0]+bb[2])/2,cz=(bb[1]+bb[3])/2;if(Math.hypot(cx-F.x,cz-F.z)>LIFE.R*.6)continue;
    LIFE.cats.push({x:bb[0]-1.2+Math.random()*(bb[2]-bb[0]+2.4),z:bb[1]-1.2,yaw:Math.random()*6.28,v:0,t:Math.random()*5,col:new T3.Color([0xff9a3c,0x2b2b2b,0xf5f1ea,0x8c8c8c,0x6b4a2f][(Math.random()*5)|0])});}}
  LIFE.cats=LIFE.cats.filter(function(k){return Math.hypot(k.x-F.x,k.z-F.z)<LIFE.R*.8;});LIFE.q={};
  var hiCam=camera.position.y>650;for(var tk in L2.live.tiles){var TT=L2.live.tiles[tk];if(TT.traffic)TT.traffic.pts.visible=hiCam;}}
 var p={},m=new T3.Matrix4(),q=new T3.Quaternion(),pos=new T3.Vector3(),scl=new T3.Vector3(1,1,1),up=new T3.Vector3(0,1,0),side=DRV.lht?-1:1,day=U.uDay?U.uDay.value:1;
 // ---- vehicles ----
 var _p2=performance.now();M.kinds.forEach(function(K){K.n=0;});var CG=LIFE.cg={},PG=LIFE.pg={},BK={};LIFE.cars.forEach(function(c){var k=c.L.id+'|'+c.dir+'|'+c.lane;(BK[k]||(BK[k]=[])).push(c);});LIFE.cars.forEach(function(c){if(!c.p)return;var k=Math.floor(c.p.x/12)+','+Math.floor(c.p.z/12);(CG[k]||(CG[k]=[])).push(c);});
 LIFE.peds.forEach(function(w){if(!w.p)return;var k=Math.floor(w.p.x/12)+','+Math.floor(w.p.z/12);(PG[k]||(PG[k]=[])).push(w);});
 var me=DRV.on&&DRV.car&&!DRV.fly?{x:DRV.car.position.x,z:DRV.car.position.z,fx:Math.sin(DRV.yaw),fz:Math.cos(DRV.yaw),pk:!!DRV.parked&&DRV.v<.3}:null;
 if(me){var mo={p:{x:me.x,z:me.z},hx:me.fx,hz:me.fz,v:DRV.v,kind:0,id:-1},mk=Math.floor(me.x/12)+','+Math.floor(me.z/12);(CG[mk]||(CG[mk]=[])).push(mo);}
 for(i=0;i<LIFE.cars.length;i++){var c=LIFE.cars[i],L=c.L,ahead=c.dir>0?L.len-c.s:c.s;lifeAt(L,c.s,p);var hx=p.dx*c.dir,hz=p.dz*c.dir;
  // next junction on this line in our direction: signal / stop decision with the shared plan
  var vt=c.vmax,hold=null,sigSt=null,lineS=null,s0c=c.s,JSs=L.js,Lc0=M.kinds[c.kind].k.L;
  // next controlled junction on this road (stations come from the same geometry that paints the stop lines)
  var qPrev=null;if(JSs)for(var k=0;k<JSs.length;k++){var q0=JSs[c.dir>0?k:JSs.length-1-k],sv=q0[0],dd=(sv-c.s)*c.dir;if(dd<0){qPrev=q0;continue;}if(dd>90)break;if(!q0[4])continue;
   var f4=q0[4],isSig=f4===2,J=lifeStJ(q0,L),key=J.key;var so=q0[3]+3.3+1.6+Lc0/2;
   // two junction nodes too close to queue between (divided-road crossings): having come through the first, clear the second too
   if(qPrev&&(sv-qPrev[0])*c.dir<so+qPrev[3]+3)continue;
   var stopD=dd-so,sLine=sv-so*c.dir;if(c.jk!==key){c.jk=key;c.goY=false;}
   var endS0=Math.abs(sv-(c.dir>0?L.len:0))<q0[3]+4;if(!endS0&&dd<75&&c.tjk!==key){c.tjk=key;c.tj=(Math.random()<.3)?lifeTurnPick(c,L,q0):null;if(c.tj)c.tj.key=key;}
   if(isSig){var PJs=lifePlan(J),endSt=Math.abs(sv-(c.dir>0?L.len:0))<q0[3]+4,tX=(endSt&&c.nx&&c.nx!=='none'&&c.nx[2]==='X')||(!!c.tj&&c.tj.key===key&&c.tj.t==='X'),tsv=PJs.turn;PJs.turn=tX?(DRV.lht?'R':'L'):'S';var S=drvSig(PJs,Math.atan2(hx,hz));PJs.turn=tsv;if(S.st==='G'||S.st==='GA')c.goY=false;
    var mustStop=(S.st==='R'&&!c.goY)||(S.st==='Y'&&!c.goY&&stopD>c.v*c.v/6+1);if(S.st==='Y'&&!mustStop)c.goY=true;// committed on amber → clear the box
    var turning=(endSt&&c.nx&&c.nx!=='none'&&c.nx[2]!=='S')||(!!c.tj&&c.tj.key===key);if(turning&&stopD>-1&&stopD<45)vt=Math.min(vt,5+Math.max(0,stopD)*.3);// slow down for the turn
    if(!mustStop&&tX&&S.st==='G'&&c.goL!==key&&stopD>-1){if(stopD<12&&lifeOncoming(J,hx,hz,c)){mustStop=true;LIFE.dbg.yL=(LIFE.dbg.yL||0)+dt;}else if(stopD<1.5)c.goL=key;}// permissive turn across traffic: wait at the line in the turn lane
    if(mustStop&&stopD>-1){vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,stopD)));if(stopD<.8)vt=0;hold=sLine;}sigSt=S.st;}
   else if(f4===3){var PPb=lifePlan(J),pbs=lifePB(PPb);if(pbs==='G')c.goY=false;var mS=(pbs==='R'&&!c.goY)||(pbs==='Y'&&!c.goY&&stopD>c.v*c.v/6+1);if(pbs==='Y'&&!mS)c.goY=true;
    if(mS&&stopD>-1){vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,stopD)));if(stopD<.8)vt=0;hold=sLine;}sigSt=pbs;}
   else if(c.stopKey!==key){// zebra + give way: slow down, stop for people waiting at the crossing and for traffic on the road we join
    if(stopD>-1){vt=Math.min(vt,4.5+Math.max(0,stopD)*.45);var PPz=lifePlan(J),zw=(LIFE.clock-(PPz.zw!=null?PPz.zw:-9))<.5&&(c.wait||0)<15,gap=lifeGapClear(J,c);
     if(stopD<16&&(zw||!gap)){vt=Math.min(vt,Math.sqrt(2*3*Math.max(0,stopD)));hold=sLine;if(stopD<.8){vt=0;if(c.v<.3)c.wait+=dt;}}
     else if(stopD<2.5){c.stopKey=key;c.wait=0;}}}
   lineS=sLine;break;}
  if(ahead<70&&!c.nx)c.nx=lifeNextLine(c,L)||'none';
  var tjd=c.tj&&c.tj.L===L?(c.tj.sv-c.s)*c.dir:-1,tjT=tjd>0&&tjd<75?c.tj.t:(c.nx&&c.nx!=='none'&&ahead<70?c.nx[2]:null);
  if(tjT){var LNc=lifeLN(L),tl=tjT==='X'?0:tjT==='W'?LNc.n-1:c.lane;tl=Math.max(0,Math.min(LNc.n-1,tl));if(tl!==c.lane&&(tjd>12||(tjd<=0&&ahead>12))){var bkT=BK[L.id+'|'+c.dir+'|'+tl],okT=true,Lcx=M.kinds[c.kind].k.L;if(bkT)for(var bt=0;bt<bkT.length;bt++){var ot=bkT[bt];if(Math.abs(ot.s-c.s)<(Lcx+M.kinds[ot.kind].k.L)/2+4){okT=false;break;}}if(okT){c.lane=tl;(BK[L.id+'|'+c.dir+'|'+tl]||(BK[L.id+'|'+c.dir+'|'+tl]=[])).push(c);}}}
  if(ahead<25)vt=Math.min(vt,8);
  var Lc=M.kinds[c.kind].k.L,lead=null,lg=1e9,bk=BK[L.id+'|'+c.dir+'|'+c.lane];if(bk)for(var b2=0;b2<bk.length;b2++){var o3=bk[b2];if(o3===c)continue;var gp=(o3.s-c.s)*c.dir-(Lc+M.kinds[o3.kind].k.L)/2;if(gp>-Lc&&gp<lg&&(o3.s-c.s)*c.dir>0){lg=gp;lead=o3;}}
  if(lead)vt=Math.min(vt,Math.max(0,(lg-2.5)*.9),lead.v+Math.max(0,lg-10)*.5);
  if(c.p)vt=Math.min(vt,lifeNeighbours(c,hx,hz,M));
  if(me&&c.p&&me.fx*hx+me.fz*hz>.5){var ex=me.x-c.p.x,ez=me.z-c.p.z,fw=ex*hx+ez*hz,lat=Math.abs(ex*hz-ez*hx);if(fw>0&&fw<30&&lat<(me.pk?1.9:2.2))vt=Math.min(vt,Math.max(0,(fw-7)*.9));}
  c.v+=Math.max(-6*dt,Math.min(2.4*dt,vt-c.v));if(vt<=0.05&&c.v<1.5)c.v=0;if(c.v<0)c.v=0;c.s+=c.v*dt*c.dir;
  if(lead){var mg=(Lc+M.kinds[lead.kind].k.L)/2+1.2;if((lead.s-c.s)*c.dir<mg){c.s=lead.s-mg*c.dir;c.v=Math.min(c.v,lead.v);}}// hard rule: never drive into the car ahead
  if(c.p&&c.v>0){var nx=c.p.x+hx*c.v*dt,nz=c.p.z+hz*c.v*dt,gx=Math.floor(nx/12),gz=Math.floor(nz/12),blk=false;for(var ga=gx-1;ga<=gx+1&&!blk;ga++)for(var gb=gz-1;gb<=gz+1&&!blk;gb++){var cel=CG[ga+','+gb];if(cel)for(var ci2=0;ci2<cel.length;ci2++){var o4=cel[ci2];if(o4===c||!o4.p||o4.hx==null)continue;if(o4.hx*hx+o4.hz*hz<.7)continue;var qx=o4.p.x-nx,qz=o4.p.z-nz,qf=qx*hx+qz*hz;if(qf<=0)continue;if(Math.abs(qx*hz-qz*hx)<1.6&&qf<(Lc+M.kinds[o4.kind].k.L)/2+.8){blk=true;break;}}}
   if(!blk){var PG2=LIFE.pg,kw=M.kinds[c.kind].k.w/2+.45;for(var pa=gx-1;pa<=gx+1&&!blk;pa++)for(var pb=gz-1;pb<=gz+1&&!blk;pb++){var pce=PG2[pa+','+pb];if(pce)for(var pi=0;pi<pce.length;pi++){var wq=pce[pi];if(!wq.p)continue;var qx2=wq.p.x-nx,qz2=wq.p.z-nz,qf2=qx2*hx+qz2*hz;if(qf2>-Lc/2&&qf2<Lc/2+.8&&Math.abs(qx2*hz-qz2*hx)<kw){blk=true;break;}}}}
   if(blk){c.s=s0c;c.v=0;}}
  if(hold!=null&&(c.s-hold)*c.dir>0){c.s=hold;c.v=0;}c.still=c.v<.2?(c.still||0)+dt:0;if(c.still>LIFE.dbg.still)LIFE.dbg.still=c.still;// never roll over a stop line we must stop at
  if(lineS!=null&&sigSt==='R'&&!c.goY&&(s0c-lineS)*c.dir<0&&(c.s-lineS)*c.dir>0)LIFE.dbg.rr++;
  if(c.tj&&c.tj.L===L&&(c.s-c.tj.sv)*c.dir>=0){var TJ=c.tj;c.tj=null;c.L=TJ.M;c.dir=TJ.dirM;c.s=Math.max(.5,Math.min(TJ.M.len-.5,TJ.sM+TJ.dirM*.5));c.nx=null;c.stopKey=null;c.jk=null;var nlT=lifeLN(TJ.M).n;if(c.lane>=nlT)c.lane=nlT-1;LIFE.dbg.turnMid=(LIFE.dbg.turnMid||0)+1;continue;}
  if(c.s<0||c.s>L.len){var key2=c.s>L.len?Math.round(L.x1)+','+Math.round(L.z1):Math.round(L.x0)+','+Math.round(L.z0),opts=(LIFE.ends[key2]||[]).filter(function(o){return o[0]!==L&&(o[0].cl<=5||o[0].cl===10)&&(o[1]===0?o[0].ow!==-1:o[0].ow!==1);});
   var e0={};lifeAt(L,c.s>L.len?L.len:0,e0);var h0x=e0.dx*c.dir,h0z=e0.dz*c.dir;opts=opts.map(function(o){var e1={},d1=o[1]===0?1:-1;lifeAt(o[0],o[1]===0?1:o[0].len-1,e1);return [o,(e1.dx*d1)*h0x+(e1.dz*d1)*h0z];}).filter(function(q){return q[1]>-.5;});
   if(!opts.length){if(L.ow||c.p&&Math.hypot(c.p.x-camera.position.x,c.p.z-camera.position.z)>200){LIFE.cars.splice(i,1);i--;continue;}c.dir=-c.dir;c.s=Math.max(.5,Math.min(L.len-.5,c.s));c.v=0;c.lane=0;c.nx=null;continue;}
   var st=opts.filter(function(q){return q[1]>.85;}),pk=(st.length&&Math.random()<.6?st:opts),o=pk[(Math.random()*pk.length)|0][0];
   if(c.nx&&c.nx!=='none'){for(var oi=0;oi<opts.length;oi++)if(opts[oi][0][0]===c.nx[0]&&opts[oi][0][1]===c.nx[1]){o=opts[oi][0];break;}}c.nx=null;
   c.L=o[0];c.dir=o[1]===0?1:-1;c.s=o[1]===0?.5:o[0].len-.5;c.stopKey=null;
   var nl=lifeLN(o[0]).n;if(c.lane>=nl)c.lane=nl-1;continue;}
  lifeAt(c.L,c.s,p);var rx=-p.dz*c.dir,rz=p.dx*c.dir,LNo=lifeLN(c.L);if(c.lane>=LNo.n)c.lane=LNo.n-1;var loT=laneU(LNo,c.lane,side),swv=1.3;
  if(me&&me.pk&&(me.fx*p.dx+me.fz*p.dz)*c.dir>.5){var mf=(me.x-p.x)*p.dx*c.dir+(me.z-p.z)*p.dz*c.dir,ml=(me.x-p.x)*rx+(me.z-p.z)*rz;if(mf>-9&&mf<22&&Math.abs(ml-loT)<2.3){loT=ml-2.35*(ml>=0?1:-1);swv=2.4;}}// pass a parked car
  if(c.lo==null||(LNo.two&&c.lo*loT<0&&!me))c.lo=loT;else if(LNo.two&&c.lo*loT<0&&!(me&&me.pk))c.lo=loT;c.lo+=Math.max(-swv*dt,Math.min(swv*dt,loT-c.lo));var lo=c.lo;
  if(!c.p)c.p={x:0,z:0};c.p.x=p.x+rx*lo;c.p.z=p.z+rz*lo;c.hx=p.dx*c.dir;c.hz=p.dz*c.dir;var K=M.kinds[c.kind];if(K.n>=K.k.cap)continue;pos.set(c.p.x,.95+p.y,c.p.z);q.setFromAxisAngle(up,Math.atan2(p.dx*c.dir,p.dz*c.dir));m.compose(pos,q,scl);K.body.setMatrixAt(K.n,m);K.lights.setMatrixAt(K.n,m);K.body.setColorAt(K.n,c.col);K.n++;}
 M.kinds.forEach(function(K){K.body.count=K.lights.count=K.n;K.body.instanceMatrix.needsUpdate=K.lights.instanceMatrix.needsUpdate=true;if(K.body.instanceColor)K.body.instanceColor.needsUpdate=true;K.lights.material.color.setScalar(.35+.65*(1-day*.7));});
 var _p3=performance.now();// ---- pedestrians + dogs ----
 var np=0,nd=0,LP=M.lead.geometry.attributes.position.array,ph=M.pph.array,dph=M.dph.array;
 for(i=0;i<LIFE.peds.length;i++){var w=LIFE.peds[i];w.wasHold=w.hold;w.hold=false;
  if(w.pause>0){w.pause-=dt;}else{if(!w.jcAt||now-w.jcAt>600){w.jcAt=now;w.jc=lifePedJ(w);}
   if(w.jc){var jd=(w.jc.sv-w.s)*w.dir,kb=w.jc.kerb;
    if(jd>kb-.5&&jd<kb+1.6&&!(w.jc.go&&LIFE.clock-w.jc.goT<2.5&&Math.abs(DRV.simT-(w.jc.goS||0))<3)){var JC=w.jc,PPd=lifePlan(JC.J),ok=false;
     // at a junction where this pavement ends: go straight over (if it continues) or turn the corner
     if(JC.end&&!JC.dec){JC.dec=true;var hasS=lifePedXfer(w,'straight',true);if((!hasS||Math.random()<.5)&&lifePedXfer(w,'turn')){LIFE.dbg.corner=(LIFE.dbg.corner||0)+1;JC=null;}else if(!hasS){w.dir=-w.dir;w.side=-w.side;w.jc=null;w.jcAt=0;JC=null;}}
     if(JC){
      if(JC.t==='sig'){var PS=drvSig(PPd,JC.yaw);ok=PS.st==='G'&&PS.rem>Math.max(5,(kb*2)/w.v);if(ok)JC.gd=[PS.st,+PS.rem.toFixed(1),+DRV.simT.toFixed(1),PPd.key,+JC.yaw.toFixed(3),+LIFE.clock.toFixed(1)];}
      else if(JC.t==='pb'){var pbs=lifePB(PPd);if(pbs==='R'&&(LIFE.clock-PPd.pbT)<PPd.pbW-(kb*2)/w.v)ok=true;else{PPd.pbReq=1;PPd.pbW=Math.max(PPd.pbW||9,Math.min(20,kb*2/1.05+3));LIFE.dbg.press=(LIFE.dbg.press||0)+1;}}
      else{PPd.zw=LIFE.clock;ok=!lifeCarComing(w);}
      if(ok&&lifeCarNear(w,7))ok=false;
      if(ok){JC.go=true;JC.goT=LIFE.clock;JC.goS=DRV.simT;}else{if(!w.wasHold)LIFE.dbg.wait++;w.hold=true;}}}
    else if(w.jc&&jd<-kb-1)w.jc=null;}
   if(!w.hold){var ps0=w.s;w.s+=w.v*dt*w.dir;if(Math.random()<.0008&&(!w.jc||Math.abs((w.jc.sv-w.s)*w.dir)>w.jc.kerb+4))w.pause=2+Math.random()*4;
    if(w.jc){var a0=(w.jc.sv-ps0)*w.dir,a1=(w.jc.sv-w.s)*w.dir,kb2=w.jc.kerb-.5;if(a0>kb2&&a1<=kb2){LIFE.dbg.cross++;if(w.jc.t==='sig'){var PS2=drvSig(lifePlan(w.jc.J),w.jc.yaw);if(PS2.st!=='G'){LIFE.dbg.pr++;LIFE.dbg.prx=[PS2.st,+PS2.rem.toFixed(1),w.jc.go,w.jc.goT!=null?+(LIFE.clock-w.jc.goT).toFixed(1):null,+w.v.toFixed(2),w.jc.kerb,w.jc.gd,+DRV.simT.toFixed(1),lifePlan(w.jc.J).key,+w.jc.yaw.toFixed(3),+LIFE.clock.toFixed(1)];}}else if(w.jc.t==='pb'){if(lifePB(lifePlan(w.jc.J))!=='R')LIFE.dbg.pr++;LIFE.dbg.pbX=(LIFE.dbg.pbX||0)+1;}else LIFE.dbg.zebX=(LIFE.dbg.zebX||0)+1;}}}}
  if(w.s<0||w.s>w.L.len){if(!lifePedXfer(w,'any')){w.dir=-w.dir;w.side=-w.side;w.s=Math.max(0,Math.min(w.L.len,w.s));w.jc=null;w.jcAt=0;}}
  if(!w.off)w.off=lifePedOff(w.L,w.offr);var tgo=w.off;if(w.jc&&w.jc.zoff){var jdz=(w.jc.sv-w.s)*w.dir;if(jdz<w.jc.kerb+4&&jdz>-w.jc.kerb-3)tgo=w.jc.zoff;}if(w.oc==null)w.oc=tgo;w.oc+=Math.max(-.9*dt,Math.min(.9*dt,tgo-w.oc));
  lifeAt(w.L,w.s,p);var hx2=p.dx*w.dir,hz2=p.dz*w.dir,rx2=-hz2,rz2=hx2,px=p.x+rx2*w.oc*w.side,pz=p.z+rz2*w.oc*w.side;if(!w.p)w.p={x:0,z:0};w.p.x=px;w.p.z=pz;w.hx=hx2;w.hz=hz2;if(np>=LIFE.maxPed)continue;
  var walking=w.pause<=0&&!w.hold;pos.set(px,1.0,pz);q.setFromAxisAngle(up,Math.atan2(hx2,hz2));m.compose(pos,q,scl);M.ped.setMatrixAt(np,m);M.head.setMatrixAt(np,m);M.ped.setColorAt(np,w.col);M.head.setColorAt(np,w.skin);ph[np*2]=w.ph;ph[np*2+1]=walking?w.v*5.2:0;
  if(w.dog){var dx2=px+hx2*1.1+rx2*w.side*-.45,dz2=pz+hz2*1.1+rz2*w.side*-.45;pos.set(dx2,1.0,dz2);m.compose(pos,q,scl);M.dog.setMatrixAt(nd,m);M.dog.setColorAt(nd,w.dogCol);dph[nd*2]=w.ph+1;dph[nd*2+1]=walking?9:0;
   var b6=nd*6;LP[b6]=px+rx2*w.side*-.25;LP[b6+1]=1.0+.95;LP[b6+2]=pz+rz2*w.side*-.25;LP[b6+3]=dx2+hx2*.3;LP[b6+4]=1.0+.62;LP[b6+5]=dz2+hz2*.3;nd++;}np++;}
 M.ped.count=M.head.count=np;M.dog.count=nd;[M.ped,M.head,M.dog].forEach(function(o){o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;});M.pph.needsUpdate=M.dph.needsUpdate=true;
 M.lead.geometry.setDrawRange(0,nd*2);M.lead.geometry.attributes.position.needsUpdate=true;
 // ---- cats: sit, then trot a few metres ----
 var nk=0,kph=M.kph.array;LIFE.cats.forEach(function(k){k.t-=dt;if(k.t<0){if(k.v>0){k.v=0;k.t=3+Math.random()*8;}else{k.v=.6+Math.random()*.8;k.yaw=Math.random()*6.28;k.t=1.5+Math.random()*2.5;}}k.x+=Math.sin(k.yaw)*k.v*dt;k.z+=Math.cos(k.yaw)*k.v*dt;
  pos.set(k.x,1.0,k.z);q.setFromAxisAngle(up,k.yaw);m.compose(pos,q,scl);M.cat.setMatrixAt(nk,m);M.cat.setColorAt(nk,k.col);kph[nk*2]=k.t;kph[nk*2+1]=k.v>0?11:0;nk++;});
 M.cat.count=nk;M.cat.instanceMatrix.needsUpdate=true;if(M.cat.instanceColor)M.cat.instanceColor.needsUpdate=true;M.kph.needsUpdate=true;
 LIFE.stats={c:LIFE.cars.length,p:np,d:nd,k:nk};
 var _p4=performance.now();lifeSigns();if(now-(LIFE.jsAt||0)>200){LIFE.jsAt=now;lifeJSigs(F);}var _p5=performance.now();var PR=LIFE.prof||(LIFE.prof={l:0,u:0,c:0,p:0,s:0});PR.l=PR.l*.9+(_p1-_p0)*.1;PR.u=PR.u*.9+(_p2-_p1)*.1;PR.c=PR.c*.9+(_p3-_p2)*.1;PR.p=PR.p*.9+(_p4-_p3)*.1;PR.s=PR.s*.9+(_p5-_p4)*.1;}
function lifeHide(){var M=LIFE.meshes;M.kinds.forEach(function(K){K.body.count=K.lights.count=0;});M.ped.count=M.head.count=M.dog.count=M.cat.count=0;M.lead.geometry.setDrawRange(0,0);M.cloud.visible=false;M.lim.forEach(function(g){g.visible=false;});M.zeb.count=0;M.js.pole.count=M.js.head.count=M.js.lamp.count=0;}
// speed-limit plates every ~450 m along your route + zebra crossings on your approach to signals
function lifeSigns(){var M=LIFE.meshes,li=0,zi=0,zn=0,p={},side=DRV.lht?-1:1;
 if(DRV.on&&DRV.route&&!DRV.fly){var R=drvRouteLocal();if(R){var s0=Math.ceil((DRV.s+30)/450)*450;for(var s=s0;s<Math.min(R.len,DRV.s+900)&&li<M.lim.length;s+=450){drvAt(s,p);var sg=drvNearSeg(p.x,p.z,14);if(!sg)continue;var v=drvFmtV(drvLimit(sg[4])),g=M.lim[li++],rx=-Math.cos(p.yaw)*side,rz=Math.sin(p.yaw)*side,w=(RW[sg[4]]||8)/2+1.2;
    g.visible=true;g.position.set(p.x+rx*w,1.0,p.z+rz*w);g.rotation.y=p.yaw+Math.PI;var t=lifeLimTex(v,drvUnit());if(g.userData.pl.material.map!==t){g.userData.pl.material.map=t;g.userData.pl.material.needsUpdate=true;}}}
  var zm4=new T3.Matrix4(),zq=new T3.Quaternion(),zv=new T3.Vector3(),zs=new T3.Vector3(1,1,1),zu=new T3.Vector3(0,1,0);
  DRV.ctl.forEach(function(c){if(true||c.t!=='sig'||zi>=10||c.s<DRV.s-20||c.s>DRV.s+300)return;drvAt(Math.max(0,c.s-(c.stopOff||7)+2),p);zi++;var wd=(RW[c.ours]||8),n=Math.max(4,Math.min(10,Math.round(wd/1.0))),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);zq.setFromAxisAngle(zu,p.yaw);
   for(var k=0;k<n&&zn<70;k++){var o=(k-(n-1)/2)*1.0;zv.set(p.x+rx*o,1.02,p.z+rz*o);zm4.compose(zv,zq,zs);M.zeb.setMatrixAt(zn++,zm4);}});}
 for(;li<M.lim.length;li++)M.lim[li].visible=false;M.zeb.count=zn;M.zeb.instanceMatrix.needsUpdate=true;}
function lifeLeadGap(x,z,yaw,v){if(DRV.car){x=DRV.car.position.x;z=DRV.car.position.z;}var fx=Math.sin(yaw),fz=Math.cos(yaw),best=1e9,bv=0,cap=1e9;
 for(var j=0;j<LIFE.peds.length;j++){var w=LIFE.peds[j];if(!w.p)continue;var px=w.p.x-x,pz=w.p.z-z,pf=px*fx+pz*fz;if(!(pf>-1&&pf<9+v*v/8))continue;var pl=Math.abs(px*fz-pz*fx),pd=Math.abs((w.hx||0)*fx+(w.hz||0)*fz),ah=pf/Math.max(1.5,v),stl=w.hold||w.pause>0;if(stl?pl<1.5:(pd<.92?pl<2.1+Math.min(3.5,1.3*ah*(1-pd)):pl<1.3))cap=Math.min(cap,Math.max(0,(pf-4.5)*.8));}
 for(var i=0;i<LIFE.cars.length;i++){var c=LIFE.cars[i];if(!c.p||c.hx==null)continue;var dt2=c.hx*fx+c.hz*fz;
  if(dt2<=.5&&dt2>-.7){var qx=c.p.x-x,qz=c.p.z-z,qf=qx*fx+qz*fz,tg=(DRV.stillT||0)>4&&c.v<.3;if(qf>0&&(tg?qf<7&&Math.abs(qx*fz-qz*fx)<2.3:qf<12&&Math.abs(qx*fz-qz*fx)<3.2))cap=Math.min(cap,Math.max(0,(qf-(tg?4.2:6))*.8));continue;}
  if(dt2<=.5)continue;var ex=c.p.x-x,ez=c.p.z-z,fw=ex*fx+ez*fz;if(fw<=0||fw>60)continue;var lat=Math.abs(ex*fz-ez*fx);if(lat>2.2)continue;
  var ch=c.L,hx=ch?(ch.x1-ch.x0):0,hz=ch?(ch.z1-ch.z0):0;if(fw<best){best=fw;bv=c.v;}}
 if(best>1e8)return cap;var gap=best-4.6-(M_KLEN||4.6)/2-2;return Math.min(cap,Math.max(0,Math.min(bv+gap*.5,Math.sqrt(2*3*Math.max(0,gap)))));}
var M_KLEN=5;
// bridge deck height under the car (only when the car is travelling along the bridge, not passing under it)
function lifeBridgeY(x,z,yaw,cur){var lines=LIFE.lines;if(!lines)return 0;if(LIFE.brOf!==lines){LIFE.brOf=lines;LIFE.brl=lines.filter(function(L){return L.bz&&L.bz[0]>0;});}
 var fx=Math.sin(yaw),fz=Math.cos(yaw),best=null,bs=1e9,anyH=cur==null;
 for(var i=0;i<LIFE.brl.length;i++){var L=LIFE.brl[i];if(x<Math.min(L.x0,L.x1)-60||x>Math.max(L.x0,L.x1)+60||z<Math.min(L.z0,L.z1)-60||z>Math.max(L.z0,L.z1)+60)continue;
  for(var k=0;k+3<L.c.length;k+=2){var ax=L.c[k],az=L.c[k+1],bx=L.c[k+2],bz=L.c[k+3],dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;if(!l2)continue;var t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l2)),qx=ax+dx*t-x,qz=az+dz*t-z,e=qx*qx+qz*qz;if(e>16)continue;var l=Math.sqrt(l2);if(Math.abs((dx*fx+dz*fz)/l)<.8)continue;
   var h=brH(L.cum[k/2]+t*l,L.len,L.bz),jump=anyH?0:Math.abs(h-cur);if(!anyH&&jump>1.6)continue;var sc=e+jump*jump*20;if(sc<bs){bs=sc;best=h;}}}
 return best==null?0:best;}

// bridge profiles: deck height per bridge line; ramps only at real ends (not where it continues as another bridge piece or crosses the tile edge)
function brH(s,L,b){if(!b)return 0;var H=b[0],R=Math.min(80,L*.35);if(b[1]&&b[2])H=Math.min(H,Math.max(0,(L-25)*.12));else if(b[1]||b[2])H=Math.min(H,L*.11);if(H<.05)return 0;var u=1;if(b[1])u=Math.min(u,s/R);if(b[2])u=Math.min(u,(L-s)/R);u=Math.max(0,Math.min(1,u));return H*u*u*(3-2*u);}
function bridgeProfile(rd,ly){var out=new Array(rd.length),x0=1e9,z0=1e9,x1=-1e9,z1=-1e9,BE={},i,r;
 for(i=0;i<rd.length;i++){r=rd[i];for(var k=2;k<r.length;k+=2){if(r[k]<x0)x0=r[k];if(r[k]>x1)x1=r[k];if(r[k+1]<z0)z0=r[k+1];if(r[k+1]>z1)z1=r[k+1];}
  if(r[1]===1){[[r[2],r[3]],[r[r.length-2],r[r.length-1]]].forEach(function(e){var q=Math.round(e[0]/3)+','+Math.round(e[1]/3);BE[q]=(BE[q]||0)+1;});}}
 function edge(x,z){return x-x0<4||x1-x<4||z-z0<4||z1-z<4;}
 for(i=0;i<rd.length;i++){r=rd[i];if(r[1]!==1){out[i]=0;continue;}var lay=Math.max(1,Math.min(4,(ly&&ly[i])||1)),H=Math.min(24,7.5+5*(lay-1));
  var ax=r[2],az=r[3],bx=r[r.length-2],bz=r[r.length-1],ka=Math.round(ax/3)+','+Math.round(az/3),kb=Math.round(bx/3)+','+Math.round(bz/3);
  out[i]=[H,(BE[ka]>1||edge(ax,az))?0:1,(BE[kb]>1||edge(bx,bz))?0:1];}
 return out;}

// ====================================================================
// LiDAR SIMULATION — time-of-flight laser scanner on the drone (nadir, non-repetitive rosette like solid-state
// aerial units) or on the car roof (mechanical 32-line spinning unit). Every beam is ray-traced against the real
// building footprints × heights and the ground; hits accumulate into a fading point cloud you can export (.xyz).
// Sensor parameters are typical published values for each class, not one specific product; returns get ±2 cm noise.
// ====================================================================
var LID={on:false,car:false,pat:'auto',col:'range',cap:160000,w:0,n:0,pts:null,geo:null,beams:null,bgeo:null,grid:null,gridOf:null,stamp:1,az:0,t:0,gen:-1,
 st:{rays:0,hits:0,rate:0,t0:0,last:0,rng:0},hud:0,bw:0};
var LID_SPEC={spin:{zh:'机械旋转 · 32 线',en:'Spinning · 32-line',nm:905,hz:10,R:200,vf:'−25°…+15°',acc:'±2 cm'},
 rosette:{zh:'固态花瓣 · 非重复扫描',en:'Solid-state · non-repetitive rosette',nm:905,hz:10,R:1200,vf:'70° 圆形',acc:'±2 cm'}};
function lidPattern(){return LID.pat!=='auto'?LID.pat:(DRV.on&&!DRV.fly?'spin':'rosette');}
function lidGrid(){var P=L2.picks;if(LID.gridOf===P&&LID.grid)return LID.grid;var G={},CS=40;(P||[]).forEach(function(b){var bb=b._bb||(b._bb=smapBB(b));
 for(var i=Math.floor(bb[0]/CS);i<=Math.floor(bb[2]/CS);i++)for(var j=Math.floor(bb[1]/CS);j<=Math.floor(bb[3]/CS);j++){var k=i+','+j;(G[k]||(G[k]=[])).push(b);}});LID.grid=G;LID.gridOf=P;return G;}
function lidPip(x,z,b){var n=(b.length-3)>>1,ins=false,j=n-1;for(var i=0;i<n;i++){var xi=b[2+2*i],zi=b[3+2*i],xj=b[2+2*j],zj=b[3+2*j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))ins=!ins;j=i;}return ins;}
function lidPrism(b,ox,oy,oz,dx,dy,dz,tmax){var h=Math.max(3,b[0]),mh=b[1]||0;if(mh>=h)mh=0;var top=mh+h,best=tmax,n=(b.length-3)>>1;
 if(dy<0&&oy>top){var tr=(top-oy)/dy;if(tr>0&&tr<best&&lidPip(ox+dx*tr,oz+dz*tr,b))best=tr;}
 for(var i=0;i<n;i++){var j=(i+1)%n,ax=b[2+2*i],az=b[3+2*i],ex=b[2+2*j]-ax,ez=b[3+2*j]-az,den=dx*ez-dz*ex;if(den>-1e-9&&den<1e-9)continue;
  var qx=ax-ox,qz=az-oz,t=(qx*ez-qz*ex)/den,u=(qx*dz-qz*dx)/den;if(t<=0||t>=best||u<0||u>1)continue;var y=oy+dy*t;if(y<mh||y>top)continue;best=t;}
 return best;}
// first return along a ray: 2-D DDA over a 40 m building grid, then exact prism tests; ground plane at y=0
function lidRay(ox,oy,oz,dx,dy,dz,R){var best=R,kind=0,hb=null,G=lidGrid(),CS=40,st=++LID.stamp;
 if(dy<-1e-5){var tg=-oy/dy;if(tg<best){best=tg;kind=1;}}
 var cx=Math.floor(ox/CS),cz=Math.floor(oz/CS),sx=dx>0?1:-1,sz=dz>0?1:-1,txm=dx!==0?((cx+(dx>0?1:0))*CS-ox)/dx:1e9,tzm=dz!==0?((cz+(dz>0?1:0))*CS-oz)/dz:1e9,tdx=dx!==0?CS/Math.abs(dx):1e9,tdz=dz!==0?CS/Math.abs(dz):1e9;
 for(var it=0;it<80;it++){var L=G[cx+','+cz];if(L){for(var i=0;i<L.length;i++){var b=L[i];if(b._ls===st)continue;b._ls=st;var t=lidPrism(b,ox,oy,oz,dx,dy,dz,best);if(t<best){best=t;kind=2;hb=b;}}}
  var tn=Math.min(txm,tzm);if(best<=tn||tn>R)break;if(txm<tzm){cx+=sx;txm+=tdx;}else{cz+=sz;tzm+=tdz;}}
 if(!kind)return null;return {t:best,k:kind,b:hb};}
function lidInit(){if(LID.pts)return;var N=LID.cap,g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('color',new T3.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('aT',new T3.BufferAttribute(new Float32Array(N).fill(-1e6),1));
 g.setDrawRange(0,0);var m=new T3.ShaderMaterial({uniforms:{uT:{value:0},uPx:{value:1},uDecay:{value:24}},transparent:true,depthWrite:false,blending:T3.AdditiveBlending,
  vertexShader:'attribute float aT;uniform float uT,uPx,uDecay;varying vec3 vC;varying float vA;void main(){float age=uT-aT;vA=age<0.?0.:exp(-age/uDecay)*(.35+.65*exp(-age*1.4));vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(2.0*uPx*240./-mv.z,1.1,3.2)*(age<.25?1.6:1.);}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;if(dot(d,d)>.25)discard;gl_FragColor=vec4(vC,vA);}',vertexColors:true});
 LID.pts=new T3.Points(g,m);LID.pts.frustumCulled=false;LID.geo=g;streetScene.add(LID.pts);
 var bg=new T3.BufferGeometry();bg.setAttribute('position',new T3.BufferAttribute(new Float32Array(64*2*3),3));bg.setAttribute('color',new T3.BufferAttribute(new Float32Array(64*2*3),3));bg.setDrawRange(0,0);
 LID.beams=new T3.LineSegments(bg,new T3.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.38,blending:T3.AdditiveBlending,depthWrite:false}));LID.beams.frustumCulled=false;LID.bgeo=bg;streetScene.add(LID.beams);}
function lidClear(){if(!LID.geo)return;LID.w=0;LID.n=0;LID.geo.attributes.aT.array.fill(-1e6);LID.geo.attributes.aT.needsUpdate=true;LID.geo.setDrawRange(0,0);}
var LID_C=new T3.Color();
function lidColor(kind,b,y,t,R){var c=LID_C;if(LID.col==='height')c.setHSL(.66-.66*Math.min(1,Math.max(0,y/140)),1,.55);
 else if(LID.col==='refl'){if(kind===1)c.setRGB(.18,.24,.32);else{var tall=b&&b[0]>=40,M=b?TAX[txOf(b).m]:null;c.set(M?M.col:'#9fd0ff');c.lerp(TMPC.setRGB(1,1,1),tall?.55:.15);}}
 else c.setHSL(.0+.72*Math.min(1,t/R),1,.56);return c;}
function lidSource(){if(DRV.on&&LID.car&&DRV.car)return {x:DRV.car.position.x,y:DRV.car.position.y+1.15,z:DRV.car.position.z,yaw:DRV.yaw,car:true};
 if(!DRV.on&&L2.drone&&L2.drone.on&&!(typeof SKYV!=='undefined'&&SKYV.on)){var c=camera.position;return {x:L2.target.x+(c.x-L2.target.x)*.04,y:c.y-2,z:L2.target.z+(c.z-L2.target.z)*.04,yaw:-Math.PI/2-L2.cam.az,car:false,alt:c.y};}return null;}
function lidStep(dt,now){var active=LID.on&&mode==='street'&&L2.active&&!!L2.live&&(DRV.on?LID.car:true);if(LID.pts){LID.pts.visible=LID.on&&mode==='street';LID.beams.visible=active;}if(!active){return;}
 lidInit();if(LID.gen!==L2.live.gen){LID.gen=L2.live.gen;lidClear();}var S=lidSource();if(!S){LID.beams.visible=false;return;}
 var pat=lidPattern(),sp=LID_SPEC[pat],R=pat==='spin'?sp.R:Math.max(300,Math.min(sp.R,(S.y||100)*2.2)),t0=performance.now(),g=LID.geo,P=g.attributes.position.array,C=g.attributes.color.array,A=g.attributes.aT.array,T=now/1000,shot=0,hit=0,bi=0,BP=LID.bgeo.attributes.position.array,BC=LID.bgeo.attributes.color.array,w0=LID.w;
 LID.pts.material.uniforms.uT.value=T;LID.pts.material.uniforms.uPx.value=Math.min(2,window.devicePixelRatio||1);
 var cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),N=1e9,dx,dy,dz;
 for(var k=0;k<N;k++){if((k&63)===0&&performance.now()-t0>2.6)break;
  if(pat==='spin'){var ch=k%32;if(ch===0)LID.az+=2*Math.PI*sp.hz*Math.min(dt,.05)/90;var el=(-25+40*ch/31)*D2R,az=LID.az+ch*.0021;dx=Math.cos(el)*Math.sin(az);dz=Math.cos(el)*Math.cos(az);dy=Math.sin(el);}
  else{LID.t+=.00071;var tt=LID.t,th=35*D2R*Math.abs(Math.sin(7.13*tt)),ph=3.31*tt+1.7*Math.sin(.53*tt);
   if(S.car){var lx=Math.sin(th)*Math.cos(ph),ly=Math.sin(th)*Math.sin(ph)-.05,lz=Math.cos(th);dx=lx*cy+lz*sy;dz=-lx*sy+lz*cy;dy=ly;}else{dx=Math.sin(th)*Math.cos(ph);dz=Math.sin(th)*Math.sin(ph);dy=-Math.cos(th);}}
  shot++;var r=lidRay(S.x,S.y,S.z,dx,dy,dz,R);if(!r)continue;var t=r.t+(Math.random()-.5)*.04;hit++;
  var x=S.x+dx*t,y=Math.max(0,S.y+dy*t),z=S.z+dz*t,i3=LID.w*3;P[i3]=x;P[i3+1]=y+.05;P[i3+2]=z;var col=lidColor(r.k,r.b,y,t,R);C[i3]=col.r;C[i3+1]=col.g;C[i3+2]=col.b;A[LID.w]=T;
  LID.w=(LID.w+1)%LID.cap;LID.n=Math.min(LID.cap,LID.n+1);if(bi<64&&(k%Math.max(1,(shot/64|0)||7))===0){var b6=bi*6;BP[b6]=S.x;BP[b6+1]=S.y;BP[b6+2]=S.z;BP[b6+3]=x;BP[b6+4]=y;BP[b6+5]=z;BC[b6]=1;BC[b6+1]=.15;BC[b6+2]=.2;BC[b6+3]=1;BC[b6+4]=.35;BC[b6+5]=.3;bi++;}LID.st.rng=t;}
 // upload only the ring-buffer span written this frame
 [g.attributes.position,g.attributes.color].forEach(function(a){a.clearUpdateRanges&&a.clearUpdateRanges();});g.attributes.aT.clearUpdateRanges&&g.attributes.aT.clearUpdateRanges();
 function upd(s,e){if(e<=s)return;g.attributes.position.addUpdateRange(s*3,(e-s)*3);g.attributes.color.addUpdateRange(s*3,(e-s)*3);g.attributes.aT.addUpdateRange(s,e-s);}
 if(LID.w>=w0)upd(w0,LID.w);else{upd(w0,LID.cap);upd(0,LID.w);}g.attributes.position.needsUpdate=g.attributes.color.needsUpdate=g.attributes.aT.needsUpdate=true;g.setDrawRange(0,LID.n);
 LID.bgeo.setDrawRange(0,bi*2);LID.bgeo.attributes.position.needsUpdate=LID.bgeo.attributes.color.needsUpdate=true;
 var s=LID.st;s.rays+=shot;s.hits+=hit;if(now-s.t0>1000){s.rate=Math.round(s.hits*1000/(now-s.t0||1));s.t0=now;s.rays=0;s.hits=0;}
 if(now-LID.hud>300){LID.hud=now;lidHud(pat,sp,R);}}
function lidHud(pat,sp,R){var zh=LZ(),txt='<b>'+(I18P(sp.zh,sp.en))+'</b><span>'+sp.nm+' nm · '+(I18T('class_1_eye_safe'))+' · '+sp.hz+' Hz · '+(I18T('range_2'))+Math.round(R)+' m · '+sp.acc+'</span><span>'+(LID.st.rate/1000).toFixed(1)+(I18T('k_pts_s_cloud'))+LID.n.toLocaleString()+(I18T('pts_last_return'))+LID.st.rng.toFixed(1)+' m</span>';
 ['smLidS','dvLidS'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=txt;});}
function lidExport(){if(!LID.n||!L2.live){toast(I18T('no_points_yet_run'));return;}var g=LID.geo,P=g.attributes.position.array,C=g.attributes.color.array,A=g.attributes.aT.array,lv=L2.live,out=['# Sentinel Earth simulated LiDAR point cloud','# local ENU metres; origin lat '+lv.lat0.toFixed(6)+' lon '+lv.lon0.toFixed(6)+' (x=east, y=up, z=north)','# x y z r g b'];
 for(var i=0;i<LID.n;i++){if(A[i]<-1e5)continue;out.push(P[i*3].toFixed(2)+' '+P[i*3+1].toFixed(2)+' '+(-P[i*3+2]).toFixed(2)+' '+Math.round(C[i*3]*255)+' '+Math.round(C[i*3+1]*255)+' '+Math.round(C[i*3+2]*255));}
 try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out.join('\n')],{type:'text/plain'}));a.download='sentinel-lidar-'+Date.now()+'.xyz';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);}catch(e){toast('export failed');}}
function lidControlsHTML(where){var zh=LZ(),on=where==='dv'?(LID.on&&LID.car):LID.on;
 return '<div class="lidC"><button type="button" data-lid="on" aria-pressed="'+on+'">'+(on?(I18T('lidar_on')):(I18T('lidar_off')))+'</button>'+
  '<button type="button" data-lid="p:auto" aria-pressed="'+(LID.pat==='auto')+'">'+(I18T('auto_2'))+'</button><button type="button" data-lid="p:spin" aria-pressed="'+(LID.pat==='spin')+'">'+(I18T('spin_32'))+'</button><button type="button" data-lid="p:rosette" aria-pressed="'+(LID.pat==='rosette')+'">'+(I18T('rosette'))+'</button></div>'+
  '<div class="lidC"><button type="button" data-lid="c:range" aria-pressed="'+(LID.col==='range')+'">'+(I18T('range_3'))+'</button><button type="button" data-lid="c:height" aria-pressed="'+(LID.col==='height')+'">'+(I18T('height'))+'</button><button type="button" data-lid="c:refl" aria-pressed="'+(LID.col==='refl')+'">'+(I18T('reflectivity'))+'</button><button type="button" data-lid="clr">'+(I18T('clear_3'))+'</button><button type="button" data-lid="xyz">'+(I18T('export_xyz'))+'</button></div>';}
function lidWire(el,where){if(!el||el._lw)return;el._lw=1;el.addEventListener('click',function(e){var b=e.target.closest('[data-lid]');if(!b)return;e.stopPropagation();var v=b.getAttribute('data-lid');
 if(v==='on'){if(where==='dv'){LID.car=!(LID.on&&LID.car);LID.on=LID.car;}else LID.on=!LID.on;if(LID.on)toast(I18T('lidar_scanning_every_beam'));}
 else if(v.indexOf('p:')===0)LID.pat=v.slice(2);else if(v.indexOf('c:')===0)LID.col=v.slice(2);else if(v==='clr')lidClear();else if(v==='xyz')lidExport();
 lidUI();});}
function lidUI(){[['smLid','sm'],['dvLid','dv']].forEach(function(p){var e=document.getElementById(p[0]);if(!e)return;e.innerHTML=lidControlsHTML(p[1]);lidWire(e,p[1]);});}

// ==== movable windows: every panel gets a grab bar on its top edge; drag to move, double-click to snap back ====
// The user offset is added on top of the automatic layout (and the edge-collapse slide), so panels keep following
// the layout while staying where you put them. Offsets are remembered per browser.
var WIN={ids:['panel','mmap','ahead','smapP','drvP','drvHud','dhHolo','miniGlobe','gizmo','envBar','srch','liveInfo','catLegend'],at:0,lay:null,drag:null};
function winTr(el){var cl=el._clp,x=(el._tx||0)+(cl?0:(el._ux||0)),y=(el._ty||0)+(cl?0:(el._uy||0));el.style.translate=(x||y)?Math.round(x)+'px '+Math.round(y)+'px':'';}
function winSave(el){try{if(el._ux||el._uy)localStorage.setItem('se.win.'+el.id,JSON.stringify([Math.round(el._ux),Math.round(el._uy)]));else localStorage.removeItem('se.win.'+el.id);}catch(e){}}
function winInit(){if(WIN.lay)return;var L=document.createElement('div');L.id='winGrips';document.body.appendChild(L);WIN.lay=L;
 WIN.ids.forEach(function(id){var el=document.getElementById(id);if(!el)return;try{var v=JSON.parse(localStorage.getItem('se.win.'+id)||'null');if(v&&v.length===2){el._ux=v[0];el._uy=v[1];winTr(el);}}catch(e){}
  var g=document.createElement('button');g.type='button';g.className='winGrip';g.title=I18T('drag_to_move_double');g.setAttribute('aria-label','move window');L.appendChild(g);el._grip=g;
  g.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();try{g.setPointerCapture(e.pointerId);}catch(_e){}WIN.drag={el:el,x:e.clientX,y:e.clientY,ux:el._ux||0,uy:el._uy||0,tr:el.style.transition};el.style.transition='none';g.classList.add('on');document.body.classList.add('winDrag');});
  g.addEventListener('pointermove',function(e){var D=WIN.drag;if(!D||D.el!==el)return;var W=window.innerWidth,H=window.innerHeight,r=el.getBoundingClientRect(),nx=D.ux+e.clientX-D.x,ny=D.uy+e.clientY-D.y,
   bx=r.left-((el._ux||0)),by=r.top-((el._uy||0));nx=Math.max(-bx-r.width+60,Math.min(W-bx-60,nx));ny=Math.max(-by,Math.min(H-by-30,ny));el._ux=nx;el._uy=ny;winTr(el);winPlace(1);});
  function end(){var D=WIN.drag;if(!D||D.el!==el)return;el.style.transition=D.tr;WIN.drag=null;g.classList.remove('on');document.body.classList.remove('winDrag');winSave(el);}
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
  g.addEventListener('dblclick',function(e){e.stopPropagation();el._ux=el._uy=0;winTr(el);winSave(el);winPlace(1);});});}
function winReset(){WIN.ids.forEach(function(id){var el=document.getElementById(id);if(!el)return;el._ux=el._uy=0;winTr(el);winSave(el);});winPlace(1);}
function winPlace(force){var now=performance.now();if(!force&&now-WIN.at<110)return;WIN.at=now;if(!WIN.lay)winInit();
 WIN.ids.forEach(function(id){var el=document.getElementById(id),g=el&&el._grip;if(!g)return;var r=el.getBoundingClientRect(),cs=getComputedStyle(el),vis=r.width>40&&r.height>16&&cs.display!=='none'&&cs.visibility!=='hidden'&&!el.hidden&&!el._clp&&r.right>0&&r.left<window.innerWidth&&r.bottom>0&&r.top<window.innerHeight;
  if(!vis){if(g.style.display!=='none')g.style.display='none';return;}g.style.display='';var x=Math.round(r.left+r.width/2-17),y=Math.round(Math.max(0,r.top-6));g.style.transform='translate('+x+'px,'+y+'px)';g.classList.toggle('moved',!!(el._ux||el._uy));});}

// ==== performance panel: #perf or ?perf in the address, Shift+P to toggle ====
var PERF={on:false,el:null,f:0,t0:0,lastF:0,ft:[],long:[],calls:0,tris:0,gpu:'',fps:0};
function perfGpu(){if(PERF.gpu)return PERF.gpu;try{var gl=renderer.getContext(),x=gl.getExtension('WEBGL_debug_renderer_info');PERF.gpu=String(x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER));}catch(e){PERF.gpu='?';}return PERF.gpu;}
function perfTick(now){var dtf=PERF.lastF?now-PERF.lastF:0;PERF.lastF=now;if(dtf>0&&dtf<2000){PERF.ft.push(dtf);if(PERF.ft.length>120)PERF.ft.shift();if(dtf>50&&!document.hidden)PERF.long.push(now);}
 PERF.f++;var inf=renderer.info&&renderer.info.render;if(inf){PERF.calls=inf.calls;PERF.tris=inf.triangles;}}
function perfSnap(){var now=performance.now();PERF.long=PERF.long.filter(function(t){return now-t<10000;});var ft=PERF.ft,avg=0,mx=0;ft.forEach(function(v){avg+=v;mx=Math.max(mx,v);});avg=ft.length?avg/ft.length:0;
 var lv=L2.live,rd=0,q=0;if(lv)for(var k in lv.tiles){if(lv.tiles[k].state==='ready')rd++;else q++;}
 var cv=renderer.domElement,mem=performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null;
 return {gpu:perfGpu(),webgl2:!!(renderer.capabilities&&renderer.capabilities.isWebGL2),webgpu:!!navigator.gpu,fps:PERF.fps,avg:+avg.toFixed(1),max:Math.round(mx),long10:PERF.long.length,calls:PERF.calls,tris:PERF.tris,
  pr:+pr.toFixed(2),prMax:+PR_MAX.toFixed(2),px:cv.width+'×'+cv.height,tiles:rd,queue:q,worker:!!TW.w,wk:TSTAT.wk,mainDec:TSTAT.main,mem:TSTAT.mem,hit:TSTAT.hit,net:TSTAT.net,pf:TSTAT.pf,fail:TSTAT.fail,lod:LODC.stats,heap:mem,still:Math.round((now-MV.still)/100)/10};}
function perfDraw(){if(!PERF.on||!PERF.el)return;var now=performance.now();PERF.fps=Math.round(PERF.f*1000/Math.max(1,now-PERF.t0));PERF.f=0;PERF.t0=now;var S=perfSnap(),zh=LZ();
 var igpu=/intel/i.test(S.gpu)&&!/arc/i.test(S.gpu),sw=/swiftshader|llvmpipe|software|basic render/i.test(S.gpu);
 function row(a,b,c){return '<tr><td>'+a+'</td><td'+(c?' class="'+c+'"':'')+'>'+b+'</td></tr>';}
 var fc=S.fps>=50?'ok':S.fps>=30?'mid':'bad';
 PERF.el.innerHTML='<div class="pfH" title="'+(I18T('drag_to_move_double_2'))+'"><span>⠿ ⏱ '+(I18T('performance'))+'</span><button type="button" aria-label="close">×</button></div><table>'+
  row(I18T('gpu'),esc(S.gpu),igpu||sw?'bad':'')+(igpu?row('⚠',I18T('browser_is_on_the'),'bad'):'')+(sw?row('⚠',I18T('software_rendering_hardware_acceleration'),'bad'):'')+
  row('API','WebGL'+(S.webgl2?'2':'1')+(S.webgpu?' · WebGPU ✓':''))+
  row(I18T('fps'),S.fps+' fps',fc)+row(I18T('frame_avg_max'),S.avg+' / '+S.max+' ms',S.max>50?'mid':'')+row(I18T('hitches_50_ms_10'),S.long10,S.long10>3?'bad':S.long10?'mid':'ok')+
  row(I18T('draw_calls_tris'),S.calls+' / '+(S.tris/1000).toFixed(0)+'k')+row(I18T('pixel_ratio_now_native'),S.pr+' / '+S.prMax+' · '+S.px,S.pr<S.prMax?'mid':'ok')+
  row(I18T('still'),S.still+' s '+(S.still>0.35?(I18T('native')):(I18T('moving'))))+
  row(I18T('tiles_ready_queued'),S.tiles+' / '+S.queue)+row(I18T('chunks_full_box_off'),LODC.stats.f+' / '+LODC.stats.b+' / '+LODC.stats.x)+row(I18T('worker'),S.worker?(I18T('on_done'))+S.wk:(I18T('off_main'))+S.mainDec+')',S.worker?'ok':'mid')+
  row(I18T('tiles_mem_cache_net'),S.mem+' / '+S.hit+' / '+S.net+(S.fail?' · ✗'+S.fail:''))+row(I18T('prefetched'),S.pf)+(S.heap!=null?row(I18T('js_heap'),S.heap+' MB'):'')+'</table>';
 var b=PERF.el.querySelector('button');if(b)b.onclick=function(){perfToggle(false);};}
// drag the panel by its header; the spot is remembered for this browser
function perfPlace(x,y){var el=PERF.el,w=el.offsetWidth||360,h=el.offsetHeight||300;x=Math.max(4,Math.min(window.innerWidth-w-4,x));y=Math.max(4,Math.min(window.innerHeight-Math.min(h,60)-4,y));el.style.left=x+'px';el.style.top=y+'px';el.style.transform='none';PERF.pos=[x,y];}
function perfDrag(el){var d=null;el.addEventListener('pointerdown',function(e){var hd=e.target.closest('.pfH');if(!hd||e.target.closest('button'))return;e.preventDefault();e.stopPropagation();var r=el.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};try{el.setPointerCapture(e.pointerId);}catch(_e){}el.classList.add('drag');});
 el.addEventListener('pointermove',function(e){if(!d||e.pointerId!==d.id)return;perfPlace(e.clientX-d.dx,e.clientY-d.dy);});
 function end(e){if(!d)return;d=null;el.classList.remove('drag');try{localStorage.setItem('se.perfPos',JSON.stringify(PERF.pos));}catch(_e){}}el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 el.addEventListener('dblclick',function(e){if(!e.target.closest('.pfH'))return;el.style.left='';el.style.top='';el.style.transform='';PERF.pos=null;try{localStorage.removeItem('se.perfPos');}catch(_e){}});
 ['wheel','click'].forEach(function(t){el.addEventListener(t,function(e){e.stopPropagation();},{passive:true});});
 window.addEventListener('resize',function(){if(PERF.pos)perfPlace(PERF.pos[0],PERF.pos[1]);});}
function perfToggle(on){PERF.on=on==null?!PERF.on:on;if(PERF.on&&!PERF.el){PERF.el=document.createElement('div');PERF.el.id='perfP';document.body.appendChild(PERF.el);perfDrag(PERF.el);PERF.t0=performance.now();PERF.f=0;setInterval(perfDraw,500);perfDraw();
  try{var sp=JSON.parse(localStorage.getItem('se.perfPos')||'null');if(sp&&sp.length===2)perfPlace(sp[0],sp[1]);}catch(_e){}}
 if(PERF.el)PERF.el.style.display=PERF.on?'':'none';perfDraw();}
window.addEventListener('keydown',function(e){if(e.shiftKey&&(e.key==='P'||e.key==='p')&&!/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))perfToggle();});
if(/perf/.test(location.hash+location.search))setTimeout(function(){perfToggle(true);},300);
if(/bench|selftest/.test(location.hash))window.__SEperf=function(){return perfSnap();};
if(/bench|selftest/.test(location.hash)){window.__SElife=LIFE;window.__SEdrvDbg=function(){var n=DRV.next;return {next:n&&{t:n.c.t,d:+n.d.toFixed(1),zw:n.c.zw,gap:n.c.gap,pbs:n.c.pbs,st:n.c.st&&n.c.st.st,real:n.c.real},lead:+Math.min(99,lifeLeadGap(DRV.pos.x,DRV.pos.z,DRV.yaw,DRV.v)).toFixed(2),v:DRV.v,s:DRV.s,hold:DRV.hold,zwT:DRV.zwT,lim:DRV.lim,rc:DRV.rcls,LN:DRV.LN,lane:DRV.lane,k:DRV.laneK,tl:DRV.tlane,speedX:DRV.speedX,pos:[Math.round(DRV.car.position.x),Math.round(DRV.car.position.z)]};};window.__SEpedTrace=function(n){var M=LIFE.meshes,c=null,w=null;LIFE.cars.forEach(function(q){if(c||(q.still||0)<60||!q.p)return;var y={};lifeNeighbours(q,q.hx,q.hz,M,y);if(y.k==='ped'){c=q;}});if(!c)return null;var px=c.p.x,pz=c.p.z,bd=1e9;LIFE.peds.forEach(function(q){if(!q.p)return;var d=Math.hypot(q.p.x-px,q.p.z-pz);if(d<bd){bd=d;w=q;}});var t=performance.now(),out=[];for(var k=0;k<n;k++){t+=100;lifeStep(.1,t);if(k%5===0)out.push([+w.s.toFixed(1),w.dir,w.L.id,w.L.cl,+w.L.len.toFixed(0),+(w.oc||0).toFixed(1),w.side,w.hold,+w.pause.toFixed(1),w.jc&&w.jc.t,w.jc&&+((w.jc.sv-w.s)*w.dir).toFixed(1),w.jc&&w.jc.go,Math.round(w.p.x),Math.round(w.p.z)]);}return {car:[Math.round(c.p.x),Math.round(c.p.z),c.still],ped:out};};window.__SEsol={dbg:function(){var O=SOL.orr,b=O.bodies.earth;b.mesh.updateMatrixWorld(true);var w=new T3.Vector3();b.mesh.getWorldPosition(w);return {earth:[w.x,w.y,w.z],cam:[camera.position.x,camera.position.y,camera.position.z],moon:[O.moon.position.x,O.moon.position.y,O.moon.position.z],sc:b.mesh.scale.x,geoN:!!b.mesh.geometry.attributes.normal,uv:!!b.mesh.geometry.attributes.uv,vis:b.mesh.visible,sun:O.earthMat.uniforms.uSunW.value.toArray(),day:!!O.earthMat.uniforms.dayMap.value};},S:SOL,sub:subsolar,eph:solEph,fix:function(v,o){var p=solFix(v,o);return [p.x,p.y,p.z];},ll:function(a,b){var p=ll2v(a,b,1);return [p.x,p.y,p.z];},enter:solEnter,exit:solExit,toggle:solToggle,focus:solSetFocus,zoom:function(d){want.d=d;},orb:function(){return [orb.d,want.d];}};window.__SElanes={L:LANES,apply:function(T,W){return lanesApply(T,W);},tiles:drvTiles,LN:lifeLN,U:laneU,rd:rdLane,pb:lifePB,plan:lifePlan,xst:lifeXSt};window.__SEpedHits=function(){var K=LIFE.meshes&&LIFE.meshes.kinds,n=0,me=0;if(!K)return null;LIFE.cars.forEach(function(c){if(!c.p||c.hx==null||c.v<.5)return;var k=K[c.kind].k;LIFE.peds.forEach(function(w){if(!w.p)return;var dx=w.p.x-c.p.x,dz=w.p.z-c.p.z;if(Math.abs(dx)>8||Math.abs(dz)>8)return;if(Math.abs(dx*c.hx+dz*c.hz)<k.L/2+.3&&Math.abs(dx*c.hz-dz*c.hx)<k.w/2+.3)n++;});});
 if(DRV.on&&DRV.car&&DRV.v>.5){var cp=DRV.car.position,fx=Math.sin(DRV.yaw),fz=Math.cos(DRV.yaw);LIFE.peds.forEach(function(w){if(!w.p)return;var dx=w.p.x-cp.x,dz=w.p.z-cp.z;if(Math.abs(dx*fx+dz*fz)<2.8&&Math.abs(dx*fz-dz*fx)<1.3)me++;});}return {cars:n,mine:me};};window.__SEsee=function(){var c=DRV.car.position,e=camera.position,G=lidGrid(),occ=null;for(var t=.04;t<.999;t+=.01){var x=c.x+(e.x-c.x)*t,y=c.y+1+(e.y-c.y-1)*t,z=c.z+(e.z-c.z)*t,L=G[Math.floor(x/40)+','+Math.floor(z/40)];if(!L)continue;for(var i=0;i<L.length;i++){var B=L[i],bb=B._bb;if(!bb||x<bb[0]||x>bb[2]||z<bb[1]||z>bb[3])continue;if(y<B[0]&&lidPip(x,z,B)){occ={t:+t.toFixed(2),h:B[0],y:+y.toFixed(1)};break;}}if(occ)break;}return {occ:occ,cam:[+e.x.toFixed(0),+e.y.toFixed(0),+e.z.toFixed(0)],H:DRV.cz&&+DRV.cz.H.toFixed(0),D:DRV.cz&&+DRV.cz.D.toFixed(0)};};window.__SEprog=function(){var P=renderer.info.programs||[];return {n:P.length,list:P.map(function(q){return (q.name||'')+'|'+(q.cacheKey||'').slice(0,60);})};};window.__SEdrvSim=function(){drvSim(.05);};window.__SEmem=function(){var seen=new Set(),by={},tot=0;streetScene.traverse(function(o){var g=o.geometry;if(!g||seen.has(g))return;seen.add(g);var b=0;for(var k in g.attributes){b+=g.attributes[k].array.byteLength;}if(g.index)b+=g.index.array.byteLength;var t=o.isInstancedMesh?'instanced':o.isPoints?'points':o.isLineSegments||o.isLine?'lines':o.userData.road?'roads':'mesh';by[t]=(by[t]||0)+b;tot+=b;});var pm=performance.memory;return {gpuGeoMB:+(tot/1048576).toFixed(1),by:Object.fromEntries(Object.entries(by).map(function(e){return [e[0],+(e[1]/1048576).toFixed(1)];})),info:renderer.info.memory,heapMB:pm?Math.round(pm.usedJSHeapSize/1048576):null,tiles:Object.keys(L2.live?L2.live.tiles:{}).length};};window.__SEstuck=function(sec){var t=performance.now(),M=LIFE.meshes,rep=[];for(var k=0;k<sec*10;k++){t+=100;lifeStep(.1,t);}LIFE.cars.forEach(function(c){if((c.still||0)>90&&c.p)rep.push({still:+c.still.toFixed(0),p:[Math.round(c.p.x),Math.round(c.p.z)],cl:c.L.cl,ow:c.L.ow,s:+c.s.toFixed(1),len:Math.round(c.L.len),dir:c.dir,jk:c.jk,wait:+(c.wait||0).toFixed(1),stopKey:c.stopKey,nb:+Math.min(99,lifeNeighbours(c,c.hx,c.hz,M,c._why={})).toFixed(2),why:c._why,js:c.L.js});});return rep;};window.__SEnb=function(){var M=LIFE.meshes,cs=LIFE.cars,out=null;for(var i=0;i<cs.length&&!out;i++)for(var j=0;j<cs.length;j++){var a=cs[i],b=cs[j];if(a===b||a.L!==b.L||a.dir!==b.dir||a.lane!==b.lane)continue;var g=(a.s-b.s)*a.dir;if(g>0&&g<4.5){var inCG=false,key=Math.floor(a.p.x/12)+','+Math.floor(a.p.z/12);(LIFE.cg[key]||[]).forEach(function(o){if(o===a)inCG=true;});out={g:g,nb:lifeNeighbours(b,b.hx,b.hz,M),inCG:inCG,ap:a.p,bp:b.p,ah:[a.hx,a.hz],bh:[b.hx,b.hz],bv:b.v,av:a.v,bs:b.s,as:a.s};break;}}return out;};window.__SEoverlap=function(sec){var PH=0,EX2=null,CAT={},M=LIFE.meshes,t=performance.now(),ev=0,evSM=0,samples=0,ex=[];function box(c){var k=M.kinds[c.kind].k;return {x:c.p.x,z:c.p.z,fx:c.hx,fz:c.hz,l:k.L/2,w:k.w/2};}
 function sep(A,B){var ax=[[A.fx,A.fz],[-A.fz,A.fx],[B.fx,B.fz],[-B.fz,B.fx]];for(var i=0;i<4;i++){var nx=ax[i][0],nz=ax[i][1];function pr(Q){var c=Q.x*nx+Q.z*nz,r=Q.l*Math.abs(Q.fx*nx+Q.fz*nz)+Q.w*Math.abs(-Q.fz*nx+Q.fx*nz);return [c-r,c+r];}var a=pr(A),b=pr(B);if(a[1]<b[0]||b[1]<a[0])return true;}return false;}
 for(var k=0;k<sec*10;k++){t+=100;lifeStep(.1,t);if(k%10)continue;samples++;var ph=window.__SEpedHits();if(ph){PH+=ph.cars;}var cs=LIFE.cars.filter(function(c){return c.p&&c.hx!=null;});
  for(var i=0;i<cs.length;i++)for(var j=i+1;j<cs.length;j++){var a=cs[i],b=cs[j];if(Math.abs(a.p.x-b.p.x)>14||Math.abs(a.p.z-b.p.z)>14)continue;if(Math.abs((a.L.bz?1:0)-(b.L.bz?1:0))>0)continue;var A=box(a),B=box(b);if(!sep(A,B)){ev++;var dd=a.hx*b.hx+a.hz*b.hz,ddx=b.p.x-a.p.x,ddz=b.p.z-a.p.z,lat=Math.abs(ddx*a.hz-ddz*a.hx),cat=(dd>.7?'same':dd<-.7?'opp':'cross')+(a.L===b.L?'-sameLine':'-diffLine')+(lat<1.8?'-inLane':'-lat'+Math.round(lat));CAT[cat]=(CAT[cat]||0)+1;if(a.L===b.L&&(EX2=EX2||[]).length<8)EX2.push([+a.s.toFixed(1),+b.s.toFixed(1),a.dir,b.dir,a.lane,b.lane,+a.v.toFixed(1),+b.v.toFixed(1),+(a.still||0).toFixed(0),+(b.still||0).toFixed(0),a.L.ow,Math.round(a.L.len),a.kind,b.kind,a.id===b.id,+Math.min(99,lifeNeighbours(a,a.hx,a.hz,M)).toFixed(2),+Math.min(99,lifeNeighbours(b,b.hx,b.hz,M)).toFixed(2),[+a.p.x.toFixed(1),+a.p.z.toFixed(1)],[+b.p.x.toFixed(1),+b.p.z.toFixed(1)],[+a.hx.toFixed(2),+a.hz.toFixed(2)]]);if((a.v<.2)!==(b.v<.2)){evSM++;var st=a.v<.2?a:b,mv=a.v<.2?b:a;if(ex.length<10)ex.push({at:[Math.round(st.p.x),Math.round(st.p.z)],dot:+(a.hx*b.hx+a.hz*b.hz).toFixed(2),stCl:st.L.cl,mvCl:mv.L.cl,stJk:st.jk||'',stGoY:!!st.goY,stStill:+(st.still||0).toFixed(1),mvV:+mv.v.toFixed(1),stEnd:Math.round(st.dir>0?st.L.len-st.s:st.s),mvEnd:Math.round(mv.dir>0?mv.L.len-mv.s:mv.s),me:mv.id===-1||st.id===-1});}}}}
 return {pedHits:PH,ex2:EX2,cat:CAT,samples:samples,overlapPairs:ev,stoppedVsMoving:evSM,examples:ex,cars:LIFE.cars.length};};window.__SEra=function(x,z,R){var out=[],rows=[];drvTiles().forEach(function(T){var d=T.data,dbg=[];roadArrays(d.rd,roadCols(),d.ly,d.ow,dbg);dbg.forEach(function(q){if(Math.hypot(q[3]-x,q[4]-z)<R)out.push(q);});d.rd.forEach(function(r,ri){for(var i=2;i<r.length;i+=2)if(Math.hypot(r[i]-x,r[i+1]-z)<R){rows.push([ri,r[0],r[1],(i-2)/2,(r.length-2)/2,r[i],r[i+1]]);}});});return {J:out,V:rows};};window.__SElifeBench=function(n){var t=performance.now(),f=t;for(var k=0;k<n;k++){f+=16;lifeStep(.016,f);}return {ms:(performance.now()-t)/n,cars:LIFE.cars.length,peds:LIFE.peds.length};};window.__SEbrY=function(x,z,y,c){return [lifeBridgeY(x,z,y,c),DRV.brY,DRV.pos.x,DRV.pos.z,DRV.yaw,DRV.state];};window.__SElifeRun=function(sec,withCar){var t=performance.now(),s0=DRV.s,st0=0,mx=0,lastS=DRV.s,stuck=0;for(var k=0;k<sec*10;k++){t+=100;if(withCar&&DRV.on){for(var j=0;j<2;j++)drvSim(.05);drvLaneStep(.1,t);var c=DRV.car;if(c){c.position.x=DRV.pos.x-Math.cos(DRV.yaw)*(DRV.lane||0);c.position.z=DRV.pos.z+Math.sin(DRV.yaw)*(DRV.lane||0);}if(DRV.s-lastS<.01&&DRV.state==='drive'){stuck++;mx=Math.max(mx,stuck);}else stuck=0;lastS=DRV.s;}lifeStep(.1,t);}return {dbg:LIFE.dbg,st:LIFE.stats,ds:DRV.s-s0,maxStuck:mx/10,state:DRV.state};};window.__SEdrvY=function(){return DRV.car?DRV.car.position.y:-1;};window.__SEsig=function(P,t){var o=DRV.simT;DRV.simT=t-P.off;var a=drvSig(P,P.ax).st,b=drvSig(P,P.ax+Math.PI/2).st;DRV.simT=o;return [a,b];};window.__SEgeo={ll:function(x,z){return localToLL(x,z);},hdg:function(){return camHeading();},azB:function(b){return azForBearing(b);},proj:function(x,y,z){streetCamPos();camera.updateMatrixWorld();var v=new T3.Vector3(x,y,z).project(camera);return [v.x,v.y,v.z];},cam:function(){return [camera.position.x,camera.position.y,camera.position.z];},tgt:function(){return [L2.target.x,L2.target.z,L2.cam.az,L2.cam.el,L2.cam.d,!!(L2.drone&&L2.drone.on)];},picksAll:function(){return (L2.picks||[]).map(function(b){var x=0,z=0,n=0;for(var i=2;i<b.length-1;i+=2){x+=b[i];z+=b[i+1];n++;}return [x/n,z/n];});},picks:function(){var P=L2.picks||[],neg=0,pos=0;P.forEach(function(b){var a=polyArea(b.slice(2,b.length-1),0);if(a<0)neg++;else if(a>0)pos++;});return {n:P.length,neg:neg,pos:pos,live:!!L2.live};}};window.__SEtp=function(x,z,yaw,deck){DRV.cz=null;DRV.pos.set(x,0,z);DRV.yaw=yaw;DRV.brY=deck?lifeBridgeY(x,z,yaw,null):0;DRV.route=null;DRV.state='idle';DRV.v=0;DRV.camInit=false;};window.__SElook=function(x,z,d,el,az){L2.target.set(x,0,z);L2.camWant.d=L2.cam.d=d;L2.camWant.el=L2.cam.el=el;L2.camWant.az=L2.cam.az=az;L2.drone.touch=performance.now()+1e9;};}
if(/bench|selftest/.test(location.hash))window.__SEdrv={plan:function(){return DRV.ctl.filter(function(c){return c.t==='sig';}).map(function(c){return {s:Math.round(c.s),cA:c.cA,cB:c.cB,C:c.C,GA:+c.GA.toFixed(1),GB:+c.GB.toFixed(1),YA:+c.YA.toFixed(1),YB:+c.YB.toFixed(1),RA:+c.RA.toFixed(1),LA:c.LA,turn:c.turn,stop:+c.stopOff.toFixed(1)};});},sim:function(sec){var log=[],t=0,last='';DRV.scanAt=0;while(t<sec){drvSim(.05);t+=.05;if(Math.round(t*20)%20===0){drvScan();var n=DRV.next,k=(n?n.c.t+(n.c.st?':'+n.c.st.st:''):'-');log.push(Math.round(t)+'s v'+DRV.v.toFixed(1)+' s'+Math.round(DRV.s)+' '+k+(n?'@'+Math.round(n.d):''));}if(DRV.state!=='drive')break;}return log;},start:drvStart,end:drvEnd,dest:function(dx,dz){var ll=localToLL(DRV.pos.x+dx,DRV.pos.z+dz);drvSetDest({lat:ll.lat,lon:ll.lon,n:'T'});},fly:drvSetFly,view:function(v){DRV.view=v;DRV.camInit=false;},x:function(k){DRV.speedX=k;},st:function(){var R=DRV.route;return {on:DRV.on,state:DRV.state,v:+DRV.v.toFixed(2),s:Math.round(DRV.s),len:R&&R.len?Math.round(R.len):0,src:R?R.src:'',ctl:DRV.ctl.map(function(c){return c.t+(c.real?'*':'')+'@'+Math.round(c.s)+(c.st?':'+c.st.st:'');}).slice(0,12),soc:+(DRV.soc*100).toFixed(3),alt:+DRV.alt.toFixed(1),fly:DRV.fly,lim:+DRV.lim.toFixed(1),road:DRV.road,next:DRV.next?Math.round(DRV.next.d)+DRV.next.c.t:'',simT:+DRV.simT.toFixed(2),sf:+DRV.s.toFixed(2),lead:+Math.min(99,lifeLeadGap(DRV.pos.x,DRV.pos.z,DRV.yaw,DRV.v)).toFixed(2),hold:DRV.hold!=null};}};
// ---------- boot ----------
applyLang();buildStars();probeLive().then(function(ok){if(!ok)reprobe();else ovtInit();});wireEnv();wireCov();wireTod();wireSearch();wireDroneHud();wireMM();wireSmap();wireSky();wireDrive();winInit();(function(){var b=document.getElementById('bWinReset');if(b)b.onclick=function(){winReset();toast(I18T('all_windows_reset'));};})();(function(){var b=document.getElementById('bQual');if(!b)return;b.setAttribute('aria-pressed',QUAL.m==='hq');qualLabel(b);b.onclick=function(){setQual(QUAL.m==='hq'?'bal':'hq');toast(QUAL.m==='hq'?(I18T('max_quality_full_detail')):(I18T('balanced_simplified_distance_adaptive')));};})();
Promise.all([
 loadJSON('data/earth/vector.json').then(function(d){V=d;prog(.15,'LOADING VECTORS…');}),
 loadJSON('data/nodes.json').then(function(d){NODES=d;prog(.25,'LOADING NODES…');}),
 loadJSON('data/events.json').then(function(d){window.__EVD=d;}).catch(function(){window.__EVD=null;}),
 loadJSON('data/cities.json').then(function(d){setCities(d);}).catch(function(){setCities(D.CITIES.map(function(c){return Object.assign({f:1},c);}));}),
 loadImg('data/earth/earth-day.jpg').then(function(i){prog(.5,'LOADING IMAGERY…');return i;}),
 loadImg('data/earth/earth-night.jpg'),
 loadImg('data/earth/earth-topo.png'),
 loadImg('data/earth/earth-water.png'),
 loadImg('data/earth/country-index.png').then(function(i){initCtryIndex(i);return i;})
]).then(function(a){
 var day=a[4],night=a[5],topo=a[6],water=a[7];
 prog(.8,'BUILDING GLOBE…');
 buildEarth(day,night,topo,water);buildVectors();buildGraticule();buildNodes();buildCityMarks();buildLabels();buildLegend();buildEvents(window.__EVD);
 resize();camFromOrb();
 prog(1,'READY');
 resetToIntro();invalidate(3000);
 if(EV.length&&!/bench|selftest/.test(location.hash))setTimeout(function(){if(mode==='globe')selectYear(tlMaxY,false);},2200);
 requestAnimationFrame(loop);
 if(/bench|selftest/.test(location.hash))window.__SE={enterAt:function(a,b){enterAt(a,b);},wd:function(){var ll=v2ll(camera.position);return {d:want.d/R,cine:CINE,busy:WORLD.busy,ll:ll,c:countryAt(ll.lat,ll.lon),mode:mode};},sky:function(on){setSky(on);},skySet:function(o){Object.assign(SKYV,o);skySensor();skyApplyLayers();skyControls();SKYV.gridKey='';},skyState:function(){return {on:SKYV.on,z:SKYV.lastZ,n:Object.keys(SKYV.tiles).length,frac:SKYV.frac,src:SKYV.base,el:L2.cam.el,d:L2.cam.d,data:(document.getElementById('skyData')||{}).innerText,ev:(document.getElementById('skyEv')||{}).innerText};},trvTick:function(n,dt){for(var i=0;i<n;i++){travelStep(dt);liveUpdate(true);}},travel:function(lat,lon,n){travelTo({lat:lat,lon:lon,name:n||'T',zh:'',iso:'US'});},trv:function(){return {on:TRV.on,v:TRV.v,lat0:L2.live&&L2.live.lat0,lon0:L2.live&&L2.live.lon0,tx:L2.target&&L2.target.x,city:L2.city&&L2.city.en,info:(document.getElementById('liveInfo')||{}).innerText,trvTxt:(document.getElementById('aheadTrv')||{}).innerText};},cov:function(on){setCovOn(on);},covScan:function(id){return deepScan(CITYBY[id]);},wxAge:function(ms){ENV.wxAt-=ms;ENV.uiAt=0;},wxState:function(){return {mode:ENV.wxMode,live:!!ENV.wxLive,temp:ENV.wxLive&&ENV.wxLive.temp,busy:ENV.wxBusy,ws:(document.getElementById('envWs')||{}).textContent};},wxSet:function(m){setWxMode(m);},facts:function(n){var out=[];for(var i=0;i<L2.picks.length&&out.length<n;i++){var b=L2.picks[i];var f=buildingFacts(b);if(f.num&&f.street)out.push({i:i,num:f.num,st:f.street.n,pl:f.places.map(function(p){return p.n;})});}return out;},showB:function(i){var b=L2.picks[i];setSelected(b);renderCategory(b[b.length-1],b);},focus:function(id){setFocus(id);},envSet:function(o){if(o.style!=null)ENV.style=o.style;if(o.wx)setWxMode(o.wx);if(o.hour!=null){ENV.lapse=false;setHourLocal(o.hour);}if(o.drone!=null){L2.drone.on=o.drone;}var t=performance.now();for(var i=1;i<=(o.n||120);i++)frame(t+i*50);return {sun:ENV.sun,moon:ENV.moon,lux:ENV.lux,lamps:ENV.lamps,cur:ENV.cur,live:!!ENV.wxLive,err:ENV.wxErr,tz:ENV.tz,deco:L2.deco||(L2.live?Object.keys(L2.live.tiles).reduce(function(a,k){var d=L2.live.tiles[k].deco;if(d){a.trees+=d.trees;a.lamps+=d.lamps;}return a;},{trees:0,lamps:0}):null),sec:envSecurity().map(function(x){return x.k+':'+x.lv;}).join(' ')};},envLook:function(az,el,d){L2.drone.on=false;L2.cam.az=L2.camWant.az=az;L2.cam.el=L2.camWant.el=el;L2.cam.d=L2.camWant.d=d;},droneSim:function(n){var t=performance.now();L2.drone.touch=0;var e0=L2.cam.el,a0=L2.cam.az;for(var i=1;i<=n;i++)frame(t+i*50);return {el0:e0*R2D,el:L2.cam.el*R2D,daz:(L2.cam.az-a0)*R2D,on:L2.drone.on,blend:L2.drone.blend,tm:document.getElementById('droneTm').textContent};},pan:function(dx,dy){livePan(dx,dy);},get live(){return LIVE;},liveStatus:function(){var lv=L2.live;if(!lv)return null;var r=0,n=0;for(var k in lv.tiles){n++;if(lv.tiles[k].state==='ready')r++;}return {ready:r,total:n,picks:(L2.picks||[]).length,tx:L2.target.x,tz:L2.target.z};},snap:function(){orb.th=want.th;orb.ph=want.ph;orb.d=want.d;look.copy(wantLook);},setStrikeT:function(t){STRIKES.forEach(function(x){x.t=t;});},selectYear:function(y,s){selectYear(y,s);},openEvent:function(i){openEvent(i);},get strikes(){return STRIKES.length;},get nEv(){return EV.length;},cam:function(){camFromOrb();camera.lookAt(look);camera.updateMatrixWorld();},frame:frame,updateLabels:updateLabels,enterCity:enterCity,exitCity:exitCity,orb:orb,want:want,L2:L2,get mode(){return mode;},get renders(){return RENDERS;},get labelsShown(){return ASSIGNED.length;},setAuto:function(v){autoRot=v;}};
 if(location.hash==='#selftest'){setInterval(function(){if(performance.now()-lastRaf>200)frame(performance.now());},40);setTimeout(selfTest,800);}
 setTimeout(function(){document.getElementById('loader').classList.add('done');},300);
}).catch(function(err){loadTxt.textContent='load error: '+err.message;});

// ---------- self-test ----------
function selfTest(){var out=document.createElement('pre');out.style.cssText='position:fixed;left:12px;top:150px;z-index:99;background:rgba(0,0,0,.9);color:#cfe;font:11px/1.45 monospace;padding:10px;border:1px solid #4a8;border-radius:8px;max-width:340px;white-space:pre-wrap';document.body.appendChild(out);var log=[];function ok(n,c){log.push((c?'PASS ':'FAIL ')+n);out.textContent=log.join('\n');}
 ok('globe built',!!globe&&!!earthMat);ok('vectors',!!vlayers.borders);ok('nodes',!!nodePts&&NODES.rows.length>7000);
 ok('country@SanJose',(countryAt(37.34,-121.89)||[])[2]==='US');ok('country@Tokyo',(countryAt(35.68,139.69)||[])[2]==='JP');ok('ocean@mid-atlantic',countryAt(30,-40)==null);
 var steps=[
  function(){renderCountry(39.9,116.4);ok('country panel CN',/SL/.test(pHead.textContent)&&state.type==='country');},
  function(){enterCity('sjc');},
  function(){ok('street built',L2.active&&L2.picks&&L2.picks.length>500&&!!L2.group);},
  function(){var p=L2.picks[0];var cx=0,cy=0,c=0;for(var i=2;i<p.length-1;i+=2){cx+=p[i];cy+=p[i+1];c++;}cx/=c;cy/=c;var found=null;for(var k=0;k<L2.picks.length;k++){if(pip(cx,cy,L2.picks[k],2)){found=L2.picks[k];break;}}renderCategory((found||p)[(found||p).length-1]);ok('building→category chain',state.type==='cat'&&pBody.querySelector('.chain')!=null);},
  function(){renderDistrict(4);ok('district critical SL5',state.type==='dist'&&/SL5/.test(pHead.innerHTML));},
  function(){lang='en';applyLang();ok('lang EN',pHead.textContent.indexOf('Critical')>=0);lang='zh';applyLang();},
  function(){exitCity();},
  function(){ok('back to globe',mode==='globe'&&!L2.active);ok('cities '+CITIES.length,CITIES.length>2300);enterCity('q22us');},
  function(){},function(){},function(){},function(){},function(){},
  function(){ok('bundle city q22us',L2.active&&L2.picks&&L2.picks.length>200);},
  function(){exitCity();},
  function(){ok('events '+EV.length,EV.length>=90&&!!evPts);selectYear(2017,true);},
  function(){ok('timeline 2017 strikes',tlYear===2017&&(EVY[2017]||[]).length>0);openEvent('wannacry-2017');ok('event card',state.type==='event'&&/WannaCry/.test(pHead.textContent)&&pBody.querySelectorAll('.src a').length>0);},
  function(){openEvent('heartbleed-2014');ok('global event card',state.type==='event'&&tlYear===2014);},
  function(){ok('DONE',true);}
 ];var i=0;(function nx(){if(i<steps.length){try{steps[i++]();}catch(e){ok('step threw '+e.message+' '+(e.stack||'').split('\n').slice(1,4).join(' | '),false);}setTimeout(nx,1500);}})();
}
})();
