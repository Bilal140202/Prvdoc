

const PrivacyNotice: React.FC = () => {
  return (
    <div className="privacy-notice">
      <div className="privacy-header">
        <div className="privacy-icon">🔒</div>
        <h2>Your Privacy is Guaranteed</h2>
      </div>
      
      <div className="privacy-content">
        <div className="privacy-promise">
          <h3>🛡️ What PrivacyThink Does Differently</h3>
          <div className="promise-grid">
            <div className="promise-item">
              <div className="promise-icon">💻</div>
              <h4>Local Processing</h4>
              <p>All AI processing happens directly in your browser using WebAssembly and client-side models.</p>
            </div>
            
            <div className="promise-item">
              <div className="promise-icon">🚫</div>
              <h4>Zero Server Uploads</h4>
              <p>Your documents never leave your device. Nothing is uploaded to any server, ever.</p>
            </div>
            
            <div className="promise-item">
              <div className="promise-icon">📴</div>
              <h4>Works Offline</h4>
              <p>After the initial model download, PrivacyThink works completely offline.</p>
            </div>
            
            <div className="promise-item">
              <div className="promise-icon">🗑️</div>
              <h4>Your Data, Your Control</h4>
              <p>Delete documents anytime. Clear all data with one click. You're in complete control.</p>
            </div>
          </div>
        </div>

        <div className="privacy-technical">
          <h3>🔧 Technical Implementation</h3>
          <div className="tech-details">
            <div className="tech-section">
              <h4>Storage</h4>
              <ul>
                <li>Documents stored in browser's IndexedDB</li>
                <li>Embeddings computed and stored locally</li>
                <li>No external database connections</li>
                <li>Data encrypted in browser storage</li>
              </ul>
            </div>
            
            <div className="tech-section">
              <h4>AI Processing</h4>
              <ul>
                <li>Models run via WebAssembly (WASM)</li>
                <li>Quantized models for efficiency</li>
                <li>All inference happens client-side</li>
                <li>No API calls to external AI services</li>
              </ul>
            </div>
            
            <div className="tech-section">
              <h4>Network Activity</h4>
              <ul>
                <li>One-time model download on first use</li>
                <li>App updates (optional)</li>
                <li>Zero document or query uploads</li>
                <li>No analytics or tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="privacy-comparison">
          <h3>📊 PrivacyThink vs Traditional AI Services</h3>
          <div className="comparison-table">
            <div className="comparison-row header">
              <div className="feature">Feature</div>
              <div className="privacythink">PrivacyThink</div>
              <div className="traditional">Traditional AI</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature">Document Upload</div>
              <div className="privacythink">✅ Stays on your device</div>
              <div className="traditional">❌ Uploaded to servers</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature">Processing Location</div>
              <div className="privacythink">✅ Your browser</div>
              <div className="traditional">❌ Cloud servers</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature">Internet Required</div>
              <div className="privacythink">✅ Only for model download</div>
              <div className="traditional">❌ Always required</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature">Data Retention</div>
              <div className="privacythink">✅ You control completely</div>
              <div className="traditional">❌ Company policies apply</div>
            </div>
            
            <div className="comparison-row">
              <div className="feature">Third-party Access</div>
              <div className="privacythink">✅ Impossible</div>
              <div className="traditional">❌ Possible via breaches</div>
            </div>
          </div>
        </div>

        <div className="privacy-audit">
          <h3>🔍 Verifiable Privacy</h3>
          <p>
            PrivacyThink is built with transparency in mind. You can verify our privacy claims:
          </p>
          <ul>
            <li><strong>Open Source:</strong> Full source code available for inspection</li>
            <li><strong>Network Monitoring:</strong> Use browser dev tools to verify no data uploads</li>
            <li><strong>Offline Testing:</strong> Disconnect from internet after model download</li>
            <li><strong>Local Storage:</strong> All data visible in browser's IndexedDB</li>
          </ul>
        </div>

        <div className="privacy-contact">
          <h3>📞 Questions About Privacy?</h3>
          <p>
            We're committed to transparency about our privacy practices. If you have any questions 
            about how PrivacyThink protects your data, please reach out to our team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;