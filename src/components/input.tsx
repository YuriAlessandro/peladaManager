import React, { forwardRef } from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, Props>(({
  className,
  ...props
}, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      className={`tw-p-3 tw-border tw-rounded-lg tw-text-2xl tw-border-emerald-400
        tw-bg-emerald-400 tw-bg-opacity-10
        disabled:tw-bg-stone-800 disabled:tw-border-stone-600
        ${className}
        `}
    />
  );
})

export default Input;