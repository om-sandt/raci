import React from 'react';

const HelpSupport = () => {
  // Mock FAQ data
  const faqs = [
    {
      id: 1,
      question: "What is a RACI matrix?",
      answer: "RACI stands for Responsible, Accountable, Consulted, and Informed. It's a responsibility assignment matrix that identifies the roles and responsibilities within a project or business process."
    },
    {
      id: 2,
      question: "How do I update my task status?",
      answer: "You can update your task status by going to 'My Tasks' > 'Assigned to Me', and then using the status dropdown menu to change the status of any task."
    },
    {
      id: 3,
      question: "How can I see which tasks I am accountable for?",
      answer: "Navigate to the RACI Dashboard where you can filter tasks by your assigned role, including 'Accountable'."
    },
    {
      id: 4,
      question: "Can I export my tasks to a calendar?",
      answer: "Yes, in the 'Task Calendar' view, you can click the 'Export' button to download your tasks in a calendar format compatible with most calendar applications."
    },
    {
      id: 5,
      question: "How do I request to be added to a RACI matrix?",
      answer: "Please contact your department head or project manager to request inclusion in a specific RACI matrix."
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Help & Support</h1>
        <p>Get assistance with using the RACI platform</p>
      </div>

      {/* Contact support section */}
      <div className="card">
        <div className="card-header">
          <h2>Contact Support</h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <form>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input 
                  type="text" 
                  id="subject" 
                  placeholder="Enter subject" 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" required>
                  <option value="">Select category</option>
                  <option value="technical">Technical Issue</option>
                  <option value="account">Account Problem</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label htmlFor="message">Message</label>
                <textarea 
                  id="message" 
                  rows="5" 
                  placeholder="Describe your issue or question" 
                  required
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="attachment">Attachment (optional)</label>
                <input type="file" id="attachment" />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      </div>

      {/* FAQ section */}
      <div className="card">
        <div className="card-header">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div style={{ padding: '0.5rem' }}>
          {faqs.map(faq => (
            <div key={faq.id} style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {faq.question}
              </h3>
              <p style={{ color: '#4b5563' }}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation links */}
      <div className="card">
        <div className="card-header">
          <h2>Documentation & Resources</h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            <a href="#" className="resource-link" style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#111827',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '1.5rem' }}>📚</div>
              <div style={{ fontWeight: '600' }}>User Guide</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Complete guide to using the RACI platform</div>
            </a>
            
            <a href="#" className="resource-link" style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#111827',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '1.5rem' }}>🎓</div>
              <div style={{ fontWeight: '600' }}>Video Tutorials</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Learn with step-by-step video guides</div>
            </a>
            
            <a href="#" className="resource-link" style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#111827',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '1.5rem' }}>🧩</div>
              <div style={{ fontWeight: '600' }}>RACI Best Practices</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Tips for effective RACI implementation</div>
            </a>
            
            <a href="#" className="resource-link" style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#111827',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '1.5rem' }}>🔄</div>
              <div style={{ fontWeight: '600' }}>API Documentation</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Technical docs for system integration</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
