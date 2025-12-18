import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Simple Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
          <div style={{background: 'white', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '2rem', maxWidth: '28rem'}}>
            <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '1rem'}}>Oops! An Error Occurred</h1>
            <p style={{color: '#4b5563', marginBottom: '1rem'}}>{this.state.error?.message || 'Unknown error'}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{width: '100%', padding: '0.5rem', background: '#059669', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}
            >
              Refresh Page
            </button>
            <p style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem'}}>Check browser console for details.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for caching and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Millionaires-Club/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed:', err));

    // Listen for cache updates
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'CACHE_UPDATED') {
        console.log('Cache has been updated. Refresh to see latest version.');
        // You can show a notification to user here if desired
      }
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);