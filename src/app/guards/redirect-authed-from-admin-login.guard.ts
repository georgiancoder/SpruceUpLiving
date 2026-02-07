import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const redirectAuthedFromAdminLoginGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();

      if (user) {
        void router.navigate(['/admin/dashboard']);
        return resolve(false);
      }

      resolve(true);
    });
  });
};

