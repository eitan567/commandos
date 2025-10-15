
import React from 'react';

interface MessageProps {
  text: string;
  visible: boolean;
}

const Message: React.FC<MessageProps> = ({ text, visible }) => {
  return (
    <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-sans bg-black/70 px-10 py-5 rounded-lg z-[200] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {text}
    </div>
  );
};

export default Message;
