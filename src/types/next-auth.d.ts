import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      profile_completion_status: string;
      provider?: "google" | "linkedin";
      terms_accepted?: boolean;
      is_suspended?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    profile_completion_status?: string;
    terms_accepted?: boolean;
    is_suspended?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user_id?: string;
    profile_completion_status?: string;
    terms_accepted?: boolean;
    is_suspended?: boolean;
  }
}