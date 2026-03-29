import { render, screen } from '@testing-library/react'
import App from '../src/App'

test('renders calendar with month title', () => {
  render(<App />)
  expect(screen.getByText('Sun')).toBeInTheDocument()
  expect(screen.getAllByTestId('day-cell').length).toBeGreaterThan(0)
})
