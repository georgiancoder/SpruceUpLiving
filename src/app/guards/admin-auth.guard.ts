import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();

      if (!user) {
        void router.navigate(['/admin'], { queryParams: { returnUrl: state.url } });
        return resolve(false);
      }

      try {
        const token = await user.getIdTokenResult();
        const isSuperAdmin = token?.claims?.['superAdmin'] === true;

        if (!isSuperAdmin) {
          try {
            await signOut(auth);
          } catch {
            // ignore sign-out failures; still block navigation
          }
          void router.navigate(['/admin'], { queryParams: { returnUrl: state.url } });
          return resolve(false);
        }

        return resolve(true);
      } catch {
        void router.navigate(['/admin'], { queryParams: { returnUrl: state.url } });
        return resolve(false);
      }
    });
  });
};
