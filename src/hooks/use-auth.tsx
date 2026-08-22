import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { auth, db } from "@/firebase";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AuthSession = {
  user: User;
};

type AuthContextValue = {
  user: User | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function profileFromFirestore(
  id: string,
  data: Record<string, unknown>,
): Profile {
  const displayName = data["display_name"];
  const avatarUrl = data["avatar_url"];

  return {
    id,
    display_name:
      typeof displayName === "string" ? displayName : null,
    avatar_url:
      typeof avatarUrl === "string" ? avatarUrl : null,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string) => {
    try {
      const profileRef = doc(db, "profiles", id);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        setProfile(null);
        return;
      }

      setProfile(
        profileFromFirestore(
          profileSnap.id,
          profileSnap.data(),
        ),
      );
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        setUser(nextUser);
        setSession(
          nextUser ? { user: nextUser } : null,
        );

        if (nextUser) {
          await loadProfile(nextUser.uid);
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return unsubscribe;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }

    await loadProfile(user.uid);
  }, [user?.uid, loadProfile]);

  const handleSignOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      refreshProfile,
      signOut: handleSignOut,
    }),
    [
      user,
      session,
      profile,
      loading,
      refreshProfile,
      handleSignOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>",
    );
  }

  return ctx;
}