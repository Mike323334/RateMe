import { useState, useEffect } from "react";

export default function TypingInput() {
  const phrase = (
    <>
      Upload your outfit, get instant ratings, and see how your style stacks up!
      <br />
      Sube tu outfit, recibe calificaciones al instante y
      <br />
      descubre cómo se compara tu estilo!
    </>
  );

  const [text, setText] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative font-mono w-full 
  min-h-[30px] sm:min-h-[50px]">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full bg-transparent outline-none peer transition text-sm sm:text-base"
        type="text"
      />

      {!text && (
        <span
          className={`absolute-top-2 top-0 left-2 z-10 text-gray-400 pointer-events-none 
          transition-opacity duration-1000 
          text-xs sm:text-sm md:text-base leading-5
          whitespace-normal  /* ← allows wrapping */
        ${visible ? "opacity-100" : "opacity-0"}`}
        >
          {phrase}
        </span>
      )}
    </div>
  );
}
