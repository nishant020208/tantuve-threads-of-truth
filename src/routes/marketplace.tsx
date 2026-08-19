import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — verified GI handloom textiles | Tantuve" },
      {
        name: "description",
        content:
          "Shop handloom textiles listed by verified retailers, each with a public authenticity report and GI-registered weaver.",
      },
      { property: "og:title", content: "Marketplace — verified GI handloom textiles" },
      {
        property: "og:description",
        content: "Buy handloom pieces whose provenance you can check before you pay.",
      },
    ],
  }),
  component: Marketplace;
});

function Marketplace() {
  return null;
}
