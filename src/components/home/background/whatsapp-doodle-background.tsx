import { useId } from "react";

export default function WhatsappDoodleBackground() {
  const patternId = useId();
  return <svg className="home-doodle" width="100%" height="100%" aria-hidden="true">
    <defs><pattern id={patternId} width="420" height="360" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(28 35) rotate(-12)"><rect width="38" height="58" rx="4" /><path d="M5 19h28M5 38h28M9 9h12M9 28h12M9 47h12" /><circle cx="29" cy="9" r="1" /><circle cx="29" cy="28" r="1" /><circle cx="29" cy="47" r="1" /></g>
        <g transform="translate(165 18) rotate(12)"><ellipse cx="20" cy="8" rx="20" ry="8" /><path d="M0 8v35c0 11 40 11 40 0V8M0 25c0 11 40 11 40 0" /><circle cx="45" cy="35" r="5" /><path d="m45 40 0 14m0-5h5" /></g>
        <g transform="translate(290 56) rotate(-8)"><rect width="61" height="39" rx="5" /><path d="m10 13 7 7-7 7m15 0h12M15 0v-9m30 9v-9M18 39v10h26V39" /></g>
        <g transform="translate(99 133) rotate(9)"><circle cx="0" cy="0" r="5" /><circle cx="0" cy="49" r="5" /><circle cx="34" cy="8" r="5" /><path d="M0 5v39M34 13v6C34 33 0 20 0 37" /></g>
        <g transform="translate(222 142) rotate(-15)"><rect width="38" height="38" rx="4" /><rect x="9" y="9" width="20" height="20" rx="2" /><path d="M8-7v7m11-7v7m11-7v7M8 38v7m11-7v7m11-7v7M-7 8h7m-7 11h7m-7 11h7M38 8h7m-7 11h7m-7 11h7" /></g>
        <g transform="translate(342 192) rotate(9)"><path d="m20 0 20 8v18c0 15-20 26-20 26S0 41 0 26V8Z" /><rect x="11" y="20" width="18" height="14" rx="3" /><path d="M15 20v-5a5 5 0 0 1 10 0v5m-5 6v3" /></g>
        <g transform="translate(26 265) rotate(-6)"><path d="m0 10 22-10 22 10-22 10Zm0 12 22 10 22-10M0 34l22 10 22-10" /><path d="M49 8h18v28h15" /><circle cx="86" cy="36" r="4" /></g>
        <g transform="translate(167 275) rotate(8)"><rect width="54" height="25" rx="5" /><path d="M10 12h8m10 0h4m8 0h4M27 25v17m-20 0h40M7 42v10m40-10v10" /><circle cx="7" cy="57" r="5" /><circle cx="47" cy="57" r="5" /></g>
        <path d="M310 310c-21-21 34-35 15-54m-48-135 8 5m-7 4 9-1M132 87l8 9m-10-1 10-8M373 325h12m-6-6v12" />
      </g>
    </pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </svg>;
}