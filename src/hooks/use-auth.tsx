import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";

import { auth, db } from "@/firebase";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type AuthContextValue = {
  user: User | null;
  session: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileLocal: (updates: Pick<Profile, "display_name" | "avatar_url">) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Timestamp | undefined;
  if (!timestamp || typeof timestamp.toDate !== "function") return undefined;
  return timestamp.toDate().toISOString();
}

function profileFromData(
  userId: string,
  data: Record<string, unknown> | undefined,
): Profile | null {
  if (!data) return null;

  return {
    id: userId,
    display_name:
      typeof data["display_name"] === "string" ? data["display_name"] : null,
    avatar_url:
      typeof data["avatar_url"] === "string" ? data["avatar_url"] : null,
    created_at: timestampToIso(data["created_at"]),
    updated_at: timestampToIso(data["updated_at"]),
  };
}

export async function ensureUserProfile(user: User, displayName?: string) {
  const profileRef = doc(db, "profiles", user.uid);
  const snapshot = await getDoc(profileRef);
  const existing = snapshot.exists()
    ? (snapshot.data() as Record<string, unknown>)
    : undefined;

  const name =
    displayName ??
    (typeof existing?.["display_name"] === "string"
      ? existing["display_name"]
      : user.displayName ?? null);

  const avatar =
    typeof existing?.["avatar_url"] === "string"
      ? existing["avatar_url"]
      : user.photoURL ?? null;

  await setDoc(
    profileRef,
    {
      id: user.uid,
      display_name: name,
      avatar_url: avatar,
      ...(snapshot.exists()
        ? { updated_at: serverTimestamp() }
        : {
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          }),
    },
    { merge: true },
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User) => {
    const profileRef = doc(db, "profiles", currentUser.uid);

    // O Auth já tem os dados básicos. Mostra a tela imediatamente e busca
    // o perfil salvo no Firestore em segundo plano.
    setProfile((current) =>
      current?.id === currentUser.uid
        ? current
        : {
            id: currentUser.uid,
            display_name: currentUser.displayName ?? null,
            avatar_url: currentUser.photoURL ?? null,
          },
    );

    try {
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        const loadedProfile = profileFromData(
          currentUser.uid,
          snapshot.data() as Record<string, unknown>,
        );

        if (loadedProfile) {
          setProfile(loadedProfile);
        }
        return;
      }

      const initialProfile: Profile = {
        id: currentUser.uid,
        display_name: currentUser.displayName ?? null,
        avatar_url: currentUser.photoURL ?? null,
      };

      void setDoc(
        profileRef,
        {
          id: currentUser.uid,
          display_name: initialProfile.display_name,
          avatar_url: initialProfile.avatar_url,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true },
      ).catch((error) => {
        console.error("Erro ao criar perfil no Firestore:", error);
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      // Mantém os dados vindos do Firebase Auth em vez de bloquear a tela.
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    await loadProfile(user);
  };

  const updateProfileLocal = (
    updates: Pick<Profile, "display_name" | "avatar_url">,
  ) => {
    setProfile((current) => ({
      id: user?.uid ?? current?.id ?? "",
      display_name: updates.display_name,
      avatar_url: updates.avatar_url,
      created_at: current?.created_at,
      updated_at: new Date().toISOString(),
    }));
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!mounted) return;

      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Libera a interface imediatamente. A leitura do perfil continua
      // em segundo plano.
      setProfile({
        id: currentUser.uid,
        display_name: currentUser.displayName ?? null,
        avatar_url: currentUser.photoURL ?? null,
      });
      setLoading(false);

      void loadProfile(currentUser);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user,
        profile,
        loading,
        refreshProfile,
        updateProfileLocal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  }

  return context;
}
