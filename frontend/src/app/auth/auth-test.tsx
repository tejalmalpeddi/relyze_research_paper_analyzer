'use client'
import {createContext, useContext, useEffect, useState} from 'react';

const AuthContext = createContext(0);

export const useAuth = () => useContext(AuthContext);

export default function Auth() {
    return (
        <div>
            <button>Sign In</button>
            {/* post /auth/login */}
            <button>Sign Out</button>
            {/* post /auth/logout */}
            <button>Create New User</button>
            {/* post /auth/signup */}
            <button>Edit User</button>
            {/* put /users/me */}
            <button>Delete User</button>
            {/* delete /users/me */}
            <button>Get User Info</button>
            {/* get /users/me */}
            <button>Create New History</button>
            {/* post /history/create*/}
            <button>Sign In Anonymously</button>
            <button>Create User after anonymous sign in</button>
        </div>
    );
}