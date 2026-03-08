import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { AlertCircle } from "lucide-react";

export function InvitationError() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-destructive text-xl">
            Invitation Error
          </CardTitle>
        </div>
        <CardDescription>
          There was an issue with your invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground text-sm">
          The invitation you&apos;re trying to access is either invalid or you
          don&apos;t have the correct permissions. Please check your email for a
          valid invitation or contact the person who sent it.
        </p>
      </CardContent>
      <CardFooter>
        <Link className="w-full" to="/">
          <Button className="w-full" variant="outline">
            Go back to home
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
