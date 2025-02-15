import React from 'react'

// button element props
type Props = {
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const buttonClasses = `
  tw-py-3 tw-px-8 tw-bg-emerald-400 tw-flex tw-items-center tw-justify-center tw-rounded-lg
  tw-text-2xl tw-text-black tw-gap-2
  hover:tw-brightness-90 tw-transition tw-font-medium
`

const Button = ({
  children,
  ...props
}: Props) => {
  return (
    <button
      {...props}
      className={`${buttonClasses} ${props.className}`}
    >
      {children}
    </button>
  );
}

export default Button