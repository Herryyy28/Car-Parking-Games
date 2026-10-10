import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ArenaErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ArenaErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center mb-4 shadow-lg text-3xl">
            🚌
          </div>
          <h2 className="text-xl font-black text-white mb-2">Arena Loading...</h2>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Recovering 3D diorama canvas. Tap below to reload the arena cleanly.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-6 py-3 rounded-2xl bg-gradient-to-b from-[#22c55e] to-[#15803d] border-2 border-white text-white font-black text-sm shadow-xl flex items-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RELOAD ARENA</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
