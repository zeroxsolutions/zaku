# shadcn: drawing a screen

What has to survive a swap of design system: which composed example of a screen a web frame takes its
arrangement from, and which classes in that example set each block's alignment.

## The examples of a screen

shadcn publishes composed screens as blocks, at `https://ui.shadcn.com/blocks` and in the registry as
`https://ui.shadcn.com/r/styles/<style>/<block>.json`. A web frame of a kind of screen the blocks cover
takes the arrangement of the block whose layout matches it.

| Blocks                  | Layout                                      | Heading block                                  | Closing lines                    |
| ----------------------- | ------------------------------------------- | ---------------------------------------------- | -------------------------------- |
| `login-01`, `signup-01` | the form in a `Card`                        | `CardHeader` with no class: leading            | `FieldDescription` `text-center` |
| `login-02`, `signup-02` | a bare column beside a cover image          | `flex flex-col items-center gap-1 text-center` | `FieldDescription` `text-center` |
| `login-03`, `signup-03` | a card centred on a muted page              | `CardHeader className="text-center"`           | `FieldDescription` `text-center` |
| `login-04`, `signup-04` | a card split with an image, on a muted page | `flex flex-col items-center gap-2 text-center` | `FieldDescription` `text-center` |
| `login-05`, `signup-05` | a bare centred column                       | `flex flex-col items-center gap-2 text-center` | `FieldDescription` `text-center` |

In every block the labels, the inputs and the buttons stay leading or full width; only the heading
block and the closing lines change alignment, and they keep it at every width. The one breakpoint
change is the logo of `login-02` and `signup-02`: `flex justify-center md:justify-start`, centred below
`md` and leading from it.

Read the block's JSON before relying on a row: the registry is the source, and these rows were read
from the `new-york-v4` style.
