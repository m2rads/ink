import { Landing } from "./landing/landing";

// The landing page (AGENTS.md, Landing page), public. A signed-in visitor is
// sent to Home by proxy.ts before this renders.
export default function RootPage() {
  return <Landing />;
}
