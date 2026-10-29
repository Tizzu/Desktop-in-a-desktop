import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/** Contiene un errore di rendering: senza, un solo widget rotto bloccherebbe l'intera pagina. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('Errore in un componente:', error);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
