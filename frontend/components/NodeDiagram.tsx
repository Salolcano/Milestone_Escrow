/**
 * The hero drawing: the real structure of the app.
 * Money moves along the thick line (client > contract > freelancer).
 * Validators sit on the ring and only answer questions about the evidence.
 */
const CENTER = { x: 480, y: 220 };
const RING = 190;
const VALIDATOR_ANGLES = [-90, -18, 54, 126, 198];

const validators = VALIDATOR_ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round(CENTER.x + RING * Math.cos(rad)),
    y: Math.round(CENTER.y + RING * Math.sin(rad)),
  };
});

function delay(seconds: number): React.CSSProperties {
  return { ["--delay" as string]: `${seconds}s` };
}

export function NodeDiagram() {
  return (
    <>
    <svg
      viewBox="0 0 960 440"
      role="img"
      aria-label="The client's money goes into the escrow contract. Validators check the freelancer's evidence. The contract then pays the freelancer."
      className="w-full h-auto"
      fill="none"
    >
      {/* rings */}
      <g className="pop" style={delay(0.1)} stroke="var(--input)" strokeWidth="1" strokeDasharray="3 6">
        <circle cx={CENTER.x} cy={CENTER.y} r="110" />
        <circle cx={CENTER.x} cy={CENTER.y} r={RING} />
      </g>

      {/* validator spokes */}
      <g stroke="var(--foreground)" strokeWidth="1">
        {validators.map((v, i) => (
          <line
            key={i}
            x1={v.x}
            y1={v.y}
            x2={CENTER.x}
            y2={CENTER.y}
            className="draw"
            style={{ ["--len" as string]: 220, ["--delay" as string]: `${0.9 + i * 0.12}s` } as React.CSSProperties}
          />
        ))}
      </g>

      {/* money path */}
      <g stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round">
        <line
          x1="154"
          y1={CENTER.y}
          x2="426"
          y2={CENTER.y}
          className="draw"
          style={{ ["--len" as string]: 280, ["--delay" as string]: "0.2s" } as React.CSSProperties}
        />
        <line
          x1="534"
          y1={CENTER.y}
          x2="806"
          y2={CENTER.y}
          className="draw"
          style={{ ["--len" as string]: 280, ["--delay" as string]: "1.5s" } as React.CSSProperties}
        />
      </g>

      {/* validators */}
      {validators.map((v, i) => (
        <circle
          key={i}
          cx={v.x}
          cy={v.y}
          r="9"
          fill="var(--background)"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          className="pop"
          style={delay(0.9 + i * 0.12)}
        />
      ))}
      <text
        x={validators[0].x + 20}
        y={validators[0].y + 5}
        fontSize="15"
        fill="var(--muted-foreground)"
        className="pop max-md:hidden"
        style={delay(1.6)}
      >
        Validators check the evidence
      </text>

      {/* client */}
      <g className="pop" style={delay(0)}>
        <circle cx="120" cy={CENTER.y} r="34" fill="var(--background)" stroke="var(--foreground)" strokeWidth="1.5" />
        <text className="max-md:hidden" x="120" y={CENTER.y + 66} textAnchor="middle" fontSize="16" fill="var(--foreground)">
          Client locks GEN
        </text>
      </g>

      {/* contract */}
      <g className="pop" style={delay(0.6)}>
        <circle cx={CENTER.x} cy={CENTER.y} r="52" fill="var(--foreground)" />
        <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--background)">
          Escrow
        </text>
      </g>

      {/* freelancer */}
      <g className="pop" style={delay(1.9)}>
        <circle cx="840" cy={CENTER.y} r="34" fill="var(--background)" stroke="var(--foreground)" strokeWidth="1.5" />
        <text className="max-md:hidden" x="840" y={CENTER.y + 66} textAnchor="middle" fontSize="16" fill="var(--foreground)">
          Freelancer gets paid
        </text>
      </g>
    </svg>
    <p className="mt-4 text-sm text-muted-foreground md:hidden">
      The client locks GEN. Validators check the evidence. The contract pays the freelancer.
    </p>
    </>
  );
}
