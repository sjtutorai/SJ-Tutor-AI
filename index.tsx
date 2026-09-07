
import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './components/NotificationContext';
import { StreakProvider } from './components/StreakContext';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple Error Boundary Component to catch crashes
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props to resolve TypeScript errors about property existence
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  // Initialize state in constructor to fix type inference for this.props in certain TypeScript environments
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Directly assigning this.props to satisfy type checkers that may not resolve the base class members correctly
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#FFF5F5', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: '#E53E3E', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#742A2A', maxWidth: '600px', margin: '0 auto 1rem' }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', backgroundColor: '#E53E3E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error guards to suppress opaque third-party script errors from crashing the app
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (!event) return;
    const msg = event.message || (event.error && event.error.message) || '';
    if (msg === 'Script error.' || (!event.filename && !event.lineno)) {
      console.warn('[SJ Tutor AI] Handled external Script error:', event);
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (!event) return;
    const reasonMsg = (event.reason && event.reason.message) || String(event.reason || '');
    if (reasonMsg === 'Script error.' || reasonMsg.includes('Script error')) {
      console.warn('[SJ Tutor AI] Handled unhandled rejection Script error:', event.reason);
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <StreakProvider>
          <App />
        </StreakProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
