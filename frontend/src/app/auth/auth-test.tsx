'use client';

import { useState } from 'react';
import { useAuth } from './auth-query';

export default function AuthTest() {
    const { user, isLoading, isAuthenticated, login, signup, loginAnonymously, logout, editUser, deleteUser } = useAuth();

    const [email, setEmail] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [newEmail, setNewEmail] = useState<string>('');
    const [msg, setMsg] = useState<string>('');

    if (isLoading) return <h1>LOADING</h1>;

    const handleAction = async (actionFn: () => Promise<unknown>,
        successText?: string) => {
        try {
            setMsg('');
            await actionFn();
            if (successText) setMsg(successText);
        } catch (err) {
            setMsg(`Error: ${(err as Error).message}`);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif' , alignItems: 'center', paddingTop: '140px'}}>
            {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}

            {!isAuthenticated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3>Sign In / Register</h3>
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <button onClick={() => handleAction(() => login({ email, password }), 'Logged in')}>
                        Login
                    </button>

                    <button onClick={() => handleAction(() => signup({ email, password }), 'Signed up!')}>
                        Sign Up
                    </button>

                    <hr style={{ width: '100%', margin: '10px 0' }} />

                    <button onClick={() => handleAction(() => loginAnonymously(), 'Signed in anonymously!')}>
                        Sign In Anonymously (Guest)
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3>User Profile</h3>
                    <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px' }}>
                        <p><strong>User ID:</strong> {user?.id ?? 'N/A'}</p>
                        <p><strong>Email:</strong> {user?.email || 'Guest (Anonymous)'}</p>
                        <p><strong>Is Anonymous?</strong> {user?.is_anonymous ? 'Anonymous' : 'Not Anonymous'}</p>
                    </div>

                    <h4>Edit User Profile</h4>
                    <input
                        type="email"
                        placeholder="New Email Address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <button onClick={() => handleAction(() => editUser({ email: newEmail }), 'User email updated!')}>
                        Update Email
                    </button>

                    <hr style={{ width: '100%', margin: '10px 0' }} />

                    <button onClick={() => handleAction(() => logout(), 'Logged out successfully!')}>
                        Sign Out
                    </button>

                    <button
                        style={{ backgroundColor: 'red', color: 'white' }}
                        onClick={() => handleAction(() => deleteUser(), 'Account deleted!')}
                    >
                        Delete Account
                    </button>
                </div>
            )}
        </div>
    );
}
