import type { Metadata } from "next";
import { WhaleTeaLoopDemo } from "@/components/site/WhaleTeaLoopDemo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live rewards demo | Gameable Studios",
  description:
    "A live, tappable demo of a branded rewards program: join, collect stamps, unlock a voucher, redeem at the counter, and see the owner dashboard. This is a demo — WhatsApp us to get yours.",
};

// The hardcoded full-loop sales demo (Customer / Staff / Dashboard). Lives on its
// own route so /b/[slug] stays purely the real DB-driven brand game hub.
export default function DemoPage() {
  return <WhaleTeaLoopDemo />;
}
