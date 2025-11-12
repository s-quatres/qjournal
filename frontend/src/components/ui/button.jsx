import React from 'react'

const Button = React.forwardRef(({ className = '', variant = 'default', children, disabled, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variants = {
    default: 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-50'
  }
  const sizes = 'h-10 px-4 py-2'
  
  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export { Button }
