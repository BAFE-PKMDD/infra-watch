import assert from "node:assert/strict";
import test from "node:test";

import { cleanAniaAnswer } from "./ania-answer-content";

test("removes redundant ANIA identity, dashboard metadata, and framing from an answer", () => {
  const answer = cleanAniaAnswer(`Data as of 2026-08-14 (Authorized Scope: Full Administrator Portfolio, no active filters).

I am ANIA (Agricultural Network Intelligence Assistant). Across the authorized portfolio, 481 projects are delayed.

Below is the comparative breakdown of delayed-project exposure across regions:

## Comparative observations

**Highest delay volume:** CAR has 111 delayed projects.`);

  assert.doesNotMatch(answer, /Data as of/i);
  assert.doesNotMatch(answer, /Authorized Scope/i);
  assert.doesNotMatch(answer, /I am ANIA/i);
  assert.doesNotMatch(answer, /Below is/i);
  assert.match(answer, /^Across the authorized portfolio, 481 projects are delayed\./);
  assert.match(answer, /## Comparative observations/);
});

test("removes repeated identity before a following data-scope line", () => {
  const answer = cleanAniaAnswer(`I am ANIA (Agricultural Network Intelligence Assistant). Below is the analytical executive brief for the current authorized infrastructure portfolio.

Data as of 2026-08-14 (Authorized Scope: Full Administrator Portfolio, no active filters).

## Executive Summary

The portfolio has 25,909 projects.`);

  assert.equal(answer, "## Executive Summary\n\nThe portfolio has 25,909 projects.");
});
