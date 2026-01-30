import React from 'react';

export default class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Boundary caught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-6 text-slate-900 overflow-auto">
                    <div className="max-w-xl w-full bg-rose-50 border border-rose-200 rounded-xl p-8 shadow-2xl">
                        <h1 className="text-2xl font-bold text-rose-700 mb-4">Application Crash</h1>
                        <p className="mb-4 text-slate-700">The application encountered a critical error and cannot continue.</p>

                        <div className="bg-white p-4 rounded border border-slate-300 overflow-x-auto mb-6 text-xs font-mono">
                            <div className="font-bold text-rose-600 mb-2">{this.state.error && this.state.error.toString()}</div>
                            <div className="text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors w-full"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
