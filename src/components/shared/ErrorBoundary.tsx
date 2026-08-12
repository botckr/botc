import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6">
            <h2 className="text-2xl font-black text-rose-500 uppercase tracking-tighter">시스템 오류 발생</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              화면을 불러오는 중 예기치 않은 오류가 발생했습니다.<br/>
              네트워크 문제이거나 일시적인 오류일 수 있습니다.
            </p>
            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left overflow-auto">
                 <p className="text-xs text-rose-400 font-mono break-all">
                    {this.state.error.message}
                 </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-sky-500 text-slate-950 hover:bg-sky-400 font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 mt-4"
            >
              새로고침 (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
