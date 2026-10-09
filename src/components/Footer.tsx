import React from 'react';

export const Footer: React.FC = () => (
  <footer className="flash-footer">
    <div className="flash-footer-inner">
      <span className="flash-footer-brand">Spotly</span>
      <span>Good plans start here.</span>
      <span>Demo experience · {new Date().getFullYear()}</span>
    </div>
  </footer>
);
