"use client";

interface CachedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isDeleted?: boolean;
  isDisabled?: boolean;
}

interface UserCache {
  [organizationId: string]: {
    users: CachedUser[];
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  };
}

class UserCacheService {
  private cache: UserCache = {};
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private fetchingPromises: {
    [organizationId: string]: Promise<CachedUser[]>;
  } = {};

  /**
   * Get cached users for an organization
   */
  getCachedUsers(organizationId: string): CachedUser[] | null {
    console.log("🔍 getCachedUsers called for:", organizationId);
    console.log("📊 Current cache keys:", Object.keys(this.cache));

    const cached = this.cache[organizationId];

    if (!cached) {
      console.log("📦 No cache found for organization:", organizationId);
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = now - cached.timestamp;
    if (age > cached.ttl) {
      console.log(
        "⏰ Cache expired for organization:",
        organizationId,
        "age:",
        age,
        "ttl:",
        cached.ttl
      );
      delete this.cache[organizationId];
      return null;
    }

    console.log(
      "✅ Cache hit for organization:",
      organizationId,
      "age:",
      age,
      "users:",
      cached.users.length
    );
    return cached.users;
  }

  /**
   * Set users in cache for an organization
   */
  setCachedUsers(
    organizationId: string,
    users: CachedUser[],
    ttl?: number
  ): void {
    this.cache[organizationId] = {
      users: [...users], // Create a copy to avoid mutations
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    console.log(
      "💾 Cached users for organization:",
      organizationId,
      "count:",
      users.length,
      "ttl:",
      ttl || this.DEFAULT_TTL
    );
  }

  /**
   * Clear cache for a specific organization
   */
  clearCache(organizationId: string): void {
    delete this.cache[organizationId];
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    [organizationId: string]: { count: number; age: number };
  } {
    const stats: { [organizationId: string]: { count: number; age: number } } =
      {};
    const now = Date.now();

    for (const [orgId, cached] of Object.entries(this.cache)) {
      stats[orgId] = {
        count: cached.users.length,
        age: now - cached.timestamp,
      };
    }

    return stats;
  }

  /**
   * Filter users by role and status
   */
  filterUsers(users: CachedUser[]): CachedUser[] {
    if (!users || !Array.isArray(users)) {
      console.log("⚠️ filterUsers: Invalid users array:", users);
      return [];
    }

    return users.filter(
      (user) =>
        !user.isDeleted &&
        !user.isDisabled &&
        ["admin", "hr", "interviewer"].includes(user.role)
    );
  }

  /**
   * Get users for an organization (cached or fetch if needed)
   */
  async getUsers(organizationId: string): Promise<CachedUser[]> {
    console.log("🚀 getUsers called for organization:", organizationId);

    // Check cache first
    const cachedUsers = this.getCachedUsers(organizationId);
    if (cachedUsers) {
      console.log("📦 Returning cached users:", cachedUsers.length);
      return cachedUsers;
    }

    // Check if we're already fetching
    if (this.fetchingPromises[organizationId]) {
      console.log(
        "⏳ Already fetching users for organization:",
        organizationId
      );
      return this.fetchingPromises[organizationId];
    }

    // Start fetching
    console.log("🌐 Starting fetch for organization:", organizationId);
    this.fetchingPromises[organizationId] =
      this.fetchUsersFromAPI(organizationId);

    try {
      const users = await this.fetchingPromises[organizationId];
      console.log("✅ getUsers returning:", users.length, "users");
      return users;
    } finally {
      // Clean up the promise
      delete this.fetchingPromises[organizationId];
    }
  }

  /**
   * Fetch users from API
   */
  private async fetchUsersFromAPI(
    organizationId: string
  ): Promise<CachedUser[]> {
    try {
      console.log("🌐 fetchUsersFromAPI: Making API call to /api/users");
      const response = await fetch(
        `/api/users?organizationId=${organizationId}`
      );
      console.log("🌐 fetchUsersFromAPI: Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("🌐 fetchUsersFromAPI: Raw data received:", data);

      // Handle both response formats: direct array or { users: array }
      const usersArray = Array.isArray(data) ? data : data.users;
      console.log(
        "🌐 fetchUsersFromAPI: Users count:",
        usersArray?.length || 0
      );

      const filteredUsers = this.filterUsers(usersArray);
      console.log(
        "🌐 fetchUsersFromAPI: Filtered users count:",
        filteredUsers.length
      );

      // Cache the filtered users
      this.setCachedUsers(organizationId, filteredUsers);
      return filteredUsers;
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      throw error;
    }
  }
}

// Create a singleton instance
export const userCacheService = new UserCacheService();

// Export the service class for testing
export { UserCacheService };
