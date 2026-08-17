'use client';

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import DifficultySelect, { type Difficulty } from '@/components/difficulty-select/DifficultySelect';
// popup.tsx itself has no self-reference to fix here -- the "/components/popups/popup"
// path is what OTHER files (like profile/page.tsx) import this file as.
import styles from './popup.module.css';
import {deleteHistory} from '@/lib/api'
import {useAuth} from '@/app/auth/auth-query'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pollUploadStatus(uploadId: string, onParsingComplete: (paperId: string) => void) {
  const timeoutId = window.setTimeout(() => onParsingComplete(uploadId), 800);
  return () => window.clearTimeout(timeoutId);
}

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
  onClose: () => void;
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
      onClose();
    }
  }

  const content = (
    <div className="fixed top-0 left-0 size-full" onClick={handleBackdropClick}>
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
// Together these form one self-contained flow: `UploadFlowPopup` owns the
// transition from "uploading" to "difficulty select" itself once the parser
// signals completion, so the parent never needs to know this happened or
// re-render with a different `type`.
// -----------------------------------------------------------------------

function UploadingPopup({
  uploadId,
  onParsingComplete,
  onClose,
}: {
  uploadId: string;
  onParsingComplete: (paperId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    // Skeleton: swap pollUploadStatus for whatever the python PDF parser
    // actually gives us (websocket push, webhook-fed status route, etc).
    const cleanup = pollUploadStatus(uploadId, onParsingComplete);
    return cleanup;
  }, [uploadId, onParsingComplete]);

  return (
    <PopupShell title="Uploading paper..." onClose={onClose}>
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
    // TODO: double check these route paths match your actual app routes.
    router.push(`${path}?id=${paperId}`);
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

type UploadFlowState =
  | { view: 'uploading'; uploadId: string }
  | { view: 'difficultySelect'; paperId: string };

function UploadFlowPopup({ uploadId, onClose }: { uploadId: string; onClose: () => void }) {
  const [state, setState] = useState<UploadFlowState>({ view: 'uploading', uploadId });

  if (state.view === 'difficultySelect') {
    return <DifficultySelectPopup paperId={state.paperId} onClose={onClose} />;
  }

  return (
    <UploadingPopup
      uploadId={state.uploadId}
      onParsingComplete={(paperId) => setState({ view: 'difficultySelect', paperId })}
      onClose={onClose}
    />
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
    // Two stacked buttons rather than the shared single-button
    // AuthSuccessPopup: "Log In to Another Account" just closes this popup
    // (onClose) -- since the user is unauthenticated again at this point,
    // the parent page's own login-gate picks up automatically once nothing
    // else is open, rather than this popup needing to know how to open the
    // login popup itself.
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
  async function handleDelete() {
    // TODO: real delete call; only fire onDeleted on success.
    await deleteHistory(paperId);
    onDeleted();
  }

  return (
    <PopupShell
      title="Delete Paper"
      onClose={onClose}
      footer={
        <menu className={styles.buttonRow}>
          <li>
            <button type="button" className={styles.buttonNeutral} onClick={onClose}>
              Keep
            </button>
          </li>
          <li>
            <button type="button" className={styles.buttonDanger} onClick={handleDelete}>
              Delete
            </button>
          </li>
        </menu>
      }
    >
      <p>Are you sure you want to delete &quot;{paperTitle}&quot;?</p>
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
    } catch {
      setError('Invalid email.');
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
    } catch {
      setError('Invalid email.');
      return;
    }
    onEmailSent();
  }

  return (
    <PopupShell
      title="Forgot Password"
      onClose={onClose}
      footer={
        <button type="submit" form="forgot-password-form" className={styles.buttonNeutral}>
          Send Reset Link
        </button>
      }
    >
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
      // TODO: verify that it logs in w current password
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
        <button type="submit" form="confirm-password-form" className={styles.buttonNeutral}>
          Confirm
        </button>
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
    } catch {
      setError('Could not update password. Please try again.');
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
        <AuthSuccessPopup
          title="Email Sent!"
          message="Please check your email for instructions to reset your password."
          onClose={onClose}
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
  | { type: 'uploading'; uploadId: string; onClose: () => void }
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
      return <UploadFlowPopup uploadId={props.uploadId} onClose={props.onClose} />;
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
