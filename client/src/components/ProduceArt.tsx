import { Sprout } from "lucide-react";

export default function ProduceArt({ type, compact = false }: { type: string; compact?: boolean }) {
  const styles: Record<string, { circle: string; a: string; b: string; c: string }> = {
    tomato: { circle: "bg-[#f6d6b8]", a: "bg-[#db5e45]", b: "bg-[#ee815e]", c: "#518144" },
    onion: { circle: "bg-[#e6dcdd]", a: "bg-[#9a5270]", b: "bg-[#c27d8f]", c: "#6c8244" },
    groundnut: { circle: "bg-[#eee3bc]", a: "bg-[#bd8743]", b: "bg-[#e1b15c]", c: "#647949" },
    paddy: { circle: "bg-[#e6e7b4]", a: "bg-[#bd9d35]", b: "bg-[#e2ca5b]", c: "#668242" },
  };
  const s = styles[type] ?? styles.tomato;
  return <div className={`relative grid place-items-center overflow-hidden rounded-[1.5rem] ${s.circle} ${compact ? "h-16 w-16" : "h-40 w-full"}`}><div className={`absolute h-16 w-16 rounded-[45%_55%_52%_48%] ${s.a} shadow-sm ${compact ? "scale-75" : ""}`} /><div className={`absolute ml-8 mt-5 h-12 w-12 rounded-[55%_45%_50%_50%] ${s.b} ${compact ? "scale-75" : ""}`} /><Sprout className="absolute -mt-14" style={{ color: s.c }} size={compact ? 20 : 29} strokeWidth={2.25} /><span className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-forest"><Sprout size={14} /></span></div>;
}
