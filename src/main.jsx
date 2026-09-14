import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const App = lazy(() => import('./App.jsx'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      const details = [
        `name: ${error?.name || 'UnknownError'}`,
        `message: ${error?.message || '(no message)'}`,
        error?.cause ? `cause: ${String(error.cause)}` : null,
        '',
        String(error?.stack || error)
      ].filter(Boolean).join('\n');
      return (
        <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#05070d',color:'#f4f7ff',fontFamily:'system-ui,-apple-system,sans-serif',padding:'24px',boxSizing:'border-box'}}>
          <div style={{width:'min(760px,100%)',border:'1px solid rgba(120,160,255,.22)',borderRadius:'18px',padding:'28px',background:'rgba(10,15,28,.94)',boxShadow:'0 20px 80px rgba(0,0,0,.45)'}}>
            <div style={{fontSize:'12px',letterSpacing:'.18em',color:'#7fa7ff',marginBottom:'10px'}}>DEBLOATER APP DIAGNOSTIC</div>
            <h1 style={{margin:'0 0 10px',fontSize:'24px'}}>App.jsx failed to start.</h1>
            <p style={{margin:'0 0 18px',color:'#9aa9c2',lineHeight:1.6}}>The exact JavaScript error is shown below so it can be fixed instead of guessed.</p>
            <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:0,padding:'14px',borderRadius:'10px',background:'#02040a',color:'#ffb4b4',fontSize:'12px'}}>{details}</pre>
            <button onClick={() => location.reload()} style={{marginTop:'18px',border:0,borderRadius:'10px',padding:'10px 15px',background:'#4f83ff',color:'#fff',fontWeight:700,cursor:'pointer'}}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#05070d',color:'#8fa2c2',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <div>Loading Debloater…</div>
    </div>
  );
}

window.addEventListener('error', (event) => console.error('Debloater startup error:', event.error || event.message));
window.addEventListener('unhandledrejection', (event) => console.error('Debloater unhandled rejection:', event.reason));

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
