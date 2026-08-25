'use client';

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import DifficultySelect, { type Difficulty } from '@/components/difficulty-select/DifficultySelect';
// popup.tsx itself has no self-reference to fix here -- the "/components/popups/popup"
// path is what OTHER files (like profile/page.tsx) import this file as.
import styles from './popup.module.css';
import {deleteHistory, cancelUpload} from '@/lib/api'
import {useAuth} from '@/app/auth/auth-query'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// -----------------------------------------------------------------------
// Shared shell — the white card + inner border + header/body/footer slots.
// Every variation below renders through this.
//
// `body` (the <section>) owns ALL centering/positioning of its children:
// it centers everything as a group by default. Individual popups never set
// their own position — the only exception is `.topText` (see popup.module.css),
// which children opt into when they're instructions/errors that need to sit
// pinned under the title instead of centered with the rest of the content.
//
// `footer` hangs half off the bottom edge of the card (matches the mockup).
// Popups that need a centered button instead (Signed Out / Account Deleted)
// just pass it as a child instead of as `footer`.
//
// `onClose` is required here now: clicking anywhere outside the card (the
// full-screen backdrop) closes the popup. That's detected by checking that
// the click target IS the backdrop itself, not something inside the card —
// clicks inside the card bubble up with a different target and never
// trigger it.
// -----------------------------------------------------------------------

interface PopupShellProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  // Optional now: when omitted, clicking the backdrop does nothing --
  // used by UploadingPopup, where "Cancel Upload" is meant to be the only
  // way to close it.
  onClose?: () => void;
}

