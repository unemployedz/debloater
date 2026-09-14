function isTikTok(url){
  const h=url.hostname.toLowerCase();
  return h==='tiktok.com'||h.endsWith('.tiktok.com');
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const raw=req.query?.url;
  if(!raw) return res.status(400).json({error:'Missing url'});

  let url;
  try{url=new URL(raw)}catch{return res.status(400).json({error:'Invalid URL'})}

  try{
    if(isTikTok(url)){
      const form=new URLSearchParams({url:url.toString(),hd:'1'});
      const r=await fetch('https://www.tikwm.com/api/',{
        method:'POST',
        headers:{
          'content-type':'application/x-www-form-urlencoded',
          'user-agent':'Mozilla/5.0 (compatible; Debloater/1.0)'
        },
        body:form.toString()
      });
      if(!r.ok) throw new Error(`TikTok resolver returned HTTP ${r.status}`);
      const data=await r.json();
      if(data?.code!==0||!data?.data) throw new Error(data?.msg||'TikTok video could not be resolved');
      const d=data.data;
      const items=[];
      const id=d.id||Date.now();
      const title=(d.title||'TikTok media').replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,90)||'TikTok media';
      const cover=d.cover||d.origin_cover||d.dynamic_cover||null;

      // Only accept TikWM's explicit no-watermark fields. Never fall back to wmplay.
      const video=d.play||d.hdplay;
      if(video){
        items.push({
          url:video,
          type:'video/mp4',
          name:`${title}.mp4`,
          noWatermark:true,
          quality:d.hdplay?'HD':'standard',
          preview:cover,
          title,
          author:d.author?.nickname||d.author?.unique_id||'',
          duration:d.duration||0
        });
      }

      const images=Array.isArray(d.images)?d.images.filter(x=>typeof x==='string'&&/^https?:/i.test(x)):[];
      images.forEach((image,index)=>items.push({
        url:image,
        type:'image/jpeg',
        name:`${title}-${index+1}.jpg`,
        noWatermark:true,
        preview:image,
        title,
        author:d.author?.nickname||d.author?.unique_id||''
      }));

      if(!items.length) throw new Error('TikTok did not return a no-watermark media URL.');
      return res.status(200).json({
        source:'TikTok',
        items,
        slideshow:images.length>0,
        noWatermark:true,
        title,
        author:d.author?.nickname||d.author?.unique_id||'',
        cover
      });
    }

    const direct=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Debloater/1.0)'}});
    const type=direct.headers.get('content-type')||'';
    if(type.startsWith('video/')||type.startsWith('image/')||type.startsWith('audio/')){
      return res.status(200).json({
        source:url.hostname,
        items:[{url:url.toString(),type,name:`download.${type.split('/')[1]||'bin'}`,preview:type.startsWith('image/')||type.startsWith('video/')?url.toString():null}],
        noWatermark:false
      });
    }

    return res.status(400).json({error:'Only public TikTok links and direct media URLs are supported.'});
  }catch(e){
    return res.status(502).json({error:e.message||'Could not resolve URL'});
  }
}
