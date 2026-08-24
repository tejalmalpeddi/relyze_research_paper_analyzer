'use client';

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import DifficultySelect, { type Difficulty } from '@/components/difficulty-select/DifficultySelect';
import styles from './popup.module.css';
import {deleteHistory, cancelUpload} from '@/lib/api'
import {useAuth} from '@/app/auth/auth-query'
import { NAVIGATION_INTENT_EVENT } from '../navbar/NavBar';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// -----------------------------------------------------------------------
// Shared shell — the white card + inner border + header/body/footer slots.
//
// IMPORTANT: PopupShell must be called directly by whichever component
// OWNS a multi-view flow (see AuthFlowPopup below), not by each
// individual view. If two different views are two different component
// FUNCTIONS that each separately call <PopupShell>, switching between
// them makes React unmount the old PopupShell (and its portal + backdrop
// <div>) entirely and mount a brand new one -- which is what caused the
// backdrop to visibly flicker when switching e.g. Login -> Create
// Account. As long as the SAME <PopupShell> element (same type, same
// position in the tree) is returned across a state change -- only its
// props (title/children/footer) differing -- React reuses the existing
// DOM node instead, and there's nothing to flicker.
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
// `onClose` is optional: when provided, clicking anywhere outside the card
// (the full-screen backdrop) closes the popup. When omitted (see
// UploadingPopup), the backdrop click does nothing.
// -----------------------------------------------------------------------

interface PopupShellProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}

function PopupShell({ title, children, footer, onClose }: PopupShellProps) {
  // Rendered through a portal straight into document.body so this always
  // centers on the true viewport, regardless of any `transform` (or
  // filter/perspective/etc) on an ancestor elsewhere in the page -- any of
  // those create a new containing block that would otherwise trap this
  // "fixed" backdrop inside that ancestor instead of the real screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }

  const content = (
    <div className="fixed top-0 left-0 size-full bg-black/50 z-99" onClick={handleBackdropClick}>
      <dialog className="static block mx-auto mt-50 w-[495px] h-[330px] bg-off-white p-6 shadow-lg/50">
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
// Uploading
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

// -----------------------------------------------------------------------
// Difficulty Select
// -----------------------------------------------------------------------

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
    // TODO: persist the chosen difficulty for `paperId` server-side too,
    // once that's wired up.
    // TODO: double check these route paths match your actual app routes.
    router.push(path);
  }

  function goToMindMap() {
    // Passes the chosen difficulty (lowercased to match the Mind Map
    // page's own DifficultyLevel type) and the paper id along via the
    // URL, so the Mind Map page can read them straight out of
    // useSearchParams() instead of needing some other shared-state
    // mechanism across the navigation.
    const href = `/mindmap?id=${paperId}&difficulty=${difficulty.toLowerCase()}`;
    window.dispatchEvent(
      new CustomEvent(NAVIGATION_INTENT_EVENT, { detail: { href } })
    );
    router.push(href);
  }

  function goToBackground() {
    const href = `/background`;
    window.dispatchEvent(
      new CustomEvent(NAVIGATION_INTENT_EVENT, { detail: { href } })
    );
    router.push(href);
  }

  function goToPaperview() {
    const href = `/paperview`;
    window.dispatchEvent(
      new CustomEvent(NAVIGATION_INTENT_EVENT, { detail: { href } })
    );
    router.push(href);
  }

  return (
    <PopupShell
      title="Upload successful!"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={goToMindMap}>
              Mind Map
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={goToBackground}>
              Background
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={goToPaperview}>
              Interactive Paper
            </button>
          </li>
        </menu>
      }
    >
      <p>How familiar are you with this paper's topic?</p>
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
// Sign out / Delete account — each manages its own confirm -> done stage
// internally. Both branches return <PopupShell> directly (not delegating
// to a separately-named component that itself calls PopupShell), so
// switching stages is a normal prop update, not an unmount/remount --
// same reasoning as the big comment on PopupShell above, just already
// satisfied here without needing the AuthFlowPopup-style split.
// -----------------------------------------------------------------------

function SignOutPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<'confirm' | 'done'>('confirm');
  const {logout} = useAuth();

  async function handleSignOut() {
    await logout();
    setStage('done');
  }

  if (stage === 'done') {
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
    try {
      await deleteUser({email: user?.email || "", password: password});
    } catch {
      setError('Incorrect password.');
      return;
    }
    setStage('done');
  }

  if (stage === 'done') {
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
      // deleteHistory expects a numeric id -- paperId comes in as a
      // string here for consistency with the other popup props (e.g.
      // difficultySelect's paperId), so it's converted right at the call
      // site instead.
      await deleteHistory(Number(paperId));
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
// Account / auth forms.
//
// These are now "Body"-only components: no PopupShell, no footer, no
// onClose. AuthFlowPopup (below) is the single owner of ONE PopupShell
// instance for the whole Login <-> Create Account <-> Forgot Password <->
// Confirm Password <-> New Password flow (plus each one's success
// screen) -- it computes the title and footer per view itself and just
// swaps which Body renders as PopupShell's children. That's what fixes
// the flicker: same PopupShell element across every view change, only
// its props differ.
//
// Every handleSubmit below follows the same shape: only the actual network
// call sits inside try/catch. The "on success" callback is called
// unconditionally after, never inside the try — otherwise a problem in
// that callback gets mislabeled as an auth failure.
// -----------------------------------------------------------------------

function CreateAccountBody({
  onAccountCreated,
  onLogin,
}: {
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
    } catch {
      setError('Invalid email.');
      return;
    }
    onAccountCreated();
  }

  return (
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
  );
}

function LoginBody({
  onForgotPassword,
  onCreateAccount,
  onLoginSuccess,
}: {
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
  );
}

function ForgotPasswordBody({
  onEmailSent,
  onReturnToLogin,
}: {
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
      // TODO: verify if implementation is correct
      await requestPasswordReset(email);
    } catch {
      setError('Invalid email.');
      return;
    }
    onEmailSent();
  }

  return (
    <form id="forgot-password-form" className={styles.form} onSubmit={handleSubmit}>
      {error ? (
        <p className={`${styles.topText} ${styles.error}`}>{error}</p>
      ) : (
        <p className={styles.topText}>Enter your email and we will send a password reset link.</p>
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
  );
}

function ConfirmPasswordBody({ onConfirmed }: { onConfirmed: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {user, login} = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // TODO: verify that it logs in w current password
      await login({email: user?.email || "", password: password});
    } catch {
      setError('Incorrect password.');
      return;
    }
    onConfirmed();
  }

  return (
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
  );
}

function NewPasswordBody({ onPasswordChanged }: { onPasswordChanged: () => void }) {
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
    } catch {
      setError('Could not update password. Please try again.');
      return;
    }
    onPasswordChanged();
  }

  return (
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
  );
}

