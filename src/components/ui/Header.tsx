import { Gemini } from "../icons/Gemini"

import { X } from 'lucide-react';

import useHeader from "../hooks/useHeader";

const Header = () => {

  const { isOpen, toggleHeader } = useHeader();

  const translateClass = isOpen ? 'translate-y-0' : '-translate-y-full';

  return (
    <nav className={`fixed top-0 py-4 px-24 flex justify-between items-center w-screen border-b backdrop-blur-2xl border-neutral-700 transition-transform duration-300 ${translateClass}`}>
      <a className="opacity-50 transition-opacity hover:opacity-90 duration-200" href="https://sask.dev" target="_blank" >Hecho por el grupo de Puca</a>
      <a 
        className="inline-flex items-center gap-2 opacity-50 transition-opacity hover:opacity-90 duration-200" 
        href="https://gemini.google.com/app"
        target="_blank"
        rel="noopener noreferrer"
      >
        Potenciado por 
        <Gemini className="size-5" />
      </a>
        <X 
          className="size-5 absolute right-10 opacity-50 transition-opacity hover:opacity-90 duration-200" 
          onClick={toggleHeader}
        />
    </nav>
  )
}

export default Header;