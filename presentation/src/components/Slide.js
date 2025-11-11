import React from 'react';
import './Slide.css';

const Slide = ({ data, slideNumber }) => {
  const { type, title, subtitle, content, items, code, highlights, diagram, technical } = data;

  return (
    <div className={`w-[90vw] max-w-7xl h-[80vh] bg-white rounded-3xl shadow-2xl flex items-center justify-center p-12 md:p-16 animate-slide-in overflow-y-auto ${type === 'title-only' ? 'text-center' : ''}`}>
      <div className="w-full max-w-5xl">
        {/* Title */}
        {title && (
          <h1 className={`font-extrabold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-6 leading-tight animate-fade-in ${type === 'title-only' ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'}`}>
            {title}
          </h1>
        )}
        
        {/* Subtitle */}
        {subtitle && (
          <h2 className={`font-semibold text-secondary-500 mb-8 animate-slide-up ${type === 'title-only' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`} style={{animationDelay: '0.1s'}}>
            {subtitle}
          </h2>
        )}
        
        {/* Content text */}
        {content && (
          <p className="text-xl text-gray-700 leading-relaxed mb-8 animate-slide-up" style={{animationDelay: '0.2s'}}>
            {content}
          </p>
        )}
        
        {/* Diagram visualization */}
        {diagram && (
          <div className="my-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl animate-slide-up" style={{animationDelay: '0.3s'}}>
            {diagram.type === 'packet-structure' && <PacketStructureDiagram data={diagram} />}
            {diagram.type === 'flow' && <FlowDiagram data={diagram} />}
            {diagram.type === 'state-machine' && <StateMachineDiagram data={diagram} />}
            {diagram.type === 'architecture' && <ArchitectureDiagram data={diagram} />}
          </div>
        )}

        {/* Technical specs */}
        {technical && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
            {technical.map((spec, index) => (
              <div key={index} className="bg-gradient-to-br from-primary-50 to-purple-50 p-6 rounded-xl border-l-4 border-primary-500 hover:shadow-lg transition-all duration-300">
                <div className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">{spec.label}</div>
                <div className="text-2xl font-bold text-gray-800">{spec.value}</div>
                {spec.description && <div className="text-sm text-gray-600 mt-2">{spec.description}</div>}
              </div>
            ))}
          </div>
        )}
        
        {/* List items */}
        {items && (
          <ul className="space-y-4 my-8">
            {items.map((item, index) => (
              <li 
                key={index} 
                className="flex items-start gap-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-l-4 border-primary-500 hover:translate-x-2 hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{animationDelay: `${0.4 + index * 0.1}s`}}
              >
                {item.icon && <span className="text-3xl flex-shrink-0">{item.icon}</span>}
                <div className="flex-1">
                  {item.title && <strong className="block text-xl text-primary-700 mb-1">{item.title}</strong>}
                  {item.description && <p className="text-gray-700 leading-relaxed">{item.description}</p>}
                  {!item.title && !item.description && <span className="text-lg text-gray-800">{item}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* Code block */}
        {code && (
          <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-sm md:text-base leading-relaxed my-8 shadow-xl border border-gray-700 animate-slide-up" style={{animationDelay: '0.5s'}}>
            <code className="font-mono">{code}</code>
          </pre>
        )}
        
        {/* Highlight boxes */}
        {highlights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            {highlights.map((highlight, index) => (
              <div 
                key={index} 
                className="relative bg-gradient-to-br from-primary-500 to-secondary-500 text-white p-8 rounded-2xl shadow-xl hover:-translate-y-2 transition-all duration-300 animate-slide-up overflow-hidden group"
                style={{animationDelay: `${0.5 + index * 0.15}s`}}
              >
                <div className="absolute top-0 right-0 text-9xl font-black opacity-10 leading-none">{index + 1}</div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-3">{highlight.title}</h3>
                  <p className="text-white/90 leading-relaxed">{highlight.description}</p>
                </div>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Packet Structure Diagram
const PacketStructureDiagram = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-gray-800 mb-4">{data.title}</h3>
    <div className="flex flex-wrap gap-2">
      {data.fields.map((field, index) => (
        <div key={index} className="flex-1 min-w-[120px]">
          <div className={`${field.color || 'bg-primary-500'} text-white p-4 rounded-lg text-center font-mono font-bold border-2 border-gray-800`}>
            {field.name}
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">{field.size}</div>
        </div>
      ))}
    </div>
  </div>
);

// Flow Diagram
const FlowDiagram = ({ data }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-gray-800 mb-4">{data.title}</h3>
    <div className="flex flex-col items-center space-y-4">
      {data.steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center gap-4 w-full max-w-2xl">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-lg pulse-ring">
              {index + 1}
            </div>
            <div className="flex-1 bg-white p-4 rounded-lg shadow-md border-l-4 border-primary-500">
              <div className="font-semibold text-gray-800">{step.action}</div>
              {step.detail && <div className="text-sm text-gray-600 mt-1">{step.detail}</div>}
            </div>
            {step.icon && <span className="text-3xl">{step.icon}</span>}
          </div>
          {index < data.steps.length - 1 && (
            <div className="text-primary-500 text-3xl packet-animation">↓</div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// State Machine Diagram
const StateMachineDiagram = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-gray-800 mb-4">{data.title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {data.states.map((state, index) => (
        <div key={index} className={`p-6 rounded-xl text-center ${state.active ? 'bg-primary-600 text-white scale-110' : 'bg-white border-2 border-gray-300 text-gray-800'} transition-all duration-300 shadow-lg`}>
          <div className="text-3xl mb-2">{state.icon}</div>
          <div className="font-bold">{state.name}</div>
        </div>
      ))}
    </div>
  </div>
);

// Architecture Diagram
const ArchitectureDiagram = ({ data }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-gray-800 mb-4">{data.title}</h3>
    <div className="flex flex-col md:flex-row items-center justify-around gap-8">
      {data.components.map((component, index) => (
        <React.Fragment key={index}>
          <div className="relative">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white p-8 rounded-2xl shadow-2xl min-w-[200px] text-center">
              <div className="text-4xl mb-3">{component.icon}</div>
              <div className="font-bold text-lg">{component.name}</div>
              <div className="text-sm text-white/80 mt-2">{component.description}</div>
            </div>
            {component.badge && (
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                {component.badge}
              </div>
            )}
          </div>
          {index < data.components.length - 1 && (
            <div className="hidden md:block text-primary-600 text-4xl packet-animation">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default Slide;
