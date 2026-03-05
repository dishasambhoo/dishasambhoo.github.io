import { useState, useEffect, useRef, useCallback } from "react";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap";
document.head.appendChild(fontLink);

const css = `
  @keyframes rollDice {
    0%   { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
    20%  { transform: rotateX(180deg) rotateY(90deg) rotateZ(45deg); }
    40%  { transform: rotateX(90deg) rotateY(270deg) rotateZ(180deg); }
    60%  { transform: rotateX(270deg) rotateY(180deg) rotateZ(90deg); }
    80%  { transform: rotateX(180deg) rotateY(360deg) rotateZ(270deg); }
    100% { transform: rotateX(360deg) rotateY(540deg) rotateZ(360deg); }
  }
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes fadeInDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
  @keyframes slideToken { }
  @keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
  @keyframes confetti { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(100vh) rotate(720deg)} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 15px rgba(255,220,50,0.5)} 50%{box-shadow:0 0 30px rgba(255,220,50,0.9),0 0 50px rgba(255,180,0,0.4)} }
  .rolling { animation: rollDice 0.6s ease-in-out; }
  .token-bounce { animation: bounce 0.4s ease; }
  .pop-in { animation: popIn 0.4s ease; }
  .glow-active { animation: glowPulse 1.5s ease infinite; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ─── Game Data ───────────────────────────────────────────────────────────────
const SNAKES = { 99:78, 95:75, 92:88, 89:68, 74:53, 64:60, 62:19, 49:11, 46:25, 16:6 };
const LADDERS = { 4:14, 9:31, 20:38, 28:84, 40:59, 51:67, 63:81, 71:91 };

const PLAYERS = [
  { id:0, name:"Player 1", color:"#e74c3c", light:"#ff8a80", emoji:"🔴" },
  { id:1, name:"Player 2", color:"#3498db", light:"#80d8ff", emoji:"🔵" },
  { id:2, name:"Player 3", color:"#2ecc71", light:"#b9f6ca", emoji:"🟢" },
  { id:3, name:"Player 4", color:"#f39c12", light:"#ffe57f", emoji:"🟡" },
];

// Build board: cell 1 = bottom-left, 100 = top-left (zigzag)
function cellToXY(cell) {
  const row = Math.floor((cell - 1) / 10); // 0=bottom
  const col = (cell - 1) % 10;
  const x = row % 2 === 0 ? col : 9 - col;
  const y = 9 - row;
  return { x, y };
}

const DOT_POSITIONS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
};

// ─── Dice Face ────────────────────────────────────────────────────────────────
function DiceFace({ value, rolling, onClick, disabled }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={rolling ? "rolling" : ""}
      style={{
        width: 72, height: 72,
        background: "linear-gradient(145deg, #ffffff, #e8e8e8)",
        borderRadius: 14,
        boxShadow: disabled
          ? "2px 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)"
          : "3px 3px 8px rgba(0,0,0,0.3), -1px -1px 4px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.9)",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "transform 0.1s, box-shadow 0.1s",
        transform: disabled ? "none" : "translateY(0)",
        userSelect: "none",
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", padding: 8 }}>
        {(DOT_POSITIONS[value] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill="#2c2c2c" />
        ))}
      </svg>
    </div>
  );
}

// ─── Snake SVG ────────────────────────────────────────────────────────────────
function SnakesSVG({ cellSize }) {
  const snakeColors = ["#e74c3c","#8e44ad","#c0392b","#d35400","#16a085","#27ae60","#2980b9","#8e44ad","#e74c3c","#c0392b"];
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}>
      {Object.entries(SNAKES).map(([from, to], idx) => {
        const f = cellToXY(Number(from));
        const t = cellToXY(Number(to));
        const fx = (f.x + 0.5) * cellSize, fy = (f.y + 0.5) * cellSize;
        const tx = (t.x + 0.5) * cellSize, ty = (t.y + 0.5) * cellSize;
        const color = snakeColors[idx % snakeColors.length];
        const mx = (fx + tx) / 2 + (Math.random() > 0.5 ? 30 : -30);
        const my = (fy + ty) / 2;
        return (
          <g key={from}>
            <path d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`}
              stroke={color} strokeWidth={cellSize*0.28} fill="none"
              strokeLinecap="round" opacity={0.75}
            />
            <path d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`}
              stroke="rgba(255,255,255,0.3)" strokeWidth={cellSize*0.1} fill="none"
              strokeLinecap="round"
            />
            {/* Snake head */}
            <circle cx={fx} cy={fy} r={cellSize*0.18} fill={color} stroke="white" strokeWidth={1.5}/>
            <circle cx={fx - cellSize*0.06} cy={fy - cellSize*0.06} r={cellSize*0.05} fill="white"/>
            <circle cx={fx + cellSize*0.06} cy={fy - cellSize*0.06} r={cellSize*0.05} fill="white"/>
            <circle cx={fx - cellSize*0.06} cy={fy - cellSize*0.06} r={cellSize*0.025} fill="#222"/>
            <circle cx={fx + cellSize*0.06} cy={fy - cellSize*0.06} r={cellSize*0.025} fill="#222"/>
          </g>
        );
      })}
    </svg>
  );
}

function LaddersSVG({ cellSize }) {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}>
      {Object.entries(LADDERS).map(([from, to]) => {
        const f = cellToXY(Number(from));
        const t = cellToXY(Number(to));
        const fx = (f.x + 0.5) * cellSize, fy = (f.y + 0.5) * cellSize;
        const tx = (t.x + 0.5) * cellSize, ty = (t.y + 0.5) * cellSize;
        const dx = tx - fx, dy = ty - fy;
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = -dy/len * cellSize*0.12, ny = dx/len * cellSize*0.12;
        const steps = Math.round(len / (cellSize * 0.55));
        return (
          <g key={from}>
            <line x1={fx+nx} y1={fy+ny} x2={tx+nx} y2={ty+ny} stroke="#c0892a" strokeWidth={cellSize*0.09} strokeLinecap="round"/>
            <line x1={fx-nx} y1={fy-ny} x2={tx-nx} y2={ty-ny} stroke="#c0892a" strokeWidth={cellSize*0.09} strokeLinecap="round"/>
            {Array.from({length: steps}).map((_,i) => {
              const t2 = (i+1) / (steps+1);
              const rx = fx + dx*t2, ry = fy + dy*t2;
              return <line key={i} x1={rx+nx*1.3} y1={ry+ny*1.3} x2={rx-nx*1.3} y2={ry-ny*1.3} stroke="#e8a840" strokeWidth={cellSize*0.07} strokeLinecap="round"/>;
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Board Cell ───────────────────────────────────────────────────────────────
const CELL_COLORS = [
  ["#fff9e6","#fef3c7"],["#e6f7ff","#dbeafe"],["#f0fdf4","#dcfce7"],
  ["#fdf4ff","#f3e8ff"],["#fff1f2","#ffe4e6"],["#f0fdfa","#ccfbf1"],
];

function Board({ positions, numPlayers, cellSize }) {
  const cells = [];
  for (let n = 1; n <= 100; n++) {
    const { x, y } = cellToXY(n);
    const row = Math.floor((n-1)/10);
    const [c1, c2] = CELL_COLORS[(x + row) % CELL_COLORS.length];
    const isSnakeHead = n in SNAKES;
    const isLadderBase = n in LADDERS;
    cells.push(
      <div key={n} style={{
        position:"absolute",
        left: x * cellSize, top: y * cellSize,
        width: cellSize, height: cellSize,
        background: (x+row)%2===0 ? c1 : c2,
        border: "0.5px solid rgba(0,0,0,0.07)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-start",
        fontSize: cellSize * 0.2, color: "rgba(0,0,0,0.35)",
        fontFamily:"'Nunito',sans-serif", fontWeight:700,
        paddingTop: 2, boxSizing:"border-box",
        overflow:"hidden",
      }}>
        <span style={{lineHeight:1}}>{n}</span>
        {isSnakeHead && <span style={{fontSize:cellSize*0.28}}>🐍</span>}
        {isLadderBase && <span style={{fontSize:cellSize*0.28}}>🪜</span>}
      </div>
    );
  }

  // Tokens
  const tokenEls = [];
  for (let p = 0; p < numPlayers; p++) {
    const pos = positions[p];
    if (pos === 0) continue;
    const { x, y } = cellToXY(pos);
    const offsets = [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]];
    const [ox, oy] = offsets[p] || [0,0];
    const player = PLAYERS[p];
    tokenEls.push(
      <div key={p} className="pop-in" style={{
        position:"absolute",
        left: (x + 0.5 + ox) * cellSize - cellSize*0.16,
        top: (y + 0.5 + oy) * cellSize - cellSize*0.16,
        width: cellSize*0.32, height: cellSize*0.32,
        borderRadius:"50%",
        background: `radial-gradient(circle at 35% 35%, ${player.light}, ${player.color})`,
        border: "2px solid white",
        boxShadow:`0 2px 6px rgba(0,0,0,0.4)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: cellSize*0.16, zIndex:10,
        transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1), top 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        fontWeight:800, color:"white",
        fontFamily:"'Nunito',sans-serif",
      }}>
        {p+1}
      </div>
    );
  }

  return (
    <div style={{ position:"relative", width: cellSize*10, height: cellSize*10, flexShrink:0 }}>
      {cells}
      <LaddersSVG cellSize={cellSize}/>
      <SnakesSVG cellSize={cellSize}/>
      {tokenEls}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({length:40}).map((_,i) => ({
    left: Math.random()*100, delay: Math.random()*2,
    duration: 2+Math.random()*2, color: ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c"][i%6],
    size: 6+Math.random()*8,
  }));
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
      {pieces.map((p,i) => (
        <div key={i} style={{
          position:"absolute", left:`${p.left}%`, top:-20,
          width:p.size, height:p.size,
          background:p.color, borderRadius: i%3===0 ? "50%" : 2,
          animation:`confetti ${p.duration}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
    </div>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function SnakesAndLadders() {
  const [numPlayers, setNumPlayers] = useState(null);
  const [positions, setPositions] = useState([0,0,0,0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState(null);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("setup"); // setup | playing | won
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const startGame = (n) => {
    setNumPlayers(n);
    setPositions(Array(4).fill(0));
    setCurrentPlayer(0);
    setDiceValue(1);
    setWinner(null);
    setLog([`🎲 Game started with ${n} players! ${PLAYERS[0].name}'s turn.`]);
    setMessage(`${PLAYERS[0].name}'s turn — roll the dice!`);
    setPhase("playing");
  };

  const rollDice = useCallback(() => {
    if (rolling || winner) return;
    setRolling(true);
    const roll = Math.ceil(Math.random() * 6);

    // Animate through random values
    let ticks = 0;
    const maxTicks = 10;
    const interval = setInterval(() => {
      setDiceValue(Math.ceil(Math.random()*6));
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setDiceValue(roll);
        setRolling(false);

        setPositions(prev => {
          const next = [...prev];
          let pos = next[currentPlayer] + roll;
          let msg = `${PLAYERS[currentPlayer].emoji} ${PLAYERS[currentPlayer].name} rolled a ${roll}`;

          if (pos > 100) {
            msg += ` — too high, stays at ${next[currentPlayer]}!`;
            pos = next[currentPlayer];
          } else if (pos === 100) {
            next[currentPlayer] = 100;
            setWinner(currentPlayer);
            setPhase("won");
            msg += ` → 100! 🏆 WINNER!`;
            setLog(l => [...l, msg]);
            setMessage(`🏆 ${PLAYERS[currentPlayer].name} wins!`);
            return next;
          } else if (SNAKES[pos]) {
            const newPos = SNAKES[pos];
            msg += ` → ${pos} 🐍 Bitten! Slides to ${newPos}`;
            pos = newPos;
          } else if (LADDERS[pos]) {
            const newPos = LADDERS[pos];
            msg += ` → ${pos} 🪜 Ladder! Climbs to ${newPos}`;
            pos = newPos;
          } else {
            msg += ` → ${pos}`;
          }

          next[currentPlayer] = pos;
          const nextPlayer = (currentPlayer + 1) % numPlayers;
          setCurrentPlayer(nextPlayer);
          setMessage(`${PLAYERS[nextPlayer].name}'s turn — roll the dice!`);
          setLog(l => [...l, msg]);
          return next;
        });
      }
    }, 60);
  }, [rolling, winner, currentPlayer, numPlayers]);

  // Responsive cell size
  const cellSize = 52;

  if (phase === "setup") {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily:"'Fredoka One',cursive",
        padding: 20,
      }}>
        <div style={{
          background:"rgba(255,255,255,0.05)", backdropFilter:"blur(10px)",
          borderRadius:24, padding:"40px 48px", textAlign:"center",
          border:"1px solid rgba(255,255,255,0.1)",
          boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
          animation:"fadeInDown 0.6s ease both",
          maxWidth:400,
        }}>
          <div style={{fontSize:60,marginBottom:8}}>🐍🪜</div>
          <h1 style={{color:"#ffd700",fontSize:36,margin:"0 0 8px",textShadow:"0 2px 10px rgba(255,215,0,0.5)"}}>
            Snakes & Ladders
          </h1>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:14,fontFamily:"'Nunito',sans-serif",marginBottom:32}}>
            Classic board game — roll dice, climb ladders, avoid snakes!
          </p>
          <p style={{color:"rgba(255,255,255,0.8)",fontSize:16,marginBottom:20}}>
            How many players?
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            {[2,3,4].map(n => (
              <button key={n} onClick={() => startGame(n)} style={{
                width:70, height:70,
                background:`linear-gradient(145deg, ${PLAYERS[n-1].light}, ${PLAYERS[n-1].color})`,
                border:"none", borderRadius:16, fontSize:28,
                cursor:"pointer", color:"white", fontFamily:"'Fredoka One',cursive",
                boxShadow:"0 6px 20px rgba(0,0,0,0.3)",
                transition:"transform 0.15s, box-shadow 0.15s",
              }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 10px 28px rgba(0,0,0,0.4)"}}
              onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.3)"}}
              >{n}P</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display:"flex", flexDirection:"column", alignItems:"center",
      fontFamily:"'Nunito',sans-serif", padding:"16px 8px",
    }}>
      {phase === "won" && <Confetti/>}

      {/* Header */}
      <div style={{
        display:"flex",alignItems:"center",gap:12,marginBottom:14,
        animation:"fadeInDown 0.5s ease both",
      }}>
        <span style={{fontSize:28}}>🐍</span>
        <h1 style={{
          color:"#ffd700",fontSize:22,margin:0,
          fontFamily:"'Fredoka One',cursive",
          textShadow:"0 2px 10px rgba(255,215,0,0.4)",
        }}>Snakes & Ladders</h1>
        <span style={{fontSize:28}}>🪜</span>
      </div>

      <div style={{
        display:"flex", gap:16, alignItems:"flex-start",
        flexWrap:"wrap", justifyContent:"center", width:"100%", maxWidth:900,
      }}>
        {/* Board */}
        <div style={{
          borderRadius:12, overflow:"hidden",
          boxShadow:"0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,215,0,0.3)",
          flexShrink:0,
        }}>
          <Board positions={positions} numPlayers={numPlayers} cellSize={cellSize}/>
        </div>

        {/* Side panel */}
        <div style={{
          display:"flex", flexDirection:"column", gap:12,
          minWidth:200, maxWidth:240, flex:1,
        }}>
          {/* Player scores */}
          <div style={{
            background:"rgba(255,255,255,0.06)", borderRadius:14,
            padding:14, border:"1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,letterSpacing:2,marginBottom:10,textTransform:"uppercase"}}>Players</div>
            {Array.from({length:numPlayers}).map((_,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:8,
                padding:"6px 10px", borderRadius:10,
                background: currentPlayer===i && phase==="playing"
                  ? `rgba(${i===0?"231,76,60":i===1?"52,152,219":i===2?"46,204,113":"243,156,18"},0.2)`
                  : "rgba(255,255,255,0.04)",
                border: currentPlayer===i && phase==="playing"
                  ? `1px solid ${PLAYERS[i].color}60`
                  : "1px solid transparent",
                transition:"all 0.3s",
              }}>
                <div style={{
                  width:28,height:28,borderRadius:"50%",
                  background:`radial-gradient(circle at 35% 35%, ${PLAYERS[i].light}, ${PLAYERS[i].color})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"white",fontSize:12,fontWeight:800,
                  boxShadow:`0 2px 8px ${PLAYERS[i].color}80`,
                  flexShrink:0,
                }}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{color:"white",fontSize:12,fontWeight:700}}>{PLAYERS[i].name}</div>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:11}}>
                    Square {positions[i] || "Start"}
                  </div>
                </div>
                {currentPlayer===i && phase==="playing" && (
                  <div style={{
                    width:8,height:8,borderRadius:"50%",
                    background:PLAYERS[i].color,
                    animation:"pulse 1s ease infinite",
                    boxShadow:`0 0 8px ${PLAYERS[i].color}`,
                    flexShrink:0,
                  }}/>
                )}
              </div>
            ))}
          </div>

          {/* Dice + Roll */}
          <div style={{
            background:"rgba(255,255,255,0.06)", borderRadius:14,
            padding:16, border:"1px solid rgba(255,255,255,0.1)",
            display:"flex", flexDirection:"column", alignItems:"center", gap:12,
          }}>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,letterSpacing:2,textTransform:"uppercase",alignSelf:"flex-start"}}>Dice</div>
            <DiceFace value={diceValue} rolling={rolling} onClick={rollDice} disabled={rolling||phase!=="playing"}/>
            {phase === "playing" ? (
              <button onClick={rollDice} disabled={rolling} style={{
                width:"100%", padding:"10px 0",
                background: rolling
                  ? "rgba(255,255,255,0.1)"
                  : `linear-gradient(145deg, ${PLAYERS[currentPlayer].light}, ${PLAYERS[currentPlayer].color})`,
                border:"none", borderRadius:10,
                color:"white", fontSize:14, fontWeight:800,
                cursor: rolling ? "not-allowed" : "pointer",
                fontFamily:"'Fredoka One',cursive",
                boxShadow: rolling ? "none" : `0 4px 15px ${PLAYERS[currentPlayer].color}60`,
                transition:"all 0.2s",
                letterSpacing:1,
              }}>
                {rolling ? "Rolling..." : "🎲 Roll!"}
              </button>
            ) : (
              <button onClick={() => startGame(numPlayers)} style={{
                width:"100%", padding:"10px 0",
                background:"linear-gradient(145deg, #ffd700, #ff8c00)",
                border:"none", borderRadius:10,
                color:"white", fontSize:14, fontWeight:800,
                cursor:"pointer", fontFamily:"'Fredoka One',cursive",
                boxShadow:"0 4px 15px rgba(255,140,0,0.5)",
                letterSpacing:1,
              }}>🔄 Play Again</button>
            )}
            {/* Turn message */}
            <div style={{
              color: phase==="won" ? "#ffd700" : PLAYERS[currentPlayer].light,
              fontSize:11, textAlign:"center", fontWeight:700,
              minHeight:32, lineHeight:"1.4",
            }}>{message}</div>
          </div>

          {/* Log */}
          <div style={{
            background:"rgba(0,0,0,0.3)", borderRadius:14, padding:12,
            border:"1px solid rgba(255,255,255,0.07)", flex:1,
          }}>
            <div style={{color:"rgba(255,255,255,0.4)",fontSize:10,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Move Log</div>
            <div ref={logRef} style={{
              maxHeight:160, overflowY:"auto",
              scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.2) transparent",
            }}>
              {log.map((entry,i) => (
                <div key={i} style={{
                  color:"rgba(255,255,255,0.7)", fontSize:11, marginBottom:5,
                  lineHeight:"1.4", paddingBottom:5,
                  borderBottom: i<log.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>{entry}</div>
              ))}
            </div>
          </div>

          {/* New game */}
          <button onClick={() => setPhase("setup")} style={{
            padding:"8px 0",
            background:"rgba(255,255,255,0.07)",
            border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:10, color:"rgba(255,255,255,0.6)",
            fontSize:11, cursor:"pointer", fontFamily:"'Nunito',sans-serif",
            letterSpacing:1,
            transition:"all 0.15s",
          }}
          onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
          onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
          >← Change Players</button>
        </div>
      </div>
    </div>
  );
}
