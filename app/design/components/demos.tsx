"use client";

import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// One provider for every tooltip, so moving between them skips the delay.
export function DemoProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}

const categories = [
  { value: "prep", label: "Prepositions", dot: "bg-c-prep" },
  { value: "accord", label: "Agreement", dot: "bg-c-accord" },
  { value: "conj", label: "Conjugation", dot: "bg-c-conj" },
  { value: "ortho", label: "Spelling", dot: "bg-c-ortho" },
];

export function ButtonDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Check fix</Button>
        <Button variant="outline">Skip</Button>
        <Button variant="secondary">Show hint</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="link">See all notes</Button>
        <Button variant="destructive">Delete essay</Button>
        <Button variant="brand">Start mock run</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  );
}

export function KbdDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6 text-ui text-text-2">
      <span className="flex items-center gap-2">
        Check fix <Kbd>Enter</Kbd>
      </span>
      <span className="flex items-center gap-2">
        Look up a word
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </span>
    </div>
  );
}

export function InputDemo() {
  return (
    <div className="grid max-w-sm gap-3">
      <Input placeholder="you@example.com" type="email" aria-label="Email" />
      <Input defaultValue="à Paris" aria-invalid aria-label="Fix" lang="fr" />
      <Input placeholder="Disabled" disabled aria-label="Disabled" />
    </div>
  );
}

export function TextareaDemo() {
  return (
    <Textarea
      className="max-w-lg"
      placeholder="Écrivez votre réponse ici…"
      aria-label="Essay"
      lang="fr"
    />
  );
}

export function ToggleGroupDemo() {
  return (
    <ToggleGroup
      multiple
      variant="outline"
      defaultValue={["prep", "accord"]}
      aria-label="Filter mistakes by category"
    >
      {categories.map((c) => (
        <ToggleGroupItem key={c.value} value={c.value}>
          <span className={`size-2 rounded-full ${c.dot}`} aria-hidden />
          {c.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function TabsDemo() {
  return (
    <div className="grid gap-8">
      <Tabs defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">Section A</TabsTrigger>
          <TabsTrigger value="b">Section B</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="text-ui text-text-2">
          A short news article.
        </TabsContent>
        <TabsContent value="b" className="text-ui text-text-2">
          An argued letter.
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="all">
        <TabsList variant="line">
          <TabsTrigger value="all">All essays</TabsTrigger>
          <TabsTrigger value="mock">Mock runs</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export function TooltipDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Skip</TooltipTrigger>
        <TooltipContent>
          Skip this mistake <Kbd>S</Kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Show answer
        </TooltipTrigger>
        <TooltipContent>Available after two tries</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Rule details
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Il faut que + subjonctif</PopoverTitle>
          <PopoverDescription>
            After “il faut que”, the verb takes the subjunctive: il faut que tu
            <em> viennes</em>, not <em>viens</em>.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Essay actions
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          Retake as mock run <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem>Export as text</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete essay</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Submit essay</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit for correction?</DialogTitle>
          <DialogDescription>
            You wrote 214 words in 31 minutes. You can’t edit the essay after
            this.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep writing
          </DialogClose>
          <DialogClose render={<Button />}>Submit</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Leave mock run
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the mock run?</AlertDialogTitle>
          <AlertDialogDescription>
            The timer keeps running, as it would in the real exam. Your draft is
            saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Open notes
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>3 · Agreement</DrawerTitle>
          <DrawerDescription>
            “Les filles sont venu”: the past participle agrees with the subject
            after être. You’ve made this mistake 4 times before.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pt-2">
          <Input defaultValue="venues" aria-label="Your fix" lang="fr" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function CommandDemo() {
  return (
    <Command className="max-w-sm rounded-xl border">
      <CommandInput placeholder="Look up a word…" />
      <CommandList>
        <CommandEmpty>No entries found.</CommandEmpty>
        <CommandGroup heading="Dictionary">
          <CommandItem>
            dépendre <CommandShortcut>verb</CommandShortcut>
          </CommandItem>
          <CommandItem>
            le télétravail <CommandShortcut>noun</CommandShortcut>
          </CommandItem>
          <CommandItem>
            néanmoins <CommandShortcut>adverb</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Conjugation">
          <CommandItem>venir · subjonctif</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function ProgressDemo() {
  return (
    <Progress value={31} className="max-w-sm">
      <ProgressLabel>Resolved</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}

export function SkeletonDemo() {
  return (
    <div className="grid max-w-sm gap-2" aria-hidden>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SonnerDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Fix accepted")}>
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Correction failed", { description: "Check your connection and retry." })
        }
      >
        Error toast
      </Button>
    </div>
  );
}

export function SeparatorDemo() {
  return (
    <div className="flex h-5 items-center gap-3 text-ui text-text-2">
      <span>214 words</span>
      <Separator orientation="vertical" />
      <span>31:08</span>
      <Separator orientation="vertical" />
      <span>Est. CLB 6</span>
    </div>
  );
}
