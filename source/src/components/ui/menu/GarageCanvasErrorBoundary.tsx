import {Component,type ReactNode,type ErrorInfo} from 'react';
interface GarageErrorBoundaryProps {
  children: ReactNode;
}

interface GarageErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class GarageCanvasErrorBoundary extends Component<
  GarageErrorBoundaryProps,
  GarageErrorBoundaryState
> {
  public override state: GarageErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): GarageErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '3D Preview unavailable on this device',
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn('[GarageCanvasErrorBoundary] Suppressed 3D preview error in Garage:', error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '16px',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🏎️</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171' }}>
            3D Preview Unavailable
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', maxWidth: '240px' }}>
            GPU memory limit or context lost. Vehicle can still be equipped and raced.
          </span>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: null })}
            style={{
              marginTop: '6px',
              padding: '4px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Retry 3D View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


