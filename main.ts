// post-x-promote-make-your-own-bounty-01
// Node 22, standard library only, no network.
// Reads POST.json, validates the entry, prints a one-line summary.
// Refuses a placeholder POST.json so a placeholder can never be submitted.

import { readFileSync } from "node:fs";

const POST_URL_RE = /^https:\/\/x\.com\/WuYuanJie17\/status\/(\d+)$/;
const PLAY_CODES = [
  "makefun-corn-gull-keel",
  "makefun-beetle-chowder-windsock",
  "makefun-radar-chisel-chimney",
  "makefun-anchor-nozzle-coconut",
];
const SPONSOR_LINK = "https://make.fun/sponsor/new";
const PROMOTED_POST = "https://x.com/makefunai/status/2124915864336236646";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(new URL("./POST.json", import.meta.url), "utf8");
} catch {
  fail("POST.json not found next to main.ts");
}

let post;
try {
  post = JSON.parse(raw);
} catch {
  fail("POST.json is not valid JSON");
}

if (typeof post !== "object" || post === null || Array.isArray(post)) {
  fail("POST.json must be a JSON object");
}

// A placeholder URL is not a real post: refuse it loudly.
if (typeof post.url !== "string" || post.url.includes("PLACEHOLDER")) {
  fail("POST.json still holds a placeholder URL — post on X first, then fill in the real status URL");
}

const match = POST_URL_RE.exec(post.url);
if (!match) {
  fail(`post url must match https://x.com/WuYuanJie17/status/<digits>, got: ${post.url}`);
}

// Real X status ids are long (19 digits); a short id is a typo or a fake.
if (match[1].length < 10) {
  fail(`status id looks too short to be a real X post: ${match[1]}`);
}

if (!PLAY_CODES.includes(post.play_code)) {
  fail(`play_code must be one of ${PLAY_CODES.join(", ")}, got: ${post.play_code}`);
}

if (post.sponsor_link !== SPONSOR_LINK) {
  fail(`sponsor_link must be ${SPONSOR_LINK}, got: ${post.sponsor_link}`);
}

if (post.promoted_post !== PROMOTED_POST) {
  fail(`promoted_post must be ${PROMOTED_POST}, got: ${post.promoted_post}`);
}

console.log(
  `entry OK: post https://x.com/WuYuanJie17/status/${match[1]} | play code ${post.play_code} | promotes ${PROMOTED_POST} | sponsor ${SPONSOR_LINK}`,
);
