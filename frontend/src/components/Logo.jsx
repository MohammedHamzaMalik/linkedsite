export const Logo = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#007BFF"/>
        <stop offset="100%" stopColor="#00D1B2"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="50" r="6" fill="url(#techGradient)" />
    <circle cx="60" cy="140" r="6" fill="url(#techGradient)" />
    <circle cx="140" cy="140" r="6" fill="url(#techGradient)" />
    <line x1="100" y1="50" x2="60" y2="140" stroke="url(#techGradient)" strokeWidth="2" strokeLinecap="round" />
    <line x1="100" y1="50" x2="140" y2="140" stroke="url(#techGradient)" strokeWidth="2" strokeLinecap="round" />
    <line x1="60" y1="140" x2="140" y2="140" stroke="url(#techGradient)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default Logo;