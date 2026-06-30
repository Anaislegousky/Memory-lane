import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/AuthProvider";

/**
 * Returns whether the current user is an anonymous (guest) user.
 */
export function useIsGuest() {
  const { user } = useAuth();
  return !!user?.is_anonymous;
}

const COPY: Record<string, { title: string; description: string }> = {
  download: {
    title: "Créez un compte pour télécharger",
    description:
      "Le téléchargement des photos est réservé aux membres avec un compte. C'est rapide et vos accès restent en sécurité.",
  },
  delete: {
    title: "Action réservée aux membres",
    description:
      "Seuls les membres avec un compte peuvent supprimer ces photos. Créez un compte pour gérer le contenu.",
  },
  create_event: {
    title: "Créez un compte pour organiser",
    description:
      "Pour créer votre propre événement et inviter vos amis, il vous faut un compte. C'est gratuit et ça prend 10 secondes.",
  },
  invite: {
    title: "Invitations réservées aux membres",
    description:
      "Seul l'organisateur (et les membres avec un compte) peuvent inviter d'autres personnes à cet événement.",
  },
  upload_limit: {
    title: "Limite invité atteinte",
    description:
      "Les invités peuvent ajouter jusqu'à 10 photos par événement. Créez un compte pour en ajouter davantage.",
  },
};

export type GateAction = keyof typeof COPY;

/**
 * Wraps a trigger element. If the user is a guest, clicking it pops an
 * upgrade dialog instead of performing the action.
 *
 * Usage:
 *   <GuestGate action="download" onAllowed={runDownload}>
 *     {(trigger) => <button onClick={trigger}><Download /></button>}
 *   </GuestGate>
 */
export function GuestGate({
  action,
  onAllowed,
  children,
}: {
  action: GateAction;
  onAllowed: () => void;
  children: (trigger: () => void) => ReactNode;
}) {
  const isGuest = useIsGuest();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const copy = COPY[action];

  function trigger() {
    if (isGuest) setOpen(true);
    else onAllowed();
  }

  return (
    <>
      {children(trigger)}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                navigate({ to: "/auth", search: { mode: "signup" } });
              }}
            >
              Créer mon compte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Imperative variant: opens the same dialog on demand.
 */
export function GuestUpgradeDialog({
  action,
  open,
  onOpenChange,
}: {
  action: GateAction;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const copy = COPY[action];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Plus tard</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/auth", search: { mode: "signup" } });
            }}
          >
            Créer mon compte
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
