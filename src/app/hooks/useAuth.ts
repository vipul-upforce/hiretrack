import Cookies from 'js-cookie';

export const useAuth = () => {
  const isAuthenticated = !!Cookies.get('token');
  const userRole = Cookies.get('role');

  return { isAuthenticated, userRole };
}; 