function PopupShell({ title, children, footer, onClose }: PopupShellProps) {
  // Rendered through a portal straight into document.body so this always
  // centers on the true viewport, regardless of any `transform` (or
  // filter/perspective/etc) on an ancestor elsewhere in the page -- any of
  // those create a new containing block that would otherwise trap this
  // "fixed" backdrop inside that ancestor instead of the real screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }

  const content = (
    <div className="fixed top-0 left-0 size-full bg-black/50 z-99" onClick={handleBackdropClick}>
      <dialog className="block mx-auto mt-50 w-[495px] h-[330px] bg-off-white p-6 shadow-lg/50">
        <article className="relative size-full border-dark-brown border-2 flex flex-col items-center">
          <header className="absolute -top-6 w-fit bg-off-white p-2">
            <h2>{title}</h2>
          </header>

          <section className={styles.body}>{children}</section>

          {footer && <footer className={styles.footer}>{footer}</footer>}
        </article>
      </dialog>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

// -----------------------------------------------------------------------
// Uploading / Difficulty Select
//
// These are two independent, plain entry points now -- unlike before,
// there's no internal polling or self-managed transition between them.
// The real "upload finished" signal is importPdf() resolving in whatever
// page triggers the upload (e.g. the homepage) -- that page is what
// decides when to stop rendering type="uploading" and start rendering
// type="difficultySelect" instead. See PopupProps/the dispatcher below.
// -----------------------------------------------------------------------

function UploadingPopup({
  uploadId,
  fileName,
  onClose,
}: {
  uploadId: string;
  fileName: string;
  onClose: () => void;
}) {
  async function handleCancel() {
    try {
      // TODO: connect to the real cancel-upload backend call once it
      // exists. Until then, this always fails -- caught below so the
      // popup still closes instead of getting stuck or showing an error
      // for a feature that isn't implemented yet.
      await cancelUpload(uploadId);
    } catch {
      // Not implemented yet -- close anyway.
    }
    onClose();
  }

  return (
    <PopupShell
      title="Uploading paper..."
      // No onClose passed to PopupShell here on purpose -- clicking the
      // backdrop does nothing. "Cancel Upload" below is the only way out.
      footer={
        <button type="button" className={styles.buttonNeutral} onClick={handleCancel}>
          Cancel Upload
        </button>
      }
    >
      <p className={styles.topText}>{fileName}</p>
      <img className={styles.loadingGif} src="/interface/loading.gif" alt="Uploading, please wait..." />
    </PopupShell>
  );
}

function DifficultySelectPopup({
  paperId,
  onClose,
}: {
  paperId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');

  function goTo(path: string) {
    // TODO: persist the chosen difficulty for `paperId` before navigating.
    router.push(`${path}?id=${encodeURIComponent(paperId)}`);
  }

  return (
    <PopupShell
      title="Upload successful!"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={() => goTo('/mindmap')}>
              Mind Map
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={() => goTo('/background')}>
              Background
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={() => goTo('/paperview')}>
              Interactive Paper
            </button>
          </li>
        </menu>
      }
    >
      <p>How familiar are you with this paper&apos;s topic?</p>
      <DifficultySelect value={difficulty} onChange={setDifficulty} />
      {difficulty == 'Beginner' && (
        <p className={styles.blurb}>
          1-2 sentence explanation using simple language, no jargon, analogies welcome.
        </p>
      )}
      {difficulty == 'Intermediate' && (
        <p className={styles.blurb}>
          2-3 sentence long explanations assuming general literacy but not domain expertise.
        </p>
      )}
      {difficulty == 'Advanced' && (
        <p className={styles.blurb}>
          2-3 sentence precise technical explanation using domain terminology and specifics.
        </p>
      )}
    </PopupShell>
  );
}

// -----------------------------------------------------------------------
// Success screens shared by the auth flow AND sign-out/delete-account — a
// title, an optional message pinned under it, and a centered "Return to
// Home" button. Used for "Login Successful!" / "Account Created!" /
// "Email Sent!" / "Password Changed!" / "Signed Out" / "Account Deleted".
// -----------------------------------------------------------------------

function AuthSuccessPopup({
  title,
  message,
  buttonText = 'Return to Home',
  onClose,
}: {
  title: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <PopupShell title={title} onClose={onClose}>
      {message && <p className={styles.topText}>{message}</p>}
      <button type="button" className={styles.buttonNeutral} onClick={() => router.push('/')}>
        {buttonText}
      </button>
    </PopupShell>
  );
}

// -----------------------------------------------------------------------
// Sign out / Delete account — each manages its own confirm -> done stage
// internally, since that's how the mockup groups them. Every child here is
// a plain flow child; the body centers them, nothing sets its own position.
// -----------------------------------------------------------------------

function SignOutPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<'confirm' | 'done'>('confirm');
  const {logout} = useAuth();

  async function handleSignOut() {
    // TODO: verify logout works
    await logout();
    setStage('done');
  }

  if (stage === 'done') {
    return (
      <PopupShell title="Signed Out" onClose={onClose}>
        <button type="button" className={styles.buttonNeutral} onClick={onClose}>
          Log In to Another Account
        </button>
        <button type="button" className={styles.buttonNeutral} onClick={() => router.push('/')}>
          Return to Home Page
        </button>
      </PopupShell>
    );
  }

  return (
    <PopupShell
      title="Sign Out"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={onClose}>
              Cancel
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonDanger} onClick={handleSignOut}>
              Sign Out
            </button>
          </li>
        </menu>
      }
    >
      <p>Are you sure you want to sign out? You will need to log in again to access your preferences and history.</p>
    </PopupShell>
  );
}

function DeleteAccountPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<'confirm' | 'done'>('confirm');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {user, deleteUser} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    // Only the actual network call is inside try/catch — if it succeeds,
    // moving to the "done" stage happens unconditionally afterward, so a
    // problem there can never get mislabeled as "Incorrect password."
    try {
      await deleteUser({email: user?.email || "", password: password});
    } catch {
      setError('Incorrect password.');
      return;
    }
    setStage('done');
  }

  if (stage === 'done') {
    // Two stacked buttons rather than the shared single-button
    // AuthSuccessPopup: "Log In to Another Account" just closes this popup
    // (onClose) -- since the user is unauthenticated again at this point,
    // the parent page's own login-gate picks up automatically once nothing
    // else is open, rather than this popup needing to know how to open the
    // login popup itself.
    return (
      <PopupShell title="Account Deleted" onClose={onClose}>
        <button type="button" className={styles.buttonNeutral} onClick={onClose}>
          Log In to Another Account
        </button>
        <button type="button" className={styles.buttonNeutral} onClick={() => router.push('/')}>
          Return to Home Page
        </button>
      </PopupShell>
    );
  }

  return (
    <PopupShell
      title="Delete Account"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={onClose}>
              Cancel
            </button>
          </li>
          <li>
            <button type="submit" form="delete-account-form" className={styles.buttonDanger}>
              Delete Account
            </button>
          </li>
        </menu>
      }
    >
      <form id="delete-account-form" className={styles.form} onSubmit={handleSubmit}>
        {error ? (
          <p className={`${styles.topText} ${styles.error}`}>{error}</p>
        ) : (
          <p className={styles.topText}>Enter your password to confirm account deletion.</p>
        )}
        <label className={styles.field}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
      </form>
    </PopupShell>
  );
}

