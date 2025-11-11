import React, { useState, useEffect } from 'react';
import './App.css';
import Slide from './components/Slide';
import slides from './slides/slideData';

function App() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Home') {
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        setCurrentSlide(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-primary-500 via-purple-600 to-secondary-500 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <Slide data={slides[currentSlide]} slideNumber={currentSlide + 1} />
      
      {/* Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-5 items-center bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full shadow-2xl z-50 border border-white/20">
        <button 
          onClick={prevSlide} 
          disabled={currentSlide === 0}
          className="bg-white/90 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2.5 rounded-full font-semibold text-primary-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl shadow-lg"
        >
          ← Previous
        </button>
        <span className="text-white font-bold text-lg min-w-[80px] text-center drop-shadow-lg">
          {currentSlide + 1} / {slides.length}
        </span>
        <button 
          onClick={nextSlide} 
          disabled={currentSlide === slides.length - 1}
          className="bg-white/90 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed px-6 py-2.5 rounded-full font-semibold text-primary-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl shadow-lg"
        >
          Next →
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="hidden md:block fixed top-6 right-6 text-white/70 text-sm bg-black/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
        Use ← → keys or click buttons to navigate
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/20 z-50">
        <div 
          className="h-full bg-gradient-to-r from-white to-yellow-300 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

export default App;
