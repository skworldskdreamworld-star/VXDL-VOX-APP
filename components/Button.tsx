
import React from 'react';
import Spinner from './Spinner';

// FIX: Switched from an interface extending React.ButtonHTMLAttributes to a type alias
// using an intersection (&). This is a more robust way to combine component-specific props
// with all standard HTML button attributes, resolving type errors where properties like
// 'onClick', 'type', and 'disabled' were not recognized.
type ButtonProps = {
  isLoading?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({ isLoading = false, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className="relative w-full flex justify-center items-center bg-white text-black font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow-md hover:shadow-white/10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-white/50 transform active:scale-95 disabled:bg-gray-800 disabled:shadow-none disabled:cursor-not-allowed disabled:text-gray-500"
      disabled={isLoading || props.disabled}
    >
      <span className="relative">{isLoading ? <Spinner /> : children}</span>
    </button>
  );
}

export default Button;