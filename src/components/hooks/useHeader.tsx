import { useState } from "react";

const useHeader = () => {
  const [ isOpen, setIsOpen ] = useState(true);

  const toggleHeader = () => {
    setIsOpen(false);
  }

  return { toggleHeader, isOpen };
}

export default useHeader;