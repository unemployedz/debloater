import { useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Galaxy from './Galaxy';

const IMAGE_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
const MEDIA_ACCEPT='.mp4,.mov,.webm,.mkv,.avi,.m4v,.mp3,.m4a,.wav,.flac,.ogg,.opus,.aac,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif';

function ext(name){return name.split('.').pop()?.toLowerCase()||'bin'}
function bytes(n){if(!n)return '0 B';const u=['B','KB','MB','GB'];const i=Math.floor(Math.log(n)/Math.log(1024));return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`}
function platform(url){try{const h=new URL(url).hostname; if(h.includes('tiktok'))return 'TikTok';if(h.includes('pinterest')||h==='pin.it')return 'Pinterest';if(h.includes('capcut'))return 'CapCut';return 'Direct media'}catch{return 'Unknown'}}

export default function App(){
  const input=useRef();
  const ff=useRef(new FFmpeg());
  const [files,setFiles]=useState([]); const [url,setUrl]=useState(''); const [status,setStatus]=useState('Ready'); const [progress,setProgress]=useState(0);
  const [results,setResults]=useState([]); const [loaded,setLoaded]=useState(false);
  const [watermark,setWatermark]=useState(false); const [box,setBox]=useState({x:'',y:'',w:'',h:''}); const [source,setSource]=useState(null);
  const total=useMemo(()=>files.reduce((a,f)=>a+f.size,0),[files]);

  const loadFFmpeg=async()=>{if(loaded)return;setStatus('Loading media engine…');const core='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';const wasm='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';await ff.current.load({coreURL:await toBlobURL(core,'text/javascript'),wasmURL:await toBlobURL(wasm,'application/wasm')});ff.current.on('progress',p=>setProgress(Math.max(0,Math.min(100,Math.round(p.progress*100))));setLoaded(true)};

  const addFiles=e=>{const next=[...e.target.files];setFiles(next);setResults([]);setStatus(`${next.length} file${next.length>1?'s':''} queued`)};

  async function cleanImage(file){setStatus(`Cleaning ${file.name}…`);setProgress(25);const img=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const type=file.type==='image/png'?'image/png':file.type==='image/webp'?'image/webp':'image/jpeg';const blob=await new Promise(r=>canvas.toBlob(r,type,type==='image/jpeg'?.98:undefined));setProgress(100);return new File([blob],`${file.name.replace(/\.[^.]+$/,'')}.clean.${type.split('/')[1].replace('jpeg','jpg')}`,{type});}

  async function cleanWithFFmpeg(file){await loadFFmpeg();const inName=`input.${ext(file.name)}`;const outExt=watermark&&file.type.startsWith('video/')?'mp4':ext(file.name);const outName=`cleaned.${outExt}`;await ff.current.writeFile(inName,await fetchFile(file));let args=['-i',inName,'-map','0','-map_metadata','-1','-map_chapters','-1'];if(watermark&&file.type.startsWith('video/')){const x=Number(box.x),y=Number(box.y),w=Number(box.w),h=Number(box.h);if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw new Error('Enter a valid watermark rectangle: x, y, width, height.');args.push('-vf',`delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`,'-fps_mode','passthrough','-c:v','libx264','-preset','veryfast','-crf','18','-c:a','copy');}else args.push('-c','copy');args.push(outName);await ff.current.exec(args);const data=await ff.current.readFile(outName);await ff.current.deleteFile(inName);await ff.current.deleteFile(outName);setProgress(100);return new File([data],`${file.name.replace(/\.[^.]+$/,'')}.clean.${outExt}`,{type:outExt==='mp4'?'video/mp4':file.type||'application/octet-stream'});}

  async function process(){if(!files.length)return;try{setResults([]);const out=[];for(let i=0;i<files.length;i++){setProgress(0);const f=files[i];let cleaned;if(IMAGE_TYPES.includes(f.type))cleaned=await cleanImage(f);else cleaned=await cleanWithFFmpeg(f);out.push(cleaned);setStatus(`Cleaned ${i+1}/${files.length}`)}setResults(out);setStatus(`Done — ${out.length} clean file${out.length>1?'s':''}`);sendWebhook(out);}catch(e){console.error(e);setStatus(e.message||'Processing failed');}}

  async function resolveUrl(){if(!url.trim())return;try{setStatus(`Resolving ${platform(url)}…`);const r=await fetch(`/api/resolve?url=${encodeURIComponent(url)}`);const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not resolve URL');if(data.items?.length){const chosen=[];for(const item of data.items){const res=await fetch(item.url);if(!res.ok)continue;const blob=await res.blob();chosen.push(new File([blob],item.name||`download-${chosen.length+1}.${item.type?.split('/')[1]||'bin'}`,{type:item.type||blob.type}));}if(!chosen.length)throw new Error('The media URL could not be fetched by the browser.');setFiles(chosen);setSource(data.source);setStatus(`${data.items.length} source item${data.items.length>1?'s':''} found`)}else throw new Error('No public media source found. Try the direct media URL.');}catch(e){setStatus(e.message||'URL resolve failed')}}

  async function sendWebhook(cleaned){try{const meta={files:cleaned.map(f=>({name:f.name,size:f.size,type:f.type})),source:source||'local upload',watermarkRemoval:watermark,timestamp:new Date().toISOString()};const r=await fetch('/api/webhook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(meta)});if(!r.ok)console.warn('Webhook notification failed');}catch(e){console.warn('Webhook unavailable',e)}}

  const download=f=>{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  return <div className="app"><Galaxy mouseRepulsion mouseInteraction density={1.15} glowIntensity={.18} saturation={.65} hueShift={190} starSpeed={.45}/><main className="shell">
    <header><div className="brand"><div className="logo">✦</div><div><strong>DEBLOATER</strong><span>privacy-first media cleaner</span></div></div><div className="badge">LOCAL PROCESSING</div></header>
    <section className="hero"><p className="eyebrow">MEDIA SANITIZER</p><h1>Clean the baggage.<br/><em>Keep the media.</em></h1><p className="sub">Strip metadata from images, audio and video. Remove simple rectangular logos without changing the canvas size. Files stay in your browser while they are processed.</p>
      <div className="drop" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFiles([...e.dataTransfer.files]);setResults([])}}><input ref={input} hidden multiple type="file" accept={MEDIA_ACCEPT} onChange={addFiles}/><div className="upload-icon">↑</div><b>Drop media here</b><span>or click to browse · MP4 · MP3 · PNG · JPEG · WebP · WAV · and more</span></div>
      <div className="url-row"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a TikTok, Pinterest, CapCut or direct media URL…"/><button onClick={resolveUrl}>Resolve URL</button></div>
    </section>
    <section className="panel"><div className="panel-head"><div><small>QUEUE</small><h2>{files.length?`${files.length} item${files.length>1?'s':''}`:'No media selected'}</h2></div>{files.length>0&&<span>{bytes(total)}</span>}</div>
      {files.length>0&&<div className="queue">{files.map((f,i)=><div className="file" key={i}><div className="filetype">{ext(f.name).toUpperCase()}</div><div className="fileinfo"><b>{f.name}</b><span>{f.type||'unknown'} · {bytes(f.size)}</span></div><button className="x" onClick={()=>setFiles(files.filter((_,n)=>n!==i))}>×</button></div>)}</div>}
      <div className="options"><label className="switch"><input type="checkbox" checked={watermark} onChange={e=>setWatermark(e.target.checked)}/><span></span><div><b>Remove watermark / logo</b><small>Uses FFmpeg delogo interpolation. Best for simple fixed logos.</small></div></label>{watermark&&<div className="coords"><input value={box.x} onChange={e=>setBox({...box,x:e.target.value})} placeholder="X"/><input value={box.y} onChange={e=>setBox({...box,y:e.target.value})} placeholder="Y"/><input value={box.w} onChange={e=>setBox({...box,w:e.target.value})} placeholder="Width"/><input value={box.h} onChange={e=>setBox({...box,h:e.target.value})} placeholder="Height"/></div>}</div>
      <div className="process"><div className="progress"><i style={{width:`${progress}%`}}/></div><div className="status"><span>{status}</span><span>{progress}%</span></div></div><button className="primary" disabled={!files.length||status.includes('Loading')||status.includes('…')} onClick={process}>CLEAN & DEBLOAT {files.length?`· ${files.length}`:''}</button>
    </section>
    {results.length>0&&<section className="panel results"><div className="panel-head"><div><small>OUTPUT</small><h2>Clean files ready</h2></div></div>{results.map((f,i)=><div className="result" key={i}><div><b>{f.name}</b><span>{f.type} · {bytes(f.size)}</span></div><button onClick={()=>download(f)}>Download</button></div>)}</section>}
    <footer><span>Debloater · metadata removal + media cleanup</span><span>Original dimensions preserved · video FPS passthrough when watermarking</span></footer>
  </main></div>
}
