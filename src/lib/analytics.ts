// Mesure d'audience avec PostHog (hébergement UE, Francfort).
//
// Règles de confidentialité appliquées ici :
// - rien n'est chargé ni envoyé tant que la personne n'a pas cliqué sur « Accepter » ;
// - pas d'enregistrement de session (les photos privées des événements apparaîtraient
//   dans les vidéos) ;
// - suivi des clics sur boutons et liens : on garde le libellé des boutons (« Inviter »,
//   « Télécharger »…) mais jamais le texte des liens, qui contient les noms d'événements ;
// - les liens d'invitation (/join/<jeton>?code=…) sont masqués avant envoi, sinon
//   n'importe qui ayant accès à PostHog pourrait rejoindre l'événement.

import type { PostHog } from "posthog-js";

const CONSENT_KEY = "memories.cookie-consent.v2";
export const CONSENT_CHANGED_EVENT = "memories:consent-changed";

export type ConsentChoice = "accepted" | "refused";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";

/** Vrai si une clé PostHog est configurée (sinon aucune mesure d'audience n'existe). */
export const analyticsEnabled = Boolean(POSTHOG_KEY);

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const { choice } = JSON.parse(raw) as { choice?: string };
    return choice === "accepted" || choice === "refused" ? choice : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
  } catch {
    // Stockage indisponible (navigation privée…) : on ignore.
  }
  if (choice === "accepted") void startAnalytics();
  else stopAnalytics();
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Efface le choix enregistré : la bannière s'affichera de nouveau. */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Stockage indisponible (navigation privée…) : on ignore.
  }
  stopAnalytics();
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

let posthogPromise: Promise<PostHog> | undefined;

/** Démarre PostHog seulement si la personne a accepté. À appeler au chargement de l'app. */
export function startAnalytics() {
  if (!analyticsEnabled || typeof window === "undefined" || getConsent() !== "accepted") {
    return;
  }
  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST,
        capture_pageview: "history_change",
        capture_pageleave: true,
        // Suivi des clics sur les boutons et les liens uniquement (pas de saisie de texte).
        autocapture: { dom_event_allowlist: ["click"], element_allowlist: ["button", "a"] },
        rageclick: false,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_external_dependency_loading: true,
        person_profiles: "identified_only",
        before_send: scrubEvent,
      });
      return posthog;
    });
  } else {
    void posthogPromise.then((posthog) => posthog.opt_in_capturing());
  }
  return posthogPromise;
}

function stopAnalytics() {
  if (posthogPromise) {
    void posthogPromise.then((posthog) => {
      posthog.opt_out_capturing();
      posthog.reset();
    });
  }
  // Supprime les traces laissées par une session PostHog précédente.
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("ph_") || key.startsWith("__ph_")) localStorage.removeItem(key);
    }
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name?.startsWith("ph_")) {
        document.cookie = `${name}=; max-age=0; path=/`;
      }
    }
  } catch {
    // Stockage indisponible (navigation privée…) : on ignore.
  }
}

// --- Nettoyage des URL envoyées ---------------------------------------------

function scrubPath(path: string) {
  return path
    .replace(/\/join\/[^/?#]+/g, "/join/:token")
    .replace(/\/events\/[0-9a-f-]{36}/gi, "/events/:id");
}

function scrubValue(value: string) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.origin}${scrubPath(url.pathname)}`;
    } catch {
      return value;
    }
  }
  if (value.startsWith("/")) return scrubPath(value.split(/[?#]/)[0]);
  // Filet de sécurité pour les textes composites (ex. $elements_chain des clics).
  return scrubPath(value).replace(/([?&]code=)[^&"\s]*/gi, "$1:code");
}

// Pour un clic, on ne garde le texte que s'il s'agit d'un bouton.
function stripLinkText(props: Record<string, unknown>) {
  const chain = props.$elements_chain;
  if (typeof chain === "string") {
    props.$elements_chain = chain
      .split(";")
      .map((part) =>
        /^button[.:]?/.test(part) ? part : part.replace(/text="(?:[^"\\]|\\.)*"/g, ""),
      )
      .join(";");
  }
  const elements = props.$elements;
  if (Array.isArray(elements)) {
    for (const el of elements as Record<string, unknown>[]) {
      if (el && el.tag_name !== "button") delete el.$el_text;
      if (el && typeof el.attr__href === "string") el.attr__href = scrubValue(el.attr__href);
    }
  }
  const target = Array.isArray(elements)
    ? (elements[0] as Record<string, unknown> | undefined)
    : undefined;
  const targetTag =
    target?.tag_name ?? (typeof chain === "string" ? chain.split(/[.:;]/)[0] : undefined);
  if (targetTag !== "button") delete props.$el_text;
}

function scrubProps(props: Record<string, unknown> | undefined) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") props[key] = scrubValue(value);
  }
}

function scrubEvent<
  T extends {
    event: string;
    properties: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  } | null,
>(event: T): T {
  if (!event) return event;
  if (event.event === "$autocapture") stripLinkText(event.properties);
  scrubProps(event.properties);
  scrubProps(event.$set);
  scrubProps(event.$set_once);
  return event;
}
