
import Image from "next/image";
import BgGradient from "../../_assets/images/gradient-bg.png";
import leftImage from "../../_assets/images/Ellipse 40 (1).png";
import rightImage from "../../_assets/images/Ellipse 40.png"
import LightleftImage from "../../_assets/images/Light_left_Image.png";
import LightrightImage from "../../_assets/images/Light_right_Image.png"
export default function AuthBackground({ children }: { children: React.ReactNode }) {

  const isLight = false

  return (
    <div className="min-h-screen flex items-center relative justify-center p-4 bg-gradient-custom">
      
      <div
        className="backend-gradient-wrapper"
        style={{
          backgroundImage: `url(${BgGradient.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="left-bottom-gradient">
          <Image
            src={isLight ? LightrightImage : rightImage}
            alt="Right Image"
            width={0}
            height={0}
            sizes="100vw"
            draggable={false}
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="right-top-gradient">
          <Image
            src={isLight ? LightleftImage : leftImage}
            alt="Left Image"
            width={0}
            height={0}
            sizes="100vw"
            draggable={false}
            style={{ width: "auto", height: "auto" }}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
