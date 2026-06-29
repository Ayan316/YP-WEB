export class AuthClient {
  private refreshPromise: Promise<boolean> | null = null;

  async fetchWithAuth(url: string, options: RequestInit = {}) {
    let response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Middleware handles 401 refresh, but retry once if needed
    if (response.status === 401) {
      const refreshed = await this.refreshToken();

      if (!refreshed) {
        await this.logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:refresh-expired"));
        }
        return response;
      }

      // Retry request
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });
      }
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    // Prevent concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        return response.ok;
      } catch (error) {
        console.error("Refresh error:", error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getSession() {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (!response.ok) return null;
      // Guard against dev setups that return HTML (e.g. a 200 error page) for
      // the session endpoint — calling .json() on that would throw and spam
      // the console with a ClientFetchError.
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  async logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
}

export const authClient = new AuthClient();
