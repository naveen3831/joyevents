const Logo = ({ className = "h-11 w-11", full = false }) => {
  if (full) {
    return (
      <img
        src="/eventoza-logo.svg"
        alt="Eventoza Logo"
        className={`object-contain ${className}`}
      />
    );
  }
  return (
    <img
      src="/eventoza-icon.svg"
      alt="Eventoza Logo"
      className={`object-contain ${className}`}
    />
  );
};

export default Logo;
