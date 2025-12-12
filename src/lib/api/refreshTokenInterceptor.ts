
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }) as Promise<string | null>;
  }

  console.log("refreshAccessToken 88");

  isRefreshing = true;

  try {
    // Get refresh token from localStorage or cookie
    const refreshToken =
      localStorage.getItem("refresh_token") || getCookie("refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        credentials: "include",
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Handle license validation failure
      if (response.status === 403 && errorData.code === "LICENSE_INVALID") {
        // Redirect to license error page or login
        window.location.href =
          "/auth/login?error=license_invalid&message=" +
          encodeURIComponent(
            errorData.licenseError || "License validation failed"
          );
        throw new Error("License validation failed");
      }

      throw new Error("Failed to refresh token");
    }

    const data = await response.json();

    // Update refresh token in storage
    if (data.refreshToken) {
      localStorage.setItem("refresh_token", data.refreshToken);
    }

    processQueue(null, data.refreshToken);
    isRefreshing = false;

    return data.refreshToken;
  } catch (error) {
    processQueue(error as Error, null);
    isRefreshing = false;
    console.error(error, "error-79");

    // Clear tokens and redirect to login
    localStorage.removeItem("refresh_token");
    window.location.href = "/auth/login";

    throw error;
  }
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

// Intercept fetch requests to handle 401 errors
export function setupTokenRefreshInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    let response = await originalFetch(...args);
    // If 401, try to refresh token
    console.log("response",response, "response-103");



    if (
      response.status === 401 &&
      !args[0]?.toString().includes("/auth/refresh")
    ) {
      try {
        await refreshAccessToken();
        // Retry original request
        response = await originalFetch(...args);
      } catch (error) {
        // Refresh failed, redirect to login
        window.location.href = "/auth/login";
      }
    }
    return response;
  };
}
