import { cookies } from 'next/headers';

export async function auth() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie) {
    return null;
  }

  try {
    const user = JSON.parse(userCookie.value);
    return { user };
  } catch {
    return null;
  }
} 