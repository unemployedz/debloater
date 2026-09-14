function findValues(value, keys, out = []) {
  if (!value || typeof value !== 'object' || out.length >= 50) return out;
  if (Array.isArray(value)) { for (const item of value) findValues(item, keys, out); return out; }
  for (const [k,v] of Object.entries(value)) {
    if (keys.includes(k)) {
      if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v);
      if (Array.isArray(v)) for (const x of v) if(typeof x==='string'&&/^https?:\/\//.test(x)) out.push(x);
    }
    if (v && typeof v === 'object') findValues(v, keys, out);
  }
  return out;
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const raw=req.query?.url;
  if(!raw) return res.status(400).json({error:'Missing url'});
  let url; try{url=new URL(raw)}catch{return res.status(400).json({error:'Invalid URL'})}
  try{
    const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Debloater/1.0; +https://github.com/unemployedz/debloater)','accept':'text/html,application/xhtml+xml'}});
    if(!r.ok) throw new Error(`Source returned HTTP ${r.status}`);
    const type=r.headers.get('content-type')||'';
    if(type.startsWith('video/')||type.startsWith('image/')||type.startsWith('audio/')) return res.status(200).json({source:url.hostname,items:[{url:url.toString(),type,name:`download.${type.split('/')[1]||'bin'}`}]});
    const html=await r.text();const items=[];const push=(u)=>{try{const x=new URL(u.replaceAll('\\/','/').replaceAll('\\u002F','/').replaceAll('\\u0026','&'),url);const p=x.pathname.toLowerCase();let t='';if(/\.(jpe?g|png|webp|gif|avif)$/.test(p))t='image/'+(p.match(/\.(\w+)$/)?.[1]||'jpeg').replace('jpg','jpeg');else if(/\.(mp4|webm|mov|m4v)$/.test(p))t='video/mp4';else if(/\.(mp3|m4a|wav|ogg|opus)$/.test(p))t='audio/mpeg';if(t)items.push({url:x.toString(),type:t,name:`media-${items.length+1}.${t.split('/')[1].replace('jpeg','jpg')}`})}catch{}};
    for(const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:video(?::url)?|og:image)["'][^>]+content=["']([^"']+)["']/gi))push(m[1]);
    for(const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+/g))push(m[0]);
    for(const id of ['__UNIVERSAL_DATA_FOR_REHYDRATION__','SIGI_STATE']){
      const m=html.match(new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i'));
      if(m){try{const json=JSON.parse(m[1]);for(const u of findValues(json,['playAddr','downloadAddr','urlList','url','src','srcUrl','imageURL']))push(u)}catch{}}
    }
    const uniqueItems=[];const seen=new Set();for(const x of items){if(!seen.has(x.url)){seen.add(x.url);uniqueItems.push(x)}}
    if(!uniqueItems.length)return res.status(404).json({error:'No public media source found. Direct CDN/media URLs work best.'});
    return res.status(200).json({source:url.hostname,items:uniqueItems.slice(0,35),slideshow:uniqueItems.length>1});
  }catch(e){return res.status(502).json({error:e.message||'Could not resolve URL'})}
}
