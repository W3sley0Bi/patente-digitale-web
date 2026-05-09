import { Component, cloneElement } from "react";
import type { ErrorInfo, ReactElement, ReactNode } from "react";

interface Props {
  fallback:
    | ReactElement
    | ((error: Error, reset: () => void) => ReactElement);
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      if (typeof fallback === "function") {
        return fallback(error, this.reset);
      }
      return cloneElement(fallback, { error, onReset: this.reset });
    }

    return children;
  }
}

export default ErrorBoundary;
