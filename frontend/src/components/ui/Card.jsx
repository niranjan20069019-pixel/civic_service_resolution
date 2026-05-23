import { T } from "../../theme.js";

export default function Card({ children, style={}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background:T.surface, borderRadius:16, border:`1px solid ${T.border}`,
        padding:"20px 24px", cursor:onClick?"pointer":"default",
        transition:"all 0.2s", backdropFilter:"blur(12px)", ...style,
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.boxShadow="0 4px 32px rgba(6,182,212,0.12)";
        e.currentTarget.style.borderColor="rgba(6,182,212,0.25)";
        e.currentTarget.style.transform="translateY(-2px)";
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.boxShadow="none";
        e.currentTarget.style.borderColor=T.border;
        e.currentTarget.style.transform="none";
      } : undefined}
    >
      {children}
    </div>
  );
}
