import { HttpInterceptorFn } from '@angular/common/http';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token del localStorage
  const userJson = localStorage.getItem('user');
  let token = '';
  
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      token = user.access_token;
    } catch (e) {
      console.error('Error parsing user data from localStorage');
    }
  }

  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  }

  return next(req);
};