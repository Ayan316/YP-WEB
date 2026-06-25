import ForceDarkTheme from "@/components/authentication/ForceDarkTheme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceDarkTheme />
      {children}
    </>
  );
}
