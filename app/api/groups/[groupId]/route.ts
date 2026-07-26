import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  getGroupSnapshot,
  joinGroup,
  performGroupAction,
  QuorumError,
  readSession,
} from "@/lib/quorum-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

function groupResponse(
  request: NextRequest,
  session: { id: string; created: boolean },
  body: unknown,
  status = 200,
) {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  return attachSessionCookie(response, request, session);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = readSession(request);

  try {
    const { groupId } = await context.params;
    const snapshot = await getGroupSnapshot(groupId, session.id);
    return groupResponse(request, session, snapshot);
  } catch (error) {
    const status = error instanceof QuorumError ? error.status : 500;
    const message =
      error instanceof QuorumError
        ? error.message
        : "Quorum could not load this group.";
    return groupResponse(request, session, { error: message }, status);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = readSession(request);

  try {
    const { groupId } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const snapshot =
      payload.action === "join"
        ? await joinGroup(groupId, session.id, payload)
        : await performGroupAction(groupId, session.id, payload);
    return groupResponse(request, session, snapshot);
  } catch (error) {
    const status = error instanceof QuorumError ? error.status : 500;
    const message =
      error instanceof QuorumError
        ? error.message
        : "Quorum could not update this group.";
    return groupResponse(request, session, { error: message }, status);
  }
}
