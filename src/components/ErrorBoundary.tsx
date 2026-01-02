import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}



export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    console.log("ErrorBoundary render - hasError:", this.state.hasError);

    if (this.state.hasError) {
      console.log("Showing error screen:", this.state.error?.message);

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#ef4444',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          border: '10px solid #ffed00',
          textAlign: 'center',
          zIndex: 10000
        }}>
          ERROR BOUNDARY: {this.state.error?.message}
        </div>
      );
    }

    console.log("ErrorBoundary showing children");
    return this.props.children;
  }
}