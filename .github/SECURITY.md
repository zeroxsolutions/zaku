<!--
SCAFFOLD TEMPLATE - fill every <...> and delete these comments.

This is a runbook, not a public vulnerability-disclosure policy. It answers "a
credential just leaked, what now" for the people who work on this repository.
If this product ever goes public and takes outside reports, add a reporting
section above the runbook - do not replace the runbook with one.

Written against the scaffold's option sets. Delete the options this product did
not select; the choices are recorded in AGENTS.md.
-->

# Security

## Reporting

Report a suspected credential leak or vulnerability to <security contact>.
Do not open a public issue for it, and do not paste the credential into the
report - reference where it appeared instead.

## What counts as a leak

A credential that reached any of these is compromised and must be rotated, even
if the exposure was brief and even if it was reverted:

- a commit, a pull request, or any git history - including a force-pushed or
  deleted branch, which remains reachable
- a log line, a build log, or an error report
- an issue, a pull-request body, or a chat message
- a third-party service that was not supposed to receive it

Reverting a commit does not undo the exposure. Rotate first, tidy history after.

## Rotation runbook

Work top to bottom. Rotate at the source before touching any configuration -
re-setting a value that is still valid at the provider changes nothing.

### 1. Identify what leaked

Credentials this workspace can hold, by owner:

| Credential | Held by | Notes |
|---|---|---|
| Cloud platform API token and account id | deploy pipeline, and the migration environment file | broadest blast radius - rotate first |
| Auth provider secret key `<Clerk \| Firebase \| other>` | the edge gateway worker | rotating invalidates server-side verification until redeployed |
| Database credential `<Postgres direct URL \| database id + platform token>` | the migration environment file | the migration connection is a superset of runtime access |
| Registry token for the private package scope | publishing pipelines in the library repositories | read is anonymous here; only publishing needs auth |
| `<any product-specific integration secret>` | `<owner>` | |

### 2. Rotate at the source

Issue a new credential in the provider's console and revoke the old one. Revoke
explicitly - do not rely on the new one displacing it.

### 3. Re-set it where it is consumed

- **Worker secrets** - `wrangler secret put <NAME> --env <env>`, once per
  environment. Never move a secret into the worker's plain configuration
  variables; those ship in clear text with the deployment.
- **Terraform-managed secrets** - update the secret manager or the untracked
  variables file, then apply. Never commit the raw value; committed
  configuration references the produced id, never the credential.
- **Local development** - update the worker's ignored local variables file so it
  mirrors the deployed secrets. It is never committed.
- **Migration credentials** - update the single ignored environment file at the
  workspace root that the migration target sources.

### 4. Redeploy and verify

Redeploy the workers that consume the rotated secret and confirm the affected
path works. A worker keeps its old secret until it is redeployed.

### 5. Assess exposure

Check the provider's audit log for use of the old credential between exposure
and revocation. Record what you find, including "no use observed" - absence of
evidence is worth writing down.

### 6. Clean up history

Only after rotation. A credential in git history stays reachable through forks,
clones, and caches, so rewriting history reduces future copying but never
un-leaks the value. Rotation is the fix; cleanup is hygiene.

## Keeping credentials out

- Secrets go to the secret store or the infrastructure tooling - never to a
  worker's plain configuration variables, never to a committed file.
- Ignored patterns cover the local variables and environment files. Do not add
  an exception to commit one "just this once".
- Logs carry structured, safe fields only. Never log a token, an identity, or a
  full request body - a logged credential outlives the request in the log sink.
- Configuration references a provisioned resource id, never a raw connection
  string or key.
- Infrastructure state carries secret values: keep it in the remote backend and
  never commit a local state file.
