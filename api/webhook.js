export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  const hook=process.env.WEBHOOK_URL;
  if(!hook)return res.status(204).end();
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const files=Array.isArray(body.files)?body.files:[];
    const embed={title:'🧼 Debloater — Media Cleaned',description:'A media item was cleaned and debloated.',color:0x4d8dff,fields:[
      {name:'Source',value:String(body.source||'Local upload').slice(0,1024),inline:true},
      {name:'Watermark',value:body.watermarkRemoval?'Removed / requested':'Not requested',inline:true},
      {name:'Files',value:String(files.length),inline:true},
      ...files.slice(0,8).map(f=>({name:f.name||'cleaned file',value:`${f.type||'media'} · ${f.size||0} bytes\n[Open cleaned file](${f.url})`,inline:false}))
    ],footer:{text:'Debloater'},timestamp:body.timestamp||new Date().toISOString()};
    const response=await fetch(hook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'Debloater',embeds:[embed],allowed_mentions:{parse:[]}})});
    if(!response.ok)throw new Error(`Webhook returned ${response.status}`);
    return res.status(200).json({ok:true});
  }catch(error){return res.status(502).json({error:error?.message||'Webhook failed'})}
}
