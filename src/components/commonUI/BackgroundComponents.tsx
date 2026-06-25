import React from "react";
import BgGradient from "../../_assets/images/gradient-bg.png";

type BackgroundComponentsProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function BackgroundComponents({
  children,
  style,
}: BackgroundComponentsProps) {
  return (
    <div className="min-h-screen" style={style}>
      <div
        className=""
        style={{
          backgroundImage: `url(${BgGradient.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
