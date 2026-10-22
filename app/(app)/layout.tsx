import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ContentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error inside <main>:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.fallbackKey !== this.props.fallbackKey && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 h-full min-h-[360px] items-center justify-center p-6 select-none">
          <div className="flex flex-col items-center max-w-md text-center p-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#1A1A21] shadow-lg space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ocorreu um erro ao carregar esta tela
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8E92A2] leading-relaxed">
                {this.state.error?.message || 'Houve uma falha inesperada na renderização deste módulo.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Tentar Novamente</span>
              </button>
              <a
                href="/perfis"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-50 dark:hover:bg-[#2A2B36] transition-colors"
              >
                <Home size={13} />
                <span>Ir para Perfis</span>
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <TooltipProvider delay={150}>
      <div className="flex h-screen w-screen overflow-hidden bg-[#ECEBE7] dark:bg-[#0A0A0E] text-[#1B1A18] dark:text-[#F1F1F4] transition-colors duration-150 select-none">
        {/* Sidebar global */}
        <Sidebar />

        {/* Main viewport */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          {/* Header superior */}
          <Header />

          {/* Content area otimizada para usabilidade, dimensões flexíveis e contenção de scroll */}
          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            aria-label="Conteúdo Principal"
            className="relative flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-4.5 bg-transparent focus:outline-none [scrollbar-width:thin] select-text"
          >
            <ContentErrorBoundary fallbackKey={location.pathname}>
              <Outlet />
            </ContentErrorBoundary>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
