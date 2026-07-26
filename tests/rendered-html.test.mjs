import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the five-stage consensus journey", async () => {
  const page = await source("app/prototype/page.tsx");

  for (const label of [
    "Collect options",
    "Private affordability",
    "Private favorite",
    "Approve my share",
    "Booked for everyone.",
  ]) {
    assert.match(page, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(page, /Choose as my favorite/);
  assert.match(page, /Works for me/);
  assert.match(page, /Too much/);
  assert.doesNotMatch(page, /Pick this option/);
});

test("persists shared state without exposing another member's answers", async () => {
  const [schema, server, migration] = await Promise.all([
    source("db/schema.ts"),
    source("lib/quorum-server.ts"),
    source("drizzle/0000_giant_blue_blade.sql"),
  ]);

  for (const table of [
    "quorum_groups",
    "quorum_members",
    "quorum_options",
    "quorum_review_rounds",
    "quorum_comfort_responses",
    "quorum_favorite_votes",
    "quorum_payment_authorizations",
  ]) {
    assert.match(schema, new RegExp(table));
    assert.match(migration, new RegExp(table));
  }

  assert.match(server, /session_id/);
  assert.match(server, /myComfort/);
  assert.match(server, /affordabilityFinished/);
  assert.doesNotMatch(server, /otherMembersComfort|allComfortResponses/);
  assert.match(server, /NOT EXISTS \(\s*SELECT 1 FROM quorum_payment_authorizations/);
});