// -----------------------------------------------------------------------
// Delete paper
// -----------------------------------------------------------------------

function DeletePaperPopup({
  onClose,
  paperId,
  paperTitle,
  onDeleted,
}: {
  onClose: () => void;
  paperId: string;
  paperTitle: string;
  onDeleted: () => void;
}) {
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setError('');
    setIsDeleting(true);
    try {
      await deleteHistory(paperId);
    } catch (err) {
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Something went wrong while deleting.');
      return;
    }
    onDeleted();
  }

  return (
    <PopupShell
      title="Delete Paper"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          {error ? (
            <>
              <li>
                <button type="button" className={styles.buttonNeutral} onClick={onClose}>
                  Close
                </button>
              </li>
              <li>
                <button type="button" className={styles.buttonDanger} onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Retrying...' : 'Retry'}
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button type="button" className={styles.buttonNeutral} onClick={onClose} disabled={isDeleting}>
                  Keep
                </button>
              </li>
              <li>
                <button type="button" className={styles.buttonDanger} onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            </>
          )}
        </menu>
      }
    >
      <p className={error ? styles.error : undefined}>
        {error || `Are you sure you want to delete "${paperTitle}"?`}
      </p>
    </PopupShell>
  );
}

// -----------------------------------------------------------------------
// Account / auth forms — each <form> only holds its fields (plain flow
// content the body centers as a group). Instructions/errors use
// `.topText` to pin themselves under the title instead. The submit button
// lives in the hanging footer and is wired to the form via `form=`.
//
// Login <-> Create Account <-> Forgot Password <-> Confirm Password <->
// New Password (and the success screens each of those lands on) are all
// reachable from one another; `AuthFlowPopup` below owns that navigation
// internally so the parent only ever renders one entry point and never
// has to react to where the user ends up inside the flow.
//
// Every handleSubmit below follows the same shape: only the actual network
// call sits inside try/catch. The "on success" callback is called
// unconditionally after, never inside the try — otherwise a problem in
// that callback gets mislabeled as an auth failure.
// -----------------------------------------------------------------------

function CreateAccountPopup({
  onClose,
  onAccountCreated,
  onLogin,
}: {
  onClose: () => void;
  onAccountCreated: () => void;
  onLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const {signup, login} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('Invalid email.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    try {
      // TODO: server should reject this if the email is already registered —
      // surface that failure as "Invalid email." too, per spec.

      // pretty sure supabase alr does this; it will fire an error? maybe we can parse the error to make it nicer for the user
      await signup({email: email, password: password});
      // /auth/signup doesn't set a session cookie on its own (only
      // /auth/login and /auth/login-anonymous do), so log in immediately
      // afterward with the same credentials to get the user signed in
      // right away instead of leaving them signed-up-but-logged-out.
      await login({email: email, password: password});
    } catch (e: any){
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred; please try again.';
      setError(errorMessage);
      return;
    }
    onAccountCreated();
  }

  return (
    <PopupShell
      title="Create Account"
      onClose={onClose}
      footer={
        <button type="submit" form="create-account-form" className={styles.buttonNeutral}>
          Create Account
        </button>
      }
    >
      <form id="create-account-form" className={styles.form} onSubmit={handleSubmit}>
        {error && <p className={`${styles.topText} ${styles.error}`}>{error}</p>}
        <label className={styles.field}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Confirm Password
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
        </label>
        <p className={styles.linkRow}>
          <button type="button" className={styles.linkBrown} onClick={onLogin}>
            Log in to existing account
          </button>
        </p>
      </form>
    </PopupShell>
  );
}

