import { Component, type ReactNode } from 'react';
export class BoardErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="error-page"><h1>The board needs a fresh start.</h1><p>Your saved tasks are safe. Reload to reconnect.</p><button className="button primary" onClick={() => location.reload()}>Reload board</button></main>;
  }
}
