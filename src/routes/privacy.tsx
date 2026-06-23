import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Memories" },
      { name: "description", content: "How Memories handles your personal data, and your rights under the GDPR." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← Back</Link>
      <h1 className="mt-4 font-display text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

      <section className="prose prose-sm mt-8 max-w-none space-y-6 text-foreground">
        <div>
          <h2 className="font-display text-xl">What we store and why</h2>
          <p className="mt-2 text-sm">
            Memories stores the minimum needed to run the app: your email and a display name (so
            friends can recognise you), the events you create (name, date, location), the photos
            you upload, and tags you add to those photos. We do not sell or share this data with
            third parties.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Where it is stored</h2>
          <p className="mt-2 text-sm">
            Data and photos are stored on our backend infrastructure in the European Union. Photos
            are kept in a private storage bucket and are automatically deleted 90 days after
            upload.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Cookies & tracking</h2>
          <p className="mt-2 text-sm">
            We use only essential cookies/local storage to keep you signed in and remember your
            cookie preference. We do not use third-party analytics or advertising trackers.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Your rights</h2>
          <p className="mt-2 text-sm">
            Under the GDPR you can access, export, correct, or delete your data at any time.
            You can:
          </p>
          <ul className="ml-5 mt-2 list-disc text-sm">
            <li>Export your data from your Profile page (JSON download).</li>
            <li>Delete your account and all your events, photos and tags from your Profile page.</li>
            <li>
              Contact us for any other request at{" "}
              <a className="underline" href="mailto:privacy@memories.app">privacy@memories.app</a>.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl">Photo access</h2>
          <p className="mt-2 text-sm">
            Photos are private to event members. They are served via short-lived signed URLs and
            are not publicly accessible.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Contact</h2>
          <p className="mt-2 text-sm">
            For any GDPR request or question, write to{" "}
            <a className="underline" href="mailto:privacy@memories.app">privacy@memories.app</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
