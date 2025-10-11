import React from 'react'

const Alert = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-white text-gray-900 border-gray-200',
    destructive: 'bg-red-50 text-red-900 border-red-200'
  }
  
  return (
    <div
      ref={ref}
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...props}
    />
  )
})
Alert.displayName = 'Alert'

const AlertDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`text-sm ${className}`} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription }
