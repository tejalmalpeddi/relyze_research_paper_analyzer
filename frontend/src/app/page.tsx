import Image from "next/image";
import AuthTest from "./auth/auth-test";
import {AuthProvider} from "./auth/auth-query";

export default function Home() {
  return (
    <AuthProvider>
    <AuthTest />
    </AuthProvider>
  );
}
