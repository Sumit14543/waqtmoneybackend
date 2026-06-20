import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDashboardCrmTimeline } from "./dashboardCrm.js";

test("keeps the latest event per stage and orders stages by CRM progress", () => {
  const timeline = [
    {
      id: 3296,
      stageKey: "disbursed",
      occurredAt: "2026-05-30T06:57:23.000Z",
      progressPercent: 100,
    },
    {
      id: 3052,
      stageKey: "application_received",
      occurredAt: "2026-05-30T06:57:24.000Z",
      progressPercent: 5,
    },
    {
      id: 3055,
      stageKey: "documents_requested",
      occurredAt: "2026-05-30T06:59:58.000Z",
      progressPercent: 25,
    },
    {
      id: 3072,
      stageKey: "documents_requested",
      occurredAt: "2026-05-30T07:44:21.000Z",
      progressPercent: 25,
    },
    {
      id: 3132,
      stageKey: "accounting_handoff",
      occurredAt: "2026-05-30T10:14:36.000Z",
      progressPercent: 85,
    },
    {
      id: 3139,
      stageKey: "disbursed",
      occurredAt: "2026-05-30T10:55:53.000Z",
      progressPercent: 100,
    },
  ];

  const normalized = normalizeDashboardCrmTimeline(timeline);

  assert.deepEqual(normalized.map((item) => item.id), [3052, 3072, 3132, 3139]);
  assert.equal(normalized.at(-1).stageKey, "disbursed");
  assert.equal(normalized.at(-1).progressPercent, 100);
});

test("returns an empty timeline for missing CRM data", () => {
  assert.deepEqual(normalizeDashboardCrmTimeline(null), []);
});
