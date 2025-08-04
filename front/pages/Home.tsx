import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/home.scss';

gsap.registerPlugin(ScrollTrigger);

// MatrixIcon component to visually represent a 2×2 RACI matrix
const matrixCellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ffffff',
  color: '#4f46e5',
  fontWeight: 700,
  borderRadius: '4px',
  fontSize: '0.9rem',
};

const MatrixIcon: React.FC = () => {
  // Dedicated colors to visually distinguish each RACI role
  const cellColors: Record<string, string> = {
    R: '#4f46e5', // Responsible – Indigo
    A: '#0891b2', // Accountable – Teal
    C: '#ca8a04', // Consulted – Amber
    I: '#ea580c', // Informed – Orange
  };

  return (
    <div
      style={{
        width: '60px',
        height: '60px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '2px',
        backgroundColor: '#ede9fe',
        borderRadius: '12px',
        padding: '4px',
        boxSizing: 'border-box',
        margin: 0,
      }}
    >
      {(['R', 'A', 'C', 'I'] as const).map(letter => (
        <div
          key={letter}
          style={{
            ...matrixCellStyle,
            backgroundColor: cellColors[letter],
            color: '#ffffff',
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
};

const Home = () => {
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

  useEffect(() => {
    // GSAP Hero Animation
    gsap.fromTo('.home-title', 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, delay: 0.2 }
    );

    gsap.fromTo('.home-subtitle', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.4 }
    );

    gsap.fromTo('.cta-button', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.6 }
    );

    // GSAP Feature Cards Animation
    const featureCards = gsap.utils.toArray('.feature-card');
    gsap.fromTo(featureCards,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".feature-section",
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="home-container">
      {/* Combined navigation bar */}
      <div className="home-nav">
        <div className="container">
          <div className="nav-left">
            <div className="brand-logo">
              <img src="/snt.png" alt="NIYANTAR Logo" />
            </div>
            <div className="brand-name">NIYANTAR</div>
          </div>
          
          {/* Commented out Features and About sections for future use */}
          {/* <div className="nav-center">
            <div 
              className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Home
            </div>
            <div 
              className={`nav-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features
            </div>
            <div 
              className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </div>
          </div> */}
          
          <div className="nav-right">
            <Link to="/learn-raci" className="learn-raci-button">
              Learn RACI
            </Link>
            <Link to="/auth/login" className="login-button">
              Login
            </Link>
          </div>
        </div>
      </div>

      {activeTab === 'home' && (
        <div className="tab-content">
          <section className="hero-section">
            <div className="home-content">
              <h1 className="home-title">Welcome to NIYANTAR</h1>
              <p className="home-subtitle">
                Confusion to Clarity - SOD / RACI Matrix tool
              </p>
              <Link to="/auth/login">
                <button
                  className="cta-button"
                  style={{
                    background: 'linear-gradient(90deg, #4f8cff 0%, #1a237e 100%)',
                    color: '#fff',
                    padding: '1rem 2.5rem',
                    fontSize: '1.2rem',
                    border: 'none',
                    borderRadius: '2rem',
                    boxShadow: '0 4px 16px rgba(79, 140, 255, 0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    marginTop: '2rem',
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.04)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(79, 140, 255, 0.25)';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = '';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(79, 140, 255, 0.15)';
                  }}
                >
                  Get Started
                </button>
              </Link>
            </div>
          </section>
          
          <section className="feature-section">
            <div className="features">
              <div className="feature-card">
                <MatrixIcon />
                <div className="feature-content">
                  <h3>RACI/DOA</h3>
                  <p>Create and raci/doa for all your projects. Assign roles and responsibilities with ease.</p>
                </div>
              </div>
              

            </div>
          </section>
          
          <section className="cta-section" style={{ paddingBottom: '2rem' }}>
            <div className="cta-content">
              <h2>Ready to get started?</h2>
              <p>Join thousands of companies that use our RACI platform to improve project clarity and team alignment.</p>
            </div>
          </section>
        </div>
      )}
      
      {/* Commented out Features section for future use */}
      {/* {activeTab === 'features' && (
        <div className="tab-content">
          <div style={{ padding: '4rem 2rem', backgroundColor: '#f8fafc' }}>
            <div className="home-content">
              <h2 style={{ 
                fontSize: '2.5rem', 
                color: '#1a237e', 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                fontWeight: '700' 
              }}>
                Platform Features
              </h2>
              
              <p style={{ 
                textAlign: 'center', 
                maxWidth: '700px', 
                margin: '0 auto 3rem', 
                color: '#64748b', 
                fontSize: '1.2rem', 
                lineHeight: '1.6' 
              }}>
                Discover how NIYANTAR streamlines responsibility assignment and enhances team collaboration
              </p>
              
              <div style={{ 
                maxWidth: '1100px', 
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                gap: '2rem'
              }}>
                <div style={{ 
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  padding: '2rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '8px',
                    height: '100%',
                    backgroundColor: '#4f46e5'
                  }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <MatrixIcon />
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      color: '#1e293b',
                      fontWeight: '600',
                      margin: 0
                    }}>RACI Matrix Management</h3>
                  </div>
                  <p style={{ 
                    color: '#64748b', 
                    lineHeight: '1.6', 
                    marginBottom: '1.5rem'
                  }}>
                    Create, edit, and manage RACI matrices with our intuitive interface. Assign roles and responsibilities with drag-and-drop functionality.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Drag & Drop</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dbeafe',
                      color: '#2563eb',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Real-time Updates</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Role Templates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}
      
      {/* Commented out About section for future use */}
      {/* {activeTab === 'about' && (
        <div className="tab-content">
          <div style={{ 
            padding: '4rem 2rem',
            background: 'linear-gradient(to bottom, #ffffff, #f8fafc)'
          }}>
            <div className="home-content">
              <h2 style={{ 
                fontSize: '2.5rem', 
                color: '#1a237e', 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                fontWeight: '700'
              }}>
                About NIYANTAR
              </h2>
              
              <div style={{ 
                maxWidth: '900px', 
                margin: '0 auto 3rem',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '1.2rem',
                lineHeight: '1.6'
              }}>
                Bringing clarity and accountability to teams of all sizes
              </div>
              
              <div style={{ 
                maxWidth: '900px', 
                margin: '0 auto', 
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                padding: '2.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '4px',
                  background: 'linear-gradient(to right, #4f46e5, #7c3aed)'
                }}></div>
                
                <div style={{ 
                  fontSize: '1.15rem', 
                  lineHeight: '1.7', 
                  color: '#334155',
                  textAlign: 'left'
                }}>
                  <p style={{ marginBottom: '1.5rem' }}>
                    NIYANTAR is a cutting-edge platform designed to help organizations of all sizes clearly define roles and responsibilities across projects and departments.
                  </p>
                  
                  <p style={{ marginBottom: '1.5rem' }}>
                    By implementing the RACI model, teams gain clarity on who is doing what, reducing confusion and increasing productivity. Our platform transforms traditional RACI charts into an interactive, dynamic system.
                  </p>
                  
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    padding: '2rem',
                    margin: '2rem 0',
                    position: 'relative',
                    borderLeft: '4px solid #4f46e5'
                  }}>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      color: '#1e293b',
                      fontWeight: '600',
                      marginBottom: '1.25rem',
                      marginTop: 0
                    }}>Our Mission</h3>
                    <p style={{ 
                      margin: 0,
                      color: '#475569',
                      fontSize: '1.1rem'
                    }}>
                      To empower organizations with clear role definitions, improved communication, and enhanced project success through innovative RACI matrix management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Footer */}
      <footer
        className="home-footer"
        style={{
          padding: '1.5rem 0',
          textAlign: 'center',
          backgroundColor: '#f1f5f9',
          color: '#475569',
          fontSize: '0.95rem',
          marginTop: 0,
        }}
      >
        © {new Date().getFullYear()} Sharp &amp; Tannan. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
