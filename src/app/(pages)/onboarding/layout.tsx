import ForceDarkTheme from "@/components/authentication/ForceDarkTheme";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceDarkTheme />
      {children}
    </>
  );
}