// Shared by every "success" view below -- an optional message pinned
// under the title, and a centered "Return to Home" (or custom-labeled)
// button. Title itself is owned by AuthFlowPopup's per-view lookup.
function AuthSuccessBody({
  message,
  buttonText = 'Return to Home',
}: {
  message?: string;
  buttonText?: string;
}) {
  const router = useRouter();

  return (
    <>
      {message && <p className={styles.topText}>{message}</p>}
      <button type="button" className={styles.buttonNeutral} onClick={() => router.push('/')}>
        {buttonText}
      </button>
    </>
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

const AUTH_VIEW_TITLES: Record<AuthView, string> = {
  login: 'Log In',
  createAccount: 'Create Account',
  forgotPassword: 'Forgot Password',
  confirmPassword: 'Confirm Password',
  newPassword: 'New Password',
  loginSuccess: 'Login Successful!',
  accountCreated: 'Account Created!',
  emailSent: 'Email Sent!',
  passwordChanged: 'Password Changed!',
};

function AuthFlowPopup({ initialView, onClose }: { initialView: AuthView; onClose: () => void }) {
  const [view, setView] = useState<AuthView>(initialView);

  let body: ReactNode;
  let footer: ReactNode;

  switch (view) {
    case 'login':
      body = (
        <LoginBody
          onForgotPassword={() => setView('forgotPassword')}
          onCreateAccount={() => setView('createAccount')}
          onLoginSuccess={() => setView('loginSuccess')}
        />
      );
      footer = (
        <button type="submit" form="login-form" className={styles.buttonNeutral}>
          Log In
        </button>
      );
      break;
    case 'createAccount':
      body = (
        <CreateAccountBody
          onAccountCreated={() => setView('accountCreated')}
          onLogin={() => setView('login')}
        />
      );
      footer = (
        <button type="submit" form="create-account-form" className={styles.buttonNeutral}>
          Create Account
        </button>
      );
      break;
    case 'forgotPassword':
      body = (
        <ForgotPasswordBody
          onEmailSent={() => setView('emailSent')}
          onReturnToLogin={() => setView('login')}
        />
      );
      footer = (
        <button type="submit" form="forgot-password-form" className={styles.buttonNeutral}>
          Send Reset Link
        </button>
      );
      break;
    case 'confirmPassword':
      body = <ConfirmPasswordBody onConfirmed={() => setView('newPassword')} />;
      footer = (
        <button type="submit" form="confirm-password-form" className={styles.buttonNeutral}>
          Confirm
        </button>
      );
      break;
    case 'newPassword':
      body = <NewPasswordBody onPasswordChanged={() => setView('passwordChanged')} />;
      footer = (
        <button type="submit" form="new-password-form" className={styles.buttonNeutral}>
          Change Password
        </button>
      );
      break;
    case 'loginSuccess':
      body = <AuthSuccessBody />;
      footer = undefined;
      break;
    case 'accountCreated':
      body = (
        <AuthSuccessBody
          message="To get started, upload a PDF on the home page"
          buttonText="Get Started"
        />
      );
      footer = undefined;
      break;
    case 'emailSent':
      body = (
        <AuthSuccessBody message="Please check your email for instructions to reset your password." />
      );
      footer = undefined;
      break;
    case 'passwordChanged':
      body = <AuthSuccessBody />;
      footer = undefined;
      break;
  }

  return (
    <PopupShell title={AUTH_VIEW_TITLES[view]} onClose={onClose} footer={footer}>
      {body}
    </PopupShell>
  );
}

// -----------------------------------------------------------------------
// Dispatcher — <Popup type="login" ... /> picks the variation.
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