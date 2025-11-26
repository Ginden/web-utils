import React, { useId, useState } from 'react';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement<Record<string, unknown>>;
};

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={show}
      onTouchEnd={hide}
    >
      {React.cloneElement(
        children as React.ReactElement,
        {
          'aria-describedby': visible ? id : undefined,
        } as Record<string, unknown>,
      )}
      <span role="tooltip" id={id} className={`tooltip-bubble ${visible ? 'visible' : ''}`}>
        {content}
      </span>
    </span>
  );
};

export default Tooltip;
