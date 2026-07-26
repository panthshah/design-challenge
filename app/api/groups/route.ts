import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createGroup,
  QuorumError,
  readSession,
} from "@/lib/quorum-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = readSession(request);

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const snapshot = await createGroup(session.id, payload);
    const response = NextResponse.json(snapshot, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
    return attachSessionCookie(response, request, session);
  } catch (error) {
    const status = error instanceof QuorumError ? error.status : 500;
    const message =
      error instanceof QuorumError
        ? error.message
        : "Quorum could not create the group.";
    const response = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
    return attachSessionCookie(response, request, session);
  }
}
