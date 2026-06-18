import { Button } from "@workspace/ui/components/shadcn/button";
import { AlertTriangleIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** `"strip"` (default): renders a visible "Chat is unavailable" bar with a
   *  reload button. `"silent"`: renders nothing on error — useful for the
   *  popup/fullscreen body, where vanishing the body is fine because the
   *  bar's strip already tells the user. */
  fallback?: "strip" | "silent";
}

interface State {
  error: Error | null;
}

/**
 * Scopes chat-dock crashes to the dock itself so a `useAgentChat` /
 * `useAgent` blowup doesn't take down the surrounding project view via
 * TanStack Router's outer CatchBoundary. We mount one of these around
 * the dock body (silent fallback) and another around the dock bar
 * (visible strip with a reload button); both share `DockProvider` state.
 */
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
