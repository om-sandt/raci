import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/learn-raci.scss';

gsap.registerPlugin(ScrollTrigger);

const LearnRACI = () => {
  const matrixRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState('');

  const openVideoModal = (videoSrc: string) => {
    setSelectedVideo(videoSrc);
    setIsModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsModalOpen(false);
    setSelectedVideo('');
  };

  useEffect(() => {
    // GSAP Matrix Animation
    const matrixCells = gsap.utils.toArray('.matrix-cell');
    
    gsap.fromTo(matrixCells, 
      {
        opacity: 0,
        y: 50,
        scale: 0.8
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".matrix-animation-container",
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // GSAP Hero Animation
    gsap.fromTo('.hero-content h1', 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, delay: 0.2 }
    );

    gsap.fromTo('.hero-content p', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.4 }
    );

    gsap.fromTo('.hero-buttons', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.6 }
    );

    // GSAP Video Cards Animation
    const videoCards = gsap.utils.toArray('.video-card');
    gsap.fromTo(videoCards,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".video-section",
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // GSAP Document Cards Animation
    const documentCards = gsap.utils.toArray('.document-card');
    gsap.fromTo(documentCards,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".documents-section",
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // GSAP Quiz Cards Animation
    const quizCards = gsap.utils.toArray('.quiz-card');
    gsap.fromTo(quizCards,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".quiz-section",
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
    <div className="learn-raci-container">
      {/* Navigation Header */}
      <div className="learn-nav">
        <div className="container">
          <div className="nav-left">
            <div className="brand-logo">
              <img src="/snt.png" alt="NIYANTAR Logo" />
            </div>
            <div className="brand-name">NIYANTAR</div>
          </div>
          <div className="nav-right">
            <Link to="/" className="learn-raci-button">
              Home
            </Link>
            <Link to="/auth/login" className="login-button">
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Master RACI Matrix</h1>
          <p>Learn the fundamentals of Responsibility Assignment Matrix through interactive tutorials and resources</p>
        </div>
      </section>

      {/* Interactive RACI Matrix Animation */}
      <section className="matrix-animation-section">
        <div className="container">
                    <h2>Understanding RACI Matrix</h2>
          <br />
          <br />
 
          
          <div className="matrix-animation-container" ref={matrixRef}>
            <div className="matrix-grid">
              {/* Header Row */}
              <div className="matrix-header-row">
                <div className="matrix-cell header-cell">Events/Tasks</div>
                <div className="matrix-cell header-cell">R</div>
                <div className="matrix-cell header-cell">A</div>
                <div className="matrix-cell header-cell">C</div>
                <div className="matrix-cell header-cell">I</div>
              </div>
              
              {/* Matrix Rows */}
              <div className="matrix-row">
                <div className="matrix-cell task-cell">Requirements Gathering</div>
                <div className="matrix-cell role-cell responsible">Project Manager</div>
                <div className="matrix-cell role-cell accountable">Project Manager</div>
                <div className="matrix-cell role-cell consulted">Production Company</div>
                <div className="matrix-cell role-cell informed">Stakeholder</div>
              </div>
              
              <div className="matrix-row">
                <div className="matrix-cell task-cell">Design Creation</div>
                <div className="matrix-cell role-cell responsible">Designer</div>
                <div className="matrix-cell role-cell accountable">Stakeholder</div>
                <div className="matrix-cell role-cell consulted">Production Company</div>
                <div className="matrix-cell role-cell informed">Project Manager</div>
              </div>
              
              <div className="matrix-row">
                <div className="matrix-cell task-cell">Development</div>
                <div className="matrix-cell role-cell responsible">Production Company</div>
                <div className="matrix-cell role-cell accountable">Project Manager</div>
                <div className="matrix-cell role-cell consulted">Designer</div>
                <div className="matrix-cell role-cell informed">Stakeholder</div>
              </div>
              
              <div className="matrix-row">
                <div className="matrix-cell task-cell">Testing</div>
                <div className="matrix-cell role-cell responsible">Project Manager</div>
                <div className="matrix-cell role-cell accountable">Designer</div>
                <div className="matrix-cell role-cell consulted">Production Company</div>
                <div className="matrix-cell role-cell informed">Stakeholder</div>
              </div>
              
              <div className="matrix-row">
                <div className="matrix-cell task-cell">Deployment</div>
                <div className="matrix-cell role-cell responsible">Production Company</div>
                <div className="matrix-cell role-cell accountable">Project Manager</div>
                <div className="matrix-cell role-cell informed">Designer</div>
                <div className="matrix-cell role-cell informed">Stakeholder</div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="matrix-legend">
              <div className="legend-item">
                <div className="legend-color responsible"></div>
                <span>R - Responsible</span>
              </div>
              <div className="legend-item">
                <div className="legend-color accountable"></div>
                <span>A - Accountable</span>
              </div>
              <div className="legend-item">
                <div className="legend-color consulted"></div>
                <span>C - Consulted</span>
              </div>
              <div className="legend-item">
                <div className="legend-color informed"></div>
                <span>I - Informed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Tutorials Section */}
      <section id="video-tutorials" className="video-section">
        <div className="container">
          <h2>Video Tutorials</h2>
          <p className="section-subtitle">Learn RACI through step-by-step video guides</p>
          
          <div className="video-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div className="video-card" onClick={() => openVideoModal('/viedos/English_RACI Explainer.mp4')} style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}>
              <div className="video-thumbnail" style={{
                position: 'relative',
                height: '200px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
              }}>
                <div className="play-button" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#4f46e5',
                  zIndex: 3,
                  transition: 'all 0.3s ease'
                }}>▶</div>
                <div className="video-logo-container" style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  zIndex: 1
                }}>
                  <img src="/snt.png" alt="SNT Logo" style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'contain', 
                    filter: 'brightness(0) invert(1)',
                    opacity: '0.8'
                  }} />
                </div>
                <div className="video-overlay" style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
                  padding: '20px',
                  color: 'white',
                  zIndex: 2
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600' }}>English RACI Explainer</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: '0.9' }}>Learn RACI concepts in English</p>
                </div>
              </div>
              <div className="video-content" style={{
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <img src="/snt.png" alt="SNT Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', color: '#1f2937' }}>English RACI Explainer</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280', lineHeight: '1.5', fontSize: '0.95rem' }}>Comprehensive guide to RACI matrix methodology in English</p>
                <div className="video-meta" style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <span className="duration" style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>Video Tutorial</span>
                  <span className="level" style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>All Levels</span>
                </div>
              </div>
            </div>
            
            <div className="video-card" onClick={() => openVideoModal('/viedos/Hindi_RACI Explainer V4.mp4')} style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}>
              <div className="video-thumbnail" style={{
                position: 'relative',
                height: '200px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
              }}>
                <div className="play-button" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#4f46e5',
                  zIndex: 3,
                  transition: 'all 0.3s ease'
                }}>▶</div>
                <div className="video-logo-container" style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  zIndex: 1
                }}>
                  <img src="/snt.png" alt="SNT Logo" style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'contain', 
                    filter: 'brightness(0) invert(1)',
                    opacity: '0.8'
                  }} />
                </div>
                <div className="video-overlay" style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
                  padding: '20px',
                  color: 'white',
                  zIndex: 2
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600' }}>Hindi RACI Explainer</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: '0.9' }}>Learn RACI concepts in Hindi</p>
                </div>
              </div>
              <div className="video-content" style={{
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <img src="/snt.png" alt="SNT Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', color: '#1f2937' }}>Hindi RACI Explainer</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280', lineHeight: '1.5', fontSize: '0.95rem' }}>Comprehensive guide to RACI matrix methodology in Hindi</p>
                <div className="video-meta" style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <span className="duration" style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>Video Tutorial</span>
                  <span className="level" style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>All Levels</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Documents Section - Commented out as we don't have PDFs at this time */}
      {/* <section id="documents" className="documents-section">
        <div className="container">
          <h2>Downloadable Resources</h2>
          <p className="section-subtitle">Comprehensive guides and templates for your RACI journey</p>
          
          <div className="documents-grid">
            <div className="document-card">
              <div className="document-icon">📋</div>
              <div className="document-content">
                <h3>RACI Matrix Template</h3>
                <p>Ready-to-use Excel template for creating RACI matrices</p>
                <div className="document-meta">
                  <span className="file-type">Excel</span>
                  <span className="file-size">2.3 MB</span>
                </div>
                <button className="download-btn">Download Template</button>
              </div>
            </div>
            
            <div className="document-card">
              <div className="document-icon">📖</div>
              <div className="document-content">
                <h3>RACI Implementation Guide</h3>
                <p>Comprehensive guide covering best practices and implementation strategies</p>
                <div className="document-meta">
                  <span className="file-type">PDF</span>
                  <span className="file-size">5.1 MB</span>
                </div>
                <button className="download-btn">Download Guide</button>
              </div>
            </div>
            
            <div className="document-card">
              <div className="document-icon">📊</div>
              <div className="document-content">
                <h3>RACI Case Studies</h3>
                <p>Real-world examples and case studies from successful implementations</p>
                <div className="document-meta">
                  <span className="file-type">PDF</span>
                  <span className="file-size">3.8 MB</span>
                </div>
                <button className="download-btn">Download Case Studies</button>
              </div>
            </div>
            
            <div className="document-card">
              <div className="document-icon">✅</div>
              <div className="document-content">
                <h3>RACI Checklist</h3>
                <p>Step-by-step checklist to ensure successful RACI implementation</p>
                <div className="document-meta">
                  <span className="file-type">PDF</span>
                  <span className="file-size">1.2 MB</span>
                </div>
                <button className="download-btn">Download Checklist</button>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Interactive Quiz Section */}
      <section className="quiz-section">
        <div className="container">
          <h2>Test Your Knowledge</h2>
          <p className="section-subtitle">Take our interactive quiz to reinforce your learning</p>
          
          <div className="quiz-container">
            <div className="quiz-card">
              <h3>RACI Recall: Fast-Track your understanding</h3>
              <p>Test your understanding of RACI matrix concepts and principles</p>
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSdHoP3-xX0lBm641rtdF_mVjFZBYRBoEtKC1abBzaoAOSINoA/viewform" 
                target="_blank" 
                rel="noopener noreferrer"
                className="quiz-btn"
                style={{ 
                  display: 'inline-block', 
                  textDecoration: 'none', 
                  textAlign: 'center',
                  padding: '12px 24px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.3s ease'
                }}
              >
                Start Quiz
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Implement RACI?</h2>
          <p>Start using our platform to create and manage your RACI matrices effectively</p>
          <div className="cta-buttons">
            <Link to="/auth/login" className="cta-button primary">
              Get Started Now
            </Link>
            <Link to="/" className="cta-button secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isModalOpen && (
        <div 
          className="video-modal-overlay"
          onClick={closeVideoModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            className="video-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '80%',
              height: '80%',
              maxWidth: '1200px',
              backgroundColor: '#000',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <div 
              className="video-modal-header"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 20px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 10
              }}
            >
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>
                {selectedVideo.includes('English') ? 'English RACI Explainer' : 'Hindi RACI Explainer'}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={closeVideoModal}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <video
              src={selectedVideo}
              controls
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="learn-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Sharp & Tannan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LearnRACI; 