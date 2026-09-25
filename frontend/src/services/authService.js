import { supabase } from "./supabase";

// Legacy demo officer account, kept so existing demos keep working without a Supabase user.
const DEMO_ACCOUNT = {
  email: "sentialcctv@gmail.com",
  password: "sentialofficial@1428",
  badgeId: "GP-CID-7809",
  roleKey: "admin",
  department: "CID Crime Branch (Criminal Pursuit & ANPR)",
};

const ROLE_LABELS = {
  admin: "Dy. Commissioner (Admin)",
  operator: "Traffic In-Charge (Operator)",
};

/**
 * Converts a Supabase auth user into the officer profile shape used across the app.
 */
function toProfile(authUser) {
  const meta = authUser?.user_metadata || {};
  const roleKey = meta.roleKey === "operator" ? "operator" : "admin";
  return {
    id: authUser?.id,
    email: authUser?.email,
    badgeId: meta.badgeId || "—",
    department: meta.department || "SENTINEL Command Grid",
    role: ROLE_LABELS[roleKey],
    roleKey,
  };
}

function friendlyError(error) {
  const msg = error?.message || "";
  if (/invalid login credentials/i.test(msg)) return "Invalid email or password.";
  if (/email not confirmed/i.test(msg)) return "Email not verified yet. Please open the confirmation link sent to your inbox, then sign in.";
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Please sign in instead.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
  return msg || "Authentication failed. Please try again.";
}

export const authService = {
  /**
   * Registers a new officer account. Officer details are stored as Supabase user metadata.
   * Returns { profile } when a session starts immediately, or { needsConfirmation: true }
   * when the Supabase project requires email verification first.
   */
  async signUp({ email, password, badgeId, roleKey, department }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { badgeId: badgeId.trim().toUpperCase(), roleKey, department },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: friendlyError(error) };

    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }
    if (!data.session) return { needsConfirmation: true };
    return { profile: toProfile(data.user) };
  },

  /**
   * Signs in with email + password. Falls back to the local demo account.
   */
  async signIn({ email, password }) {
    const cleanEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (!error) return { profile: toProfile(data.user) };

    if (cleanEmail.toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password) {
      return {
        profile: {
          email: DEMO_ACCOUNT.email,
          badgeId: DEMO_ACCOUNT.badgeId,
          department: DEMO_ACCOUNT.department,
          role: ROLE_LABELS[DEMO_ACCOUNT.roleKey],
          roleKey: DEMO_ACCOUNT.roleKey,
        },
      };
    }
    return { error: friendlyError(error) };
  },

  /**
   * Returns the profile for a persisted Supabase session, or null.
   */
  async getCurrentProfile() {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user ? toProfile(data.session.user) : null;
    } catch (err) {
      return null;
    }
  },

  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out failed:", err);
    }
  },

  demoAccount: { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password },
};
