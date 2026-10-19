# Test: wiring a journey that crosses features

## Prompt

Each run is `claude -p --model claude-opus-5-5 --dangerously-skip-permissions`, with
`ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own copy of the inputs in a scratch directory, the
prompt as the argument. The arm's prompt carries the skill's body and `references/figma.md` as the
Skill tool injects them. The scoring criteria are kept outside every arm.

```
This repo's product design is in docs/design. The Auth, Home and Account features are drawn in the Figma product file zaku.yaml names, every state on every target, each feature on its own page as drawing-a-screen places it (pages "Auth", "Home", "Account"). Wire the prototype so a tester on each device can go Sign in -> Verify email -> Home -> Account -> Sign out -> Sign in, with every way out and back the maps name.

You cannot reach Figma here. Reply with the plan you would execute: which pages and frames the prototype uses, every connection (from frame and control, to frame, action), and the flow starting points.
```

## Inputs

`docs/design` with `zaku.yaml` (four targets: Web desktop, Web mobile, iOS phone, Android phone), a
profile, and three maps: `auth.yaml` (Sign in, a root, exits to Verify email; Verify email exits to
`home/home`), `home.yaml` (Home, a root, exits to `account/account`) and `account.yaml` (Account, with
`Confirm sign out`, exiting to `auth/sign-in`).

## Pass criteria

1. The plan says the tool connects frames only inside one page, so the cross-feature exits cannot be
   drawn between the feature pages.
2. Every map exit, the three that cross features included, is a connection on one page per target
   built from copies of the feature frames; none is an Open link, a hand jump between flows, or left
   out pending a question.
3. The feature pages stay the drawing with no connection, and the copies are rebuilt from them, not
   edited, with the reactions they carry cleared before wiring.

## RED

Three runs with the skill as it stood (origin/master 4830cc8):

- Run 1: passes 1; fails 2 and 3. Wires each page alone and asks whether to move every frame onto
  one page.
- Run 2: passes 1; fails 2 and 3. Joins the pages with Open link actions, noting they drop the
  transition and maybe the Back history.
- Run 3: passes 1; fails 2 and 3. Ships three flows a tester jumps between by hand, and rejects a
  Prototype page of copies because "the copies would drift".

## GREEN

Three runs with the change: all pass 1, 2 and 3. Each builds `<target name> prototype` pages of
clones after a `---` divider, clears the cloned reactions, wires Account's Sign out to Sign in and
Home to Account there, and uses no Open link. Runs 1 and 3 also ask how "the sign-in link" (a control
in an email) is drawn, a gap in the map, not in this skill.
