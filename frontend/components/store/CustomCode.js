'use client';
import { useEffect } from 'react';

// Injects "Custom Code" from General Settings (Facebook Pixel, Google Analytics, chat widgets…)
// Scripts are re-created so the browser actually executes them.
export default function CustomCode({ code }) {
  useEffect(() => {
    if (!code || document.getElementById('custom-code-loaded')) return;
    const holder = document.createElement('div');
    holder.id = 'custom-code-loaded';
    holder.style.display = 'none';
    const tpl = document.createElement('template');
    tpl.innerHTML = code;
    tpl.content.childNodes.forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const s = document.createElement('script');
        for (const attr of node.attributes) s.setAttribute(attr.name, attr.value);
        s.text = node.textContent;
        document.head.appendChild(s);
      } else if (node.nodeName === 'NOSCRIPT' || node.nodeType === 1) {
        holder.appendChild(node.cloneNode(true));
      }
    });
    document.body.appendChild(holder);
  }, [code]);
  return null;
}