function LoginPopup({
  onClose,
  onForgotPassword,
  onCreateAccount,
  onLoginSuccess,
}: {
  onClose: () => void;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
  onLoginSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {login} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login({email: email, password: password});
    } catch {
      setError('Please check the email or password is correct.');
      return;
    }
    onLoginSuccess();
  }

  return (
    <PopupShell
      title="Log In"
      onClose={onClose}
      footer={
        <button type="submit" form="login-form" className={styles.buttonNeutral}>
          Log In
        </button>
      }
    >
      <form id="login-form" className={styles.form} onSubmit={handleSubmit}>
        {error && <p className={`${styles.topText} ${styles.error}`}>{error}</p>}
        <label className={styles.field}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <p className={styles.linkRow}>
          <button type="button" className={styles.link} onClick={onForgotPassword}>
            Forgot password?
          </button>
          <button type="button" className={styles.linkBrown} onClick={onCreateAccount}>
            Create account
          </button>
        </p>
      </form>
    </PopupShell>
  );
}

function ForgotPasswordPopup({
  onClose,
  onEmailSent,
  onReturnToLogin,
}: {
  onClose: () => void;
  onEmailSent: () => void;
  onReturnToLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const {requestPasswordReset} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('Invalid email.');
      return;
    }
    try {
      await requestPasswordReset(email);
    } catch (e: any){
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred; please try again.';
      console.log(errorMessage);
    }
    onEmailSent();
  }

  return (
    <PopupShell
      title="Forgot Password"
      onClose={onClose}
      footer={
        <button type="submit" form="forgot-password-form" className={styles.buttonNeutral}>
          Send Reset Code
        </button>
      }
    >
      <form id="forgot-password-form" className={styles.form} onSubmit={handleSubmit}>
        {error ? (
          <p className={`${styles.topText} ${styles.error}`}>{error}</p>
        ) : (
          <p className={styles.topText}>Enter your email and we will send a password reset code.</p>
        )}
        <label className={styles.field}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <p className={styles.linkRow}>
          <button type="button" className={styles.linkBrown} onClick={onReturnToLogin}>
            Return to Log In
          </button>
        </p>
      </form>
    </PopupShell>
  );
}

function EmailSentResetCodePopup({
  onClose,
  newPasswordChange,
}: {
  onClose: () => void;
  newPasswordChange: () => void;
}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const {recoveryCode} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('Invalid email.');
      return;
    }
    try {
      await recoveryCode(email, code);
    } catch (e: any){
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred; please try again.';
      setError(errorMessage);
      return;
    }
    newPasswordChange();
  }

  return (
    <PopupShell
      title="Email Sent!"
      onClose={onClose}
      footer={
        <button type="submit" form="email-sent-password-form" className={styles.buttonNeutral}>
          Reset Password
        </button>
      }
    >
      <form id="email-sent-password-form" className={styles.form} onSubmit={handleSubmit}>
        {error ? (
          <p className={`${styles.topText} ${styles.error}`}>{error}</p>
        ) : (
          <p className={styles.topText}>Check your email for your access code.</p>
        )}
        <label className={styles.field}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Access Code
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
      </form>
    </PopupShell>
  );
}

function ConfirmPasswordPopup({
  onClose,
  onConfirmed,
}: {
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {user, login} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login({email: user?.email || "", password: password});
    } catch {
      setError('Incorrect password.');
      return;
    }
    onConfirmed();
  }

  return (
    <PopupShell
      title="Confirm Password"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={onClose}>
              Cancel
            </button>
          </li>
          <li>
            <button type="submit" form="confirm-password-form" className={styles.buttonNeutral}>
              Confirm
            </button>
          </li>
        </menu>
      }
    >
      <form id="confirm-password-form" className={styles.form} onSubmit={handleSubmit}>
        {error ? (
          <p className={`${styles.topText} ${styles.error}`}>{error}</p>
        ) : (
          <p className={styles.topText}>Enter your current password in order to change it.</p>
        )}
        <label className={styles.field}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
      </form>
    </PopupShell>
  );
}

function NewPasswordPopup({
  onClose,
  onPasswordChanged,
}: {
  onClose: () => void;
  onPasswordChanged: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const {editUser} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    try {
      // Updates the password for the currently logged-in user.
      await editUser({password: password});
    } catch (e: any){
      const errorMessage = e instanceof Error ? e.message : 'Could not update password. Please try again.';
      setError(errorMessage);
      return;
    }
    onPasswordChanged();
  }

  return (
    <PopupShell
      title="New Password"
      onClose={onClose}
      footer={
        <button type="submit" form="new-password-form" className={styles.buttonNeutral}>
          Change Password
        </button>
      }
    >
      <form id="new-password-form" className={styles.form} onSubmit={handleSubmit}>
        {error && <p className={`${styles.topText} ${styles.error}`}>{error}</p>}
        <label className={styles.field}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className={styles.field}>
          Confirm Password
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
        </label>
      </form>
    </PopupShell>
  );
}

