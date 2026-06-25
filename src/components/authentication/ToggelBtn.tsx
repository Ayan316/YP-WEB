"use client";

interface ToggleBtnProps {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
}

const ToggleBtn = ({ isLogin, setIsLogin }: ToggleBtnProps) => {
  return (
    <div className="signup-login-btn-wrapper">

      <button
        className={`btn-custom cursor-pointer ${isLogin ? "active" : ""}`}
        onClick={() => setIsLogin(true)}
      >
        Login
      </button>

      <button
        className={`btn-custom cursor-pointer ${!isLogin ? "active" : ""}`}
        onClick={() => setIsLogin(false)}
      >
        Sign up
      </button>
      
    </div>
  );
};

export default ToggleBtn;
