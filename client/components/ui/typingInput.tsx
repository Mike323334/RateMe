import { useState, useEffect } from "react";

export default function TypingInput() {
  const phrase =  <>
    Upload your outfit, get instant ratings, and see how your style stacks up!<br />
    Sube tu outfit, recibe calificaciones al instante y<br />
     descubre cómo se compara tu estilo!
  </>;

  const [text, setText] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(true); // controla opacidad

  useEffect(() => {
    // Alterna entre visible y no visible
    const interval = setInterval(() => {
      setVisible((prev) => !prev);
    }, 1000); // tiempo total del ciclo (3s)

    return () => clearInterval(interval);
  }, []);

  return (
  <div className="relative font-mono text-base w-full h-10">  {/* ← altura añadida */}
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      className="w-full bg-transparent outline-none peer transition"
      type="text"
    />

    {!text && (
      <span
        className={`absolute top-0 left-[25px] z-10 text-gray-400 pointer-events-none whitespace-nowrap transition-opacity duration-1000  ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {phrase}
      </span>
    )}
  </div>
);
}