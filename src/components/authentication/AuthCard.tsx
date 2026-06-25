export default function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="content-signup-card">
        <div className="form-card">
      {children}
        </div>
    </div>
  );
}
