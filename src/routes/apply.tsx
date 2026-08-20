import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply as a handloom weaver — Tantuve" },
      {
        name: "description",
        content:
          "Join Tantuve as a GI handloom weaver: register your craft, get verified by the GI authority and issue tamper-evident provenance tags.",
      },
      { property: "og:title", content: "Apply as a handloom weaver — Tantuve" },
      {
        property: "og:description",
        content: "Register your loom and start issuing verifiable provenance tags.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const [form, setForm] = useState({ name: "", region: "", craft_type: "", bio: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { data: registry } = useQuery({
    queryKey: ["gi-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gi_registry")
        .select("craft_type, region, official_description");
      if (error) throw error;
      return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("weavers").insert({
      name: form.name,
      region: form.region,
      craft_type: form.craft_type,
      bio: form.bio || null,
      status: "pending",
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setDone(true);
      toast.success("Application submitted for GI authority review");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl text-primary">Apply as a weaver</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us about your loom and craft. The GI authority reviews every application before
            provenance tags can be issued.
          </p>
          {done ? (
            <div className="mt-8 rounded-md border border-teal/40 bg-card p-6">
              <p className="font-display text-lg text-primary">Application received</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The GI authority will review your craft details against the registry and approve
                your workshop.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="name">Weaver or workshop name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="craft">Craft type</Label>
                <Input
                  id="craft"
                  list="craft-options"
                  value={form.craft_type}
                  onChange={(e) => setForm({ ...form, craft_type: e.target.value })}
                  required
                />
                <datalist id="craft-options">
                  {(registry ?? []).map((r) => (
                    <option key={r.craft_type} value={r.craft_type} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="bio">About your practice</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <Button type="submit" variant="madder" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="font-display text-xl text-primary">GI registry</h2>
          <div className="mt-4 space-y-4">
            {(registry ?? []).map((r) => (
              <div key={r.craft_type}>
                <p className="font-medium text-foreground">
                  {r.craft_type} · <span className="text-muted-foreground">{r.region}</span>
                </p>
                <p className="text-sm text-muted-foreground">{r.official_description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
