---
name: Release checklist
about: Runbook for one deploy. Open one per release and tick as you go.
title: 'Release: <env> <short-sha>'
---

<!--
A Markdown template, not a form, on purpose: a form captures input at creation
time, and this needs to land as an unticked checklist you work through over
minutes or hours.

Every item below is a step CI leaves to a person. CI owns timing only - it never
applies infrastructure, never provisions a secret, and never creates a route.
Delete an item that does not apply to this deploy rather than leaving it
ambiguous.
-->

## What is shipping

- **Environment:**
- **Commit SHA:** <!-- the SHA, never a branch name - a promotion ships the exact commit the lower environment validated -->
- **Included:** <!-- change names, or the diff range -->

## Before the deploy

- [ ] The gate is green on **this SHA**, not on a later branch tip
- [ ] Schema migrations, if any, are generated and committed
- [ ] Secrets this release newly needs are provisioned **for this environment** (human step - CI cannot do it)
- [ ] Infrastructure is applied for anything new that must exist before code runs: a worker identity, a database, a queue, a bucket
- [ ] For a promotion: the environment below already deployed this same SHA successfully

## Deploy

- [ ] Deployed the **whole topology as one unit**, not a subset - workers are coupled at runtime by bindings and queues, which the build graph does not model
- [ ] Migrations applied to this environment's database(s)

## After the deploy

- [ ] Second-pass infrastructure apply for anything that requires an already-deployed worker - routes, custom domains, cron triggers, queue consumers
- [ ] Smoke check: the public entry point answers, and one path that exercises a changed service
- [ ] Observability shows no new error class since the deploy

## If it fails part-way

A partial deploy is **recoverable by re-running for the same commit** - the
deploy is idempotent for a given SHA. Reverting the merge does not fix a partial
deploy; it produces a different SHA and leaves the already-deployed workers on
the old one.

- [ ] Re-ran for the same SHA
- [ ] If it is still broken, recorded what failed here before closing this issue

## Notes
