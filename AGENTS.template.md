# AGENTS.md

<!--
SCAFFOLD TEMPLATE - copy to the repo root as `AGENTS.md`, fill the two sections, delete
this comment.

Almost nothing qualifies. Before adding a line, name the file a reader would open
instead; where one exists, that file is its home and the line does not go here.

| Reached for | Where it already is |
| --- | --- |
| a rule's own constraint, or a slug pointing at one | the rule, which is loaded already - `see <slug>` is a file nobody opens, and it rots into a dead name |
| the environment inputs | the schema that parses them, the platform config that supplies them, and each gitignored file's committed `*.example` sibling |
| the house libraries in use | `package.json` - a dependency that is absent is not in use |
| the bundler, linter, test runner | `nx.json` and any sibling project |
| a departure from a rule, and its cost | a comment at the departure, which is the one place deleting it is visible |

What is left has no other home: what this product is, and which projects exist.

A third heading, `## This project's choices`, is added for what no single file can state -
an interaction between two configs, or something that is missing - one bullet giving what
it is and what it costs. Most repos meet no such case and never add the heading.
-->

<one line: what this product is - who it serves, and what it does for them>.

## Workspace

- `apps/<app>` (+ `<app>-e2e`) - `<its role>`.
- `packages/<lib>` (`@<scope>/<lib>`) - `<its role>`.
- `<standalone root outside the graph, e.g. iac/>` - `<its toolchain>`.
