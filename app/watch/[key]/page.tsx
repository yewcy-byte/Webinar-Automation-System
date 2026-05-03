"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { WatchVideoExperience } from "@/components/WatchVideoExperience";

type WatchPageProps = {
  params: Promise<{ key: string }>;
};

export default function WatchPage({ params }: WatchPageProps) {
  const [key, setKey] = useState<string>("");
  const [signedIn, setSignedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<any | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const cloudFrontBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      setKey(resolvedParams.key);
    })();
  }, [params]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are not configured.");
      setSignedIn(false);
      setCheckingAuth(false);
      return;
    }

    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseKey);

        if (!mounted) return;
        setSupabaseClient(client);

        const {
          data: { session },
        } = await client.auth.getSession();

        if (session?.access_token) {
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: session.access_token }),
          });

          if (res.ok) {
            const json = await res.json();
            if (mounted) {
              setSignedIn(true);
              setUserEmail(json.user?.email || null);
            }
          } else if (mounted) {
            setSignedIn(false);
            setUserEmail(null);
          }
        } else if (mounted) {
          setSignedIn(false);
        }

        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (session?.access_token) {
            setSignedIn(true);
          } else {
            setSignedIn(false);
            setUserEmail(null);
          }
        });

        authSubscription = listener.subscription;
      } catch (error) {
        console.error("Auth check failed:", error);
        if (mounted) setSignedIn(false);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    })();

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, [supabaseKey, supabaseUrl]);

  if (!cloudFrontBase) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>NEXT_PUBLIC_CLOUDFRONT_URL is not configured.</p>
      </main>
    );
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
        <div className="py-12 text-center">Checking authentication...</div>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Please sign in to view this webinar</h1>
        <p className="text-sm text-gray-600">
          We need your Google account to associate answers and resume submissions.
        </p>
        <div className="mt-6">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={async () => {
              try {
                let client = supabaseClient;
                if (!client) {
                  const { createClient } = await import("@supabase/supabase-js");
                  client = createClient(supabaseUrl || "", supabaseKey || "");
                  setSupabaseClient(client);
                }

                await client.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.href },
                });
              } catch (error) {
                console.error("Sign-in failed:", error);
                alert("Unable to start sign-in. Check Supabase configuration.");
              }
            }}
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  if (!key) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>Loading webinar...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <WatchVideoExperience
        videoKey={key}
        cloudFrontBase={cloudFrontBase}
        userEmail={userEmail || ""}
      />
    </main>
  );
}
