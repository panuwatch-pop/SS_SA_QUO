import React, { useState, useEffect } from 'react';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
}

export default function FormattedNumberInput({ 
  value, 
  onChange, 
  allowDecimals = true,
  ...props 
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Sync internal display value with external value
  useEffect(() => {
    if (value === undefined || value === null || isNaN(value)) {
      setDisplayValue('');
      return;
    }

    // Only update display value from external if we're not actively typing a decimal point
    // or if the external value differs significantly from our parsed internal value
    const currentParsed = parseFloat(displayValue.replace(/,/g, ''));
    if (currentParsed !== value) {
      if (allowDecimals) {
        // preserve trailing dot/zeros if user is typing them
        const valStr = value.toString();
        setDisplayValue(value.toLocaleString('en-US', {
          maximumFractionDigits: 6
        }));
      } else {
        setDisplayValue(Math.floor(value).toLocaleString('en-US'));
      }
    }
  }, [value, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    
    // Remove invalid characters
    rawStr = rawStr.replace(/[^0-9.,]/g, '');
    
    // Handle decimals
    if (!allowDecimals) {
      rawStr = rawStr.replace(/\./g, '');
    } else {
      // Prevent multiple decimal points
      const parts = rawStr.split('.');
      if (parts.length > 2) {
        rawStr = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
      }
    }

    // If typing just a decimal point
    if (rawStr === '.') {
      setDisplayValue('0.');
      onChange(0);
      return;
    }

    // If empty
    if (rawStr === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Format the integer part with commas as user types
    let formatted = rawStr;
    if (allowDecimals && rawStr.includes('.')) {
      const [intPart, decPart] = rawStr.split('.');
      const cleanInt = intPart.replace(/,/g, '');
      const num = parseInt(cleanInt || '0', 10);
      formatted = (isNaN(num) ? '0' : num.toLocaleString('en-US')) + '.' + decPart;
    } else {
      const cleanInt = rawStr.replace(/,/g, '');
      const num = parseInt(cleanInt, 10);
      if (!isNaN(num)) {
        formatted = num.toLocaleString('en-US');
      }
    }

    setDisplayValue(formatted);
    
    // Update parent with actual number
    const parsed = parseFloat(rawStr.replace(/,/g, ''));
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue === '') {
      onChange(0);
      setDisplayValue('0');
      return;
    }
    
    const parsed = parseFloat(displayValue.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      if (allowDecimals) {
        // If it's a whole number but user left a trailing dot, remove it
        if (displayValue.endsWith('.')) {
           setDisplayValue(parsed.toLocaleString('en-US'));
        }
      } else {
        setDisplayValue(parsed.toLocaleString('en-US'));
      }
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}
