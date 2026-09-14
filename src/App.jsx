import { useEffect, useMemo, useRef, useState } from 'react';

const IMAGE_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
const MEDIA_ACCEPT='.mp4,.mov,.webm,.mkv,.avi,.m4v,.mp3,.m4a,.wav,.flac,.ogg,.opus,.aac,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif';
function ext(name){return name.split('.').pop()?.toLowerCase()||'bin'}
function bytes(n){if(!n)return '0 B';const u=['B','KB','MB','GB'];const i=Math.min(u.length-1,Math.floor(Math.log(n)/Math.log(1024)));return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`}
function platform(url){try{const h=new URL(url).hostname.toLowerCase();if(h==='tiktok.com'||h.endsWith('.tiktok.com'))return 'TikTok';return 'Direct media'}catch{return 'Unknown'}}

function MediaPreview({src,type,poster,label}){
 const [objectUrl,setObjectUrl]=useState('');
 useEffect(()=>{
   if(!src)return;
   if(typeof src==='string'){setObjectUrl(src);return}
   const u=URL.createObjectURL(src);setObjectUrl(u);return()=>URL.revokeObjectURL(u);
 },[src]);
 if(!objectUrl)return <div className="preview empty">Loading preview…</div>;
 if(type?.startsWith('image/')) return <div className="preview image-preview"><img src={objectUrl} alt={label||'media preview'}/></div>;
 if(type?.startsWith('video/')) return <div className="preview video-preview"><video src={objectUrl} poster={poster||undefined} controls playsInline preload="metadata"/></div>;
 return <div className="preview audio-preview"><span>♫</span><b>{label||'Audio'}</b></div>;
}

export default function App(){
 const input=useRef();
 const ff=useRef(null);
 const ffFetchFile=useRef(null);
 const blobUpload=useRef(null);
 const [files,setFiles]=useState([]);
 const [url,setUrl]=useState('');
 const [status,setStatus]=useState('Ready');
 const [progress,setProgress]=useState(0);
 const [results,setResults]=useState([]);
 const [remoteResults,setRemoteResults]=useState([]);
 const [remoteSaving,setRemoteSaving]=useState(null);
 const [loaded,setLoaded]=useState(false);
 const [source,setSource]=useState(null);
 const total=useMemo(()=>files.reduce((a,f)=>a+f.size,0),[files]);

 const loadFFmpeg=async()=>{
   if(loaded&&ff.current)return;
   setStatus('Loading media engine…');
   const [{FFmpeg},{fetchFile,toBlobURL}]=await Promise.all([import('@ffmpeg/ffmpeg'),import('@ffmpeg/util')]);
   if(!ff.current)ff.current=new FFmpeg();
   ffFetchFile.current=fetchFile;
   const core='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
   const wasm='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';
   await ff.current.load({coreURL:await toBlobURL(core,'text/javascript'),wasmURL:await toBlobURL(wasm,'application/wasm')});
   ff.current.on('progress',p=>setProgress(Math.max(0,Math.min(100,Math.round(p.progress*100)))));
   setLoaded(true);
 };

 const addFiles=e=>{const next=[...e.target.files];setFiles(next);setRemoteResults([]);setResults([]);setStatus(`${next.length} file${next.length>1?'s':''} queued`)};

 async function cleanImage(file){
   setStatus(`Removing metadata from ${file.name}…`);setProgress(25);
   const img=await createImageBitmap(file);
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
   canvas.getContext('2d').drawImage(img,0,0);
   const type=file.type==='image/png'?'image/png':file.type==='image/webp'?'image/webp':'image/jpeg';
   const blob=await new Promise(r=>canvas.toBlob(r,type,type==='image/jpeg'?.98:undefined));
   if(!blob)throw new Error('Could not encode image.');
   setProgress(100);
   return new File([blob],`${file.name.replace(/\.[^.]+$/,'')}.clean.${type.split('/')[1].replace('jpeg','jpg')}`,{type});
 }

 async function cleanWithFFmpeg(file){
   await loadFFmpeg();
   const inName=`input.${ext(file.name)}`;const outExt=ext(file.name);const outName=`cleaned.${outExt}`;
   await ff.current.writeFile(inName,await ffFetchFile.current(file));
   const code=await ff.current.exec(['-i',inName,'-map','0','-map_metadata','-1','-map_chapters','-1','-c','copy',outName]);
   if(code!==0)throw new Error('FFmpeg could not process this media.');
   const data=await ff.current.readFile(outName);
   await ff.current.deleteFile(inName);await ff.current.deleteFile(outName);setProgress(100);
   return new File([data],`${file.name.replace(/\.[^.]+$/,'')}.clean.${outExt}`,{type:file.type||'application/octet-stream'});
 }

 async function process(){
   if(!files.length)return;
   try{setResults([]);const out=[];for(let i=0;i<files.length;i++){setProgress(0);const f=files[i];const cleaned=IMAGE_TYPES.includes(f.type)?await cleanImage(f):await cleanWithFFmpeg(f);out.push(cleaned);setStatus(`Cleaned ${i+1}/${files.length}`)}setResults(out);setStatus(`Done — ${out.length} clean file${out.length>1?'s':''}`);await sendWebhook(out)}catch(e){console.error(e);setStatus(e.message||'Processing failed')}
 }

 async function resolveUrl(){
   if(!url.trim())return;
   try{setRemoteResults([]);setResults([]);setFiles([]);setProgress(10);setStatus(`Resolving ${platform(url)}…`);const r=await fetch(`/api/resolve?url=${encodeURIComponent(url.trim())}`);const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not resolve URL');if(!data.items?.length)throw new Error('No downloadable media found.');setSource(data.source);setRemoteResults(data.items);setProgress(100);setStatus(data.noWatermark?'Ready — no-watermark TikTok source found':'Direct media source found')}catch(e){setProgress(0);setStatus(e.message||'URL resolve failed')}
 }

 async function saveRemote(item,index){
   setRemoteSaving(index);setStatus(`Preparing ${item.name}…`);
   try{
     const r=await fetch(item.url,{mode:'cors'});
     if(!r.ok)throw new Error(`Media server returned ${r.status}`);
     const blob=await r.blob();
     const blobUrl=URL.createObjectURL(blob);
     const a=document.createElement('a');a.href=blobUrl;a.download=item.name||'debloater-media';document.body.appendChild(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(blobUrl),5000);
     setStatus(`Saved ${item.name}`);
   }catch(e){
     console.warn('Direct blob save failed',e);
     setStatus('Your browser blocked direct saving. Use the preview controls to save the media.');
   }finally{setRemoteSaving(null)}
 }

 async function sendWebhook(cleaned){
   try{if(!blobUpload.current){const mod=await import('@vercel/blob/client');blobUpload.current=mod.upload}const links=[];for(const f of cleaned){setStatus(`Publishing ${f.name}…`);const blob=await blobUpload.current(`debloater/${Date.now()}-${f.name}`,f,{access:'public',handleUploadUrl:'/api/upload',multipart:f.size>4500000,onUploadProgress:p=>setProgress(Math.round(p.percentage))});links.push({name:f.name,size:f.size,type:f.type,url:blob.url})}const meta={event:'debloated_media',files:links,source:source||'local upload',watermarkRemoval:false,timestamp:new Date().toISOString()};const r=await fetch('/api/webhook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(meta)});if(!r.ok)console.warn('Webhook notification failed')}catch(e){console.warn('Webhook unavailable',e)}
 }

 const downloadLocal=f=>{const a=document.createElement('a');const u=URL.createObjectURL(f);a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)};

 return <div className="app"><main className="shell">
   <header><div className="brand"><div className="logo">✦</div><div><strong>DEBLOATER</strong><span>privacy-first media cleaner</span></div></div><div className="badge">TIKTOK NO-WATERMARK</div></header>
   <section className="hero">
     <p className="eyebrow">MEDIA SANITIZER</p><h1>Clean the baggage.<br/><em>Keep the media.</em></h1>
     <p className="sub">Paste a public TikTok link and preview the actual media before saving it. TikTok downloads use a no-watermark source when one is available. Local files can have their metadata removed.</p>
     <div className="drop" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFiles([...e.dataTransfer.files]);setRemoteResults([]);setResults([]);setStatus('Files queued')}}><input ref={input} hidden multiple type="file" accept={MEDIA_ACCEPT} onChange={addFiles}/><div className="upload-icon">↑</div><b>Drop media here</b><span>or click to browse · MP4 · MP3 · PNG · JPEG · WebP · WAV · and more</span></div>
     <div className="url-row"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a TikTok URL…" onKeyDown={e=>{if(e.key==='Enter')resolveUrl()}}/><button onClick={resolveUrl} disabled={!url.trim()}>Get media</button></div>
     <div className="hint">No X/Y/width/height settings. No crop. No resize. The preview shows the returned media before you save it.</div>
   </section>

   {(remoteResults.length>0||files.length>0||results.length>0)&&<section className="panel">
     {remoteResults.length>0&&<><div className="panel-head"><div><small>TIKTOK RESULT</small><h2>{remoteResults.length>1?`${remoteResults.length} media files ready`:'Media ready'}</h2></div><span>{source}</span></div>
       <div className="remote-grid">{remoteResults.map((item,i)=><article className="remote-card" key={`${item.url}-${i}`}><MediaPreview src={item.preview||item.url} type={item.type} poster={item.preview} label={item.title||item.name}/><div className="remote-info"><div className="remote-title"><b>{item.title||item.name}</b><span>{item.author?`@${item.author} · `:''}{item.quality||item.type} · no watermark</span></div><button className="save-btn" onClick={()=>saveRemote(item,i)} disabled={remoteSaving!==null}>{remoteSaving===i?'SAVING…':'SAVE FILE'}</button></div></article>)}</div>
     </>}

     {files.length>0&&<><div className="panel-head"><div><small>LOCAL QUEUE</small><h2>{files.length} item{files.length>1?'s':''}</h2></div><span>{bytes(total)}</span></div><div className="queue">{files.map((f,i)=><div className="file" key={i}><MediaPreview src={f} type={f.type} label={f.name}/><div className="fileinfo"><b>{f.name}</b><span>{f.type||'unknown'} · {bytes(f.size)}</span></div><button className="x" onClick={()=>setFiles(files.filter((_,n)=>n!==i))}>×</button></div>)}</div><div className="local-note">Local cleanup removes embedded metadata. It does not pretend that metadata removal erases visible watermark pixels.</div><div className="process"><div className="progress"><i style={{width:`${progress}%`}}/></div><div className="status"><span>{status}</span><span>{progress}%</span></div></div><button className="primary" disabled={!files.length||status.includes('Loading')||status.includes('…')} onClick={process}>REMOVE METADATA · {files.length}</button></>}

     {results.length>0&&<><div className="panel-head"><div><small>OUTPUT</small><h2>Clean files ready</h2></div></div><div className="remote-grid">{results.map((f,i)=><article className="remote-card" key={i}><MediaPreview src={f} type={f.type} label={f.name}/><div className="remote-info"><div className="remote-title"><b>{f.name}</b><span>{f.type} · {bytes(f.size)}</span></div><button className="save-btn" onClick={()=>downloadLocal(f)}>SAVE FILE</button></div></article>)}</div></>}
   </section>}
   <footer><span>Debloater · TikTok no-watermark + metadata cleanup</span><span>Dark mode · no crop or resize</span></footer>
 </main></div>
}
