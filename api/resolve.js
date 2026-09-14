function isTikTok(url){
  const h=url.hostname.toLowerCase();
  return h==='tiktok.com'||h.endsWith('.tiktok.com');
}

function cleanUrl(value){
  if(typeof value!=='string'||!/^https?:\/\//i.test(value)) return null;
  return value.replaceAll('\\/','/').replaceAll('\\u002F','/').replaceAll('\\u0026','&');
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const raw=req.query?.url;
  if(!raw) return res.status(400).json({error:'Missing url'});

  let url;
  try{url=new URL(raw)}catch{return res.status(400).json({error:'Invalid URL'})}

  try{
    /*
     * TikTok mode intentionally does NOT run FFmpeg watermark removal.
     * We ask TikWM for TikTok's no-watermark rendition and hand that URL
     * straight to the browser, which is the SnapTik-style approach.
     */
    if(isTikTok(url)){
      const api=`https://www.tikwm.com/api/?url=${encodeURIComponent(url.toString())}&hd=1`;
      const r=await fetch(api,{headers:{'user-agent':'Mozilla/5.0 (compatible; Debloater/1.0)'}});
      if(!r.ok) throw new Error(`TikTok resolver returned HTTP ${r.status}`);
      const data=await r.json();
      if(data?.code!==0||!data?.data) throw new Error(data?.msg||'TikTok video could not be resolved');
      const d=data.data;
      const items=[];

      const video=d.play||d.hdplay||d.wmplay;
      if(video){
        items.push({
          url:video,
          type:'video/mp4',
          name:`tiktok-${d.id||Date.now()}.mp4`,
          noWatermark:true,
          quality:d.hdplay?'HD':'standard'
        });
      }

      const images=Array.isArray(d.images)?d.images.filter(x=>typeof x==='string'):[];
      images.forEach((image,index)=>items.push({
        url:image,
        type:'image/jpeg',
        name:`tiktok-${d.id||Date.now()}-${index+1}.jpg`,
        noWatermark:true
      }));

      if(!items.length) throw new Error('TikTok returned no downloadable media.');
      return res.status(200).json({source:'TikTok',items,slideshow:images.length>0,noWatermark:true});
    }

    /* Direct media URLs remain supported. */
    const direct=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Debloater/1.0)'}});
    const type=direct.headers.get('content-type')||'';
    if(type.startsWith('video/')||type.startsWith('image/')||type.startsWith('audio/')){
      return res.status(200).json({
        source:url.hostname,
        items:[{url:url.toString(),type,name:`download.${type.split('/')[1]||'bin'}`}],
        noWatermark:false
      });
    }

    return res.status(400).json({error:'Only public TikTok links and direct media URLs are supported.'});
  }catch(e){
    return res.status(502).json({error:e.message||'Could not resolve URL'});
  }
}
