<!--
Lint, build, test, secret-scanning and project scaffolding are already hard-gated
by the pre-push hook and the PreToolUse hooks - a branch that failed them could
not be pushed. This template therefore asks only for what no gate can check.
-->

## Change

<!-- What this implements and why, in one or two lines. -->

## Doctrine audit

<!-- Required by `landing-a-change`: map the staged diff against the skills that
     govern the paths it touches and state the result - the commit-time reminder names
     them, and `reviewing-a-diff` says what counts as a finding. "Compliant" is a
     valid answer; so is a list of what you fixed. An empty section means the audit
     did not happen. -->

## Risk surface

<!-- Tick only what this diff actually touches, and add one line of detail for
     each ticked item. An untouched box is the useful signal. -->

- [ ] Infrastructure (`iac/`) - a resource is added, changed, or removed
- [ ] Database schema or a migration
- [ ] Client-facing contract - a wire shape, route, or the emitted OpenAPI document
- [ ] A shared/published package's public surface
- [ ] Deployment config, bindings, or secrets
- [ ] None of the above

Detail:

## Notes for the reviewer

<!-- Optional: what you are unsure about, what you deliberately left out, or the
     one place you would look first if this broke. -->
