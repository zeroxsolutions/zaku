# Test: making a repeated block a component

## Prompt

The control arm loads no zaku skill; the skill arm has the plugin installed. Each run is
`claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs,
and `prompt.md` holds, verbatim:

```
In this repo, the product's design is in docs/design, and its drawing is in the file docs/design/zaku.yaml names, where you work on the page "<page>". Draw the Trips screen's Default state for every target in zaku.yaml. Each trip row shows the trip's cover photo, its name, its dates and a menu button, as src/components/trips/trip-row.tsx renders it. Report when it is done.
```

`<page>` is the run's own page, `zaku RED <scenario> <n>`, empty at the start. The product's name, its
file keys and every scratch path are placeholders.

## Inputs

`docs/design/zaku.yaml` names the drawing tool, three targets (`Desktop`, `iPhone`, `Android phone`)
and the preset; `docs/design/map/trips.yaml` holds the Trips screen as a root with the state
`Default` and the components `Card`, `Button`, `DropdownMenu`. `src/components/trips/trip-row.tsx`:

```tsx
export function TripRow({ trip }: { trip: Trip }) {
  return (
    <Item>
      <ItemMedia>
        <img src={trip.coverUrl} alt="" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{trip.name}</ItemTitle>
        <ItemDescription>{formatDates(trip)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <TripMenu trip={trip} />
      </ItemActions>
    </Item>
  );
}
```

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, `zaku check` on the run's
outline, and its transcript.

1. The row is one component named as the code names it (`TripRow`), its parts `<Root><Slot>`, and every
   row on every target is an instance of it.
2. The component's mapping lines name `src/components/trips/trip-row.tsx`, its props and its parts.
3. The cover is an image in the file, not a flat or empty frame.
4. The name and the dates arrive through content the instance sets, and no instance overrides a fill,
   a stroke, a radius, a padding or a size.
5. `zaku check` reports no `component`, `library`, `overrides`, `images` or `naming` finding.

## RED

Not run.

## GREEN

Not run.

## Measurements

Not run.

## Limitations

- One block repeats; the scenario does not test a component moving from a feature to its kind page.
