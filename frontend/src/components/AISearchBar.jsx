/**
 * AISearchBar — conversational search bar with shimmer effect and AI processing indicator.
 */
import { useState } from 'react';
import './AISearchBar.css';

export default function AISearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 5 && !loading) {
      onSearch(query.trim());
    }
  };

  const placeholders = [
    'Try: "AC bus from Hyderabad to Bangalore tomorrow morning under ₹1500"',
    'Try: "Sleeper bus Delhi to Jaipur tonight"',
    'Try: "Cheapest bus to Pune from Mumbai this weekend"',
  ];
  const [placeholderIdx] = useState(Math.floor(Math.random() * placeholders.length));

  return (
    <div className="ai-search-wrapper" id="ai-search-bar">
      <div className="ai-search-label">
        <span className="ai-sparkle">✨</span>
        <span>AI-Powered Search</span>
        <span className="ai-sub">— Describe your travel plan in natural language</span>
      </div>
      <form className="ai-search-form" onSubmit={handleSubmit}>
        <div className={`ai-search-input-wrapper ${loading ? 'searching' : ''}`}>
          <span className="ai-search-icon">{loading ? '⏳' : '🔍'}</span>
          <input
            type="text"
            className="ai-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholders[placeholderIdx]}
            disabled={loading}
            id="ai-search-input"
          />
          <button
            type="submit"
            className="btn btn-primary ai-search-btn"
            disabled={loading || query.trim().length < 5}
            id="ai-search-submit"
          >
            {loading ? (
              <span className="ai-spinner" />
            ) : (
              'Search with AI'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
