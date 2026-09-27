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
    display_name: typeof data["display_name"] === "string" ? data["display_name"] : null,
    avatar_url: typeof data["avatar_url"] === "string" ? data["avatar_url"] : null,
    created_at: timestampToIso(data["created_at"]),
    updated_at: timestampToIso(data["updated_at"]),
  };
}

/**
 * Garante que o documento de perfil exista.
 * Esta função continua sendo usada no cadastro, mas o carregamento normal
 * não faz mais uma segunda leitura depois de criar o documento.
 */
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

    try {
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        setProfile(
          profileFromData(
            currentUser.uid,
            snapshot.data() as Record<string, unknown>,
          ),
        );
        return;
      }

      // Perfil novo: monta o estado imediatamente, sem fazer
      // getDoc -> setDoc -> getDoc em sequência.
      const initialProfile: Profile = {
        id: currentUser.uid,
        display_name: currentUser.displayName ?? null,
        avatar_url: currentUser.photoURL ?? null,
      };

      setProfile(initialProfile);

      // Persiste em segundo plano. O usuário não precisa esperar a escrita
      // do Firestore para conseguir visualizar o perfil.
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
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    await loadProfile(user);
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!mounted) return;

      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        if (mounted) setLoading(false);
        return;
      }

      await loadProfile(currentUser);

      if (mounted) {
        setLoading(false);
      }
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
