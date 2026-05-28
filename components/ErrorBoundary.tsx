import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <i className="fas fa-exclamation-triangle text-amber-500 text-4xl mb-4"></i>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar o painel</h1>
            <p className="text-sm text-slate-500 mb-4">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
