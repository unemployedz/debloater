import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

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
      return (
        <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#05070d',color:'#f4f7ff',fontFamily:'system-ui,-apple-system,sans-serif',padding:'24px',boxSizing:'border-box'}}>
          <div style={{width:'min(680px,100%)',border:'1px solid rgba(120,160,255,.22)',borderRadius:'18px',padding:'28px',background:'rgba(10,15,28,.94)',boxShadow:'0 20px 80px rgba(0,0,0,.45)'}}>
            <div style={{fontSize:'12px',letterSpacing:'.18em',color:'#7fa7ff',marginBottom:'10px'}}>DEBLOATER ERROR</div>
            <h1 style={{margin:'0 0 10px',fontSize:'24px'}}>The app hit a startup error.</h1>
            <p style={{margin:'0 0 18px',color:'#9aa9c2'}}>The page is running, but a JavaScript component failed. This error is shown instead of a blank screen so it can be diagnosed.</p>
            <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:0,padding:'14px',borderRadius:'10px',background:'#02040a',color:'#ffb4b4',fontSize:'12px'}}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => location.reload()} style={{marginTop:'18px',border:0,borderRadius:'10px',padding:'10px 15px',background:'#4f83ff',color:'#fff',fontWeight:700,cursor:'pointer'}}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
