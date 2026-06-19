import { createFileRoute } from "@tanstack/react-router";
import AcceptInvitation from "@/components/organization/invitation/accept-invitation";

export const Route = createFileRoute("/accept-invitation/$id")({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { id } = Route.useParams();
  return <AcceptInvitation invitationId={id} />;
}
