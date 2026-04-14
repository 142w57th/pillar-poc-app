import { NextRequest } from "next/server";

import { createInvite } from "@/server/auth/invite-repository";
import { withAuthedRoute } from "@/server/http/authed-route";
import { fail, ok } from "@/server/http/response";

type InvitePayload = {
  email?: string;
};

class InviteValidationError extends Error {}

function validateInvitePayload(payload: InvitePayload) {
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new InviteValidationError("A valid email is required.");
  }
  return { email };
}

export const POST = withAuthedRoute(
  async (request: NextRequest) => {
    try {
      const body = (await request.json()) as InvitePayload;
      const { email } = validateInvitePayload(body);
      const result = await createInvite(email);
      return ok(result, result.created ? 201 : 200);
    } catch (error: unknown) {
      if (error instanceof InviteValidationError) {
        return fail("INVITE_FAILED", error.message, 400);
      }

      console.error("[invites/create] Unhandled error:", error);
      return fail("INTERNAL_SERVER_ERROR", "Unable to create invite.", 500);
    }
  },
  { logLabel: "invites/create" },
);