type AuthView =
  | 'login'
  | 'createAccount'
  | 'forgotPassword'
  | 'confirmPassword'
  | 'newPassword'
  | 'loginSuccess'
  | 'accountCreated'
  | 'emailSent'
  | 'passwordChanged';

function AuthFlowPopup({ initialView, onClose }: { initialView: AuthView; onClose: () => void }) {
  const [view, setView] = useState<AuthView>(initialView);

  switch (view) {
    case 'login':
      return (
        <LoginPopup
          onClose={onClose}
          onForgotPassword={() => setView('forgotPassword')}
          onCreateAccount={() => setView('createAccount')}
          onLoginSuccess={() => setView('loginSuccess')}
        />
      );
    case 'createAccount':
      return (
        <CreateAccountPopup
          onClose={onClose}
          onAccountCreated={() => setView('accountCreated')}
          onLogin={() => setView('login')}
        />
      );
    case 'forgotPassword':
      return (
        <ForgotPasswordPopup
          onClose={onClose}
          onEmailSent={() => setView('emailSent')}
          onReturnToLogin={() => setView('login')}
        />
      );
    case 'confirmPassword':
      return <ConfirmPasswordPopup onClose={onClose} onConfirmed={() => setView('newPassword')} />;
    case 'newPassword':
      return (
        <NewPasswordPopup onClose={onClose} onPasswordChanged={() => setView('passwordChanged')} />
      );
    case 'loginSuccess':
      return <AuthSuccessPopup title="Login Successful!" onClose={onClose} />;
    case 'accountCreated':
      return (
        <AuthSuccessPopup
          title="Account Created!"
          message="To get started, upload a PDF on the home page"
          buttonText="Get Started"
          onClose={onClose}
        />
      );
    case 'emailSent':
      return (
        <EmailSentResetCodePopup
          onClose={onClose}
          newPasswordChange={() => setView('newPassword')}
        />
      );
    case 'passwordChanged':
      return <AuthSuccessPopup title="Password Changed!" onClose={onClose} />;
  }
}

// -----------------------------------------------------------------------
// Dispatcher — <Popup type="login" ... /> picks the variation.
//
// Every entry point now requires `onClose`, since clicking outside any
// popup closes it — including uploading/difficultySelect, which never
// needed it before this.
// -----------------------------------------------------------------------

export type PopupProps =
  | { type: 'uploading'; uploadId: string; fileName: string; onClose: () => void }
  | { type: 'difficultySelect'; paperId: string; onClose: () => void }
  | { type: 'login'; onClose: () => void }
  | { type: 'createAccount'; onClose: () => void }
  | { type: 'forgotPassword'; onClose: () => void }
  | { type: 'confirmPassword'; onClose: () => void }
  | { type: 'newPassword'; onClose: () => void }
  | { type: 'signOutConfirm'; onClose: () => void }
  | { type: 'deleteAccountConfirm'; onClose: () => void }
  | {
      type: 'deletePaperConfirm';
      onClose: () => void;
      paperId: string;
      paperTitle: string;
      onDeleted: () => void;
    };

export default function Popup(props: PopupProps) {
  switch (props.type) {
    case 'uploading':
      return (
        <UploadingPopup uploadId={props.uploadId} fileName={props.fileName} onClose={props.onClose} />
      );
    case 'difficultySelect':
      return <DifficultySelectPopup paperId={props.paperId} onClose={props.onClose} />;
    case 'login':
    case 'createAccount':
    case 'forgotPassword':
    case 'confirmPassword':
    case 'newPassword':
      return <AuthFlowPopup initialView={props.type} onClose={props.onClose} />;
    case 'signOutConfirm':
      return <SignOutPopup onClose={props.onClose} />;
    case 'deleteAccountConfirm':
      return <DeleteAccountPopup onClose={props.onClose} />;
    case 'deletePaperConfirm':
      return (
        <DeletePaperPopup
          onClose={props.onClose}
          paperId={props.paperId}
          paperTitle={props.paperTitle}
          onDeleted={props.onDeleted}
        />
      );
    default:
      return null;
  }
}
