/* ============================================================
   SPIN WHEEL — chunky candy wheel, sticker pointer, prize slices
   ============================================================ */
function SpinWheel({ onResult, plays }) {
  const SLICES = [
    PRIZES.drink, PRIZES.miss, PRIZES.off20, PRIZES.bogo,
    PRIZES.gift, PRIZES.miss, PRIZES.topping, PRIZES.jackpot,
  ];
  const sliceColors = [POP.aqua, "#EAD9F2", POP.bubble, POP.sun, POP.grape, "#EAD9F2", POP.coral, POP.mint];
  const N = SLICES.length;
  const slice = 360 / N;
  const SIZE = 300, R = SIZE / 2;

  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [tick, setTick] = React.useState(false);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    const idx = Math.floor(Math.random() * N);
    // pointer is at top (-90deg). Land center of idx slice under pointer.
    const turns = 5 + Math.floor(Math.random() * 3);
    const target = turns * 360 + (360 - (idx * slice + slice / 2));
    const final = rotation - (rotation % 360) + target;
    setRotation(final);
    setTimeout(() => {
      setSpinning(false);
      if (!SLICES[idx].loss) window.fireConfetti(60);
      setTimeout(() => onResult(SLICES[idx]), 700);
    }, 4400);
  }

  // peg-tick animation while spinning
  React.useEffect(() => {
    if (!spinning) return;
    const i = setInterval(() => setTick((t) => !t), 90);
    return () => clearInterval(i);
  }, [spinning]);

  function sliceLabel(p) {
    return p.loss ? "TRY AGAIN" : p.label.toUpperCase();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center", gap: 26, padding: "0 16px" }}>
      <div className="pop-display titlepop" style={{ fontSize: 38, textAlign: "center", lineHeight: .95 }}>
        SPIN<br />TO WIN
      </div>

      <div style={{ position: "relative", width: SIZE + 36, height: SIZE + 36, display: "grid", placeItems: "center" }}>
        {/* outer ring with pegs */}
        <div className="sticker-lg" style={{
          position: "absolute", inset: 6, borderRadius: "50%", background: POP.ink,
          padding: 12, boxShadow: "0 8px 0 " + POP.ink + ", inset 0 0 0 0 #000",
        }}>
          {Array.from({ length: N }).map((_, i) => {
            const a = (i * slice - 90) * (Math.PI / 180);
            const rr = R + 8;
            return <span key={i} style={{
              position: "absolute", width: 12, height: 12, borderRadius: "50%",
              background: POP.sun, border: "2px solid " + POP.ink,
              left: R + 6 + Math.cos(a) * rr - 6, top: R + 6 + Math.sin(a) * rr - 6,
              boxShadow: tick && spinning ? "0 0 8px " + POP.sun : "none",
            }} />;
          })}

          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.4s cubic-bezier(.15,.7,.12,1)" : "none",
            display: "block",
          }}>
            {SLICES.map((p, i) => {
              const a0 = (i * slice - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
              const x0 = R + R * Math.cos(a0), y0 = R + R * Math.sin(a0);
              const x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1);
              const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
              const ic = { x: R + R * 0.66 * Math.cos(mid), y: R + R * 0.66 * Math.sin(mid) };
              const tc = { x: R + R * 0.4 * Math.cos(mid), y: R + R * 0.4 * Math.sin(mid) };
              const rot = i * slice + slice / 2;
              return (
                <g key={i}>
                  <path d={`M${R},${R} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`}
                    fill={sliceColors[i]} stroke={POP.ink} strokeWidth="3" strokeLinejoin="round" />
                  <text x={ic.x} y={ic.y} fontSize="30" textAnchor="middle" dominantBaseline="central"
                    transform={`rotate(${rot},${ic.x},${ic.y})`}>{p.icon}</text>
                  <text x={tc.x} y={tc.y} fontSize="11" textAnchor="middle" dominantBaseline="central"
                    fontFamily="Luckiest Guy, cursive" fill={POP.ink}
                    transform={`rotate(${rot},${tc.x},${tc.y})`}>{sliceLabel(p)}</text>
                </g>
              );
            })}
          </svg>

          {/* hub */}
          <div className="sticker" style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            width: 66, height: 66, borderRadius: "50%", background: POP.paper,
            display: "grid", placeItems: "center", zIndex: 5,
          }}>
            <Sparkle size={30} color={POP.coral} />
          </div>
        </div>

        {/* pointer */}
        <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%) rotate(180deg)", zIndex: 10, filter: `drop-shadow(2px -2px 0 ${POP.ink})` }}>
          <svg width="40" height="46" viewBox="0 0 40 46">
            <path d="M20 46 L4 8 Q20 -4 36 8 Z" fill={POP.coral} stroke={POP.ink} strokeWidth="3" strokeLinejoin="round" />
            <circle cx="20" cy="14" r="5" fill={POP.paper} stroke={POP.ink} strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      <PopButton color={POP.sun} onClick={spin} disabled={spinning || plays <= 0}
        style={spinning ? {} : { animation: "wob 1.6s ease-in-out infinite" }}>
        {spinning ? "GOOD LUCK…" : plays > 0 ? "SPIN!" : "NO PLAYS LEFT"}
      </PopButton>
    </div>
  );
}
window.SpinWheel = SpinWheel;
