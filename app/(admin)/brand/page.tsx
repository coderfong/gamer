import { redirect } from "next/navigation";

// Brand management moved to the multi-brand dashboard at /brands. The single
// /brand entry now just forwards there.
export default function BrandIndexPage() {
  redirect("/brands");
}
