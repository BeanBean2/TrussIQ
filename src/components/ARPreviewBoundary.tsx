import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ARPreviewBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ARPreviewBoundaryState {
  failed: boolean;
}

/** Keep a failed lazy 3D chunk from taking down the rest of the workspace. */
export class ARPreviewBoundary extends Component<ARPreviewBoundaryProps, ARPreviewBoundaryState> {
  state: ARPreviewBoundaryState = { failed: false };

  static getDerivedStateFromError(): ARPreviewBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TrussIQ 3D preview failed to load or render.', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alertdialog" aria-modal="true" aria-labelledby="ar-preview-error-title" className="fixed inset-0 z-50 grid place-items-center bg-surface-950/95 p-6 text-center backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl">
            <h2 id="ar-preview-error-title" className="text-base font-semibold text-surface-100">3D preview didn’t load</h2>
            <p className="mt-2 text-sm leading-6 text-surface-400">The rest of your workspace is still available. Check your connection and reopen the preview, or export the model from the workspace.</p>
            <button type="button" onClick={this.props.onClose} className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface-950 hover:bg-teal-300">Return to workspace</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
