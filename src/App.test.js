/* global test, expect */

import React from 'react'
import { render } from '@testing-library/react'
import App from './App'

test('renders title element', () => {
  const { getByText } = render(<App />)
  const titleElement = getByText(/HCSX/i)
  expect(titleElement).toBeInTheDocument()
})
