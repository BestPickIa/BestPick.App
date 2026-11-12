// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock scroll-restoration que tenta acessar APIs não disponíveis em jsdom
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tag, ...args) {
  const element = originalCreateElement(tag, ...args);
  if (tag === 'script') {
    // Evita executar scripts inline que causam erros em jsdom
    element.appendChild = () => element;
  }
  return element;
};

// Mock scrollTo que não está disponível em jsdom
if (!window.scrollTo) {
  window.scrollTo = jest.fn();
}
if (!document.documentElement.scrollTop) {
  Object.defineProperty(document.documentElement, 'scrollTop', {
    writable: true,
    value: 0,
  });
}


