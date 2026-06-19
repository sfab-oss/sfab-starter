import { Button } from "@workspace/ui/components/shadcn/button";
import { AlertTriangleIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: "strip" | "silent";
}

interface State {
  error: Error | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ChatErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    if (this.props.fallback === "silent") {
      return null;
    }
    return (
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-t bg-background px-3 text-sm">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
          <span className="truncate">
            Chat is unavailable. Reload to try again.
          </span>
        </div>
        <Button onClick={this.reset} size="sm" variant="outline">
          Reload chat
        </Button>
      </div>
    );
  }
}
