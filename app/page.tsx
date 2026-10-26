// PROTO:landing — start. The marketing-page prototype (app/proto/landing)
// mounted at / for review. Once a variant is picked, delete this block and
// app/proto/landing, and restore what was here:
//
//   import { redirect } from "next/navigation";
//
//   // Ink is Home and the essay; Home lives at /home.
//   export default function RootPage() {
//     redirect("/home");
//   }
import { Harness } from "./proto/landing/harness";

export default function RootPage() {
  return <Harness />;
}
// PROTO:landing — end
