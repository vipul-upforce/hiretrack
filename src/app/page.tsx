import { redirect } from 'next/navigation';

export default function Home() {
  // Check if the user is authenticated
  const isAuthenticated = false; // Replace with actual authentication logic

  if (!isAuthenticated) {
    // Redirect to the login page
    redirect('/auth/login'); // Ensure you import redirect from 'next/navigation'
  }

  return <></>;
}
