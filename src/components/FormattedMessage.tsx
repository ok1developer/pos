// src/components/FormattedMessage.tsx
import React from 'react'; // เรายังคงต้อง import React เพื่อใช้ createElement
import reactStringReplace from 'react-string-replace';

interface FormattedMessageProps {
  text: string;
}

export default function FormattedMessage({ text }: FormattedMessageProps) {
  // เราจะใช้ React.ReactNode ซึ่งเป็น Type ที่ครอบคลุมที่สุด
  let replacedText: React.ReactNode[] = [text];

  // 1. เปลี่ยน Hashtag (#) ให้เป็นสีฟ้า
  replacedText = reactStringReplace(replacedText, /(#[\wก-๙]+)/g, (match, i) => (
    // React.createElement('span', { props }, 'children')
    React.createElement('span', { key: match + i, className: "text-cyan-400" }, match)
  ));

  // 2. ซ่อน URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  replacedText = reactStringReplace(replacedText, urlRegex, (match, i) => (
    React.createElement('span', { key: match + i, className: "hidden" }, match)
  ));

  // 3. จัดการการขึ้นบรรทัดใหม่
  const lines = replacedText.map((part, partIndex) => {
    if (typeof part === 'string') {
      return part.split('\n').map((line, lineIndex) => (
        // ใช้ React.Fragment เพื่อครอบโดยไม่มี tag เพิ่ม
        React.createElement(React.Fragment, { key: `${partIndex}-${lineIndex}` }, 
          line,
          // ถ้าไม่ใช่บรรทัดสุดท้าย ให้เพิ่ม <br />
          lineIndex < part.split('\n').length - 1 ? React.createElement('br') : null
        )
      ));
    }
    return part;
  });

  // return <>{lines}</>; ถูกเปลี่ยนเป็น React.createElement
  return React.createElement(React.Fragment, null, ...lines);
}