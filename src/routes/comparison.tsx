import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      {
        title:
          "Memories vs FamilyAlbum vs Cluster: Which Private Photo Sharing App is Best?",
      },
      {
        name: "description",
        content:
          "Compare Memories, FamilyAlbum, and Cluster for private photo sharing. See why Memories stands out with 90-day privacy, invite-only events, and no ads.",
      },
      {
        property: "og:title",
        content:
          "Memories vs FamilyAlbum vs Cluster: Which Private Photo Sharing App is Best?",
      },
      {
        property: "og:description",
        content:
          "Compare the top private photo sharing apps and find the best fit for your family and friends.",
      },
      { property: "og:url", content: "/comparison" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/comparison" }],
  }),
  component: ComparisonPage,
});

function ComparisonPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>

      <article className="mt-6">
        <header>
          <h1 className="font-display text-3xl leading-tight tracking-tight">
            Memories vs FamilyAlbum vs Cluster: Which Private Photo Sharing
            App is Best?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: June 2026
          </p>
        </header>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
          <p>
            Choosing the right <strong>private photo sharing app</strong> can
            be tricky. FamilyAlbum is a household name for parents, Cluster is a
            favourite among close friends, and Memories offers a fresh,
            privacy-first approach. In this guide, we compare the three so you
            can pick the one that fits your needs.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl">Quick comparison</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Feature</th>
                  <th className="px-4 py-3 text-left font-medium">Memories</th>
                  <th className="px-4 py-3 text-left font-medium">
                    FamilyAlbum
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Cluster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Privacy model</td>
                  <td className="px-4 py-3">
                    Invite-only events, no public feed
                  </td>
                  <td className="px-4 py-3">Family-only circles</td>
                  <td className="px-4 py-3">Invite-only groups</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Photo retention</td>
                  <td className="px-4 py-3 font-medium text-primary">
                    Auto-deleted after 90 days
                  </td>
                  <td className="px-4 py-3">Kept indefinitely</td>
                  <td className="px-4 py-3">Kept indefinitely</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Ads</td>
                  <td className="px-4 py-3">None</td>
                  <td className="px-4 py-3">Ad-supported (free tier)</td>
                  <td className="px-4 py-3">None</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Event map</td>
                  <td className="px-4 py-3">Built-in shared map</td>
                  <td className="px-4 py-3">Not available</td>
                  <td className="px-4 py-3">Not available</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Pricing</td>
                  <td className="px-4 py-3">Free</td>
                  <td className="px-4 py-3">Freemium</td>
                  <td className="px-4 py-3">Free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-display text-xl">
            Why Memories stands out: 90-day privacy
          </h2>
          <p>
            Most photo sharing apps keep your pictures forever. That sounds
            convenient, but it also means your data lives on someone
            else&apos;s servers indefinitely. Memories takes a different stance:
            photos are automatically deleted after 90 days. This "90-day
            privacy" model means:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Less digital clutter — only recent moments matter.</li>
            <li>Lower risk of long-term data breaches.</li>
            <li>A natural, ephemeral feel that encourages sharing without
              overthinking.</li>
          </ul>
          <p>
            If you want a <strong>Cluster alternative</strong> that is
            intentionally temporary, Memories is the clear choice.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-display text-xl">
            FamilyAlbum: great for baby albums, less for events
          </h2>
          <p>
            FamilyAlbum is built around chronology. It auto-sorts pictures by
            month and makes it easy to print photo books. That makes it ideal
            for parents tracking a child&apos;s first years. However, it lacks
            event-specific grouping and a shared map, so it is less suited for
            travel or party photo pools.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-display text-xl">
            Cluster: simple groups, no map or expiration
          </h2>
          <p>
            Cluster lets you create invite-only groups quickly. It is clean and
            easy to use, but photos stay forever and there is no way to see
            where events happened on a map. If you are looking for a
            lightweight <strong>private photo sharing app</strong> with a
            built-in event map and automatic cleanup, Cluster does not tick
            those boxes.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="font-display text-xl">Which app should you choose?</h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Memories</strong> — Best for friends who want a private,
              event-focused space with a shared map and 90-day auto-deletion.
            </li>
            <li>
              <strong>FamilyAlbum</strong> — Best for parents building a
              permanent baby or family timeline.
            </li>
            <li>
              <strong>Cluster</strong> — Best for casual, permanent group
              albums without extra features.
            </li>
          </ul>
        </section>

        <section className="mt-10 rounded-2xl bg-accent p-6 text-center">
          <h2 className="font-display text-lg">
            Ready to share memories privately?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first event on Memories and invite the people who were
            really there.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try Memories free
          </Link>
        </section>
      </article>
    </div>
  );
}
