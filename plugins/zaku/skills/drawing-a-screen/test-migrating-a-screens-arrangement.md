# Test: migrating a screen whose old drawing aligns it differently from the design system's example

## Prompt

Each run is a fresh `claude -p` session in its own copy of the inputs, a scratch directory with no
memory, no project instructions and no skill named in the prompt, so the skill is reached only through
its description:

```
claude -p "<task>" --model claude-opus-5-5 --plugin-dir <zaku>/plugins/zaku \
  --settings '{"enabledPlugins":{"zaku@zaku":false}}' \
  --allowedTools Read Write Glob Grep Skill WebFetch --output-format stream-json --verbose
```

`<zaku>` is the skill as it stands for RED and the changed copy for GREEN; the control arm passes no
`--plugin-dir`. The settings turn off any zaku the machine has installed, so only the copy under test
loads. `<task>`, verbatim:

```
In this repo the product's design is in docs/design. The Auth feature's Sign in screen, state Default, is being migrated from the old drawing (the map names its source files) to the targets zaku.yaml names. Before anything is drawn, write the layout table that both the drawing and engineering will follow: for each block the map lists, give its horizontal alignment (leading, centred, or full width) and its width on each of the three targets, with one line of reason per decision. Write it to layout.md in this directory. Do not open Figma and change no other file.
```

The scratch paths and the product's name were replaced with placeholders.

## Inputs

`docs/design/zaku.yaml`:

```yaml
product: <product>
preset: <preset>
design-system: shadcn (style base-nova)
figma: { library: <library file key>, product: <product file key> }
targets:
  - { id: web-desktop, family: web, name: Web desktop }
  - { id: web-tablet, family: web, name: Web tablet }
  - { id: web-mobile, family: web, name: Web mobile }
```

`docs/design/map/auth.yaml`:

```yaml
feature: Auth
screens:
  - title: Sign in
    route: /sign-in
    states: [Default, Error]
    targets: [web-desktop, web-tablet, web-mobile]
    layout:
      web-desktop: two columns; the form column on the left half, a cover photo on the right half
      web-tablet: one column, the form centred in the page at a fixed max width
      web-mobile: one column, full width with 24 px side padding, a back button and a help button at the top
    blocks: [logo, heading "Welcome back" + description "Sign in to keep your trips in sync.", Email field, Password field, "Forgot password?" link, Sign in button, "Or" divider, Continue with Google / Apple / phone buttons, closing lines "New here? Create an account" and "Lost your passport or phone? See what to do"]
    source: [source/sign-in-default-web-desktop.html, source/sign-in-default-web-tablet.html, source/sign-in-default-web-mobile.html]
    components: [Field, Input, Input Group, Button, Separator]
```

`docs/design/source/sign-in-default-web-tablet.html`; the desktop file puts the same column in the left
half of a 1440 x 900 `main` beside a cover image, and the mobile file puts it under a back and a help
button in a 390 x 844 `main` with 24 px padding:

```html
<!-- exported from the old drawing: Sign in / Default / Web tablet -->
<main style="width:768px;height:1024px;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div style="width:320px">
    <img src="logo.svg" alt="<product>" style="display:block" />
    <h1 style="text-align:left;font-size:24px">Welcome back</h1>
    <p style="text-align:left;color:#71717a">Sign in to keep your trips in sync.</p>
    <label>Email</label><input style="width:100%" value="mai.tran@gmail.com" /> <label>Password</label
    ><input style="width:100%" type="password" />
    <a style="display:block;text-align:left">Forgot password?</a>
    <button style="width:100%">Sign in</button>
    <div style="text-align:center">Or</div>
    <button style="width:100%">Continue with Google</button><button style="width:100%">Continue with Apple</button
    ><button style="width:100%">Continue with phone</button>
    <p style="text-align:left">New here? <a>Create an account</a></p>
    <p style="text-align:left">Lost your passport or phone? <a>See what to do</a></p>
  </div>
</main>
```

## Pass criteria

1. The heading block is centred on all three targets.
2. The closing lines are centred on all three targets.
3. The labels and inputs are leading or full width on all three targets.
4. Each block's alignment is the same on the three targets, or the table names the reason it changes.

## RED

Skill arm (the skill as it stands), three runs: every run invoked `zaku:drawing-a-screen` on its own.
Criteria 1 and 2 failed in all three, with the heading block and the closing lines leading, copied
from the old drawing's `text-align:left`; 3 and 4 passed.

Control arm (no zaku), three runs: the same result, criteria 1 and 2 failed in all three.

## GREEN

Three runs against the changed copy: every run invoked `zaku:drawing-a-screen` on its own, read
`drawing-a-screen/references/shadcn.md`, and fetched `https://ui.shadcn.com/r/styles/base-nova/login-02.json`.
All four criteria passed in all three: the heading block and the closing lines centred on every target,
the fields full width, and the logo leading from `md` and centred below it, named as `login-02`'s one
breakpoint change. All three also moved "Forgot password?" into the Password label row, trailing, as
`login-02` does, which no criterion scored.

## Measurements

Model `claude-opus-5-5`, three runs per arm, RED, GREEN and control. Skill invocation, files read and
fetches read off each run's stream-json log.

An earlier round handed the skill's body to the skill arm in the prompt instead: RED failed 1 and 2 in
all three skill runs and all three control runs, and GREEN passed all four in three runs. It was
replaced by the round above because it could not show whether a reader reaches the skill unasked, and
its GREEN runs could fetch while its RED runs could not.

## Limitations

No run drew in Figma: the scenario scores the layout the drawing would follow, written before it. No
native target was in the scenario, so the platform half of the rule had no run.
