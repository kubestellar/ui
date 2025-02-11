import React, { useEffect, useState } from "react";
import { Home, RefreshCw, Rocket } from "lucide-react";

const quotes = [
  {
    text: "In space, no one can hear you 404.",
    author: "Space Explorer"
  },
  {
    text: "Lost among the stars, but not forgotten.",
    author: "Cosmic Wanderer"
  },
  {
    text: "Every wrong turn is just another adventure in the cosmos.",
    author: "Stellar Navigator"
  }
];

const NotFoundPage: React.FC = () => {
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-base-200 relative">
      <style>
        {`
        layer base {
          :root {
            --animation-duration: 300ms;
          }
        }

        @layer utilities {
          .animate-fade-in {
            animation: fadeIn 1s ease-in-out;
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float 6s ease-in-out infinite;
            animation-delay: 2s;
          }

          .animate-twinkle {
            animation: twinkle 4s ease-in-out infinite;
          }

          .animate-rocket-main {
            animation: rocketMain 30s linear infinite;
          }

          .animate-rocket-small {
            animation: rocketSmall 40s linear infinite;
          }

          .animate-trail {
            animation: trail 2s linear infinite;
          }

          .animate-shooting-star {
            animation: shootingStar 4s ease-out infinite;
          }

          .animate-shooting-star-delayed {
            animation: shootingStar 4s ease-out infinite;
            animation-delay: 2s;
          }

          .animate-pulse-slow {
            animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        }

        .rocket-particles::before,
        .rocket-particles::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3B82F6;
          opacity: 0;
          animation: particles 1s linear infinite;
        }

        .rocket-particles::after {
          animation-delay: 0.5s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes rocketMain {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100vw);
            }
        }

        @keyframes rocketSmall {
          0% {
              transform: translateX(-100%);
            }
          100% {
            transform: translateX(100vw);
          }
        }

        @keyframes trail {
          0% {
            transform: translateY(-100%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(100%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes particles {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-20px, 20px) scale(0);
            opacity: 0;
          }
        }

        @keyframes shootingStar {
          0% {
            transform: translateX(0) translateY(0) rotate(45deg) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(500px) translateY(-500px) rotate(45deg) scale(0.1);
            opacity: 0;
          }
        }

        /* Smooth transitions for theme changes */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: var(--animation-duration);
        }
        `}
      </style>
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}

        {/* Planets */}
        <svg className="absolute top-20 left-20 w-24 h-24 text-primary/20 animate-float" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-20 right-20 w-32 h-32 text-primary/15 animate-float-delayed" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="currentColor" />
        </svg>

        {/* Shooting Stars */}
        <div className="absolute w-[2px] h-[2px] bg-primary animate-shooting-star" style={{ top: '20%', left: '10%' }} />
        <div className="absolute w-[2px] h-[2px] bg-primary animate-shooting-star-delayed" style={{ top: '40%', right: '20%' }} />

        {/* Rocket */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-8 animate-rocket-main">
          <Rocket size={80} className="text-primary/30 transform rotate-45" />
        </div>

        {/* Small Rockets */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-rocket-small opacity-20"
              style={{
                top: `${Math.random() * 100}%`,
                left: '-100%',
                animation: `rocketSmall ${10 + i * 3}s linear infinite`,
                animationDelay: `${i * 3}s`,
              }}
          >
            <Rocket size={40} className="text-primary transform rotate-45" />
          </div>
        ))}
      </div>
      </div>

      {/* Main Content */}
      <div className="relative text-center space-y-6 max-w-2xl w-full px-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/KubeStellar.png" alt="KubeStellar Logo" className="h-16 md:h-24 transition-transform hover:scale-105 duration-300" />
        </div>

        {/* 404 Text */}
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-base-content">Houston, We Have a Problem</h2>
          <p className="text-base-content/70 max-w-md mx-auto">
            The page you're looking for has drifted into deep space. 
          </p>
        </div>

        {/* Quote Section */}
        <div className="h-24 relative">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className={`absolute w-full transition-all duration-500 ${
                index === currentQuote ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}
            >
              <p className="text-lg italic text-base-content/80">{quote.text}</p>
              <p className="text-sm text-primary">{quote.author}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => (window.location.href = "/")} className="btn btn-primary">
            <Home size={20} />
            Return Home
          </button>
          <button onClick={() => window.location.reload()} className="btn btn-ghost gap-2 transition-all duration-300 hover:scale-105 group">
            <RefreshCw className="group-hover:rotate-180 transition-transform" size={20} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
