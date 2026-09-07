import Image from "next/image";

export default function HeroImage() {
  return <Image className="home-hero-image" src="/images/hero_bg.jpg" alt="" aria-hidden="true" width={1920} height={2560} preload sizes="100vw" />;
}