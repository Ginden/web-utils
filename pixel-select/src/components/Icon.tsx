import React from 'react';

type IconProps = {
  path: string;
  size?: number;
  className?: string;
  title?: string;
};

const Icon: React.FC<IconProps> = ({ path, size = 18, className, title }) => {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} fill="currentColor" />
    </svg>
  );
};

export default Icon;
