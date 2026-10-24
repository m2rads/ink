import type { Metadata } from "next";

import {
  AlertDialogDemo,
  ButtonDemo,
  CommandDemo,
  DemoProviders,
  DialogDemo,
  DrawerDemo,
  DropdownMenuDemo,
  InputDemo,
  KbdDemo,
  PopoverDemo,
  ProgressDemo,
  SeparatorDemo,
  SkeletonDemo,
  SonnerDemo,
  TabsDemo,
  TextareaDemo,
  ToggleGroupDemo,
  TooltipDemo,
} from "./demos";

export const metadata: Metadata = {
  title: "Components · Ink",
};

type Entry = {
  name: string;
  file: string;
  use: string;
  demo: React.ReactNode;
};

const sections: { id: string; title: string; entries: Entry[] }[] = [
  {
    id: "actions",
    title: "Actions",
    entries: [
      { name: "Button", file: "button.tsx", use: "Check fix, Skip, Submit. Primary is gray; brand is for one emphasis per page.", demo: <ButtonDemo /> },
      { name: "Kbd", file: "kbd.tsx", use: "Keyboard hints in notes and tooltips.", demo: <KbdDemo /> },
    ],
  },
  {
    id: "inputs",
    title: "Inputs & selection",
    entries: [
      { name: "Input", file: "input.tsx", use: "Sign-in, the inline fix input (restyled to sit inside the essay).", demo: <InputDemo /> },
      { name: "Textarea", file: "textarea.tsx", use: "Fallback writing surface until the editor engine is chosen.", demo: <TextareaDemo /> },
      { name: "ToggleGroup", file: "toggle-group.tsx", use: "Margin’s category filter chips.", demo: <ToggleGroupDemo /> },
      { name: "Tabs", file: "tabs.tsx", use: "Section A/B, history filters.", demo: <TabsDemo /> },
    ],
  },
  {
    id: "overlays",
    title: "Overlays",
    entries: [
      { name: "Tooltip", file: "tooltip.tsx", use: "Hints on controls and highlights.", demo: <TooltipDemo /> },
      { name: "Popover", file: "popover.tsx", use: "Rule details on small screens.", demo: <PopoverDemo /> },
      { name: "DropdownMenu", file: "dropdown-menu.tsx", use: "Essay row actions in history.", demo: <DropdownMenuDemo /> },
      { name: "Dialog", file: "dialog.tsx", use: "Submit essay.", demo: <DialogDemo /> },
      { name: "AlertDialog", file: "alert-dialog.tsx", use: "Leave a mock run, delete an essay.", demo: <AlertDialogDemo /> },
      { name: "Drawer", file: "drawer.tsx", use: "Margin’s notes on phones, where the column doesn’t fit.", demo: <DrawerDemo /> },
      { name: "Command", file: "command.tsx", use: "Dictionary lookup in practice runs.", demo: <CommandDemo /> },
    ],
  },
  {
    id: "feedback",
    title: "Feedback & status",
    entries: [
      { name: "Progress", file: "progress.tsx", use: "Mistakes resolved in the correction loop.", demo: <ProgressDemo /> },
      { name: "Skeleton", file: "skeleton.tsx", use: "While the AI correction loads.", demo: <SkeletonDemo /> },
      { name: "Sonner", file: "sonner.tsx", use: "Saved, fix accepted, correction failed.", demo: <SonnerDemo /> },
      { name: "Separator", file: "separator.tsx", use: "App bar meta, menu groups.", demo: <SeparatorDemo /> },
    ],
  },
];

// Ours to build: the product lives here, so these never come from shadcn.
const native = [
  "Essay editor",
  "Prompt card",
  "Timer",
  "Word count",
  "Lookup panel (on Command)",
  "App bar",
  "<Correction> and its parts: Filters, Paragraph, Mark, FixInput, Notes, Note, Feedback",
  "Category tag",
  "Correction summary",
  "Essay history row",
  "Category trend bars",
  "Empty states",
];

export default function ComponentsPage() {
  return (
    <DemoProviders>
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p className="eyebrow text-text-3">Design system</p>
        <h1 className="text-heading mt-2">Components</h1>
        <p className="text-body mt-2 max-w-prose text-text-2">
          The shadcn components Ink uses, restyled to its tokens. Built on Base
          UI, copied into <code className="text-ui">components/ui/</code>. No
          motion yet; that comes in the motion pass.
        </p>

        <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-ui">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-text-2 underline decoration-border-strong underline-offset-4 hover:text-text hover:decoration-current"
            >
              {s.title}
            </a>
          ))}
          <a
            href="#native"
            className="text-text-2 underline decoration-border-strong underline-offset-4 hover:text-text hover:decoration-current"
          >
            Built natively
          </a>
        </nav>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-14 scroll-mt-8">
            <h2 className="eyebrow text-text-3">{section.title}</h2>
            <div className="mt-4 divide-y border-y">
              {section.entries.map((entry) => (
                <div
                  key={entry.name}
                  className="grid gap-4 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8"
                >
                  <div className="text-caption text-text-3">
                    <h3 className="text-label font-medium text-text">{entry.name}</h3>
                    <code className="mt-1 block">{entry.file}</code>
                    <p className="mt-1">{entry.use}</p>
                  </div>
                  <div className="min-w-0">{entry.demo}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section id="native" className="mt-14 scroll-mt-8">
          <h2 className="eyebrow text-text-3">Built natively · not from shadcn</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2 border-y py-6 text-ui text-text-2 sm:grid-cols-2">
            {native.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      </main>
    </DemoProviders>
  );
}
