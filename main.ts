// Entry checker for the "Promote Make-Your-Own-Bounty on X" bounty.
// It reads POST.json next to this file and makes sure the recorded X post,
// play code, sponsor link and promoted original post are all real and
// consistent before the entry goes in. Anything off stops the run.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const folder = dirname(fileURLToPath(import.meta.url));
const postFile = join(folder, "POST.json");

const acceptedCodes: string[] = [
  "makefun-corn-gull-keel",
  "makefun-beetle-chowder-windsock",
  "makefun-radar-chisel-chimney",
  "makefun-anchor-nozzle-coconut",
];

const placeholderMarks: string[] = [
  "placeholder",
  "example",
  "todo",
  "changeme",
  "xxx",
  "your-",
  "insert-",
];

function abort(why: string): never {
  console.error(`CHECK FAILED: ${why}`);
  process.exit(1);
}

function hasPlaceholderMark(text: string): boolean {
  const lowered = text.toLowerCase();
  for (const mark of placeholderMarks) {
    if (lowered.includes(mark)) {
      return true;
    }
  }
  return false;
}

function parseLink(text: string, label: string): URL {
  try {
    return new URL(text);
  } catch {
    abort(`${label} is not a parseable link: ${text}`);
  }
}

function requireLink(value: unknown, label: string): string {
  if (typeof value !== "string") {
    abort(`${label} is missing (expected text, got ${typeof value})`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    abort(`${label} is empty`);
  }
  if (!trimmed.startsWith("https://")) {
    abort(`${label} must begin with https://, got: ${trimmed}`);
  }
  if (hasPlaceholderMark(trimmed)) {
    abort(`${label} still contains a placeholder value: ${trimmed}`);
  }
  return trimmed;
}

function statusNumber(link: string, label: string): string {
  const found = link.match(/\/status\/(\d{10,})/);
  if (found === null) {
    abort(`${label} carries no numeric status id: ${link}`);
  }
  return found[1];
}

function loadRecord(): Record<string, unknown> {
  let text: string;
  try {
    text = readFileSync(postFile, "utf8");
  } catch {
    abort(`cannot read POST.json at ${postFile}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    abort("POST.json is not valid JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    abort("POST.json must contain a single JSON object");
  }
  return parsed as Record<string, unknown>;
}

const entry = loadRecord();

// First, the author's own X post: it must be a real status link on x.com.
const postUrl = requireLink(entry["url"], "post url");
const postParts = parseLink(postUrl, "post url");
if (postParts.hostname !== "x.com" && postParts.hostname !== "twitter.com") {
  abort(`post url must be on x.com, found host ${postParts.hostname}`);
}
const postStatus = statusNumber(postUrl, "post url");
if (!postParts.pathname.includes("/status/")) {
  abort(`post url must point at a status page: ${postUrl}`);
}

// Second, the play code: it must be one of this bounty four codes.
const codeValue = entry["play_code"];
if (typeof codeValue !== "string" || codeValue.trim().length === 0) {
  abort("play_code is missing or empty");
}
const playCode = codeValue.trim();
if (hasPlaceholderMark(playCode)) {
  abort(`play_code still holds a placeholder value: ${playCode}`);
}
if (!playCode.startsWith("makefun-")) {
  abort(`play_code must start with makefun-, got: ${playCode}`);
}
if (!acceptedCodes.includes(playCode)) {
  abort(`play_code ${playCode} is not accepted for this bounty`);
}

// Third, the sponsor link: it must open the make.fun sponsor flow.
const sponsorLink = requireLink(entry["sponsor_link"], "sponsor link");
const sponsorParts = parseLink(sponsorLink, "sponsor link");
if (sponsorParts.hostname !== "make.fun") {
  abort(`sponsor link must point at make.fun, found host ${sponsorParts.hostname}`);
}
if (!sponsorParts.pathname.startsWith("/sponsor")) {
  abort(`sponsor link must open the sponsor flow, found path ${sponsorParts.pathname}`);
}
if (!sponsorParts.pathname.endsWith("/new")) {
  abort(`sponsor link must open the new-sponsor page, found path ${sponsorParts.pathname}`);
}

// Fourth, the promoted original post: a real makefunai status, not our own.
const promotedLink = requireLink(entry["promoted_post"], "promoted post");
const promotedParts = parseLink(promotedLink, "promoted post");
if (promotedParts.hostname !== "x.com" && promotedParts.hostname !== "twitter.com") {
  abort(`promoted post must be on x.com, found host ${promotedParts.hostname}`);
}
if (!promotedParts.pathname.startsWith("/makefunai/status/")) {
  abort(`promoted post must be a makefunai status, found path ${promotedParts.pathname}`);
}
const promotedStatus = statusNumber(promotedLink, "promoted post");
if (promotedStatus === postStatus) {
  abort("promoted post must not be the same status as the author's own post");
}

// Fifth, the post itself must mention the bounty host by handle path.
if (!postParts.pathname.startsWith("/WuYuanJie17/status/")) {
  abort(`post url must belong to the entrant account path, found ${postParts.pathname}`);
}

console.log(
  `VERIFIED: post ${postUrl} (status ${postStatus}) carries play code ${playCode}; ` +
    `sponsor ${sponsorLink} and promoted original ${promotedLink} (status ${promotedStatus}) all check out.`,
);
