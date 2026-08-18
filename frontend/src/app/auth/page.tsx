// app/auth/page.tsx
//
// Reachable at "/auth". This is a thin wrapper around AuthTest (a
// dev-only login/signup form your teammate already built in
// auth-test.tsx) -- it didn't have a page.tsx yet, so visiting "/auth"
// would have 404'd. This file adds nothing new except making that
// existing form actually reachable in the browser, wrapped in the
// AuthProvider it needs to function.

'use client';

// import { AuthProvider } from './auth-query';
import AuthTest from './auth-test';

export default function AuthPage() {
  return (
    // <AuthProvider>
      <AuthTest />
    // </AuthProvider>
  );
}
