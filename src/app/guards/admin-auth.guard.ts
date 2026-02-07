import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();

      if (user) return resolve(true);

      void router.navigate(['/admin'], { queryParams: { returnUrl: state.url } });
      resolve(false);
    });
  });
};

