import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/home.scss';

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

  return (
    <div className="home-container">
      {/* Combined navigation bar */}
      <div className="home-nav">
        <div className="container">
          <div className="nav-left">
            <div className="brand-logo">🔄</div>
            <div className="brand-name">Sharp RACI</div>
          </div>
          
          <div className="nav-center">
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
          </div>
          
          <div className="nav-right">
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
              <h1 className="home-title">Welcome to Sharp RACI Platform</h1>
              <p className="home-subtitle">
                Enhance organizational efficiency with our comprehensive RACI (Responsible, Accountable, Consulted, Informed) matrix solution
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
                  <h3>RACI Matrix</h3>
                  <p>Create and manage RACI matrices for all your projects. Assign roles and responsibilities with ease.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h3>Team Management</h3>
                  <p>Manage your teams, departments and organizational structure all in one place.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h3>Visual Dashboards</h3>
                  <p>Get insights with beautiful visual dashboards that help you track progress and responsibilities.</p>
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
      
      {activeTab === 'features' && (
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
                Discover how Sharp RACI streamlines responsibility assignment and enhances team collaboration
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
                      fontSize: '1.8rem', 
                      margin: 0, 
                      color: '#1e293b',
                      fontWeight: '600' 
                    }}>
                      RACI Matrix Management
                    </h3>
                  </div>
                  <p style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.6', 
                    color: '#475569',
                    marginBottom: '1rem'
                  }}>
                    Create detailed RACI matrices for your projects, assigning team members to each role:
                  </p>
                  <ul style={{
                    listStyleType: 'none',
                    padding: '0',
                    marginBottom: '1rem'
                  }}>
                    <li style={{
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>R</span>
                      <span>R – Performs the task</span>
                    </li>
                    <li style={{
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#0891b2',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>A</span>
                      <span>A – Ultimately accountable for the work</span>
                    </li>
                    <li style={{
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#ca8a04',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>C</span>
                      <span>C – Provides input</span>
                    </li>
                    <li style={{
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#ea580c',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>I</span>
                      <span>I – Receives updates</span>
                    </li>
                  </ul>
                </div>
                
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
                    backgroundColor: '#0891b2'
                  }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      backgroundColor: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>👥</div>
                    <h3 style={{ 
                      fontSize: '1.8rem', 
                      margin: 0, 
                      color: '#1e293b',
                      fontWeight: '600'
                    }}>
                      Organization Management
                    </h3>
                  </div>
                  <p style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.6', 
                    color: '#475569' 
                  }}>
                    Create a comprehensive structure of your organization with:
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    margin: '1.5rem 0'
                  }}>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '24px', marginBottom: '0.5rem'}}>🏢</div>
                      <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a'}}>Departments</h4>
                      <p style={{margin: 0, fontSize: '0.9rem', color: '#64748b'}}>Create and manage departmental units</p>
                    </div>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '24px', marginBottom: '0.5rem'}}>👤</div>
                      <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a'}}>Users</h4>
                      <p style={{margin: 0, fontSize: '0.9rem', color: '#64748b'}}>Manage team members and roles</p>
                    </div>
                  </div>
                </div>
                
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
                    backgroundColor: '#ca8a04'
                  }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      backgroundColor: '#fef9c3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>📅</div>
                    <h3 style={{ 
                      fontSize: '1.8rem', 
                      margin: 0, 
                      color: '#1e293b',
                      fontWeight: '600'
                    }}>
                      Event & Task Management
                    </h3>
                  </div>
                  <p style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.6', 
                    color: '#475569' 
                  }}>
                    Create events, manage tasks, and track progress with our user-friendly interfaces:
                  </p>
                  <ul style={{
                    padding: '0.5rem 0 0.5rem 1rem',
                    listStylePosition: 'inside',
                    color: '#475569',
                    fontSize: '1.05rem',
                    lineHeight: '1.7'
                  }}>
                    <li>Define events and associated tasks</li>
                    <li>Set deadlines and priorities</li>
                    <li>Track completion status in real-time</li>
                    <li>Receive notifications on critical updates</li>
                    <li>Generate progress reports automatically</li>
                  </ul>
                </div>
                
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
                    backgroundColor: '#7c3aed'
                  }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      backgroundColor: '#f3e8ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>📊</div>
                    <h3 style={{ 
                      fontSize: '1.8rem', 
                      margin: 0, 
                      color: '#1e293b',
                      fontWeight: '600'
                    }}>
                      Custom Dashboards & Analytics
                    </h3>
                  </div>
                  <p style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.6', 
                    color: '#475569',
                    marginBottom: '1rem'
                  }}>
                    Get insights with role-specific dashboards and powerful analytics:
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginTop: '1rem'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3e8ff',
                      color: '#7c3aed',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Performance Tracking</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#e0f2fe',
                      color: '#0891b2',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Resource Allocation</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Progress Reports</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ffedd5',
                      color: '#ea580c',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Task Dependencies</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: '500'
                    }}>Bottleneck Detection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'about' && (
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
                About Sharp RACI
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
                  height: '8px',
                  background: 'linear-gradient(to right, #4f46e5, #7c3aed)'
                }}></div>
                
                <div style={{ 
                  fontSize: '1.15rem', 
                  lineHeight: '1.7', 
                  color: '#334155',
                  textAlign: 'left'
                }}>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Sharp RACI is a cutting-edge platform designed to help organizations of all sizes clearly define roles and responsibilities across projects and departments.
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        fontSize: '18px'
                      }}>✓</span>
Why Choose Sharp RACI?                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                      gap: '1.25rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#fef9c3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>📅</div>
                        <div>
                          <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '600'}}>
                            Event Tracking & Scheduling
                          </h4>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.95rem'}}>
                            Organize events, schedule meetings, and manage timelines—all in one place
                          </p>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#e0f2fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>⚖️</div>
                        <div>
                          <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '600'}}>
                            Improved Accountability
                          </h4>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.95rem'}}>
                            Clearly define who is responsible for what in any project or process
                          </p>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#dcfce7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>💬</div>
                        <div>
                          <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '600'}}>
                            Streamlined Communication
                          </h4>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.95rem'}}>
                            Ensure the right people are consulted and informed at every step
                          </p>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#fef9c3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>📊</div>
                        <div>
                          <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '600'}}>
                            Better Resource Management
                          </h4>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.95rem'}}>
                            Optimize workload distribution and prevent resource conflicts
                          </p>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#ffedd5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>🔎</div>
                        <div>
                          <h4 style={{margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '600'}}>
                            Event Transparency
                          </h4>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.95rem'}}>
                            Offer clear insight into event status and updates for every stakeholder
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p style={{ 
                    fontSize: '1.2rem',
                    fontWeight: '500',
                    color: '#1e293b',
                    textAlign: 'center',
                    marginTop: 0,
                    padding: '1rem',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    Our mission is to help teams work more efficiently by providing the tools they need to define, track, and optimize responsibilities across their organization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
