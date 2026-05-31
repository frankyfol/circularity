import { useState, useEffect } from 'react';

const SLIDES = [
  {
    title: 'Linear City',
    text: 'Waste flows one way: consume → use → dump. Cheap now, costly later.',
    emoji: '🏭→🗑️',
    color: 'text-pixel-red',
  },
  {
    title: 'Circular City',
    text: 'Waste becomes a resource: reduce, reuse, recycle, recover. Sustainable — but never free.',
    emoji: '♻️→🌱',
    color: 'text-pixel-green',
  },
  {
    title: 'Your Mission',
    text: 'You are the Chief Sustainability Officer. Balance five pillars over six years. No single strategy wins.',
    emoji: '🏙️',
    color: 'text-pixel-accent',
  },
];

export default function IntroAnimation({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (slide < SLIDES.length - 1) {
            setSlide((s) => s + 1);
            return 0;
          }
          onComplete();
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [slide, onComplete]);

  const current = SLIDES[slide];

  return (
    <div className="pixel-panel max-w-lg mx-auto text-center space-y-6">
      <p className="font-pixel text-pixel-yellow text-xs">CIRCULAR CITY</p>
      <div className="text-6xl animate-pulse-glow">{current.emoji}</div>
      <h2 className={`font-pixel text-sm ${current.color}`}>{current.title}</h2>
      <p className="font-body text-gray-300">{current.text}</p>
      <div className="pixel-gauge max-w-xs mx-auto">
        <div className="pixel-gauge-fill bg-pixel-accent" style={{ width: `${progress}%` }} />
      </div>
      <button className="pixel-btn" onClick={onComplete}>
        Skip Intro
      </button>
    </div>
  );
}
