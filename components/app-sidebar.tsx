"use client";

import { PenLineIcon } from "lucide-react";
import Link from "next/link";

import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { essayHref, essayTitle, useEssays, useStartEssay } from "@/lib/essays";

// shadcn's AppSidebar, cut down to what Ink needs: the logo, New essay right
// under it, and every essay as one flat list, most recently edited first.
// The page's primary action lives on the page, so New essay here is outline.

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const essays = useEssays();
  const startEssay = useStartEssay();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/home" />}>
              <span className="size-4 shrink-0 rounded-full bg-brand" aria-hidden />
              <span className="font-medium">Ink</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button variant="outline" onClick={startEssay} className="w-full justify-start">
          <PenLineIcon />
          New essay
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Essays</SidebarGroupLabel>
          <SidebarMenu>
            {essays === null ? (
              ["80%", "62%", "74%", "55%"].map((width) => (
                <SidebarMenuItem key={width}>
                  <SidebarMenuSkeleton width={width} />
                </SidebarMenuItem>
              ))
            ) : essays.length === 0 ? (
              <p className="px-2 py-1.5 text-label text-text-3">No essays yet</p>
            ) : (
              essays.map((essay) => (
                <SidebarMenuItem key={essay.id}>
                  <SidebarMenuButton render={<Link href={essayHref(essay.id)} />}>
                    <TruncateWords
                      text={essayTitle(essay)}
                      lang="fr"
                      className={essay.title.trim() ? undefined : "text-text-3"}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
