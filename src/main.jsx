import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function StartupTest() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#05070d',color:'#f4f7ff',fontFamily:'system-ui,-apple-system,sans-serif',padding:'24px',boxSizing:'border-box'}}>
      <div style={{width:'min(680px,100%)',border:'1px solid rgba(120,160,255,.22)',borderRadius:'18px',padding:'28px',background:'rgba(10,15,28,.94)',boxShadow:'0 20px 80px rgba(0,0,0,.45)'}}>
        <div style={{fontSize:'12px',letterSpacing:'.18em',color:'#7fa7ff',marginBottom:'10px'}}>DEBLOATER DIAGNOSTIC</div>
        <h1 style={{margin:'0 0 10px',fontSize:'28px'}}>React startup is working.</h1>
        <p style={{margin:0,color:'#9aa9c2',lineHeight:1.6}}>The deployment, Vite bundle, React runtime, and CSS loaded successfully. The next step is to isolate the application component itself.</p>
        <div style={{marginTop:'18px',padding:'12px 14px',borderRadius:'10px',background:'#02040a',color:'#8fa2c2',fontSize:'13px'}}>DIAGNOSTIC: PASS · App.jsx is temporarily not mounted.</div>
      </div>
    </div>
  );
}

window.addEventListener('error', (event) => {
  console.error('Debloater startup error:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Debloater unhandled rejection:', event.reason);
});

createRoot(document.getElementById('root')).render(<StartupTest />);
